import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl, attendance_record_url } from "./constants";
import { TestDB } from "./helpers/pb";
import { applyMonthRange, clearPySearchSelect, setPageSize } from "./helpers/ui";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

test("搜索测试", async ({ page }) => {
  /**
   * 注入三个人 19 条本月的考勤记录(撑出两页)，
   * 1、单个搜索 2、多个搜索 3、搜索会回到第一页(历史bug) 4、复原
   */
  await db.ensureBaseWork();
  const workerC = await db.seedWorker("测试刘旭堂");
  const workerA = await db.seedWorker("测试张孝刚");
  const workerB = await db.seedWorker("测试马福娃");
  const workA = await db.seedWorkType("测试司机");
  const thisMonth = dayjs().format("YYYY-MM");
  const recordsFor = (workerId: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      worker_id: workerId,
      work: workA.id,
      work_date: `${thisMonth}-${String((i % 27) + 1).padStart(2, "0")}`,
      work_minutes: 300,
    }));
  await db.seedRecords([
    ...recordsFor(workerC.id, 5),
    ...recordsFor(workerA.id, 7),
    ...recordsFor(workerB.id, 7),
  ]);

  await page.goto(appUrl(attendance_record_url));
  // 默认查询范围就是 当前月～下一月，不用设置月份
  await test.step("单个", async () => {
    // 翻页，然后搜索是确定搜索之后页面有没有回到第一页
    // 之前有一个bug就是不会回到第一页
    await page.getByRole("link", { name: "2" }).click();
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("张孝刚");
    await page.getByTitle("测试张孝刚").click();
    await page.getByTestId("py-search-button").click();
    await expect(page.getByTestId("row-name-0")).toContainText("测试张孝刚");
    // 看页面有没有回到第一页以及应该只显示一页
    await expect(page.getByRole("link", { name: "2" })).not.toBeVisible();
  });
  // 搜多个人
  await test.step("多个", async () => {
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("马福娃");
    await page.getByTitle("测试马福娃").click();
    await page.getByTestId("py-search-button").click();
    const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
    // 多个搜索应该包含两个人，且只有这两人的记录
    expect(names, "两个人的记录都应显示").toEqual(
      expect.arrayContaining([
        expect.stringContaining("测试张孝刚"),
        expect.stringContaining("测试马福娃"),
      ]),
    );
    expect(new Set(names.map((n) => n.replace("测试", ""))).size, "只有两个人").toBe(2);
  });
  // 复原
  await test.step("复原", async () => {
    // 用 clear 图标清理已选人(Backspace 清多选有焦点竞态)
    await clearPySearchSelect(page);
    await page.getByTestId("py-search-button").click();
    // 清除搜索后返回全部记录：翻页可见
    await expect(page.getByRole("link", { name: "2" })).toBeVisible();
  });
});

test("表格显示测试", async ({ page }) => {
  /**
   * 注入 23 条本月记录验证表格显示、翻页、每页条数切换
   */
  await db.ensureBaseWork();
  const workers = await db.seedWorkers(["测试老昊", "测试老苗"]);
  const workA = await db.seedWorkType("测试司机");
  const thisMonth = dayjs().format("YYYY-MM");
  await db.seedRecords(
    Array.from({ length: 23 }, (_, i) => ({
      worker_id: workers[i % 2].id,
      work: workA.id,
      work_date: `${thisMonth}-${String((i % 27) + 1).padStart(2, "0")}`,
      work_minutes: 300 + i,
    })),
  );

  await page.goto(appUrl(attendance_record_url));
  await test.step("默认显示", async () => {
    // 两个提示
    await expect(page.getByTestId("help-alert")).toBeVisible();
    await expect(page.getByTestId("help-alert-2")).toBeVisible();
    // 不能添加记录
    await expect(page.getByTestId("add-button")).toBeDisabled();
    // 23条记录,第一页显示前10条
    await expect(page.getByTestId("row-id-9")).toBeVisible();
  });
  await test.step("翻页", async () => {
    // 23条 = 第1页10条 + 第2页10条 + 第3页3条
    await page.getByRole("link", { name: "2" }).click();
    await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(10);
    await page.getByRole("link", { name: "3" }).click();
    await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(3);
    await page.getByRole("link", { name: "1" }).click();
    await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(10);
  });
  await test.step("分页", async () => {
    await setPageSize(page, "20 条/页");
    // 20条/页时第二页还有3条
    await page.getByRole("link", { name: "2" }).click();
    await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(3);
    await setPageSize(page, "10 条/页");
    await expect(page.locator('[data-testid^="row-id-"]')).toHaveCount(10);
  });
});

test("排序测试", async ({ page }) => {
  /**
   * 记录按 created 逆序排序: 后创建的显示在前。
   * 注入两批分钟数不同的记录分辨先后。
   */
  await db.ensureBaseWork();
  const workers = await db.seedWorkers(["测试老甲", "测试老乙"]);
  const workA = await db.seedWorkType("测试司机");
  const thisMonth = dayjs().format("YYYY-MM");
  await db.seedRecord({
    worker_id: workers[0].id,
    work: workA.id,
    work_date: `${thisMonth}-01`,
    work_minutes: 300,
  });
  await db.seedRecord({
    worker_id: workers[1].id,
    work: workA.id,
    work_date: `${thisMonth}-02`,
    work_minutes: 480,
  });

  await page.goto(appUrl(attendance_record_url));
  // 最新创建的记录(测试老乙 8小时)在最上面
  await expect(page.getByTestId("row-name-0")).toContainText("测试老乙");
  await expect(page.getByTestId("row-name-1")).toContainText("测试老甲");
  await expect(page.getByTestId("row-num-0")).toContainText("8");
  await expect(page.getByTestId("row-num-1")).toContainText("5");
});

test("月份筛选测试", async ({ page }) => {
  /**
   * 注入两条不同月份的记录,验证筛选和筛选持久化
   */
  await db.ensureBaseWork();
  const workerA = await db.seedWorker("测试老乙");
  const workerB = await db.seedWorker("测试老丁");
  const workA = await db.seedWorkType("测试挖沟");
  const thisMonth = dayjs().format("YYYY-MM"); // 当前月
  const lastMonth = dayjs().subtract(1, "month").format("YYYY-MM"); // 上个月
  await db.seedRecords([
    { worker_id: workerA.id, work: workA.id, work_date: `${thisMonth}-03`, work_minutes: 300 },
    { worker_id: workerB.id, work: workA.id, work_date: `${lastMonth}-20`, work_minutes: 240 },
  ]);

  await page.goto(appUrl(attendance_record_url));
  await test.step(`筛选${thisMonth}`, async () => {
    await applyMonthRange(page, thisMonth, thisMonth);
    // 只显示当月记录
    await expect(page.getByTestId("row-name-0")).toContainText("乙");
    await expect(page.getByTestId("row-name-0")).toContainText("老");
  });
  await test.step(`筛选${lastMonth}`, async () => {
    await applyMonthRange(page, lastMonth, lastMonth);
    // 只显示上月记录
    await expect(page.getByTestId("row-name-0")).toContainText("丁");
  });
  await test.step("筛选持久化", async () => {
    await page.getByRole("link", { name: "人员签到" }).click();
    await expect(page.getByRole("heading", { name: "工时录入系统" })).toBeVisible();
    await page.getByRole("link", { name: "考勤记录" }).click();
    await expect(page.getByTestId("row-name-0")).toContainText("丁");
    await expect(page.getByRole("textbox", { name: "开始月份" })).toHaveValue(lastMonth);
    await expect(page.getByRole("textbox", { name: "结束月份" })).toHaveValue(lastMonth);
  });
});

test("编辑与删除", async ({ page }) => {
  /**
   * 注入 3 人 3 条 3 天前的记录，测试编辑、未保存提醒、删除、批量删除
   */
  await db.ensureBaseWork();
  const workers = await db.seedWorkers(["测试老丙", "测试老喵", "测试老登"]);
  const workA = await db.seedWorkType("测试基础");
  await db.seedWorkType("测试三轮车司机");
  const threeDaysAgo = dayjs().subtract(3, "day");
  const recordDate = threeDaysAgo.format("YYYY-MM-DD");
  const recordMonth = threeDaysAgo.format("YYYY-MM");
  // 逐条创建确保 created 时间递增(同批次创建时间相同,排序不稳定)
  await db.seedRecord({
    worker_id: workers[0].id,
    work: workA.id,
    work_date: recordDate,
    work_minutes: 300,
  });
  await db.seedRecord({
    worker_id: workers[1].id,
    work: workA.id,
    work_date: recordDate,
    work_minutes: 240,
  });
  await db.seedRecord({
    worker_id: workers[2].id,
    work: workA.id,
    work_date: recordDate,
    work_minutes: 180,
  });

  await page.goto(appUrl(attendance_record_url));
  // 选择记录所在月
  await applyMonthRange(page, recordMonth, recordMonth);
  // 记录按 created 逆序: 后创建的老登在第一行
  await expect(page.getByTestId("row-name-0")).toContainText("测试老登");
  await expect(page.getByTestId("row-name-1")).toContainText("测试老喵");
  await expect(page.getByTestId("row-name-2")).toContainText("测试老丙");

  await test.step("编辑", async () => {
    await page.getByTestId("edit-button-1").click();
    // 测试回到主页的功能
    await page.getByRole("button", { name: "bars 考勤记录" }).click();
    await expect(page.getByTestId("help-alert")).toBeVisible();
    // 编辑数据
    await page.getByTestId("edit-button-1").click();
    await expect(page.getByTestId("worker-name")).toContainText("测试老喵");
    await expect(page.locator("#work_minutes"), "小时框显示4").toHaveValue("4");
    await expect(page.getByText("测试基础")).toBeVisible();
    // 修改工时 4小时 -> 4.5小时(工时是"小时+分钟"双框,把分钟填30)
    await page.locator("#work_minutes_min").click();
    await page.locator("#work_minutes_min").fill("30");
    // 换算提示更新为 4.5 小时
    await expect(page.getByText("= 4.5 小时")).toBeVisible();
    // 修改日期(保留在同一筛选月份内,输入完整日期后回车提交)
    await page.getByTestId("work-date").click();
    await page.getByTestId("work-date").fill(`${recordMonth}-09`);
    await page.getByTestId("work-date").press("Enter");
    // 修改工作
    await page.getByTestId("work-type").click();
    await page.getByTitle("测试三轮车司机").click();
    // 测试未保存提醒
    await test.step("未保存提醒", async () => {
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("您确定要离开吗？您有未保存的更改。");
        dialog.dismiss().catch(() => {});
      });
      await page.getByRole("button", { name: "arrow-left" }).click();
    });
    await page.getByRole("button", { name: "save 保存" }).click();
    // 成功提示
    await expect(page.getByText("成功编辑")).toBeVisible();
    // 判断修改是否生效
    await expect(page.getByTestId("row-date-1")).toContainText(`${recordMonth}-09`);
    await expect(page.getByTestId("row-num-1")).toContainText("4.5");
    await expect(page.getByTestId("row-work-1")).toContainText("三轮车司机");
  });
  await test.step("删除", async () => {
    await page.getByTestId("delete-button-0").click();
    await page.getByRole("button", { name: "删 除" }).click();
    await expect(page.getByTestId("row-name-0")).toContainText("测试老喵"); //测试老登删除后测试老喵变第一行
  });
  await test.step("批量删除", async () => {
    // 未选择之前批量删除按钮禁用
    await expect(page.getByTestId("batch-delete-button")).toBeDisabled();
    await page.getByTestId("row-checkbox-0").locator("label").check();
    await page.getByTestId("row-checkbox-1").locator("label").check();
    // 进行批量删除的时候删除键不能用
    await expect(page.getByTestId("delete-button-1")).toBeDisabled();
    await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (2)");
    await page.getByTestId("batch-delete-button").click();
    await page.getByRole("button", { name: "确 定" }).click();
    // 全部删完
    await expect(page.getByRole("img", { name: "暂无数据" })).toBeVisible();
  });
});
