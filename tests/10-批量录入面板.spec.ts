import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { API_URL, appUrl, AttendanceRecord_TableName, qiandao_url } from "./constants";
import { pb, TestDB } from "./helpers/pb";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

/**
 * 批量录入面板的"批量"特性:一条龙用例只覆盖了多选 2 人的顺路场景,
 * 这里专攻:
 *  1. 多标签(≥3 人)一次批量创建;
 *  2. 同一批里"合并 + 新建"混合(merge-alert 只列出已有记录的人);
 *  3. 批量提交失败时保留输入、可直接重试(且重试不产生半途数据)。
 * 提交后不用 UI 断言行内容,直接查库核对分钟数——UI 表格绕开了排序不稳定问题。
 */
const BATCH_URL = `${API_URL}/batch`;

/** 依次输入拼音并点选多人(antd 多选 Select 点选项后自动清空搜索词,可继续输入) */
async function pickWorkers(page: import("@playwright/test").Page, filters: string[], titles: string[]) {
  await page.getByTestId("py-search-select").first().click();
  for (let i = 0; i < filters.length; i++) {
    await page.keyboard.type(filters[i]);
    await page.getByTitle(titles[i], { exact: true }).click();
  }
}

test("多标签批量创建: 3人一次提交全部建库,成功后面板清空", async ({ page }) => {
  await db.ensureBaseWork();
  const workers = await db.seedWorkers(["测试批一", "测试批二", "测试批三"]);
  const work = await db.seedWorkType("测试批量工种");
  const today = dayjs().format("YYYY-MM-DD");

  await page.goto(appUrl(qiandao_url));
  await pickWorkers(page, ["批一", "批二", "批三"], workers.map((w) => w.name));
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name, { exact: true }).click();
  await page.getByTestId("hour-button-8").click(); // 8h = 480 分钟
  // 3 人 + 工作 + 工时齐全后是"可以录入"(没人有合并提示,不能被误判为禁用)
  await expect(page.getByTestId("can-input-alert")).toBeVisible();
  await page.getByTestId("submit-button").click();
  await expect(page.getByText("成功创建")).toBeVisible();

  const records = await pb.collection(AttendanceRecord_TableName).getFullList();
  expect(records, "3 条记录全部入库").toHaveLength(3);
  for (const w of workers) {
    const rec = records.find((r) => r.worker_id === w.id);
    expect(rec, `${w.name} 的记录存在`).toBeTruthy();
    expect(rec!.work_minutes).toBe(480);
    expect(rec!.work_date).toBe(today);
  }
  // 成功后人员/工作被清空,回到"请选择考勤人员"
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
});

test("混合批量: 同批既有漏录入又有已录入,merge-alert 只报合并的人", async ({ page }) => {
  await db.ensureBaseWork();
  const workerA = await db.seedWorker("测试并甲");
  const workerB = await db.seedWorker("测试并乙");
  const work = await db.seedWorkType("测试并工种");
  // 甲已有当日记录(5h);乙没有
  await db.seedRecord({
    worker_id: workerA.id,
    work: work.id,
    work_date: dayjs().format("YYYY-MM-DD"),
    work_minutes: 300,
  });

  await page.goto(appUrl(qiandao_url));
  await pickWorkers(page, ["并甲", "并乙"], [workerA.name, workerB.name]);
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name, { exact: true }).click();
  await page.getByTestId("hour-button-8").click(); // 8h = 480 分钟

  // merge-alert 只列出甲(5h + 8h = 13h),不出现乙
  const alert = page.getByTestId("merge-alert");
  await expect(alert).toContainText("测试并甲，当天已有测试并工种记录（5小时），录入后自动合并为13小时");
  await expect(alert, "未录入的人不应出现在合并提示里").not.toContainText("测试并乙");
  await page.getByTestId("submit-button").click();
  await expect(page.getByText("成功创建")).toBeVisible();

  // 库里: 甲的记录在原条上叠加(仍只有一条),乙新起一条
  const records = await pb.collection(AttendanceRecord_TableName).getFullList();
  expect(records).toHaveLength(2);
  const a = records.find((r) => r.worker_id === workerA.id)!;
  const b = records.find((r) => r.worker_id === workerB.id)!;
  expect(a.work_minutes).toBe(780); // 300 + 480
  expect(b.work_minutes).toBe(480);
});

test("合并后恰好 24 小时: 仍可录入,边界不含等于", async ({ page }) => {
  await db.ensureBaseWork();
  const worker = await db.seedWorker("测试满时");
  const work = await db.seedWorkType("测试满时工种");
  // 已有 16h,再录 8h 恰好 24h
  await db.seedRecord({
    worker_id: worker.id,
    work: work.id,
    work_date: dayjs().format("YYYY-MM-DD"),
    work_minutes: 960,
  });

  await page.goto(appUrl(qiandao_url));
  await pickWorkers(page, ["满时"], [worker.name]);
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name, { exact: true }).click();
  await page.getByTestId("hour-button-8").click();

  await expect(page.getByTestId("merge-alert")).toContainText("录入后自动合并为24小时");
  await expect(page.getByTestId("submit-button")).toBeEnabled();
  await page.getByTestId("submit-button").click();

  // 这条走的是"更新"而不是"新建",成功通知文案与创建不同,直接查库更可靠
  await expect
    .poll(
      async () => {
        const rows = await pb.collection(AttendanceRecord_TableName).getFullList();
        return rows.length === 1 ? rows[0].work_minutes : null;
      },
      { timeout: 10_000 },
    )
    .toBe(1440);

  const records = await pb.collection(AttendanceRecord_TableName).getFullList();
  expect(records).toHaveLength(1);
  expect(records[0].work_minutes).toBe(1440);
});

test("合并后超过 24 小时: 禁用录入并提示超限,库里不变", async ({ page }) => {
  await db.ensureBaseWork();
  const worker = await db.seedWorker("测试超时");
  const work = await db.seedWorkType("测试超时工种");
  // 已有 20h,再录 8h 会到 28h
  await db.seedRecord({
    worker_id: worker.id,
    work: work.id,
    work_date: dayjs().format("YYYY-MM-DD"),
    work_minutes: 1200,
  });

  await page.goto(appUrl(qiandao_url));
  await pickWorkers(page, ["超时"], [worker.name]);
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name, { exact: true }).click();
  await page.getByTestId("hour-button-8").click();

  const alert = page.getByTestId("over-limit-alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("当天已有测试超时工种记录（20小时）");
  await expect(alert).toContainText("将达到28小时");
  await expect(alert).toContainText("超过单日 24 小时上限");
  await expect(page.getByTestId("submit-button")).toBeDisabled();

  // 禁用状态下不应产生任何写入
  const records = await pb.collection(AttendanceRecord_TableName).getFullList();
  expect(records).toHaveLength(1);
  expect(records[0].work_minutes).toBe(1200);
});

test("批量提交失败: 输入保留可重试,重试成功后才建库", async ({ page }) => {
  await db.ensureBaseWork();
  const workers = await db.seedWorkers(["测试试一", "测试试二"]);
  const work = await db.seedWorkType("测试重试工种");

  await page.goto(appUrl(qiandao_url));
  await pickWorkers(page, ["试一", "试二"], workers.map((w) => w.name));
  await page.getByTestId("work-type-select").click();
  await page.getByTitle(work.name, { exact: true }).click();
  await page.getByTestId("hour-button-2").click(); // 2h = 120 分钟

  // 拦截批量提交接口(徽 createMany 走 PB 的 /api/batch)
  await page.route(BATCH_URL, (route) => route.fulfill({ status: 500 }));
  await page.getByTestId("submit-button").click();
  // 失败必须弹出错误通知(不同语言文案不同,只断通知出现)
  await expect(page.locator(".ant-notification-notice-error")).toBeVisible({ timeout: 10_000 });
  // 失败后输入保留:区域仍是可提交状态(不是"请选择考勤人员")
  await expect(page.getByTestId("no-worker-alert")).not.toBeVisible();

  // 关右上角通知,避免挡住面板控件
  await expect(async () => {
    const notices = page.locator(".ant-notification-notice");
    if ((await notices.count()) > 0) {
      await page.locator(".ant-notification-notice-close").first().click({ timeout: 3000 });
    }
    expect(await notices.count()).toBe(0);
  }).toPass({ timeout: 10_000 });

  // 解除拦截后直接重试(不重选人/不重填工时)
  await page.unroute(BATCH_URL);
  await page.getByTestId("submit-button").click();
  await expect(page.getByText("成功创建")).toBeVisible();

  const records = await pb.collection(AttendanceRecord_TableName).getFullList();
  expect(records, "重试成功且不半途重复: 每人恰好一条").toHaveLength(2);
  for (const w of workers) {
    const rec = records.find((r) => r.worker_id === w.id);
    expect(rec!.work_minutes).toBe(120);
  }
});
