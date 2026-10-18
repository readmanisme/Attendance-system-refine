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
    include: ["vitest-tests/**/*.test.{js,ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "clover", "json"],
      // 只统计"单测负责的纯逻辑层";页面/组件由 playwright 覆盖,不计入单测覆盖率分母。
      // pocketbase_admin.ts 需要真实超管凭据,无法在单测里隔离,故不在范围内。
      include: [
        "src/constants.ts",
        "src/components/WorkMinutesInput.tsx",
        "src/utils/salary.ts",
        "src/utils/workTime.ts",
        "src/utils/tableHelpers.ts",
        "src/utils/get_data_picker_filter.ts",
        "src/utils/pocketbase.ts",
        "src/pages/tong-ji/compute.ts",
        "src/pages/tong-ji/options.ts",
        "src/pages/qian-dao/batchState.ts",
        "src/pages/gong-shi/exportSheets.ts",
        "src/pages/xin-zi/duplicateCheck.ts",
        "src/stores/index.ts",
      ],
      exclude: ["**/*.d.ts"],
      // 阈值按当前基线略低 2~3 个点设置,防止覆盖率回退;新增逻辑应同步补测
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
