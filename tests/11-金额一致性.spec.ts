import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl, gongshi_url } from "./constants";
import { TestDB } from "./helpers/pb";
import { applyMonthRange, pickMonthRange } from "./helpers/ui";
import { exportAndRead, openExportPopover, rowsOf } from "./helpers/export";

/**
 * 跨页金额一致性:同一份数据在
 *   工时&薪资页(月合计) / Excel 月 sheet / 统计页(个人收入)
 * 三处必须指向同一个数。
 *
 * 种子刻意用"非整除"金额:5 条 × 20 分钟 @20 元
 *   = 100 分钟 = 1.6666…h × 20 = 33.3333… 元(两位是 33.33)
 * 整除数据(10h×20)无法暴露取整口径漂移,只有非整除才测得出来。
 *
 * 比较时统一取两位:三处显示精度本来就不同(页面/导出是全精度 Decimal,
 * 统计页已取两位),这里只验证"是同一笔钱",不锁定显示格式——格式口径是
 * 独立决策,不该由这条用例替它做主。
 */
const db = new TestDB();

const NAME = "测试一致";
const WORK = "测试一致工种";
const MINUTES = 20;
const COUNT = 5;
const RATE = 20;
/** 5 × 20 分钟 = 100 分钟 → 33.3333… 元 */
const EXPECTED = Number(((COUNT * MINUTES * RATE) / 60).toFixed(2));

test.beforeEach(async () => {
  await db.ensureBaseWork();
  const worker = await db.seedWorker(NAME);
  const work = await db.seedWorkType(WORK);
  await db.seedSalary({ workerId: worker.id, workTypeId: work.id, salaryNum: RATE });
  const cur = dayjs().format("YYYY-MM");
  await db.seedRecords(
    Array.from({ length: COUNT }, (_, i) => ({
      worker_id: worker.id,
      work: work.id,
      work_date: `${cur}-${String(i + 1).padStart(2, "0")}`,
      work_minutes: MINUTES,
    })),
  );
});

test.afterEach(async () => {
  await db.cleanup();
});

/** 从任意文本里取出金额并统一到两位 */
const money = (value: string | number | null | undefined): number => {
  const text = String(value ?? "").replace(/[^\d.-]/g, "");
  return Number(Number(text).toFixed(2));
};

test("月合计在 工时页 / Excel / 统计页 三处一致", async ({ page }) => {
  const cur = dayjs().format("YYYY-MM");
  expect(EXPECTED, "种子应产生非整除金额").toBe(33.33);

  const pageCell = await test.step("工时&薪资页: 展开工人读月行薪资", async () => {
    await page.goto(appUrl(gongshi_url));
    await applyMonthRange(page, cur, cur);
    // 先按姓名筛选:不依赖"第一个工人就是自己",也避开上一个用例可能残留的数据
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("一致");
    await page.getByTitle(NAME, { exact: true }).click();
    await page.getByTestId("py-search-button").click();
    await expect(page.locator('[data-testid^="row-name-"]')).toHaveCount(1);
    await page.getByTestId("row-id-0").click();
    const monthRow = page.getByTestId(`row-month-${NAME}-0`).locator("xpath=ancestor::tr[1]");
    await expect(monthRow).toContainText(NAME);
    const text = (await monthRow.locator("td").last().textContent()) ?? "";
    expect(money(text), `页面月合计: ${text}`).toBe(EXPECTED);
    return text;
  });

  const excelCell = await test.step("Excel 月 sheet", async () => {
    await openExportPopover(page, cur);
    const wb = await exportAndRead(page);
    const rows = rowsOf(wb, "工时(月)");
    const row = rows.find((r) => r["工人"] === NAME);
    expect(row, "导出里应有该工人的月行").toBeTruthy();
    expect(money(row!["薪资"]), `Excel 月薪资: ${row!["薪资"]}`).toBe(EXPECTED);
    return row!["薪资"];
  });

  await test.step("统计页个人收入", async () => {
    await page.goto(appUrl("tongji"));
    await pickMonthRange(page, cur, cur, "起始月", "截止月");
    await page.getByRole("tab", { name: "个人分析" }).click();
    // 显式选人:默认选的是"出勤最多的人",不能假定就是本次种子的人
    await page.getByTestId("tj-person-select").click();
    // 限定在下拉层里点:选中值本身也是同文案,全局找会命中两个
    await page
      .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
      .getByText(`${NAME}(出勤 ${COUNT} 天)`)
      .click();
    const cell = page.getByTestId("tj-p-salary");
    await expect(cell).toBeVisible();
    // 等数字渲染出来(统计页要等记录与薪资两个请求都回来)
    await expect
      .poll(async () => money(await cell.textContent()), { timeout: 10_000 })
      .toBe(EXPECTED);
  });

  // 失败时把三处原始值打出来,便于判断是"哪一处算错了"
  test.info().annotations.push({
    type: "三处原始值",
    description: `页面=${pageCell} / Excel=${excelCell} / 期望=${EXPECTED}`,
  });
});
