import { API_URL } from "./constants";
import { test, expect } from "@playwright/test";
const HealthUrl = API_URL + "/health";
const SettingsUrl = API_URL + "/settings";

test("健康检查", async ({ page }) => {
  // 测试后端健康检查与相应提示显示
  await test.step("初始化Alert", async () => {
    await page.goto("/");
    await expect(page.getByTestId("Initializing-alert"), "初始化Alert").toBeVisible();
  });
  await test.step("自动导航到签到页面", async () => {
    await expect(page.getByRole("heading", { name: "签到录入系统" })).toBeVisible();
  });
  await test.step("后端异常Alert", async () => {
    await page.route(HealthUrl, async (route) => {
      await route.fulfill({
        status: 404,
      });
    });
    await expect(page.getByTestId("Error-alert"), "后端异常Alert").toBeVisible({ timeout: 11_000 });
  });
  await test.step("恢复正常", async () => {
    await page.unroute(HealthUrl);
    await expect(page.getByTestId("Error-alert"), "后端异常Alert").not.toBeVisible({
      timeout: 11_000,
    });
  });
});
test("Batch检查", async ({ page }) => {
  // // 测试后端Batch设置状态与相应提示显示
  await test.step("正常", async () => {
    await page.goto("/qiandao");
    await expect(page.getByTestId("batch-error-tag")).not.toBeVisible();
  });
  await test.step("未开启", async () => {
    page.route(SettingsUrl, async (route) => {
      const json = 
        {
          batch: {
            enabled: false,
            maxRequests: 3,
            timeout: 3,
            maxBodySize: 0,
          },
        }
      ;
      await route.fulfill({ json });
    });
    // 刷新网页
    await page.reload();
    await expect(page.getByTestId("batch-error-tag")).toBeVisible();
  });
  await test.step("限制太低", async () => {
    page.route(SettingsUrl, async (route) => {
      const json = 
        {
          batch: {
            enabled: true,
            maxRequests: 3,
            timeout: 3,
            maxBodySize: 0,
          },
        }
      ;
      await route.fulfill({ json });
    });
    // 刷新网页
    await page.reload();
    await expect(page.getByTestId("batch-error-tag")).toBeVisible();
  });
  await test.step("恢复正常", async () => {
    await page.unroute(SettingsUrl);
    await page.reload();
    await expect(page.getByTestId("batch-error-tag")).not.toBeVisible();
  });
});

