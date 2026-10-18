import { defineConfig, devices } from "@playwright/test";

/**
 * playwright 配置:
 * - 前端走 build 后的产物(vite preview, 端口 4172)，不是 dev server，也不含 electron
 * - 后端是 pocketbase-for-playwright-test 里的测试专用库(端口 29410，不占用开发的 29401)
 * - PB 进程由 tests/global-setup.ts 拉起，退出时自动终止
 * - 测试数据由各测试按需注入(tests/helpers/pb.ts)，运行后自行清理
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "http://localhost:4172",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 864 } },
      //窗口大小不够会影响内容显示
    },
  ],
  webServer: {
    command: "npx vite preview --port 4172 --strictPort",
    url: "http://localhost:4172",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
