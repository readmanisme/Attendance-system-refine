import { test, expect } from "@playwright/test";

test("所有帮助可见，且点击关闭或遮罩后关闭", async ({ page }) => {
  await page.goto("/qiandao");
  // 测试tooltip显示
  await page.getByTestId("help-button").hover();
  await expect(page.getByRole("tooltip", { name: "显示当前页面的帮助" })).toBeVisible();
  // 测试点击关闭
  await page.getByTestId("help-button").click();
  await expect(page.getByRole("heading", { name: "人员签到页面" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("heading", { name: "人员签到页面" })).not.toBeVisible();
  //测试点击遮罩
  await page.getByTestId("help-button").click();
  await expect(page.getByRole("heading", { name: "人员签到页面" })).toBeVisible();
  await page.locator(".ant-drawer-mask").click();
  await expect(page.getByRole("heading", { name: "人员签到页面" })).not.toBeVisible();
  // 测试所有页面
  const pages = ["考勤记录", "人员管理", "工作管理", "薪资设置", "工时&薪资显示"];
  for (let i = 0; i < pages.length; i++) {
    await page.getByRole("link", { name: pages[i] }).click();
    await page.getByTestId("help-button").click();
    await expect(page.getByRole("heading", { name: pages[i] + "页面" })).toBeVisible();
    await page.getByRole("button", { name: "关闭" }).click();
    await expect(page.getByRole("heading", { name: pages[i] + "页面" })).not.toBeVisible();
  }
});
