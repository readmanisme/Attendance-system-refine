import { copyFileSync, cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = import.meta.dirname;
const APP_NAME = "Attendance-system";

const mappings = [
  {
    src: path.join(root, "dist"),
    dest: path.join(root, "electron-app", "resources", "app", "dist"),
  },
  {
    src: path.join(root, "dist-electron", "main"),
    dest: path.join(root, "electron-app", "resources", "app", "main"),
  },
  {
    src: path.join(root, "dist-electron", "preload"),
    dest: path.join(root, "electron-app", "resources", "app", "preload"),
  },
];

const missing = mappings.filter(({ src }) => !existsSync(src));
if (missing.length > 0) {
  for (const { src } of missing) {
    console.error(`[copy_electron_files] missing source: ${src}`);
  }
  console.error(
    "[copy_electron_files] please run `pnpm build` first to generate dist and dist-electron.",
  );
  process.exit(1);
}

for (const { src, dest } of mappings) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy_electron_files] copied: ${src} -> ${dest}`);
}

// 固定打包后应用名，否则缺 name 时 Electron 默认叫 "Electron"，
// userData 会从 %APPDATA%/vite-app 漂成 %APPDATA%/Electron
const packagedPkg = path.join(root, "electron-app", "resources", "app", "package.json");
writeFileSync(packagedPkg, JSON.stringify({ name: APP_NAME, main: "./main/index.js" }, null, 2));
console.log(`[copy_electron_files] wrote: ${packagedPkg}`);

// .env 不会被 vite 打进包，main 进程运行时需要它：
// 复制到 resources/app/.env，loadEnvFile() 会按
// APP_ROOT/.env -> APP_ROOT/app/.env -> exe 同级/.env 顺序查找
const envSrc = path.join(root, ".env");
const envDest = path.join(root, "electron-app", "resources", "app", ".env");
if (existsSync(envSrc)) {
  copyFileSync(envSrc, envDest);
  console.log(`[copy_electron_files] copied: ${envSrc} -> ${envDest}`);
} else {
  console.warn("[copy_electron_files] no .env found, skip copying env.");
}

console.log("[copy_electron_files] done.");
