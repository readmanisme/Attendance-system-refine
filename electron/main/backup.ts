import { dialog } from "electron";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/**
 * PocketBase 数据目录的自动备份。
 *
 * 时机：PB 子进程启动之前。此刻没有任何进程持有 db 文件，是唯一能保证
 * "拷出来就是一致的"窗口；运行中直接 copy 运行中的 db 是不安全的。
 *
 * 策略（按用户选择）：
 *   - 数据没变化就不备份。两级判定，代价从低到高：
 *       1) 缓存命中：与上次快照记录的 (size, mtime) 全部一致 → 直接跳过，**不读文件、不哈希**
 *       2) 内容比对：stat 变了才读内容算 sha256，若仍与上次相同（例如只被 touch 过）
 *          则刷新缓存的 stat 后跳过，同样不产生新快照
 *     必须把 data.db-wal 算进来 —— 退出流程是强杀 PB（taskkill /F），已提交但没
 *     checkpoint 的事务还留在 -wal 里，只看 data.db 会漏掉最近录入。
 *   - 有变化才新建一份，**永不自动删除**，只在总占用过大时告警。
 *   - 快照 = backups/pb-YYYYMMDD-HHmmss/ 目录，含 data.db / -wal / -shm / storage/。
 *     不含 auxiliary.db（请求日志，34MB，对恢复没有价值）。
 *   - 备份失败不阻塞启动，但会弹窗——静默失败等于没备份。
 *
 * 恢复：关掉 app → 把快照目录里的文件拷回 pocketbase/pb_data/ → 启动。
 */

/** 快照目录前缀；清理/恢复只认这个前缀，避免误伤别的文件 */
const SNAPSHOT_PREFIX = "pb-";
/** 快照索引（同时充当 stat 缓存与上次内容哈希的记录） */
const INDEX_FILE = ".index.json";
/** 索引格式版本：v2 起带 inputs（stat 缓存） */
const INDEX_VERSION = 2;
/** 只告警不删除的占用阈值 */
const SIZE_WARN_BYTES = 1024 * 1024 * 1024;

/** 组成数据库的实体文件（-shm 是 SQLite 重建的派生文件，拷贝但不参与判定） */
const DATA_FILES = ["data.db", "data.db-wal", "data.db-shm"];
/** 参与"变没变"判定的文件：-shm 不参与，它跟着进程实时变化，会把每次启动都判成有变化 */
const TRACKED_FILES = ["data.db", "data.db-wal"];

/** 文件指纹（只看元数据，不读内容） */
type FileInput = { path: string; size: number; mtimeMs: number };
type Snapshot = { dir: string; at: string; bytes: number; hash: string; inputs: FileInput[] };
type BackupIndex = { version: number; snapshots: Snapshot[] };

export type BackupOutcome = "created" | "unchanged" | "skipped" | "failed";

function emptyIndex(): BackupIndex {
  return { version: INDEX_VERSION, snapshots: [] };
}

function indexPath(backupsDir: string): string {
  return path.join(backupsDir, INDEX_FILE);
}

function readIndex(backupsDir: string): BackupIndex {
  try {
    const parsed = JSON.parse(readFileSync(indexPath(backupsDir), "utf8")) as BackupIndex;
    // 版本不符时丢弃缓存：宁可多备一份，也不漏备
    if (parsed.version === INDEX_VERSION && Array.isArray(parsed.snapshots)) {
      return { version: INDEX_VERSION, snapshots: parsed.snapshots };
    }
  } catch {
    // 文件不存在或内容损坏：当作没有历史快照
  }
  return emptyIndex();
}

function writeIndex(backupsDir: string, index: BackupIndex): void {
  writeFileSync(indexPath(backupsDir), JSON.stringify(index, null, 2), "utf8");
}

/** 本地时间 YYYYMMDD-HHmmss */
function stamp(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  );
}

/** 递归列出目录下所有文件的相对路径 */
function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/**
 * 收集指纹：data.db / data.db-wal 的 stat + storage 下每个文件的 stat。
 * 只做 stat，不读内容 —— 这是"数据没变就不备份"的快路径。
 */
function collectInputs(dataDir: string): FileInput[] {
  const inputs: FileInput[] = [];
  for (const name of TRACKED_FILES) {
    const file = path.join(dataDir, name);
    if (!existsSync(file)) continue;
    const stat = statSync(file);
    inputs.push({ path: name, size: stat.size, mtimeMs: stat.mtimeMs });
  }
  const storage = path.join(dataDir, "storage");
  if (existsSync(storage)) {
    for (const rel of listFiles(storage).sort()) {
      const stat = statSync(path.join(storage, rel));
      inputs.push({ path: `storage/${rel}`, size: stat.size, mtimeMs: stat.mtimeMs });
    }
  }
  return inputs;
}

function sameInputs(a: FileInput[], b: FileInput[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i];
    return x.path === y.path && x.size === y.size && x.mtimeMs === y.mtimeMs;
  });
}

/**
 * 内容哈希：sha256。
 * db 文件读内容；storage 只把 (路径, 大小, mtime) 喂进去（附件内容哈希不划算，
 * 但增删改都能察觉）。
 */
function hashData(dataDir: string, inputs: FileInput[]): string {
  const hash = createHash("sha256");
  for (const input of inputs) {
    hash.update(input.path);
    if (input.path.startsWith("storage/")) {
      hash.update(String(input.size));
      hash.update(String(input.mtimeMs));
      continue;
    }
    hash.update(readFileSync(path.join(dataDir, input.path)));
  }
  return hash.digest("hex");
}

function dirSize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else if (entry.isFile()) total += statSync(full).size;
  }
  return total;
}

/** 同名目录已存在（同一秒内两次启动）时加后缀，绝不覆盖已有快照 */
function uniqueSnapshotDir(backupsDir: string, base: string): string {
  let name = `${SNAPSHOT_PREFIX}${base}`;
  let n = 1;
  while (existsSync(path.join(backupsDir, name))) {
    n += 1;
    name = `${SNAPSHOT_PREFIX}${base}-${n}`;
  }
  return name;
}

function warnIfTooLarge(index: BackupIndex): void {
  const total = index.snapshots.reduce((sum, s) => sum + s.bytes, 0);
  if (total <= SIZE_WARN_BYTES) return;
  const gb = (total / 1024 ** 3).toFixed(2);
  // 不自动删除任何东西，只提醒人工清理
  void dialog.showMessageBox({
    type: "warning",
    title: "备份占用偏大",
    message: `自动备份已占用 ${gb} GB（${index.snapshots.length} 份）。`,
    detail:
      "按你的要求，程序不会自动删除任何备份。\n" +
      "需要腾出空间时，请手动删除 pocketbase/backups 下较早的 pb-* 目录。",
    buttons: ["知道了"],
  });
}

/**
 * 启动前备份。返回结果供调用方记日志/判断，不会抛异常。
 * @param pbDir pocketbase 目录（含 pocketbase.exe 与 pb_data）
 */
export function backupBeforeStart(pbDir: string): BackupOutcome {
  const dataDir = path.join(pbDir, "pb_data");
  if (!existsSync(path.join(dataDir, "data.db"))) return "skipped"; // 首次启动，还没有库

  const backupsDir = path.join(pbDir, "backups");
  const index = readIndex(backupsDir);
  const last = index.snapshots[index.snapshots.length - 1];

  // 快路径：stat 全一致说明文件一个字节都没动过，连读都不用读
  const inputs = collectInputs(dataDir);
  if (last && sameInputs(last.inputs, inputs)) return "unchanged";

  let hash: string;
  try {
    hash = hashData(dataDir, inputs);
  } catch (error) {
    dialog.showErrorBox("自动备份失败", `计算数据指纹失败：\n\n${String(error)}`);
    return "failed";
  }

  // 慢路径命中：stat 变了但内容没变（被 touch 过）→ 只刷新缓存，不出新快照
  if (last && last.hash === hash) {
    last.inputs = inputs;
    try {
      writeIndex(backupsDir, index);
    } catch {
      // 缓存写不进去不影响数据安全，下次重新算一遍即可
    }
    return "unchanged";
  }

  try {
    mkdirSync(backupsDir, { recursive: true });
    const dir = uniqueSnapshotDir(backupsDir, stamp(new Date()));
    const target = path.join(backupsDir, dir);
    mkdirSync(target);

    let bytes = 0;
    for (const name of DATA_FILES) {
      const src = path.join(dataDir, name);
      if (!existsSync(src)) continue;
      cpSync(src, path.join(target, name));
      bytes += statSync(src).size;
    }

    // storage 目前基本是空的，但以后可能放附件，一并备上
    const storage = path.join(dataDir, "storage");
    if (existsSync(storage)) {
      cpSync(storage, path.join(target, "storage"), { recursive: true });
      bytes += dirSize(storage);
    }

    index.snapshots.push({ dir, at: new Date().toISOString(), bytes, hash, inputs });
    writeIndex(backupsDir, index);
    warnIfTooLarge(index);
    return "created";
  } catch (error) {
    dialog.showErrorBox(
      "自动备份失败",
      `数据目录：${dataDir}\n备份目录：${backupsDir}\n\n${String(error)}\n\n` +
        "程序会继续启动，但这次没有备份。请检查磁盘空间与目录权限。",
    );
    return "failed";
  }
}
