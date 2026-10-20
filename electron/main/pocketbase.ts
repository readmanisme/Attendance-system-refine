import { app, dialog } from "electron";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { backupBeforeStart } from "./backup";

/**
 * PocketBase 子进程的生命周期管理。
 *
 * 关于"优雅关闭"：Windows 上只有把 Ctrl+C 投递给"某个控制台里的进程组"这一条路，
 * 而 Electron 是 GUI 程序、没有控制台，spawn 出来的 PB 也就没有控制台可以接收；
 * Node 的 child.kill("SIGINT") 在 Windows 上实际是 TerminateProcess，不是信号。
 * 试过用隐藏 PowerShell + Start-Process 给 PB 造一个独立控制台，再从另一个进程
 * AttachConsole + GenerateConsoleCtrlEvent：在真实 Electron 环境下 attach 不上，
 * 只能走 taskkill 兜底。因此这里直接强杀 —— SQLite(WAL) 保证已提交事务不丢，
 * 代价只是不做 checkpoint、下次启动时由 SQLite 自行恢复。
 */

/** 启动后等待 /api/health 通过的最长时间（单次尝试） */
const HEALTH_TIMEOUT_MS = 2500;
/** 端口被抢占等原因启动失败时的最大尝试次数 */
const MAX_ATTEMPTS = 3;
/** 强杀后等待进程真正消失的上限 */
const KILL_TIMEOUT_MS = 3000;

const PB_EXE_NAME = "pocketbase.exe";
const PID_FILE_NAME = "pb.pid";

let child: ChildProcess | null = null;
let pbPid: number | null = null;
let pbPort: number | null = null;
let pbDir = "";
let pbExe = "";
/** 最近一次启动失败的说明，用于错误弹窗 */
let lastFailure = "";

/**
 * 是否由本进程托管 PB。
 * 判据用 VITE_DEV_SERVER_URL（vite-plugin-electron 只在 dev 下注入），
 * 不用 app.isPackaged —— 实测直接跑 electron-app 里的 electron.exe 时它也是 false。
 */
export function shouldStartPocketBase(): boolean {
  if (process.env.VITE_DEV_SERVER_URL) return process.env.ELECTRON_PB === "1";
  return true;
}

export function getPocketBasePort(): number | null {
  return pbPort;
}

export function isPocketBaseRunning(): boolean {
  return pbPid !== null;
}

/**
 * 解析 pocketbase 目录：与 electron 文件夹同级（即 electron.exe 所在目录的上一级）。
 * 开发态（vite dev，electron.exe 在 node_modules 里）第一个候选落空，退回项目根的 pocketbase 目录。
 */
function resolvePocketBaseDir(appRoot: string): string {
  const candidates = [
    path.resolve(path.dirname(app.getPath("exe")), "..", "pocketbase"),
    path.resolve(appRoot, "pocketbase"),
  ];

  for (const dir of candidates) {
    if (existsSync(path.join(dir, PB_EXE_NAME))) return dir;
  }
  return candidates[0];
}

function pidFilePath(): string {
  return path.join(pbDir, PID_FILE_NAME);
}

/** 取一个当前空闲的本地端口（内核分配，避免和手动的 29401/29402 撞车） */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("无法获取空闲端口")));
      }
    });
  });
}

function run(
  file: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === "number" ? error.code : -1) : 0;
      resolve({ code, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

/** pid 是否仍是我们自己的 pocketbase.exe（防止 pid 复用后误杀别的进程） */
async function isPocketBasePid(pid: number): Promise<boolean> {
  const { stdout } = await run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"]);
  return stdout.toLowerCase().includes(PB_EXE_NAME);
}

/** taskkill 整棵进程树并等它真的消失 */
async function forceKill(proc: ChildProcess | null, pid: number): Promise<void> {
  if (!(await isPocketBasePid(pid))) return;

  const exited = new Promise<void>((resolve) => {
    if (!proc || proc.exitCode !== null) return resolve();
    proc.once("exit", () => resolve());
    setTimeout(resolve, KILL_TIMEOUT_MS);
  });

  await run("taskkill", ["/PID", String(pid), "/T", "/F"]);
  await exited;
}

/** 上次异常退出（崩溃/断电）留下的实例：pid 文件还在就收掉，避免两个 PB 同时写同一个 pb_data */
async function killOrphan(): Promise<void> {
  const file = pidFilePath();
  if (!existsSync(file)) return;
  const pid = Number.parseInt(readFileSync(file, "utf8").trim(), 10);
  if (Number.isInteger(pid) && pid > 0) {
    await forceKill(null, pid);
  }
  rmPidFile();
}

function rmPidFile(): void {
  try {
    rmSync(pidFilePath(), { force: true });
  } catch {
    // 忽略
  }
}

/** 轮询 /api/health。Node 侧一律用 127.0.0.1：PB 只绑 IPv4，localhost 可能先解析到 ::1 */
async function waitHealth(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) return true;
    } catch {
      // 还没起来
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function spawnPocketBase(port: number): ChildProcess | null {
  try {
    return spawn(pbExe, ["serve", "--http", `127.0.0.1:${port}`], {
      cwd: pbDir,
      windowsHide: true,
      // PB 不输出任何有用的东西（实测请求也不打日志），直接丢弃
      stdio: "ignore",
    });
  } catch (error) {
    lastFailure = String(error);
    return null;
  }
}

/**
 * 启动 PocketBase，返回实际使用的端口；失败返回 null。
 * 端口分配和 PB 真正 bind 之间有个极小的窗口，被别人抢走时换端口重试。
 */
export async function startPocketBase(appRoot: string): Promise<number | null> {
  pbDir = resolvePocketBaseDir(appRoot);
  pbExe = path.join(pbDir, PB_EXE_NAME);

  if (!existsSync(pbExe)) {
    dialog.showErrorBox(
      "找不到 PocketBase",
      `期望路径：\n${pbExe}\n\n请确认 pocketbase 文件夹与 electron 文件夹同级，且其中包含 ${PB_EXE_NAME}。`,
    );
    return null;
  }

  await killOrphan();

  // 备份必须在 PB 启动前：此刻没有进程持有 db 文件，快照才是一致的。
  // 数据没变化时 backupBeforeStart 只做一次 stat 就返回，不读文件也不哈希。
  backupBeforeStart(pbDir);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let port: number;
    try {
      port = await getFreePort();
    } catch (error) {
      lastFailure = `分配端口失败：${String(error)}`;
      continue;
    }

    const proc = spawnPocketBase(port);
    const pid = proc?.pid;
    if (!proc || pid === undefined) {
      lastFailure = lastFailure || "进程创建失败";
      continue;
    }

    // 早期崩溃（例如数据目录被占用）会让健康检查直接失败，这里顺手记下退出码
    let exitCode: number | null = null;
    proc.once("exit", (code) => {
      exitCode = code;
    });

    if (await waitHealth(port, HEALTH_TIMEOUT_MS)) {
      child = proc;
      pbPid = pid;
      pbPort = port;
      writeFileSync(pidFilePath(), String(pid), "ascii");
      // 托管进程意外退出时清掉内存状态，避免退出流程去杀一个不存在的 pid
      proc.once("exit", () => {
        if (pbPid === pid) {
          pbPid = null;
          pbPort = null;
          child = null;
          rmPidFile();
        }
      });
      return port;
    }

    lastFailure = exitCode === null ? "健康检查超时" : `进程提前退出，退出码 ${exitCode}`;
    await forceKill(proc, pid);
    rmPidFile();
  }

  dialog.showErrorBox(
    "PocketBase 启动失败",
    `已重试 ${MAX_ATTEMPTS} 次。\n\n程序：${pbExe}\n\n${lastFailure || "原因未知"}`,
  );
  return null;
}

/** 关停当前托管的 PB（供 before-quit 调用） */
export async function stopPocketBase(): Promise<void> {
  const proc = child;
  const pid = pbPid;
  child = null;
  pbPid = null;
  pbPort = null;

  if (pid !== null) {
    await forceKill(proc, pid);
  }
  rmPidFile();
}
