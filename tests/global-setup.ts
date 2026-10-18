import { startPocketBase, stopPocketBase } from "./pocketbase-process";

export default async function globalSetup() {
  await startPocketBase();
  // 无论测试正常结束还是中途崩溃退出，都保证杀掉测试后端进程
  process.on("exit", () => {
    void stopPocketBase();
  });
  process.on("SIGINT", () => {
    void stopPocketBase();
    process.exit(130);
  });
}
