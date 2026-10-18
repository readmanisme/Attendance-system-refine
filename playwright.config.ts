import { defineConfig, devices } from "@playwright/test";

/**
 * playwright 配置:
 * - 前端走 build 后的产物(vite preview, 端口 4172)，不是 dev server，也不含 electron
 * - 后端是 pocketbase-for-playwright-test 里的测试专用库(端口 29410，不占用开发的 29401)
 * - PB 进程由 tests/global-setup.ts 拉起，退出时自动终止
 * - 测试数据由各测试按需注入(tests/helpers/pb.ts)，运行后自行清理
 *
 * 运行方式: pnpm test:e2e（或 pnpm exec playwright test）。
 * 不要用 pnx playwright test——dlx 会下载一份新版本 playwright，与项目内
 * @playwright/test 形成"双版本"，报 test() called in a wrong context。
 */
export default defineConfig({
  testDir: "./tests",
  // workers 必须保持 1: 所有 spec 共用一个测试后端，各文件的 TestDB 按
  // "created 时间窗"兜底清理，并行 worker 会互删对方的数据
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // 默认 30s 对 健康检查 类用例(人为延迟 2s + 连续失败阈值≈15s)太紧，容易撞线
  timeout: 60_000,
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "http://localhost:4172",
    // 失败时保留 trace，HTML 报告里可直接回放排查(本地 retries=0，开销可控)
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 864 } },
      //窗口大小不够会影响内容显示
    },
  ],
  webServer: {
    command: "pnpm exec vite preview --port 4172 --strictPort",
    url: "http://localhost:4172",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
