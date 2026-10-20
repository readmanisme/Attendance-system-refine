/**
 * 一次性迁移脚本：把 attendance_record 从「签到/签退时间」模型迁移为「工时(分钟)」模型。
 *
 * 迁移前字段：check_in, check_out (date/时间)，worker_id, work
 * 迁移后字段：work_date (text "YYYY-MM-DD"，本地日历日)，work_minutes (number，整数分钟)
 * 规则：
 *   1. work_date    = 本地时区的 check_in 日期（与原视图 DATE(check_in,'localtime') 等价）
 *   2. work_minutes = round((check_out - check_in) / 60000)，on faith 取绝对值
 *   3. 同 (worker_id, work_date, work) 的多条记录合并为一条（分钟求和），多余条删除
 *   4. 在 (worker_id, work_date, work) 上加唯一索引，防止再次出现可合并的重复记录
 *   5. 删除遗留视图 workHour_day_view(_test) / workHour_month_view(_test)
 *      （它们的 viewQuery 引用了 check_in/check_out，必须先于第 6 步删字段，否则视图重算会失败）
 *   6. 删除 check_in / check_out 字段
 *
 * 幂等：脚本可重复运行；已迁移（无 check_in 字段）的库会跳过数据改动，只做校验。
 *
 * 用法（在仓库根目录运行）：
 *   node scripts/migrate-hours/migrate.ts --url http://127.0.0.1:29401 --dry-run
 *   node scripts/migrate-hours/migrate.ts --url http://127.0.0.1:29401
 *   # 视图清理：默认按表名后缀推导；可用 --views a,b 指定，或 --keep-views 跳过
 *   node scripts/migrate-hours/migrate.ts --table attendance_record --views workHour_day_view,workHour_month_view
 *
 * 兼容：登录端点自动探测（新版 /api/collections/_superusers/auth-with-password，
 *       旧版 /api/admins/auth-with-password）。
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return argv[i + 1]?.startsWith("--") ? "" : argv[i + 1];
}
function argFlag(name: string): boolean {
  return argv.includes(`--${name}`);
}

const BASE_URL = (argValue("url") || "http://127.0.0.1:29401").replace(/\/+$/, "");
const TABLE = argValue("table") || "attendance_record_test";
const EMAIL = argValue("email") || process.env.PB_ADMIN_EMAIL || "shed2705@outlook.com";
const PASSWORD = argValue("password") || process.env.PB_ADMIN_PASSWORD || "bPWU8GCMuqwKF9z";
const KEEP_OLD_FIELDS = argFlag("keep-old-fields");
const DRY_RUN = argFlag("dry-run");

/**
 * 需要清理的遗留视图：工时按天/按月汇总的旧视图，迁移后由前端/新视图取代。
 * 默认名按表名后缀推导（attendance_record_test -> workHour_day_view_test），
 * 所以对生产表（attendance_record）跑时会自动找 workHour_day_view。
 */
const TABLE_SUFFIX = TABLE.endsWith("_test") ? "_test" : "";
const DEFAULT_LEGACY_VIEWS = [
  `workHour_day_view${TABLE_SUFFIX}`,
  `workHour_month_view${TABLE_SUFFIX}`,
];
const LEGACY_VIEWS = (argValue("views") ?? DEFAULT_LEGACY_VIEWS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
/** 跳过视图清理（临时排查用） */
const KEEP_VIEWS = argFlag("keep-views");

if (!EMAIL || !PASSWORD) {
  console.error("缺少 --email/--password（或环境变量 PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD）");
  process.exit(1);
}

// ---------- 基础请求 ----------

/** 带上 HTTP 状态码的错误，便于区分 404（不存在）与其他失败 */
class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

async function req(
  path: string,
  init: { method?: string; body?: any; token?: string } = {},
): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: init.token } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new HttpError(
      `${init.method ?? "GET"} ${path} -> ${res.status}: 非JSON响应 ${text.slice(0, 300)}`,
      res.status,
    );
  }
  if (!res.ok) {
    throw new HttpError(
      `${init.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(json)}`,
      res.status,
    );
  }
  return json;
}

async function auth(): Promise<string> {
  // 新版端点
  const newEndpoints = [
    "/api/collections/_superusers/auth-with-password",
    "/api/admins/auth-with-password", // 旧版端点
  ];
  let lastError: unknown;
  for (const endpoint of newEndpoints) {
    try {
      const r = await req(endpoint, {
        method: "POST",
        body: { identity: EMAIL, password: PASSWORD },
      });
      console.log(`已通过端点 ${endpoint} 登录`);
      return r.token as string;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function fetchAllRecords(token: string, collectionName: string, sort = ""): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  for (;;) {
    const r = await req(
      `/api/collections/${collectionName}/records?perPage=500&page=${page}${sort ? `&sort=${sort}` : ""}`,
      { token },
    );
    all.push(...r.items);
    if (all.length >= r.totalItems || r.items.length === 0) break;
    page++;
  }
  return all;
}

// ---------- 时区处理 ----------

const tzOffsetMinutes = new Date().getTimezoneOffset(); // minutes behind UTC（+8 => -480）
function localDateStr(iso: string): string {
  const normalized = iso.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) throw new Error(`无法解析日期: ${iso}`);
  const shifted = new Date(d.getTime() - tzOffsetMinutes * 60000);
  return shifted.toISOString().slice(0, 10);
}

// ---------- 主流程 ----------

type RecordRow = {
  id: string;
  worker_id: string;
  work: string;
  check_in: string;
  check_out: string;
  work_date?: string;
  work_minutes?: number;
  created?: string;
};

type GroupStat = { minutes: number; count: number };
type Snap = Map<Key, GroupStat>;
type Key = string; // `${worker_id}|${work_date}|${work}`

// ---------- 索引解析 ----------

/** 唯一约束的列（顺序无关：唯一性与列顺序无关） */
const UNIQUE_INDEX_COLUMNS = ["worker_id", "work_date", "work"];
/** 唯一索引名（与库中实际名字保持一致，便于人工核对） */
const UNIQUE_INDEX_NAME = `idx_${TABLE}_worker_date_work`;

type IndexInfo = { raw: string; name: string; unique: boolean; columns: string[] };

/** 从 PocketBase 返回的 `CREATE [UNIQUE] INDEX ... ON ... (...)` 语句里解析出名字/是否唯一/列 */
function parseIndex(raw: string): IndexInfo {
  const name = raw.match(/INDEX\s+[`"']?([^`"'\s(]+)[`"']?\s+ON\s/i)?.[1] ?? "";
  const unique = /^\s*CREATE\s+UNIQUE\s+INDEX/i.test(raw);
  const colsRaw = raw.match(/ON\s+[`"']?[^`"'\s(]+[`"']?\s*\(([^)]*)\)/i)?.[1] ?? "";
  const columns = colsRaw
    .split(",")
    .map((s) => s.trim().replace(/^[`"']+|[`"']+$/g, ""))
    .filter(Boolean);
  return { raw, name, unique, columns };
}

/** 列集合是否相同（大小写与顺序都不敏感） */
function sameColumns(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map((s) => s.toLowerCase()).sort();
  const sb = b.map((s) => s.toLowerCase()).sort();
  return sa.every((v, i) => v === sb[i]);
}

// ---------- 遗留视图清理 ----------

type ViewAction = "deleted" | "absent" | "planned" | "skipped:非视图";

/**
 * 删除遗留的工时视图（workHour_day_view / workHour_month_view）。
 *
 * 为什么必须在删除 check_in/check_out 之前做：这两个视图的 viewQuery 直接
 * 引用了 check_in / check_out，PocketBase 在源表结构变化后会重算视图，
 * 字段没了视图就变成坏的，源表的 PATCH 也可能连带失败。
 *
 * 安全性：
 *   - 只删 type === "view" 的集合；同名但不是视图（真表、可能有数据）一律跳过并告警
 *   - 不存在即视为已完成（幂等），不报错
 *   - dry-run 只打印计划
 */
async function dropLegacyViews(token: string): Promise<Record<string, ViewAction>> {
  const actions: Record<string, ViewAction> = {};
  if (KEEP_VIEWS) {
    console.log("已指定 --keep-views，跳过遗留视图清理");
    return actions;
  }
  if (!LEGACY_VIEWS.length) return actions;

  console.log(`遗留视图: ${LEGACY_VIEWS.join(", ")}`);
  for (const name of LEGACY_VIEWS) {
    let col: any;
    try {
      col = await req(`/api/collections/${name}`, { token });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        console.log(`  视图不存在，无需删除: ${name}`);
        actions[name] = "absent";
        continue;
      }
      throw e;
    }

    if (col.type !== "view") {
      console.warn(`⚠️  ${name} 不是 view 集合(type=${col.type})，为避免误删数据已跳过`);
      actions[name] = "skipped:非视图";
      continue;
    }

    if (DRY_RUN) {
      console.log(`  （dry-run）将删除视图: ${name}`);
      actions[name] = "planned";
      continue;
    }

    // 按 id 删除，避免名字里的特殊字符被当成路径
    await req(`/api/collections/${col.id}`, { method: "DELETE", token });
    console.log(`  已删除视图: ${name}`);
    actions[name] = "deleted";
  }
  return actions;
}

async function main() {
  console.log(`目标: ${BASE_URL}  表: ${TABLE}`);
  const off = -tzOffsetMinutes / 60;
  console.log(`时区: UTC${off >= 0 ? "+" : ""}${off}  dry-run: ${DRY_RUN}`);
  if (tzOffsetMinutes !== -480) {
    console.warn("⚠️  当前机器时区不是 UTC+8，日期是按本机时区推导的，请确认后再执行");
  }

  const token = await auth();

  const collection = await req(`/api/collections/${TABLE}`, { token });
  const fields: any[] = collection.fields ?? collection.schema ?? [];
  const indexes: string[] = collection.indexes ?? [];
  const hasCheckIn = fields.some((f) => f.name === "check_in");
  const hasCheckOut = fields.some((f) => f.name === "check_out");
  const hasWorkDate = fields.some((f) => f.name === "work_date");
  const hasWorkMinutes = fields.some((f) => f.name === "work_minutes");

  // 结构化判定：必须是 UNIQUE，且列集合恰好是 (worker_id, work_date, work)。
  // 只看子串（如 includes("work_date") && UNIQUE）会误判——(work_date) 单列唯一索引也算通过。
  const indexInfos = indexes.map(parseIndex);
  const uniqueIndex = indexInfos.find(
    (ix) => ix.unique && sameColumns(ix.columns, UNIQUE_INDEX_COLUMNS),
  );
  const hasUniqueIndex = !!uniqueIndex;
  // 与目标同名的索引（但定义不对，如非 UNIQUE / 列不符）：补索引前必须先剔除，否则 PATCH 会因重名失败
  const staleSameNameIndex = indexInfos.find(
    (ix) => ix.name === UNIQUE_INDEX_NAME && ix !== uniqueIndex,
  );
  // 其他"看起来像工时唯一索引"的索引：仅提示，避免误以为唯一约束已生效
  const otherUniqueOnWorkDate = indexInfos.filter(
    (ix) => ix.unique && ix !== uniqueIndex && ix.columns.some((c) => c === "work_date"),
  );

  console.log(
    `字段状态: check_in=${hasCheckIn} check_out=${hasCheckOut} work_date=${hasWorkDate} work_minutes=${hasWorkMinutes} 唯一索引=${hasUniqueIndex}`,
  );
  if (staleSameNameIndex) {
    console.warn(`⚠️  存在同名但定义不符的索引，将在补索引时剔除: ${staleSameNameIndex.raw}`);
  }
  if (otherUniqueOnWorkDate.length) {
    console.warn(
      `⚠️  存在其他含 work_date 的唯一索引（不算作目标索引）: ${otherUniqueOnWorkDate.map((ix) => ix.raw).join(" | ")}`,
    );
  }

  // ---------- 1. 拉取全部记录并生成快照（合并键 -> 合计分钟数/条数） ----------
  const records: RecordRow[] = await fetchAllRecords(token, TABLE);
  console.log(`记录总数: ${records.length}`);

  // 合并键快照，迁移后必须与之一致
  const preSnapshot: Snap = new Map();

  // 待执行的操作
  const updates: Array<{ id: string; body: Record<string, any> }> = [];
  const deletes: string[] = [];
  let mergedKeys = 0;
  let newFields: any[] = [];

  // 是否已经完全迁移（check 字段已被删除）
  const alreadyMigrated = !hasCheckIn && !hasCheckOut && hasWorkDate && hasWorkMinutes;
  if (alreadyMigrated) {
    console.log("检测到数据已迁移（无 check_in/check_out 字段），跳过数据改动，仅更新索引并校验。");
    for (const r of records) {
      const key: Key = `${r.worker_id}|${r.work_date}|${r.work}`;
      const prev = preSnapshot.get(key);
      if (prev) {
        prev.minutes += r.work_minutes ?? 0;
        prev.count += 1;
      } else {
        preSnapshot.set(key, { minutes: r.work_minutes ?? 0, count: 1 });
      }
    }
  } else {
    // 计算每条记录的新字段，并按合并键分组
    const groups = new Map<Key, RecordRow[]>();
    for (const r of records) {
      if (r.work_minutes == null) {
        if (!r.check_in) {
          console.warn(`⚠️  记录 ${r.id} 缺少 check_in，跳过（无法推导日期）`);
          continue;
        }
        const date = localDateStr(r.check_in);
        const minutes = hasCheckOut
          ? Math.round(
              (new Date(r.check_out.replace(" ", "T")).getTime() -
                new Date(r.check_in.replace(" ", "T")).getTime()) /
                60000,
            )
          : 0;
        if (Math.abs(minutes) > 60 * 24 * 5) {
          console.warn(`⚠️  记录 ${r.id} 时长异常(${minutes}分钟): ${r.check_in} ~ ${r.check_out}`);
        }
        (r as any).work_date = date;
        (r as any).work_minutes = Math.abs(minutes);
      }
      const key: Key = `${r.worker_id}|${(r as any).work_date}|${r.work}`;
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    }

    for (const [key, group] of groups) {
      const sum = group.reduce((acc, r) => acc + (r.work_minutes ?? 0), 0);
      preSnapshot.set(key, { minutes: sum, count: group.length });
      if (group.length === 1) {
        const r = group[0];
        // 收集快照时在本地推导过字段（或记录在库里本身就缺字段）→ 需要写库
        if (!hasWorkDate || !hasWorkMinutes || r.work_date == null || r.work_minutes == null) {
          updates.push({
            id: r.id,
            body: { work_date: r.work_date, work_minutes: r.work_minutes },
          });
        }
      } else {
        mergedKeys++;
        // 保留最早 created 的一条，其余删除，分钟数取合计
        const keeper = [...group].sort((a, b) =>
          String(a.created ?? "").localeCompare(String(b.created ?? "")),
        )[0];
        updates.push({
          id: keeper.id,
          body: { work_date: keeper.work_date, work_minutes: sum },
        });
        for (const d of group.filter((r) => r.id !== keeper.id)) deletes.push(d.id);
      }
    }

    // work_date/work_minutes 字段本身也可能缺失（首次迁移）
    if (!hasWorkDate) {
      newFields.push({
        type: "text",
        name: "work_date",
        required: false,
        presentable: false,
        id: "text2430153856",
      });
    }
    if (!hasWorkMinutes) {
      newFields.push({
        type: "number",
        name: "work_minutes",
        required: false,
        presentable: false,
        onlyInt: true,
        id: "number1839097295",
      });
    }

    console.log(
      `计划: 新增字段=${newFields.map((f) => f.name).join(",") || "无"}  更新记录=${updates.length}  合并去重=${mergedKeys}组(删除${deletes.length}条)  删除字段=${KEEP_OLD_FIELDS ? "无(保留旧字段)" : "check_in,check_out"}`,
    );

    if (DRY_RUN) {
      // 抽样展示
      for (const u of updates.slice(0, 5)) {
        console.log(`  示例更新: ${u.id} -> ${JSON.stringify(u.body)}`);
      }
      for (const d of deletes.slice(0, 5)) console.log(`  示例删除: ${d}`);
      // 视图清理也走一遍（函数内部在 dry-run 下只打印）
      await dropLegacyViews(token);
      console.log("dry-run 结束，未做任何修改。");
      return;
    }

    // ---------- 2. 添加新字段 ----------
    if (newFields.length) {
      const body = { fields: [...fields.map((f: any) => ({ ...f })), ...newFields] };
      await req(`/api/collections/${TABLE}`, { method: "PATCH", token, body });
      console.log(`已添加字段: ${newFields.map((f) => f.name).join(", ")}`);
    }

    // ---------- 3. 批量更新/删除记录 ----------
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50);
      await req("/api/batch", {
        method: "POST",
        token,
        body: {
          requests: chunk.map((u) => ({
            url: `/api/collections/${TABLE}/records/${u.id}`,
            method: "PATCH",
            body: u.body,
          })),
        },
      });
      console.log(`  更新进度: ${Math.min(i + 50, updates.length)}/${updates.length}`);
    }
    for (let i = 0; i < deletes.length; i += 50) {
      const chunk = deletes.slice(i, i + 50);
      await req("/api/batch", {
        method: "POST",
        token,
        body: {
          requests: chunk.map((id) => ({
            url: `/api/collections/${TABLE}/records/${id}`,
            method: "DELETE",
          })),
        },
      });
    }
    console.log(`记录完成: 更新 ${updates.length} 条, 删除 ${deletes.length} 条`);
  }

  // ---------- 4. 添加唯一索引（必须在合并之后，否则有重复会失败） ----------
  if (!hasUniqueIndex) {
    const cur = await req(`/api/collections/${TABLE}`, { token });
    const curIndexes = ((cur.indexes ?? []) as string[]).map(parseIndex);
    // 按名字精确剔除：同名旧索引（非 UNIQUE / 列不符）必须先删掉，否则 SQLite 建同名索引会报 already exists
    const dropped = curIndexes.filter((ix) => ix.name === UNIQUE_INDEX_NAME);
    const kept = curIndexes.filter((ix) => ix.name !== UNIQUE_INDEX_NAME).map((ix) => ix.raw);
    const uniqueIndexTarget = `CREATE UNIQUE INDEX \`${UNIQUE_INDEX_NAME}\` ON \`${TABLE}\` (\`worker_id\`, \`work_date\`, \`work\`)`;
    // dry-run 对"已迁移"的库也会走到这里，必须只打印不写
    if (DRY_RUN) {
      if (dropped.length) {
        console.log(`（dry-run）将剔除同名旧索引: ${dropped.map((ix) => ix.raw).join(" | ")}`);
      }
      console.log(`（dry-run）将添加唯一索引: ${uniqueIndexTarget}`);
    } else {
      await req(`/api/collections/${TABLE}`, {
        method: "PATCH",
        token,
        body: { indexes: [...kept, uniqueIndexTarget] },
      });
      if (dropped.length) {
        console.log(`已剔除同名旧索引: ${dropped.map((ix) => ix.raw).join(" | ")}`);
      }
      console.log("已添加唯一索引 (worker_id, work_date, work)");
    }
  }

  // ---------- 5. 删除遗留工时视图 ----------
  // 必须早于第 6 步删字段：这两个视图的 viewQuery 引用了 check_in/check_out，
  // 字段一删，PocketBase 重算视图就会失败（视图变坏，源表 PATCH 也可能被连带拒绝）。
  // 已迁移的库（check_in 早已删除）也可能残留这两个坏视图，所以不看 alreadyMigrated，总是执行。
  const viewActions = await dropLegacyViews(token);

  // ---------- 6. 删除旧字段（首次迁移且未指定 keep） ----------
  if (!alreadyMigrated && !KEEP_OLD_FIELDS) {
    const cur = await req(`/api/collections/${TABLE}`, { token });
    const kept = (cur.fields ?? []).filter(
      (f: any) => !["check_in", "check_out"].includes(f.name) || f.system,
    );
    await req(`/api/collections/${TABLE}`, { method: "PATCH", token, body: { fields: kept } });
    console.log("已删除字段: check_in, check_out");
  }

  // ---------- 7. 自校验 ----------
  const afterRecords: RecordRow[] = await fetchAllRecords(token, TABLE);
  const afterSnapshot: Snap = new Map();
  for (const r of afterRecords) {
    const key: Key = `${r.worker_id}|${r.work_date}|${r.work}`;
    const prev = afterSnapshot.get(key);
    if (prev) {
      prev.minutes += r.work_minutes ?? 0;
      prev.count += 1;
    } else {
      afterSnapshot.set(key, { minutes: r.work_minutes ?? 0, count: 1 });
    }
  }

  const diffs: string[] = [];
  for (const [key, stat] of preSnapshot) {
    const after = afterSnapshot.get(key);
    if (!after) diffs.push(`键丢失: ${key} (迁移前 ${stat.minutes} 分钟)`);
    else if (after.minutes !== stat.minutes)
      diffs.push(`工时不同: ${key} 前=${stat.minutes} 后=${after.minutes}`);
  }
  for (const key of afterSnapshot.keys()) {
    if (!preSnapshot.has(key)) diffs.push(`多余键: ${key}`);
  }

  const report = {
    url: BASE_URL,
    table: TABLE,
    dryRun: DRY_RUN,
    totalBefore: records.length,
    totalAfter: afterRecords.length,
    mergedKeys,
    recordUpdates: updates.length,
    duplicateDeleted: deletes.length,
    legacyViews: viewActions,
    diffs,
    ok: diffs.length === 0,
    checkedAt: new Date().toISOString(),
  };
  const reportPath = join(
    process.cwd(),
    `report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`校验报告已写入: ${reportPath}`);

  if (diffs.length) {
    console.error(`❌ 自校验发现 ${diffs.length} 处不一致:`);
    for (const d of diffs.slice(0, 20)) console.error("   " + d);
    process.exit(2);
  }
  console.log(`✅ 迁移与校验通过: ${records.length} 条 -> ${afterRecords.length} 条`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
