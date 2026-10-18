import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { API_URL, appUrl } from "./constants";
import { TestDB } from "./helpers/pb";
import { pickMonthRange } from "./helpers/ui";
import { exportAndRead, openExportPopover, rowsOf } from "./helpers/export";

const db = new TestDB();
/** 种子记录 id(明细 sheet 的"序号"列就是记录 id) */
let recordIds: Record<string, string> = {};

/**
 * 种子(与 7-统计图表 不同包,专给导出用):
 *  A(测试搬运定价20): cur-01 600(10h×20=200), cur-02 300(5h×20=100)
 *  B(无定价兜底基础10): cur-01 搬运 240(4h×10=40) + 挖土 300(5h×10=50)
 *  (同人同日要换工种:库有"人×工种×日"唯一索引,API 直接注同键会 400)
 * 全部在本月 → 导出范围缩到本月即可全覆盖,不依赖"今年"默认范围的年度边界。
 */
test.beforeEach(async () => {
  await db.ensureBaseWork();
  const a = await db.seedWorker("测试甲");
  const b = await db.seedWorker("测试乙");
  const by = await db.seedWorkType("测试搬运");
  const wt = await db.seedWorkType("测试挖土");
  await db.seedSalary({ workerId: a.id, workTypeId: by.id, salaryNum: 20 });
  const cur = dayjs().format("YYYY-MM");
  const r1 = await db.seedRecord({ worker_id: a.id, work: by.id, work_date: `${cur}-01`, work_minutes: 600 });
  const r2 = await db.seedRecord({ worker_id: a.id, work: by.id, work_date: `${cur}-02`, work_minutes: 300 });
  const r3 = await db.seedRecord({ worker_id: b.id, work: by.id, work_date: `${cur}-01`, work_minutes: 240 });
  const r4 = await db.seedRecord({ worker_id: b.id, work: wt.id, work_date: `${cur}-01`, work_minutes: 300 });
  recordIds = { a1: r1.id, a2: r2.id, b1: r3.id, b2: r4.id };
});

test.afterEach(async () => {
  await db.cleanup();
});

test("全量导出: 三个 sheet 的行列与薪资口径逐格核对", async ({ page }) => {
  await openExportPopover(page);
  const cur = dayjs().format("YYYY-MM");
  const wb = await exportAndRead(page);

  await test.step("考勤记录 sheet(一行一条明细)", async () => {
    const rows = rowsOf(wb, "考勤记录");
    expect(rows).toHaveLength(4);
    // 表头字段名与顺序
    expect(Object.keys(rows[0])).toEqual(["序号", "工人", "工作类型", "总工时", "薪资", "依据", "日期"]);
    // 列表顺序不确定(PocketBase 默认排序),按 日期+总工时 定位行做逐格断言
    const rowOf = (date: string, total: string) =>
      rows.find((r) => r["日期"] === date && r["总工时"] === total)!;
    // 明细"序号"列 = 记录 id(不是工人 id)
    expect(rowOf(`${cur}-01`, "10")).toMatchObject({
      序号: recordIds["a1"],
      工人: "测试甲",
      工作类型: "测试搬运",
      薪资: 200, // 10h × 20
      依据: "测试甲_测试搬运:20",
    });
    expect(rowOf(`${cur}-02`, "5")).toMatchObject({
      序号: recordIds["a2"],
      工人: "测试甲",
      薪资: 100,
      依据: "测试甲_测试搬运:20",
    });
    const bRows = rows.filter((r) => r["工人"] === "测试乙");
    expect(bRows.map((r) => r["总工时"]).sort()).toEqual(["4", "5"]); // 搬运/挖土各一条
    for (const r of bRows) {
      expect(r["依据"]).toBe("基础:10"); // 乙未定价,兜底基础
      expect(r["薪资"]).toBe(r["总工时"] === "4" ? 40 : 50);
    }
  });

  await test.step("工时(日) sheet(同人同日合计)", async () => {
    const rows = rowsOf(wb, "工时(日)");
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r["序号"]))).toEqual(new Set([1, 2, 3]));
    // 行序不依赖导出实现的排序,按 工人+日期 定位
    const rowOf = (worker: string, date: string) =>
      rows.find((r) => r["工人"] === worker && r["日期"] === date)!;
    expect(rowOf("测试乙", `${cur}-01`)).toMatchObject({ 总工时: "9", 薪资: 90 }); // 240+300 合并
    expect(rowOf("测试甲", `${cur}-01`)).toMatchObject({ 总工时: "10", 薪资: 200 });
    expect(rowOf("测试甲", `${cur}-02`)).toMatchObject({ 总工时: "5", 薪资: 100 });
  });

  await test.step("工时(月) sheet", async () => {
    const rows = rowsOf(wb, "工时(月)");
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r["序号"]))).toEqual(new Set([1, 2]));
    const rowOf = (worker: string) => rows.find((r) => r["工人"] === worker)!;
    expect(rowOf("测试乙")).toMatchObject({ 月份: cur, 总工时: "9", 薪资: 90 });
    expect(rowOf("测试甲")).toMatchObject({ 月份: cur, 总工时: "15", 薪资: 300 });
  });
});

test("单人导出: 只含该工人的记录", async ({ page }) => {
  await openExportPopover(page);
  // 弹层里的 Select 选人。Select 必须限定在弹层内,否则会抓到页面主内容里的下拉。
  // 经验证:点击下拉选项(portal)不会收起 Popconfirm,选完人直接确认导出即可;
  // 保险起见探测一下,万一关了就重开(exportPerson 存在外层组件状态,不会丢)。
  await page.getByRole("tooltip").locator(".ant-select").click();
  await page.getByTitle("测试乙").click();
  const confirm = page.getByRole("button", { name: "进行导出" });
  if (!(await confirm.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "导出考勤记录到Excel" }).click();
    await page.getByRole("tooltip").waitFor({ state: "visible" });
  }
  const wb = await exportAndRead(page);
  const detail = rowsOf(wb, "考勤记录");
  expect(detail).toHaveLength(2);
  expect(detail.every((r) => r["工人"] === "测试乙")).toBe(true);
  const dayRows = rowsOf(wb, "工时(日)");
  expect(dayRows).toHaveLength(1);
  expect(dayRows[0]).toMatchObject({ 工人: "测试乙", 总工时: "9", 薪资: 90 });
});

test("导出失败: 后端异常提示 + 恢复后可重试", async ({ page }) => {
  const recordsApi = `${API_URL}/collections/attendance_record_test/records*`;
  await page.route(recordsApi, (route) => route.fulfill({ status: 500 }));
  await page.goto(appUrl("gongshi"));
  await page.getByRole("button", { name: "导出考勤记录到Excel" }).click();
  // 失败时不应该触发下载(先触发下载再报错属于不可接受的行为)
  let downloaded = false;
  page.once("download", () => {
    downloaded = true;
  });
  await page.getByRole("button", { name: "进行导出" }).click();
  await expect(page.getByText("导出失败，请检查时间范围或后端连接后重试")).toBeVisible({
    timeout: 10_000,
  });
  expect(downloaded, "导出失败时不应产生下载文件").toBe(false);
  // 解除拦截后重新打开弹窗导出,应正常产出文件
  await page.unroute(recordsApi);
  await page.getByRole("button", { name: "导出考勤记录到Excel" }).click();
  const pop = page.getByRole("tooltip");
  await pop.waitFor({ state: "visible" });
  const cur = dayjs().format("YYYY-MM");
  await pickMonthRange(page, cur, cur, "开始月份", "结束月份", pop);
  await exportAndRead(page);
});
