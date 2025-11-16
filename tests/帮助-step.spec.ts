import { test, expect } from "@playwright/test";

test.describe("帮助功能测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/qiandao"); //beforeEach为每个test执行，但step不执行
  });

  test("应正确显示和隐藏帮助内容", async ({ page }) => {
    await test.step("验证帮助按钮的tooltip", async () => {
      await page.getByTestId("help-button").hover();
      await expect(
        page.getByRole("tooltip", { name: "显示当前页面的帮助" }),
        "应显示帮助按钮的tooltip"
      ).toBeVisible();
    });
    await test.step("点击按钮显示帮助内容", async () => {
      await page.getByTestId("help-button").click();
      await expect(page.getByText("人员签到 帮助"), "显示帮助标题").toBeVisible();
      await expect(
        page.getByRole("heading", { name: "人员签到页面" }),
        "显示帮助内容"
      ).toBeVisible();
    });

    await test.step("通过关闭按钮应能关闭帮助", async () => {
      // await page.getByTestId("help-button").click();
      // await expect(
      //   page.getByRole("heading", { name: "人员签到页面" }),
      //   "应显示人员签到帮助内容"
      // ).toBeVisible();

      await page.getByRole("button", { name: "关闭" }).click();
      await expect(
        page.getByRole("heading", { name: "人员签到页面" }),
        "关闭后应隐藏帮助内容"
      ).not.toBeVisible();
    });

    await test.step("点击遮罩应能关闭帮助", async () => {
      await page.getByTestId("help-button").click();
      await expect(
        page.getByRole("heading", { name: "人员签到页面" }),
        "打开后显示帮助内容"
      ).toBeVisible();

      await page.locator(".ant-drawer-mask").click();
      await expect(
        page.getByRole("heading", { name: "人员签到页面" }),
        "点击遮罩后应隐藏帮助内容"
      ).not.toBeVisible();
    });
  });

  test("所有页面的帮助功能应正常工作", async ({ page }) => {
    const pages = ["考勤记录", "人员管理", "工作管理", "薪资设置", "工时&薪资显示"];

    for (const pageName of pages) {
      await test.step(`测试 ${pageName} 页面的帮助功能`, async () => {
        await page.getByRole("link", { name: pageName }).click();
        await page.getByTestId("help-button").click();

        await expect(
          page.getByRole("heading", { name: `${pageName}页面` }),
          `应显示${pageName}页面的帮助标题`
        ).toBeVisible();

        await page.getByRole("button", { name: "关闭" }).click();
        await expect(
          page.getByRole("heading", { name: `${pageName}页面` }),
          `关闭后应隐藏${pageName}页面的帮助内容`
        ).not.toBeVisible();
      });
    }
  });
});
