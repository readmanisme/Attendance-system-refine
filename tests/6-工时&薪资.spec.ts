import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl, gongshi_url } from "./constants";
import { TestDB } from "./helpers/pb";
import { applyMonthRange, clearPySearchSelect, setPageSize } from "./helpers/ui";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

/**
 * 注入"测试老张/测试司机"整月两月的考勤数据(时薪20):
 * - 当前月: 1~4日各10小时 + 5日5小时 (合计45小时)
 * - 上个月: 20日10小时 + 21日5小时 (合计15小时)
 */
async function seed老张小时数据() {
  await db.ensureBaseWork();
  const worker = await db.seedWorker("测试老张");
  const work = await db.seedWorkType("测试司机");
  const salary = await db.seedSalary({
    workerId: worker.id,
    workTypeId: work.id,
    salaryNum: 20,
  });
  const curMonth = dayjs().format("YYYY-MM");
  const prevMonth = dayjs().subtract(1, "month").format("YYYY-MM");
  await db.seedRecords([
    { worker_id: worker.id, work: work.id, work_date: `${curMonth}-01`, work_minutes: 600 },
    { worker_id: worker.id, work: work.id, work_date: `${curMonth}-02`, work_minutes: 600 },
    { worker_id: worker.id, work: work.id, work_date: `${curMonth}-03`, work_minutes: 600 },
    { worker_id: worker.id, work: work.id, work_date: `${curMonth}-04`, work_minutes: 600 },
    { worker_id: worker.id, work: work.id, work_date: `${curMonth}-05`, work_minutes: 300 },
    { worker_id: worker.id, work: work.id, work_date: `${prevMonth}-20`, work_minutes: 600 },
    { worker_id: worker.id, work: work.id, work_date: `${prevMonth}-21`, work_minutes: 300 },
  ]);
  return { worker, work, salary, curMonth, prevMonth };
}

test.describe("表格显示与筛选", () => {
  test("表格显示测试", async ({ page }) => {
    /**
     * 注入12个工人(每人一条记录)撑出两页，测试翻页与每页条数
     */
    await db.ensureBaseWork();
    const work = await db.seedWorkType("测试司机");
    const others = await db.seedWorkers(
      Array.from({ length: 12 }, (_, i) => `测试工人${String(i + 1).padStart(2, "0")}`),
    );
    const curMonth = dayjs().format("YYYY-MM");
    await db.seedRecords(
      others.map((w) => ({
        worker_id: w.id,
        work: work.id,
        work_date: `${curMonth}-02`,
        work_minutes: 300,
      })),
    );

    await page.goto(appUrl(gongshi_url));
    await test.step("默认显示", async () => {
      // 未设置薪资的工种提示
      await expect(page.getByTestId("un-salary-work-alert")).toBeVisible();
      // 12条记录第一页显示前10条
      await expect(page.getByTestId("row-id-9")).toBeVisible();
    });
    await test.step("翻页", async () => {
      // 12个工人分两页(第二页2行)
      await page.getByRole("link", { name: "2" }).click();
      await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(2);
      await page.getByRole("link", { name: "1" }).click();
      await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(10);
    });
    await test.step("分页", async () => {
      await setPageSize(page, "20 条/页");
      // 20条/页全部12条显示在一页,页码消失
      await expect(page.getByRole("link", { name: "2" })).not.toBeVisible();
      await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(12);
      await setPageSize(page, "10 条/页");
      await expect(page.getByRole("link", { name: "2" })).toBeVisible();
      await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(10);
    });
  });
  test("搜索测试", async ({ page }) => {
    await seed老张小时数据();
    const others = await db.seedWorkers(["测试老王", "测试老黄"]);
    const work = await db.seedWorkType("测试司机");
    const curMonth = dayjs().format("YYYY-MM");
    await db.seedRecords(
      others.map((w) => ({
        worker_id: w.id,
        work: work.id,
        work_date: `${curMonth}-02`,
        work_minutes: 600,
      })),
    );

    await page.goto(appUrl(gongshi_url));
    await test.step("单个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("老张");
      await page.getByTitle("测试老张").click();
      await page.getByTestId("py-search-button").click();
      // 只显示测试老张(先等筛选后的行数,再断言内容,避免读到旧数据)
      await expect(page.locator('[data-testid^="row-name-"]')).toHaveCount(1);
      const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
      expect(names.map((n) => n.trim())).toEqual(["测试老张"]);
    });
    await test.step("多个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("老王");
      await page.getByTitle("测试老王").click();
      await page.getByTestId("py-search-button").click();
      await expect(page.locator('[data-testid^="row-name-"]')).toHaveCount(2);
      const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
      expect(new Set(names.map((n) => n.trim()))).toEqual(new Set(["测试老张", "测试老王"]));
    });
    await test.step("复原", async () => {
      // 用 clear 图标清理已选人(Backspace 清多选有焦点竞态)
      await clearPySearchSelect(page);
      await page.getByTestId("py-search-button").click();
      // 复原后重新显示全部工人
      await expect(page.locator('[data-testid^="row-name-"]')).toHaveCount(3);
      const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
      expect(names.length).toBe(3);
    });
  });
});

test("筛选测试", async ({ page }) => {
  const { curMonth, prevMonth, worker } = await seed老张小时数据();
  await page.goto(appUrl(gongshi_url));
  await test.step(`筛选${prevMonth}～${curMonth}`, async () => {
    await applyMonthRange(page, prevMonth, curMonth);
    // 展开第一行(只有"测试老张"一个工人)
    await page.getByTestId("row-id-0").click();
    // 月份升序排列: 上个月在前
    await expect(page.getByTestId(`row-month-${worker.name}-0`)).toContainText(prevMonth);
    // 上个月的月份行可以展开
    await page.getByTestId(`row-month-${worker.name}-0`).click();
    // 天升序排列: 20日在21日前面
    await expect(page.getByTestId(`row-day-${worker.name}-${prevMonth}-20`)).toContainText(`20`);
    await expect(page.getByTestId(`row-day-${worker.name}-${prevMonth}-21`)).toContainText(`21`);
  });
  await test.step(`筛选${prevMonth}`, async () => {
    await applyMonthRange(page, prevMonth, prevMonth);
    // 展开状态在筛选切换时被保留,工人行依然是展开的,只剩上个月的月块
    // (2026-09/2026-10 两个月块在步骤1里已经验证过展开与天数,这里不再重复)
    await expect(page.getByTestId(`row-month-${worker.name}-0`)).toContainText(prevMonth);
  });
  await test.step("筛选持久化", async () => {
    // 通过检查考勤页面的月份输入判断筛选是否持久化
    await page.getByRole("link", { name: "人员签到" }).click();
    await expect(page.getByRole("heading", { name: "工时录入系统" })).toBeVisible();
    await page.getByRole("link", { name: "考勤记录" }).click();
    await expect(page.getByRole("textbox", { name: "开始月份" })).toHaveValue(prevMonth);
    await expect(page.getByRole("textbox", { name: "结束月份" })).toHaveValue(prevMonth);
  });
});

test("数值测试", async ({ page }) => {
  const { curMonth, prevMonth, worker } = await seed老张小时数据();
  await page.goto(appUrl(gongshi_url));
  // 筛选涵盖两个月份
  await applyMonthRange(page, prevMonth, curMonth);
  // 展开工人行
  await page.getByTestId("row-id-0").click();
  // 月份块升序: 块0=上个月(20/21), 块1=当前月(01~05). 展开两个月份行
  await page.getByTestId(`row-month-${worker.name}-0`).click();
  await page.getByTestId(`row-month-${worker.name}-1`).click();
  // row-day-{工人}-{日期} 精确到天,上月与本月不会互相干扰
  await page.getByTestId(`row-day-${worker.name}-${curMonth}-01`).click();
  await page.getByTestId(`row-day-${worker.name}-${curMonth}-02`).click();
  await page.getByTestId(`row-day-${worker.name}-${curMonth}-03`).click();
  await page.getByTestId(`row-day-${worker.name}-${curMonth}-04`).click();
  await page.getByTestId(`row-day-${worker.name}-${curMonth}-05`).click();
  // 时薪20: 10小时=200, 5小时=100 (row-d3 的 testid 同时挂在 tr 和首个 td 上,取 .first())
  await expect(page.getByTestId(`row-d3-${curMonth}-01-0`).first()).toContainText(`${worker.name}测试司机10200`);
  await expect(page.getByTestId(`row-d3-${curMonth}-05-0`).first()).toContainText(`${worker.name}测试司机5100`);
  // 上个月的天记录展开
  await page.getByTestId(`row-day-${worker.name}-${prevMonth}-20`).click();
  await page.getByTestId(`row-day-${worker.name}-${prevMonth}-21`).click();
  await expect(page.getByTestId(`row-d3-${prevMonth}-20-0`).first()).toContainText(`${worker.name}测试司机10200`);
  await expect(page.getByTestId(`row-d3-${prevMonth}-21-0`).first()).toContainText(`${worker.name}测试司机5100`);
  // 月份合计(升序): 上个月15小时, 当前月45小时
  await expect(page.getByTestId(`row-month-hours-${worker.name}-0`)).toContainText("15");
  await expect(page.getByTestId(`row-month-hours-${worker.name}-1`)).toContainText("45");
});
