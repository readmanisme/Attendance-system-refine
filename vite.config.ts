/// <reference types="vitest/config" />

import { defineConfig, perEnvironmentPlugin } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import { electronSimple } from "vite-plugin-electron/multi-env";

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build";
  const sourcemap = true;
  // 只有显式执行 `vite build --mode analyze` 时才生成打包分析报告。
  // 注意：--mode analyze 不会改变 NODE_ENV，仍是 production（import.meta.env.PROD 仍为 true）
  const isAnalyze = mode === "analyze";
  // pnpm dev:web (vite dev --mode web) 时跳过 electron 插件，只跑纯网页。
  // 插件基于 Vite Environment API，会注册 electron_main / electron_preload 两个环境，
  // 不加它就是普通 Vite dev server。
  const enableElectron = mode !== "web" && process.env.ELECTRON !== "0";

  return {
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/playwright-report/**",
        "**/.git/**",
        "**/tests/**",
      ],
    },
    define: {
      // __BACKEND_API_URL__: JSON.stringify('http://localhost:8090'),
      // __BACKEND_Admin_URL__: JSON.stringify('http://localhost:8090/_/'),
      // __BACKEND_API_URL__: JSON.stringify("http://localhost:29401"),
      __BACKEND_Admin_URL__: JSON.stringify("http://localhost:29401/_/"),
      __AttendanceRecord_TableName: JSON.stringify("attendance_record_test"),
      __Workers_TableName: JSON.stringify("workers_test"),
      __WorkTypes_TableName: JSON.stringify("workType_test"),
      __WorkHours_Day_ViewName: JSON.stringify("workHour_day_view_test"),
      __WorkHours_Month_ViewName: JSON.stringify("workHour_month_view_test"),
      __SalaryType_TableName: JSON.stringify("SalaryType_test"),
      __WorkerRecordNum_TableName: JSON.stringify("worker_record_num"),
      __WorkRecordNum_TableName: JSON.stringify("work_record_num"),
      __SystemName__: JSON.stringify("工人考勤系统"),
      __Backend_UserName__: JSON.stringify("shed2705@outlook.com"),
      __Backend_Password__: JSON.stringify("bPWU8GCMuqwKF9z"),
      __VERSION__: JSON.stringify("v2026.10.16.0849"),
    },
    base: "./", //electron模式下使用
    resolve: {
      alias: {
        // '@': '/src',
        "@": path.resolve(import.meta.dirname, "./src"),
        "@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs",
      },
      tsconfigPaths: true,
    },
    server: {
      port: 5173,
      watch: {
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/playwright-report/**",
          // 前面必要要有**/，不然排除不了
          "**/logs/**",
          "**/.vscode/**",
          "**/.idea/**",
          "**/.VSCodeCounter/**",
          "**/test-results/**",
          "**/tests/**",
        ],
      },
    },
    plugins: [
      react({ compiler: true }),
      tailwindcss(),
      // visualizer 只在 analyze 模式下启用，并且只用在该配置的 client 环境（渲染进程）上。
      // 因为 electron 的 main/preload 是同一份配置下的另外两个 environment【electron_main / electron_preload】，
      // 不加限制的话插件会对三个 environment 各跑一次，三次都写同一个文件，互相覆盖。
      isAnalyze &&
        perEnvironmentPlugin("visualizer", (environment) =>
          environment.name === "client"
            ? visualizer({
                template: "treemap",
                filename: "bundle-treemap.html",
                open: true,
                projectRoot: /.*?node_modules\/\.pnpm\/[^/]+\/node_modules\//,
              })
            : false,
        ),
      ...(enableElectron
        ? [
            electronSimple({
              main: {
                input: "electron/main/index.ts",
                options: {
                  build: {
                    sourcemap,
                    minify: isBuild,
                    outDir: "dist-electron/main",
                  },
                },
              },
              preload: {
                input: "electron/preload/index.ts",
                options: {
                  build: {
                    sourcemap: sourcemap ? "inline" : undefined,
                    minify: isBuild,
                    outDir: "dist-electron/preload",
                  },
                },
              },
              // Polyfill the Electron and Node.js API for Renderer process.
              // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
              // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
              // renderer: {},
            }),
          ]
        : []),
    ],
  };
});
