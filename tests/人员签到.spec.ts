import { test, expect } from "@playwright/test";
import dayjs from "dayjs";

test("日期检测检查", async ({ page }) => {
  await page.goto("/qiandao");
  const today = dayjs().format("YYYY-MM-DD");
  const today_short = dayjs().format("-MM-DD");
  const yesterday_short = dayjs().subtract(1, "day").format("-MM-DD");
  const tomorrow_short = dayjs().add(1, "day").format("-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const tomorrow=dayjs().add(1, "day").format("YYYY-MM-DD");
  await test.step("是今天", async () => {
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(today);
    await expect(page.getByTestId("today-alert")).toBeVisible();
  });
  await test.step("是昨天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(yesterday).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(yesterday);
    // 不能fill，内容能塞进去，但是不会触发onChange事件
    await expect(page.getByTestId("past-alert")).toBeVisible();
  });
  await test.step("是明天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(tomorrow).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(tomorrow);
    await expect(page.getByTestId("future-alert")).toBeVisible();
  });
    await test.step("还是今天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(today_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(today);
    await expect(page.getByTestId("today-alert")).toBeVisible();
  });
});
