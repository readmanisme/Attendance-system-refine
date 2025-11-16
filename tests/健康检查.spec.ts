import { API_URL } from "./constants";
import { test, expect } from "@playwright/test";
const HealthUrl = API_URL + "/health";

test("健康检查", async ({ page }) => {
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
    await expect(page.getByTestId("Error-alert"), "后端异常Alert").not.toBeVisible({ timeout: 11_000 });
  });
});
