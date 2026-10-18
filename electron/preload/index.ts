/**
 * 把主进程分配的 PocketBase 端口交给渲染进程。
 *
 * 主进程通过 BrowserWindow 的 webPreferences.additionalArguments 传 `--pb-port=xxxxx`，
 * preload 在这里落到 window.process1.env.PORTTTT —— src/stores/index.ts 读的就是这个位置。
 * 需要 contextIsolation: false，preload 才能直接改 window。
 */
const PORT_ARG_PREFIX = "--pb-port=";

const portArg = process.argv.find((arg) => arg.startsWith(PORT_ARG_PREFIX));
const port = portArg?.slice(PORT_ARG_PREFIX.length);

if (port) {
  (globalThis as unknown as Record<string, unknown>).process1 = {
    env: { PORTTTT: port },
  };
}

export {};
