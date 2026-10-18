import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import {
  API_URL,
  appUrl,
  AttendanceRecord_TableName,
  gongshi_url,
  qiandao_url,
  SalaryType_TableName,
} from "./constants";
import { pb, TestDB } from "./helpers/pb";

/**
 * 异常与边界:正常流程之外的"会不会白屏 / 会不会写错数据"。
 * 这些场景 E2E 主流程覆盖不到,但恰恰是线上最容易出问题的地方。
 */
const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

test("未知路由显示 404,而不是白屏", async ({ page }) => {
  await page.goto(appUrl("not-exist"));
  // refine 的 ErrorComponent 文案随语言变化,这里只要求"有明确的错误页"
  await expect(page.getByText(/404|不存在|Sorry/i).first()).toBeVisible();
});

test("列表接口 500 时页面不白屏,基础框架仍可用", async ({ page }) => {
  await page.route(`${API_URL}/collections/attendance_record_test/records*`, (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto(appUrl("attendance-record"));
  // 契约:列表查询失败时该页表现为"0 行的空表"(默认 loading=undefined → 空数据),
  // 而不是错误占位页。若页面将来改成显示错误态/骨架屏,本用例的 0 行断言会失明,
  // 此时必须把这里的断言改为跟随新契约,而不是当作失败修掉。
  await expect(page.getByTestId("help-alert")).toBeVisible();
  await expect(page.getByTestId("add-button")).toBeVisible();
  await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(0);
});

test("未来日期: 红色提示但允许录入(补录场景)", async ({ page }) => {
  await db.ensureBaseWork();
  const worker = await db.seedWorker("测试未来");
  const work = await db.seedWorkType("测试未来工种");
  const tomorrow = dayjs().add(1, "day");
  const tomorrowText = tomorrow.format("YYYY-MM-DD");

  await page.goto(appUrl(qiandao_url));
  const dateInput = page.getByRole("textbox", { name: "请选择日期" });
  await dateInput.click();
  // 明天可能跨月:先 fill 让面板跳到目标月,再点日期格
  await dateInput.fill(tomorrowText);
  await page.getByTitle(tomorrow.format("-MM-DD")).click();
  await expect(page.getByTestId("future-alert")).toContainText("未来日期");

  await page.getByTestId("py-search-select").first().click();
  await page.keyboard.type("未来");
  await page.getByTitle(worker.name).click();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name).click();
  await page.getByTestId("hour-button-5").click();
  // 产品规则:未来日期只提示、不拦截
  await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  await page.getByTestId("submit-button").click();
  await expect(page.getByText("成功创建")).toBeVisible();

  const records = await pb.collection(AttendanceRecord_TableName).getFullList({
    filter: `worker_id = "${worker.id}" && work = "${work.id}"`,
  });
  expect(records).toHaveLength(1);
  expect(records[0].work_date).toBe(tomorrowText);
  expect(records[0].work_minutes).toBe(300);
});

test("同人同天同工种重复录入: 库里只留一条且工时累加", async ({ page }) => {
  await db.ensureBaseWork();
  const worker = await db.seedWorker("测试合并");
  const work = await db.seedWorkType("测试合并工种");
  const today = dayjs().format("YYYY-MM-DD");

  await page.goto(appUrl(qiandao_url));
  const inputOnce = async (hours: "2" | "5") => {
    await page.getByTestId("py-search-select").first().click();
    await page.keyboard.type("合并");
    await page.getByTitle(worker.name, { exact: true }).click();
    await page.getByTestId("work-type-select").click();
    await page.getByTitle(work.name, { exact: true }).click();
    await page.getByTestId(`hour-button-${hours}`).click();
  };

  await inputOnce("2");
  await page.getByTestId("submit-button").click();
  await expect(page.getByText("成功创建")).toBeVisible();

  await inputOnce("5");
  // 第二次录入前应提示自动合并(2+5=7)
  await expect(page.getByTestId("merge-alert")).toContainText("自动合并为7小时");
  await page.getByTestId("submit-button").click();
  await expect(page.getByTestId("row-time-0")).toContainText("7");

  const records = await pb.collection(AttendanceRecord_TableName).getFullList({
    filter: `worker_id = "${worker.id}" && work = "${work.id}" && work_date = "${today}"`,
  });
  expect(records, "同键只应有一条记录").toHaveLength(1);
  expect(records[0].work_minutes).toBe(420);
});

test("删除薪资条目后,工时页回退到基础价", async ({ page }) => {
  await db.ensureBaseWork(); // 基础时薪 10
  const worker = await db.seedWorker("测试回退");
  const work = await db.seedWorkType("测试回退工种");
  const salary = await db.seedSalary({
    workerId: worker.id,
    workTypeId: work.id,
    salaryNum: 20,
  });
  const cur = dayjs().format("YYYY-MM");
  await db.seedRecord({
    worker_id: worker.id,
    work: work.id,
    work_date: `${cur}-01`,
    work_minutes: 600,
  });

  const monthRow = () =>
    page.getByTestId(`row-month-${worker.name}-0`).locator("xpath=ancestor::tr[1]");

  await page.goto(appUrl(gongshi_url));
  await page.getByTestId("row-id-0").click();
  // 10h × 20 = 200
  await expect(monthRow()).toContainText("200");

  // 删掉专属时薪,薪资键应回退到"基础"(10)
  await pb.collection(SalaryType_TableName).delete(salary.id);
  await page.reload();
  await page.getByTestId("row-id-0").click();
  await expect(monthRow()).toContainText("100");
});
