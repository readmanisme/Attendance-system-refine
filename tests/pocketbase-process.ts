import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_TEST_PORT } from "./constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PB_DIR = path.resolve(__dirname, "../pocketbase-for-playwright-test");
const PB_EXE = path.join(PB_DIR, "pocketbase.exe");
/** 端口来源于 constants.ts(单一来源)。Node 侧健康检查用 127.0.0.1:
 * PB 只绑定在 127.0.0.1 上,localhost 可能解析到 ::1 导致 fetch 失败;
 * 前端请求和 page.route 匹配用的 Backend_URL(localhost) 在浏览器侧解析,无此问题。 */
export const PB_TEST_URL = `http://127.0.0.1:${PB_TEST_PORT}`;

let pbProcess: ReturnType<typeof spawn> | null = null;

export async function startPocketBase() {
  if (pbProcess) return;
  // 已有健康实例(如手动起的命令行)则直接复用
  try {
    const res = await fetch(`${PB_TEST_URL}/api/health`);
    if (res.ok) {
      console.log(`[pw] 复用已运行的 PocketBase(test) @ ${PB_TEST_URL}`);
      return;
    }
  } catch {
    // 无实例，继续启动
  }
  pbProcess = spawn(PB_EXE, ["serve", "--http", `127.0.0.1:${PB_TEST_PORT}`], {
    cwd: PB_DIR,
    stdio: "inherit",
  });
  pbProcess.on("exit", (code) => {
    console.log(`[pw] PocketBase(test) 退出, code=${code}`);
    pbProcess = null;
  });
  // 等待健康检查通过，最长 15s
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${PB_TEST_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // 未就绪，继续等
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("[pw] PocketBase(test) 健康检查超时");
}

export async function stopPocketBase() {
  if (!pbProcess) return;
  const proc = pbProcess;
  pbProcess = null;
  await new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
    // windows 下 spawn 的进程树用 taskkill 保证杀干净
    spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"]);
    setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* 已退出 */
      }
      resolve();
    }, 5000);
  });
}
