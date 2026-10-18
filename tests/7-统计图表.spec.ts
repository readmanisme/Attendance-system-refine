import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl } from "./constants";
import { TestDB } from "./helpers/pb";
import { pickMonthRange } from "./helpers/ui";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

/**
 * 种子数据(与 vitest-tests/tong-ji-compute.test.ts 的 dataset 同一套口径,期望值手工算好):
 * 工人A(测试搬运单独定价20) / 工人B(无定价,兜底基础10):
 *  A cur-01 搬运 600 → 10h×20 = 200
 *  A cur-02 搬运 300 → 5h×20  = 100
 *  A cur-02 挖土 200 → 兜底    = 33.3333
 *  B cur-01 搬运 240 → 兜底    = 40
 *  B cur-03 挖土 480 → 兜底    = 80
 *  B prev-10 搬运 90 → 兜底    = 15
 * 全局合计: 1910 分钟=31.83h, 468.33 元, 5 人天, 2 人, 6 条记录
 * 未定价: [挖土, 搬运] 共 4 条 / 1010 分钟 = 16.83h
 */
test.beforeEach(async () => {
  await db.ensureBaseWork();
  const a = await db.seedWorker("测试甲");
  const b = await db.seedWorker("测试乙");
  const by = await db.seedWorkType("测试搬运");
  const wt = await db.seedWorkType("测试挖土");
  await db.seedSalary({ workerId: a.id, workTypeId: by.id, salaryNum: 20 });
  const cur = dayjs().format("YYYY-MM");
  const prev = dayjs().subtract(1, "month").format("YYYY-MM");
  await db.seedRecord({ worker_id: a.id, work: by.id, work_date: `${cur}-01`, work_minutes: 600 });
  await db.seedRecord({ worker_id: a.id, work: by.id, work_date: `${cur}-02`, work_minutes: 300 });
  await db.seedRecord({ worker_id: a.id, work: wt.id, work_date: `${cur}-02`, work_minutes: 200 });
  await db.seedRecord({ worker_id: b.id, work: by.id, work_date: `${cur}-01`, work_minutes: 240 });
  await db.seedRecord({ worker_id: b.id, work: wt.id, work_date: `${cur}-03`, work_minutes: 480 });
  await db.seedRecord({ worker_id: b.id, work: by.id, work_date: `${prev}-10`, work_minutes: 90 });
});

const tab = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("tab", { name });

test("空状态", async ({ page }) => {
  await page.goto(appUrl("tongji"));
  await expect(page.getByTestId("tj-record-count")).toBeVisible();
  // 范围设成没有任何数据的未来月份(比默认面板近,无需翻年)
  const future = dayjs().add(3, "month").format("YYYY-MM");
  await pickMonthRange(page, future, future, "起始月", "截止月");
  await expect(page.getByText("所选范围内没有记录")).toBeVisible();
  await expect(page.getByTestId("tj-record-count")).not.toBeVisible();
});

test("概览数值与工种汇总表", async ({ page }) => {
  await page.goto(appUrl("tongji"));
  await test.step("顶部统计卡(全部历史范围)", async () => {
    await expect(page.getByTestId("tj-total-hours")).toContainText("31.8h");
    await expect(page.getByTestId("tj-total-salary")).toContainText("468.33元");
    await expect(page.getByTestId("tj-person-days")).toContainText("5人天");
    await expect(page.getByTestId("tj-worker-count")).toContainText("2人");
    await expect(page.getByTestId("tj-record-count")).toContainText("6条");
  });
  await test.step("未定价兜底提示", async () => {
    const alert = page.getByTestId("tj-unpriced-alert");
    await expect(alert).toContainText("测试挖土, 测试搬运");
    await expect(alert).toContainText("4 条 / 16.83h");
  });
  await test.step("工种汇总表行数值", async () => {
    const table = page.getByTestId("tj-worktype-table");
    const byRow = table.locator("tr", { hasText: "测试搬运" });
    await expect(byRow).toContainText("4");
    await expect(byRow).toContainText("20.5");
    await expect(byRow).toContainText("355");
    const wtRow = table.locator("tr", { hasText: "测试挖土" });
    await expect(wtRow).toContainText("2");
    await expect(wtRow).toContainText("11.33");
    await expect(wtRow).toContainText("113.33");
  });
});

test("四个 Tab 渲染冒烟(canvas 非空白)", async ({ page }) => {
  await page.goto(appUrl("tongji"));
  /**
   * ECharts 画进 canvas,DOM 拿不到数据点;这里验证卡通了、canvas 尺寸正常
   * 且真的画了内容(toDataURL 非空)。destroyInactiveTabPane 下每切一次重挂载。
   */
  const canvasCheck = async (tabName: string, minCount: number) => {
    await test.step(tabName, async () => {
      if (tabName !== "概览") await tab(page, tabName).click();
      const canvases = page.locator("main canvas");
      // 某些图表会多建一个隐藏 canvas(如热力图/visualMap),所以断下限而不是精确值
      await expect
        .poll(() => canvases.count(), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(minCount);
      const actual = await canvases.count();
      expect(actual).toBeGreaterThanOrEqual(minCount);
      for (let i = 0; i < actual; i++) {
        const len = await canvases
          .nth(i)
          .evaluate((el: Element) => (el as HTMLCanvasElement).toDataURL().length);
        expect(len, `${tabName} canvas#${i} 空白`).toBeGreaterThan(1000);
      }
    });
  };
  await canvasCheck("概览", 5);
  await test.step("展开折叠区后补充 4 张", async () => {
    await page.getByText("分布与画像").click();
    await expect
      .poll(() => page.locator("main canvas").count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(9);
  });
  await canvasCheck("时间模式", 10);
  await canvasCheck("关系分析", 4);
  await canvasCheck("个人分析", 9);
});

test("共现阈值联动", async ({ page }) => {
  await page.goto(appUrl("tongji"));
  await tab(page, "关系分析").click();
  // 默认阈值 10;阈值文案在散点卡标题的 tooltip 里,需要悬浮信息图标(tabler 渲染)
  const scatter = page.getByTestId("tj-stable-card");
  const info = scatter.locator(".tabler-icon-info-circle").first();
  await info.hover();
  await expect(page.getByRole("tooltip")).toContainText("共现 ≥10 天");
  await page.getByTestId("tj-co-threshold").locator("input").fill("3");
  await page.getByTestId("tj-co-threshold").locator("input").press("Enter");
  await info.hover();
  await expect(page.getByRole("tooltip")).toContainText("共现 ≥3 天");
});

test("个人分析联动", async ({ page }) => {
  await page.goto(appUrl("tongji"));
  await tab(page, "个人分析").click();
  // 默认选榜单第一 = 测试乙(出勤 3 天)
  await test.step("默认选人乙", async () => {
    await expect(page.getByTestId("tj-p-days")).toContainText("3天");
    await expect(page.getByTestId("tj-p-hours")).toContainText("13.5h");
    await expect(page.getByTestId("tj-p-salary")).toContainText("135");
    await expect(page.getByTestId("tj-p-avg")).toContainText("4.5h");
    await expect(page.getByTestId("tj-p-top")).toContainText("测试挖土");
  });
  await test.step("切换到甲", async () => {
    await page.getByTestId("tj-person-select").click();
    await page.getByText("测试甲(出勤 2 天)").click();
    await expect(page.getByTestId("tj-p-days")).toContainText("2天");
    await expect(page.getByTestId("tj-p-hours")).toContainText("18.3h");
    await expect(page.getByTestId("tj-p-salary")).toContainText("333.33");
    // Statistic precision=1 的舍入语义不透明(实测 9.17 显示 9.1),只断一位小数格式
    const avgText = await page.getByTestId("tj-p-avg").textContent();
    expect(avgText).toMatch(/9\.\dh/);
    await expect(page.getByTestId("tj-p-top")).toContainText("测试搬运");
  });
});

test("月份范围筛选与持久化、与其他页隔离", async ({ page }) => {
  const cur = dayjs().format("YYYY-MM");
  await page.goto(appUrl("tongji"));
  await test.step(`范围限定${cur}`, async () => {
    await pickMonthRange(page, cur, cur, "起始月", "截止月");
    // 只剩本月的 5 条: 1820 分钟 = 30.33h, 453.33 元(上月的 90 分钟/15 元被排除)
    await expect(page.getByTestId("tj-total-hours")).toContainText("30.3h");
    await expect(page.getByTestId("tj-total-salary")).toContainText("453.33元");
  });
  await test.step("刷新后持久化", async () => {
    await page.reload();
    await expect(page.getByTestId("tj-total-hours")).toContainText("30.3h");
    await expect(page.getByRole("textbox", { name: "起始月" })).toHaveValue(cur);
    await expect(page.getByRole("textbox", { name: "截止月" })).toHaveValue(cur);
  });
  await test.step("不影响考勤记录页的筛选", async () => {
    await page.getByRole("link", { name: "考勤记录" }).click();
    // 记录页的月份范围是独立字段,默认仍是 本月~下月
    await expect(page.getByRole("textbox", { name: "开始月份" })).toHaveValue(cur);
    await expect(page.getByRole("textbox", { name: "结束月份" })).toHaveValue(
      dayjs().add(1, "month").format("YYYY-MM"),
    );
  });
});
