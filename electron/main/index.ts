import { app, BrowserWindow, shell, ipcMain } from "electron";
// import { createRequire } from 'node:module'
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import {
  getPocketBasePort,
  isPocketBaseRunning,
  shouldStartPocketBase,
  startPocketBase,
  stopPocketBase,
} from "./pocketbase";

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "app", "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (process.platform === "win32" && os.release().startsWith("6.1"))
  app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

/**
 * 渲染进程读端口的方式：preload 把 additionalArguments 里的 --pb-port 挂到 window.process1.env.PORTTTT
 * （与 src/stores/index.ts 的读取逻辑对应）。端口必须在创建窗口前定下来，所以 PB 先于窗口启动。
 */
function webPreferences(): Electron.WebPreferences {
  const port = getPocketBasePort();
  return {
    preload,
    // 关闭隔离才能让 preload 直接往 window 上挂 process1
    contextIsolation: false,
    sandbox: false,
    additionalArguments: port === null ? [] : [`--pb-port=${port}`],
  };
}

async function createWindow() {
  win = new BrowserWindow({
    title: "Main window",
    // fullscreen: true,
    // autoHideMenuBar: false,
    show: false,
    webPreferences: webPreferences(),
  });
  // win.maximize()

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  win.once("ready-to-show", () => {
    win?.maximize();
    win?.show();
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
}

let quitting = false;

app.whenReady().then(async () => {
  // 端口必须先定下来（渲染进程靠它连后端），所以 PB 先于窗口启动。
  // PB 起不来时不阻塞：弹过错误框后照常开窗，前端会显示"后端无法连接"并自动重试。
  if (shouldStartPocketBase()) {
    await startPocketBase(process.env.APP_ROOT as string);
  }
  await createWindow();
});

// 退出前先关停 PocketBase：杀进程是异步的，先拦一次 quit，等它真的退出再放行
app.on("before-quit", (event) => {
  if (quitting) return;
  if (!isPocketBaseRunning()) return;
  event.preventDefault();
  quitting = true;
  void stopPocketBase().finally(() => app.quit());
});

// 控制台强退兜底（dev 下 Ctrl+C / 系统终止）
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stopPocketBase().finally(() => process.exit(0));
  });
}

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      ...webPreferences(),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
