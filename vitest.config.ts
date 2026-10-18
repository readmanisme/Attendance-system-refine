import path from "node:path";
import { defineConfig } from "vitest/config";

/** vitest 独立配置:纯 Node 环境跑聚合引擎单测,避免加载应用侧 vite.config(含 electron 插件) */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["vitest-tests/**/*.test.{js,ts}"],
    environment: "node",
  },
});
