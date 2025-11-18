import { test, expect } from "@playwright/test";
import { AttendanceRecord_TableName, Backend_URL, attendance_record_url } from "./constants";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);
import dayjs from "dayjs";

test("搜索测试", async ({ page }) => {
  await page.goto(attendance_record_url);
  const mouth = dayjs().format("YYYY-MM");
  const next_mouth = dayjs().add(1, "month").format("YYYY-MM");
  await test.step("时间", async () => {
    await expect(page.getByRole("textbox", { name: "开始月份" })).toHaveValue(mouth);
    await expect(page.getByRole("textbox", { name: "结束月份" })).toHaveValue(next_mouth);
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-11");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-12");
    await page.getByRole("button", { name: "应 用" }).click();
  });
  await test.step("单个", async () => {
    await page.getByRole("link", { name: "2" }).click();
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("张孝刚");
    await page.getByTitle("张孝刚").click();
    await page.getByTestId("py-search-button").click();
    await expect(page.getByTestId("row-name-5")).toContainText("张孝刚");
    await expect(page.getByTestId("row-id-5")).toContainText("1yv9h9tk9j24f93");
    await expect(page.getByRole("link", { name: "2" })).not.toBeVisible();
  });
  await test.step("多个", async () => {
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("张着萍");
    await page.getByTitle("张着萍").click();
    await page.getByTestId("py-search-button").click();
    await expect(page.getByTestId("row-id-1")).toContainText("um7g1d5c35208ek");
    await expect(page.getByTestId("row-id-9")).toContainText("1yv9h9tk9j24f93");
  });
  await test.step("复原", async () => {
    await page.getByTestId("py-search-select").click();
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.getByTestId("py-search-button").click();
    await expect(page.getByTestId("row-id-2")).toContainText("u4924fv43uqsx16");
    await expect(page.getByTestId("row-name-2")).toContainText("刘旭堂");
  });
});
test("表格显示测试", async ({ page }) => {
  await page.goto(attendance_record_url);
  await page.getByRole("textbox", { name: "开始月份" }).fill("2025-11");
  await page.getByRole("textbox", { name: "结束月份" }).fill("2025-12");
  await page.getByRole("button", { name: "应 用" }).click();
  await test.step("默认显示", async () => {
    await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
    await expect(page.getByTestId("row-id-9")).toContainText("88mclc4399u26xy");
  });
  await test.step("翻页", async () => {
    await page.getByRole("link", { name: "2" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("tu96q714a96x8j9");
    await expect(page.getByTestId("row-id-9")).toContainText("pcyur9v7lwj772s");
    await page.getByRole("link", { name: "1" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
    await expect(page.getByTestId("row-id-9")).toContainText("88mclc4399u26xy");
  });
  await test.step("分页", async () => {
    await page.getByText("条/页").first().click();
    await page.getByRole("option", { name: "20 条/页" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
    await expect(page.getByTestId("row-id-19")).toContainText("pcyur9v7lwj772s");
    await page.getByText("条/页").nth(1).first().click();
    await page.getByRole("option", { name: "10 条/页" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
    await expect(page.getByTestId("row-id-9")).toContainText("88mclc4399u26xy");
  });
});

test("筛选测试", async ({ page }) => {
  await page.goto(attendance_record_url);
  await test.step("2025-11-12", async () => {
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-11");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-12");
    await page.getByRole("button", { name: "应 用" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
  });
  await test.step("2025-09-10", async () => {
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-09");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-10");
    await page.getByRole("button", { name: "应 用" }).click();
    await expect(page.getByTestId("row-id-0")).toContainText("6cs1o88n514ic1b");
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
test.describe("批量删除", () => {
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
  test.beforeEach(async ({ page }) => {
    const batch = pb.createBatch();
    batch.collection(AttendanceRecord_TableName).create({
      worker_id: "7532s7t15y9r3c5",
      check_in: "2025-11-08 10:00:00.123Z", // +8小时就是本地时区
      check_out: "2025-11-08 15:00:00.123Z",
      work: "1tds1872f8v6866",
    });
    batch.collection(AttendanceRecord_TableName).create({
      worker_id: "q44da53d6838651",
      check_in: "2025-11-08 11:00:00.123Z",
      check_out: "2025-11-08 15:00:00.123Z",
      work: "1tds1872f8v6866",
    });
    batch.collection(AttendanceRecord_TableName).create({
      worker_id: "85yb02ib29u40up",
      check_in: "2025-11-08 12:00:00.123Z",
      check_out: "2025-11-08 15:00:00.123Z",
      work: "1tds1872f8v6866",
    });
    const result = await batch.send();
    expect(result.every((r) => r.status === 200)).toBe(true);
  });
  test("编辑与删除", async ({ page }) => {
    await page.goto(attendance_record_url);
    await page.getByRole("textbox", { name: "开始月份" }).fill("2025-11");
    await page.getByRole("textbox", { name: "结束月份" }).fill("2025-12");
    await page.getByRole("button", { name: "应 用" }).click();

    await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
    await expect(page.getByTestId("row-name-1")).toContainText("张着萍");
    await expect(page.getByTestId("row-name-2")).toContainText("李红红");

    await test.step("编辑", async () => {
      await page.getByTestId("edit-button-1").click();
      await expect(page.getByTestId("worker-name")).toContainText("张着萍");
      await expect(page.getByTestId("work-time")).toHaveValue("4.0");
      await expect(page.getByText("基础")).toBeVisible();
      //   19-23点
      await page.getByTestId("check-in-time").click();
      await page.getByTestId("check-in-time").fill("2025-11-08 18:00");
      await page.getByRole("button", { name: "确 定" }).click();
      await expect(page.getByTestId("work-time")).toHaveValue("5.0");

      await page.getByTestId("check-out-time").click();
      await page.getByTestId("check-out-time").fill("2025-11-08 17:00");
      await page.getByRole("button", { name: "确 定" }).click();
      await expect(page.getByText("签出时间必须晚于签到时间，已自动调整。")).toBeVisible();
      await expect(page.getByTestId("check-out-time")).toHaveValue("2025-11-08 19:00");
      await expect(page.getByTestId("work-time")).toHaveValue("1.0");

      await page.getByTestId("check-in-time").click();
      await page.getByTestId("check-in-time").fill("2025-11-08 20:00");
      await page.getByRole("button", { name: "确 定" }).nth(0).click();//out的选择页虽然看不见，但是元素还存在
      await expect(page.getByText("签出时间必须晚于签到时间，已自动调整。").nth(1)).toBeVisible(); //上一个提示还没有消失？
      await expect(page.getByTestId("check-out-time")).toHaveValue("2025-11-08 21:00");
      await expect(page.getByTestId("work-time")).toHaveValue("1.0");

      await page.getByTestId("check-in-time").click();
      await page.getByTestId("check-in-time").fill("2025-11-09 20:00");
      await page.getByRole("button", { name: "确 定" }).nth(0).click();
      await expect(page.getByTestId("check-out-time")).toHaveValue("2025-11-09 21:00");

      await page.getByTestId("check-out-time").click();
      await page.getByTestId("check-out-time").fill("2025-11-10 17:00");
      await expect(page.getByRole("button", { name: "确 定" }).nth(0)).toBeDisabled();//这会又是0了？？？

      await page.getByTestId("work-type").click();
      await page.getByTitle("三轮车司机").click();
      await page.getByRole("button", { name: "save 保存" }).click();

      await expect(page.getByTestId("row-in-0")).toContainText("2025-11-08 20:00:00");
      await expect(page.getByTestId("row-out-0")).toContainText("2025-11-09 21:00:00");
      await expect(page.getByTestId("row-num-0")).toContainText("1");
      await expect(page.getByTestId("row-work-0")).toContainText("三轮车司机");
    //   修改之后上班时间是最早的，随意变成第一个呢
    });

    await test.step("删除", async () => {
      await page.getByTestId("delete-button-0").click();
      await page.getByRole("button", { name: "删 除" }).click();
    //   await expect(page.getByText("尤响林")).not.toBeVisible();
    //   await expect(page.getByText("张着萍")).not.toBeVisible(); //上面改了之后变了
    await expect(page.getByTestId("row-name-0")).toContainText("尤响林"); //张着萍下面还有记录所以上面那个会报错
    });
    await test.step("批量删除", async () => {
      // await page.getByTestId("row-checkbox-0").check();
      await page.getByTestId("row-checkbox-0").locator("label").check();
      await page.getByTestId("row-checkbox-1").locator("label").check();
      await expect(page.getByTestId("delete-button-1")).toBeDisabled();
      await page.getByTestId("batch-delete-button").click();
      await page.getByRole("button", { name: "确 定" }).click();
      await expect(page.getByTestId("row-id-0")).toContainText("059h96g3r5so341");
    });
  });
});
