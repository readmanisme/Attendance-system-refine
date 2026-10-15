/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import { analyzer } from 'vite-bundle-analyzer'

const visualizerConfigs = [
  // https://github.com/btd/rollup-plugin-visualizer
  { template: "treemap", filename: "bundle-treemap.html", open: true,projectRoot: /.*?node_modules\/\.pnpm\/[^/]+\/node_modules\// },
  // { template: "sunburst", filename: "bundle-sunburst.html", gzipSize: true },
  // { template: "network", filename: "bundle-network.html",gzipSize: true },
  // { template: "list", filename: "bundle-list.html" ,gzipSize: true},
  // {
  //   template: "flamegraph",
  //   filename: "bundle-flamegraph.html",
  //   gzipSize: true,
  // },
];
function formatModulePath(path: string, defaultWd: string): string {
  // 统一 Windows 和 POSIX 路径分隔符
  let result = path.replace(/\\/g, '/')
  const root = defaultWd.replace(/\\/g, '/').replace(/\/+$/, '')

  // 将 pnpm 虚拟存储路径折叠为普通 node_modules 路径
  result = result.replace(
    /(^|\/)node_modules\/\.pnpm\/[^/]+\/node_modules\//,
    '$1node_modules/',
  )

  // 移除项目根目录，保留相对路径
  if (
    result.toLowerCase().startsWith(root.toLowerCase() + '/')
  ) {
    result = result.slice(root.length + 1)
  }

  return result
}
export default defineConfig({
  // 帮助文档 https://cn.vite.dev/config/
  plugins: [
    react({ compiler: true }),
    tailwindcss(),
    // analyzer({pathFormatter: formatModulePath,})
    // visualizer(),
    ...visualizerConfigs.map((config) => visualizer(config)),
  ],
  test: {
    // globals: true,
    // environment: 'jsdom',
    // setupFiles: './vitest.setup.mjs',
    exclude: ["**/node_modules/**", "**/dist/**", "**/playwright-report/**","**/.git/**","**/tests/**"],
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
    __VERSION__: JSON.stringify("v2025.12.25.0829"),
  },
  base: "./", //electron模式下使用
  resolve: {
    alias: {
      // '@': '/src',
      "@": path.resolve(import.meta.dirname, "./src"),
      "@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs",
    },
    tsconfigPaths:true
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
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
