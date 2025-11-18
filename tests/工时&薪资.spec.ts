import { test, expect } from "@playwright/test";
import { gongshi_url } from "./constants";
test.describe("表格显示与筛选", () => {
  test("表格显示测试", async ({ page }) => {
    await page.goto(gongshi_url);
    await test.step("默认显示", async () => {
      await expect(page.getByTestId("un-salary-work-alert")).toBeVisible();
      await expect(page.getByTestId("row-id-0")).toContainText("qcuh2efmj1l7uk2");
      await expect(page.getByTestId("row-id-9")).toContainText("l7f914q8c414u7p");
    });
    await test.step("翻页", async () => {
      await page.getByRole("link", { name: "2" }).click();
      await expect(page.getByTestId("row-id-0")).toContainText("p5r3kyy7z5qhn41");
      await expect(page.getByTestId("row-id-9")).toContainText("y83yjv0yazo2f1g");
      await page.getByRole("link", { name: "1" }).click();
      await expect(page.getByTestId("row-id-0")).toContainText("qcuh2efmj1l7uk2");
      await expect(page.getByTestId("row-id-9")).toContainText("l7f914q8c414u7p");
    });
    await test.step("分页", async () => {
      await page.getByText("条/页").first().click();
      await page.getByRole("option", { name: "20 条/页" }).click();
      await expect(page.getByTestId("row-id-0")).toContainText("qcuh2efmj1l7uk2");
      await expect(page.getByTestId("row-id-19")).toContainText("y83yjv0yazo2f1g");
      await page.getByText("条/页").nth(1).first().click();
      await page.getByRole("option", { name: "10 条/页" }).click();
      await expect(page.getByTestId("row-id-0")).toContainText("qcuh2efmj1l7uk2");
      await expect(page.getByTestId("row-id-9")).toContainText("l7f914q8c414u7p");
    });
  });
  test("搜索测试", async ({ page }) => {
    await page.goto(gongshi_url);
    await page.getByRole("link", { name: "2" }).click();
    await test.step("单个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("王小余");
      await page.getByTitle("王小余").click();
      await page.getByTestId("py-search-button").click();
      await expect(page.getByTestId("row-name-0")).toContainText("王小余");
      await expect(page.getByRole("link", { name: "2" })).not.toBeVisible();
    });
    await test.step("多个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("马福娃");
      await page.getByTitle("马福娃").click();
      await page.getByTestId("py-search-button").click();
      await expect(page.getByTestId("row-name-0")).toContainText("马福娃");
      await expect(page.getByTestId("row-name-1")).toContainText("王小余");
    });
    await test.step("复原", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.getByTestId("py-search-button").click();
      await expect(page.getByTestId("row-id-0")).toContainText("qcuh2efmj1l7uk2");
      await expect(page.getByRole("link", { name: "2" })).toBeVisible();
    });
  });
});
test("筛选测试", async ({ page }) => {
  await page.goto(gongshi_url);
  await test.step("2025-11-12", async () => {
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-11");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-12");
    await page.getByRole("button", { name: "应 用" }).click();
    await page.getByTestId("row-id-0").click();
    await expect(page.getByTestId("row-month-张孝刚-0")).toContainText("2025-11");
  });
  await test.step("2025-09-10", async () => {
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-09");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-10");
    await page.getByRole("button", { name: "应 用" }).click();
    await page.getByTestId("row-id-0").click();
    await expect(page.getByTestId("row-month-张孝刚-0")).toContainText("2025-10"); //9月份没干活
    await page.getByTestId("row-month-张孝刚-0").click();
    await expect(page.getByTestId("row-day-张孝刚-1")).toContainText("2025-10-31"); //显示31号
  });
  await test.step("筛选持久化", async () => {
    await page.getByRole("link", { name: "人员签到" }).click();
    await expect(page.getByRole("heading", { name: "签到录入系统" })).toBeVisible();
    await page.getByRole("link", { name: "考勤记录" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("6cs1o88n514ic1b");
    await expect(page.getByRole("textbox", { name: "开始月份" })).toHaveValue("2025-09");
    await expect(page.getByRole("textbox", { name: "结束月份" })).toHaveValue("2025-10");
  });
});
