import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { AttendanceRecord_TableName, Backend_URL } from "./constants";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);

test("日期检测检查", async ({ page }) => {
  await page.goto("/qiandao");
  const today = dayjs().format("YYYY-MM-DD");
  const today_short = dayjs().format("-MM-DD");
  const yesterday_short = dayjs().subtract(1, "day").format("-MM-DD");
  const tomorrow_short = dayjs().add(1, "day").format("-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  await test.step("是今天", async () => {
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(today);
    await expect(page.getByTestId("today-alert")).toBeVisible();
  });
  await test.step("是昨天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(yesterday_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" })).toHaveValue(yesterday);
    // 不能fill，内容能塞进去，但是不会触发onChange事件
    await expect(page.getByTestId("past-alert")).toBeVisible();
  });
  await test.step("是明天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(tomorrow_short).click();
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

test("时间测试", async ({ page }) => {
  await page.goto("/qiandao");
  await test.step("时间约束", async () => {
    await page.getByRole("textbox", { name: "开始时间" }).click();
    await page.getByRole("textbox", { name: "开始时间" }).fill("23:00");
    await page.getByRole("button", { name: "确 定" }).click();
    await page.getByRole("textbox", { name: "结束时间" }).fill("23:30");
    await page.getByRole("button", { name: "确 定" }).click();
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("23:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
  });
  await test.step("时间加减与工时计算", async () => {
    await page.getByRole("textbox", { name: "开始时间" }).click();
    await page.getByRole("textbox", { name: "开始时间" }).fill("18:00");
    await page.getByRole("button", { name: "确 定" }).click();
    await page.getByRole("button", { name: "确 定" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("5.5小时");
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:00");
    await expect(page.getByTestId("time-difference")).toContainText("5小时");
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("22:30");
    await expect(page.getByTestId("time-difference")).toContainText("4.5小时");
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:00");
    await expect(page.getByTestId("time-difference")).toContainText("5小时");
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
    await expect(page.getByTestId("time-difference")).toContainText("5.5小时");
  });
  await test.step("快速工时", async () => {
    await page.getByTestId("hour-tooltip").hover();
    await expect(page.getByRole("tooltip", { name: "从7:00开始" })).toBeVisible();
    await page.getByTestId("hour-button-2").click();
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("07:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("09:00");
    await expect(page.getByTestId("time-difference")).toContainText("2小时");
    await page.getByTestId("hour-button-7.5").click();
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("07:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("14:30");
    await expect(page.getByTestId("time-difference")).toContainText("7.5小时");
  });
});

test("录入校验", async ({ page }) => {
  await page.goto("/qiandao");
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  await page.getByTestId("py-search-select").click();
  await page.getByTitle("李红红").click();
  // 这里要选择直接能看到的，不然报错，而且会显示为菜单未弹出误导人。
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("三轮车司机").click();
  await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  await expect(page.getByTestId("can-input-alert")).toBeVisible();
  await page.getByTestId("work-type-select").hover();
  await page.getByTestId("clear-icon").click();
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  await page.getByTestId("py-search-select").click();
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
});

test.describe("一套龙", async () => {
  const today = dayjs().format("YYYY-MM-DD");
  test.afterEach(async ({ page }) => {
    const records = await pb.collection(AttendanceRecord_TableName).getFullList({
      filter: 'created > "2025-11-10"',
    });
    const ids = records.map((record) => record.id);
    if (ids.length === 0) return; //空数据发batch也会报错
    const batch = pb.createBatch();
    for (const id of ids) {
      batch.collection(AttendanceRecord_TableName).delete(id);
    }
    const result = await batch.send();
    expect(result.every((r) => r.status === 204)).toBe(true); //body是null
  });
  test("一套龙", async ({ page }) => {
    await page.goto("/qiandao");
    await expect(page.getByTestId("today-alert")).toBeVisible();
    let names;
    await test.step("录入", async () => {
      await page.getByTestId("py-search-select").click();
      await page.getByTitle("李红红").click();
      await page.getByTitle("张着萍").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("基础").click();
      await page.getByTestId("hour-button-2.5").click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();

      await page.getByTestId("py-search-select").click();
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.getByTitle("尤响林").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      await page.getByTestId("hour-button-5").click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();

      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-status-0")).toContainText("已签退");
      // await expect(page.getByTestId("row-in-0")).toContainText("2025-11-17 07:00:00");
      // await expect(page.getByTestId("row-out-0")).toContainText("2025-11-17 12:00:00");
      await expect(page.getByTestId("row-in-0")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-0")).toContainText(today + " 12:00:00");
      await expect(page.getByTestId("row-time-0")).toContainText("5");
      await expect(page.getByTestId("row-work-0")).toContainText("三轮车司机");

      await page.getByTestId("py-search-select").click();
      await page.getByTitle("尤响林").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      await page.getByRole("textbox", { name: "开始时间" }).fill("6:00");
      await page.getByRole("textbox", { name: "结束时间" }).fill("8:00");
      await expect(page.getByTestId("overlap-alert")).toBeVisible();
      await expect(page.getByTestId("submit-button")).toBeDisabled();
      await page.getByRole("textbox", { name: "开始时间" }).fill("8:00");
      await page.getByRole("textbox", { name: "结束时间" }).fill("13:00");
      await expect(page.getByTestId("overlap-alert")).toBeVisible();

      const first_name = await page.getByTestId("row-name-1").textContent();
      const second_name = await page.getByTestId("row-name-2").textContent();
      names = [first_name, second_name]; //"张着萍"和"李红红"

      await expect(page.getByTestId("row-name-1")).toContainText(first_name);
      await expect(page.getByTestId("row-status-1")).toContainText("已签退");
      await expect(page.getByTestId("row-in-1")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-1")).toContainText(today + " 09:30:00");
      await expect(page.getByTestId("row-time-1")).toContainText("2.5");
      await expect(page.getByTestId("row-work-1")).toContainText("基础");

      await expect(page.getByTestId("row-name-2")).toContainText(second_name);
      await expect(page.getByTestId("row-status-2")).toContainText("已签退");
      await expect(page.getByTestId("row-in-1")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-1")).toContainText(today + " 09:30:00");
      await expect(page.getByTestId("row-time-2")).toContainText("2.5");
      await expect(page.getByTestId("row-work-2")).toContainText("基础");
    });
    await test.step("编辑", async () => {
      await page.getByTestId("edit-button-1").click();
      await page.locator("#workTime").hover();
      await page.getByRole("button", { name: "Increase Value" }).click();
      await page.getByTestId("row-work-1").getByText("基础").click();
      await page.getByTitle("司机").nth(3).click();
      await page.getByTestId("save-button-1").click();
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      await expect(page.getByTestId("row-work-1")).toContainText("司机");
      await page.getByTestId("edit-button-1").click();
      await page.getByTestId("cancel-button-1").click();
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      await expect(page.getByTestId("row-work-1")).toContainText("司机");
    });
    await test.step("删除", async () => {
      await page.getByTestId("delete-button-1").click();
      await page.getByRole("button", { name: "删 除" }).click();
      await expect(page.getByText(names[0])).not.toBeVisible();
    });
    await test.step("批量删除", async () => {
      // await page.getByTestId("row-checkbox-0").check();
      await page.getByTestId("row-checkbox-0").locator("label").check();
      await page.getByTestId("row-checkbox-1").locator("label").check();
      await expect(page.getByTestId("delete-button-1")).toBeDisabled();
      await page.getByTestId("batch-delete-button").click();
      await page.getByRole("button", { name: "确 定" }).click();
      await page.getByRole("img", { name: "暂无数据" }).click();
    });
  });
});
