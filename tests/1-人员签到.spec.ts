import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { appUrl, qiandao_url } from "./constants";
import { TestDB } from "./helpers/pb";
import { increaseInputNumber } from "./helpers/ui";
const db = new TestDB();
const BASE_URL_WORKERS = ["测试周伯通", "测试李红红", "测试张着萍", "测试尤响林"];

test.beforeEach(async () => {
  await db.ensureBaseWork();
  await db.seedWorkers(BASE_URL_WORKERS);
  await db.seedWorkTypes(["测试重工", "测试三轮车司机"]);
});

test.afterEach(async () => {
  await db.cleanup();
});

test("日期检测检查", async ({ page }) => {
  /**
   * 1、测试日期选择器默认是不是今天，提示是不是显示今天
   * 2、日期切换到过去的某一天(37天前，有4条注入的记录)，提示是不是显示过去日期，同时判断有没有获取到签到记录
   * 3、日期切换到明天，提示是不是显示明天
   * 4、刷新后日期应该切换到今天，提示是不是显示今天
   */
  const past = dayjs().subtract(37, "day");
  const past_short = past.format("-MM-DD");
  const past_full = past.format("YYYY-MM-DD");
  const today = dayjs().format("YYYY-MM-DD");
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  // 注入过去那天的 4 条记录（同人同工种同日组合唯一，所以错开工人/工种）
  const workerA = await db.seedWorker("测试老王");
  const workerB = await db.seedWorker("测试老张");
  const workA = await db.seedWorkType("测试搬运");
  const workB = await db.seedWorkType("测试挖土");
  const dateStr = past_full;
  await db.seedRecords([
    { worker_id: workerA.id, work: workA.id, work_date: dateStr, work_minutes: 300 },
    { worker_id: workerA.id, work: workB.id, work_date: dateStr, work_minutes: 240 },
    { worker_id: workerB.id, work: workA.id, work_date: dateStr, work_minutes: 180 },
    { worker_id: workerB.id, work: workB.id, work_date: dateStr, work_minutes: 120 },
  ]);

  await page.goto(appUrl(qiandao_url));
  // 完整时间用于判断
  await test.step("是今天", async () => {
    await expect(
      page.getByRole("textbox", { name: "请选择日期" }),
      "选择器应该显示今天",
    ).toHaveValue(today);
    await expect(page.getByTestId("today-alert"), "提示应该显示今天").toBeVisible();
  });

  await test.step("是明天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(tomorrow).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择明天成功").toHaveValue(
      tomorrow,
    );
    await expect(page.getByTestId("future-alert"), "提示应该显示明天").toBeVisible();
  });
  await test.step(`是${past_full}`, async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByRole("textbox", { name: "请选择日期" }).fill(past_full);
    // 这是需要fill的原因是一旦日期不在当前显示月，就会找不到目标日子
    // 而fill之后日期面板就会转到对应月份，就能选择了。
    // 不能直接fill，需要click后fill才能输进去。同时fill也不会改变值，需要点选或确认才行
    await page.getByTitle(past_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择成功").toHaveValue(
      past_full,
    );
    await expect(page.getByTestId("past-alert"), "提示应该显示昨天").toBeVisible();
    // 应该获取到那一天的记录（注入了4条）
    await expect(page.getByTestId("row-name-0")).toBeVisible();
    await expect(page.getByTestId("row-time-0")).toBeVisible();
  });
  await test.step("还是今天", async () => {
    await page.reload();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "刷新后显示今天").toHaveValue(
      today,
    );
    await expect(page.getByTestId("today-alert"), "提示应该显示今天").toBeVisible();
  });
});

test("工时选择测试", async ({ page }) => {
  /**
   * 1、默认工时为0(新版录入面板默认不预填)
   * 2、测试+-30min/+10min按钮、快速设置工时按钮
   * 3、直接输入小时，包括小数（如1/3小时）
   */
  await page.goto(appUrl(qiandao_url));
  await test.step("默认值", async () => {
    await expect(page.getByTestId("time-difference"), "默认0分钟").toContainText("0分钟");
    await expect(page.getByTestId("hours-input"), "输入框显示0小时").toHaveValue("0小时");
  });
  await test.step("加减分钟", async () => {
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("30分钟");
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("0分钟"); //不会减为负数
    await page.getByRole("button", { name: "+10min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("10分钟");
    await page.getByRole("button", { name: "-10min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("0分钟");
  });
  await test.step("直接输入小时", async () => {
    // 整数
    await page.getByTestId("hours-input").click();
    await page.getByTestId("hours-input").fill("8");
    await expect(page.getByTestId("time-difference")).toContainText("480分钟");
    // 小数，1/3小时=20分钟
    await page.getByTestId("hours-input").fill("0.3333");
    await expect(page.getByTestId("time-difference")).toContainText("20分钟");
  });
  await test.step("快速工时", async () => {
    // 测试tooltip显示
    await page.getByTestId("hour-tooltip").hover();
    await expect(page.getByRole("tooltip", { name: "工时可以精确到分钟" })).toBeVisible();
    // 设置2小时
    await page.getByTestId("hour-button-2").click();
    await expect(page.getByTestId("time-difference")).toContainText("120分钟");
    // 7.5小时
    await page.getByTestId("hour-button-7.5").click();
    await expect(page.getByTestId("time-difference")).toContainText("450分钟");
  });
});

test("录入校验", async ({ page }) => {
  /**
   * 测试录入记录的相关校验，包括人员校验，工作校验
   * 工时因为默认存在所以不检查
   */
  await page.goto(appUrl(qiandao_url));
  // 未选人提示，同时不能提交
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 选人
  await page.locator('[data-testid="py-search-select"]').first().click();
  await page.keyboard.type("李红红");
  await page.getByTitle("测试李红红").click();
  // 这里要选择直接能看到的，不然报错，而且会显示为菜单未弹出误导人。
  // 选了人，没选工作，提示。还是不能提交
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 选择工作
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("测试三轮车司机").click();
  // 新版默认工时为0:提示需要工时，仍不能提交
  await expect(page.getByTestId("no-minutes-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 设置工时后可以提交
  await page.getByTestId("hour-button-5").click();
  await expect(page.getByTestId("can-input-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  // 清除工作，就不能提交，还会有提示
  await page.getByTestId("work-type-select").hover();
  await page.getByTestId("clear-icon").click();
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 清除人，有提示，不能提交
  await page.locator('[data-testid="py-search-select"]').first().click();
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
});
test("表格显示", async ({ page }) => {
  await page.goto(appUrl(qiandao_url));
  // 两个alert
  await expect(page.getByTestId("edit-alert"), "编辑提示").toBeVisible();
  await expect(page.getByTestId("search-alert"), "搜索提示").toBeVisible();
  // 测试表格能不能显示超过10条的：注入11条记录到 N 天前
  // (同人同工种同日唯一,所以用 3工人×4工种 的组合覆盖;工人按创建逆序显示在表格中)
  const day = dayjs().subtract(61, "day").format("YYYY-MM-DD");
  const day_short = dayjs().subtract(61, "day").format("-MM-DD");
  const workers = await db.seedWorkers(["测试老李", "测试老韩", "测试老丁"]);
  const works = await db.seedWorkTypes(["测试挖土", "测试搬运", "测试砌墙", "测试浇筑"]);
  const records = Array.from({ length: 11 }, (_, i) => ({
    worker_id: workers[i % 3].id,
    work: works[i % 4].id,
    work_date: day,
    work_minutes: 300,
  }));
  await db.seedRecords(records);
  await page.getByRole("textbox", { name: "请选择日期" }).click();
  await page.getByRole("textbox", { name: "请选择日期" }).fill(day);
  // 这是需要fill的原因是日期面板只显示当前月，fill之后才会转到目标月。
  await page.getByTitle(day_short).click();
  await expect(page.getByTestId("past-alert"), "提示应该显示过去").toBeVisible();
  // 应该获取到那一天的记录
  await expect(page.getByTestId("row-name-10")).toBeVisible();
  // 顺便测试下全选
  await page.getByRole("checkbox", { name: "Select all" }).click();
  await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (11)");
});
test("当天统计", async ({ page }) => {
  /**
   * 录入面板下方的"当天汇总"卡片:
   * 1、没有记录时显示空提示
   * 2、录入后人数/条数/总工时/人均即时更新(同一人同工种合并后条数不变、工时叠加)
   * 3、切换到没有记录的日期后回到空提示
   */
  const empty = dayjs().subtract(37, "day");
  await page.goto(appUrl(qiandao_url));
  await expect(page.getByTestId("day-stats-empty"), "当天还没有记录").toBeVisible();

  await test.step("录入后统计更新", async () => {
    await page.locator('[data-testid="py-search-select"]').first().click();
    await page.keyboard.type("周伯通");
    await page.getByTitle("测试周伯通").click();
    await page.getByTestId("work-type-select").click();
    await page.getByTitle("测试重工").click();
    await page.getByTestId("hours-input").click();
    await page.getByTestId("hours-input").fill("6");
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("day-stats-workers")).toContainText("1人");
    await expect(page.getByTestId("day-stats-records")).toContainText("1条");
    await expect(page.getByTestId("day-stats-hours")).toContainText("6");
    await expect(page.getByTestId("day-stats-avg")).toContainText("6");
  });

  await test.step("同人同工种合并:条数不变,工时叠加", async () => {
    await page.locator('[data-testid="py-search-select"]').first().click();
    await page.getByTitle("测试周伯通").click();
    await page.getByTestId("work-type-select").click();
    await page.getByTitle("测试重工").click();
    await page.getByTestId("hour-button-2").click();
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("day-stats-workers")).toContainText("1人");
    await expect(page.getByTestId("day-stats-records")).toContainText("1条");
    await expect(page.getByTestId("day-stats-hours")).toContainText("8");
    await expect(page.getByTestId("day-stats-avg")).toContainText("8");
  });

  await test.step("再录一个人:人数与人均随之变化", async () => {
    await page.locator('[data-testid="py-search-select"]').first().click();
    await page.keyboard.type("李红红");
    await page.getByTitle("测试李红红").click();
    await page.getByTestId("work-type-select").click();
    await page.getByTitle("测试重工").click();
    await page.getByTestId("hour-button-5").click();
    await page.getByTestId("submit-button").click();
    await expect(page.getByTestId("day-stats-workers")).toContainText("2人");
    await expect(page.getByTestId("day-stats-records")).toContainText("2条");
    await expect(page.getByTestId("day-stats-hours")).toContainText("13");
    // (8 + 5) / 2 = 6.5
    await expect(page.getByTestId("day-stats-avg")).toContainText("6.5");
  });

  await test.step("切到没有记录的日期", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByRole("textbox", { name: "请选择日期" }).fill(empty.format("YYYY-MM-DD"));
    await page.getByTitle(empty.format("-MM-DD")).click();
    await expect(page.getByTestId("day-stats-empty"), "该日期没有记录").toBeVisible();
  });
});

test.describe("一条龙", async () => {
  /**
   * 录入、自动合并、编辑、删除人员考勤记录
   * (数据全部由 beforeEach 注入，afterEach 清理)
   */
  test("一条龙", async ({ page }) => {
    await page.goto(appUrl(qiandao_url));
    // 日期应该是当天
    await expect(page.getByTestId("today-alert")).toBeVisible();
    let names;
    await test.step("录入", async () => {
      // 录入不使用工时按钮而是手动输入
      await page.locator('[data-testid="py-search-select"]').first().click();
      await page.keyboard.type("周伯通"); //虚拟列表只渲染前10个选项，直接键入名字过滤后再点选
      await page.getByTitle("测试周伯通").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("测试重工").click();
      await page.getByTestId("hours-input").click();
      await page.getByTestId("hours-input").fill("6");
      await page.getByTestId("submit-button").click();
      // 成功提示
      await expect(page.getByText("成功创建")).toBeVisible();
      // 选人，多选
      await page.locator('[data-testid="py-search-select"]').first().click();
      await page.keyboard.type("李红红"); //因为前面选择之后再次打开select第一个就会是已选人，看不到测试李红红了。
      await page.getByTitle("测试李红红").click();
      await page.getByTitle("测试张着萍").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("基础").click();
      // 2.5小时
      await page.getByTestId("hour-button-2.5").click();
      await page.getByTestId("submit-button").click();
      // 选人，单选；录入之后自动清空人员和工作所以不需要手动清除
      await page.locator('[data-testid="py-search-select"]').first().click();
      await page.getByTitle("测试尤响林").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("测试三轮车司机").click();
      // 5小时
      await page.getByTestId("hour-button-5").click();
      await page.getByTestId("submit-button").click();
      // 判断记录是否已经录入及其人员、工时、工作是否正确（新记录在前）
      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-time-0")).toContainText("5");
      await expect(page.getByTestId("row-work-0")).toContainText("三轮车司机");
      // 因为同一批次创建的记录顺序不固定，所以只能这么做
      const first_name = await page.getByTestId("row-name-1").textContent();
      const second_name = await page.getByTestId("row-name-2").textContent();
      names = [first_name, second_name]; //"测试张着萍"和"测试李红红"
      // 判断第一条记录是否正确
      await expect(page.getByTestId("row-name-1")).toContainText(first_name!);
      await expect(page.getByTestId("row-time-1")).toContainText("2.5");
      await expect(page.getByTestId("row-work-1")).toContainText("基础");
      // 判断第二条记录是否正确
      await expect(page.getByTestId("row-name-2")).toContainText(second_name!);
      await expect(page.getByTestId("row-time-2")).toContainText("2.5");
      await expect(page.getByTestId("row-work-2")).toContainText("基础");
      // 判断第三条记录
      await expect(page.getByTestId("row-name-3")).toContainText("周伯通");
      await expect(page.getByTestId("row-time-3")).toContainText("6");
      await expect(page.getByTestId("row-work-3")).toContainText("重工");
    });
    await test.step("同人同工种自动合并", async () => {
      // 测试尤响林再录一次同样的工作，应该提示合并并且合并为一条（5+2.5=7.5）
      await page.locator('[data-testid="py-search-select"]').first().click();
      await page.getByTitle("测试尤响林").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("测试三轮车司机").click();
      await page.getByTestId("hour-button-2.5").click();
      await expect(page.getByTestId("merge-alert")).toContainText(
        "测试尤响林，当天已有测试三轮车司机记录（5小时），录入后自动合并为7.5小时",
      );
      await page.getByTestId("submit-button").click();
      // 合并后仍然只有一条测试尤响林记录，工时变为7.5，且不会多出新行
      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-time-0")).toContainText("7.5");
    });
    await test.step("编辑", async () => {
      // 可编辑表格
      await page.getByTestId("edit-button-1").click();
      // 编辑状态下看不到删除按钮
      await expect(page.getByTestId("delete-button-1")).not.toBeVisible();
      // 编辑工时，需要悬浮才会出现上下调整按键
      await increaseInputNumber(page, "workTime");
      // 编辑工作(页面同时存在录入面板与编辑行两份下拉 DOM,必须限定在"可见"的下拉里选)
      await page.getByTestId("row-work-1").getByText("基础").click();
      await page
        .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
        .last()
        .getByTitle("测试三轮车司机")
        .click();
      // 保存
      await page.getByTestId("save-button-1").click();
      // 判断编辑是否生效(工时步进=1小时: 2.5 -> 3.5)
      await expect(page.getByTestId("row-time-1")).toContainText("3.5");
      await expect(page.getByTestId("row-work-1")).toContainText("三轮车司机");
      // 确定cancel按键是否有效
      await page.getByTestId("edit-button-1").click();
      await page.getByTestId("cancel-button-1").click();
      await expect(page.getByTestId("row-time-1")).toContainText("3.5");
      await expect(page.locator("#workTime")).not.toBeVisible(); //只有编辑情况下才有这个
      await expect(page.getByTestId("row-work-1")).toContainText("三轮车司机");
      // 编辑第三条(测试周伯通)的工时
      await page.getByTestId("edit-button-3").click();
      await increaseInputNumber(page, "workTime");
      await page.getByTestId("save-button-3").click();
      // 判断编辑是否生效(工时步进=1小时: 6 -> 7)
      await expect(page.getByTestId("row-time-3")).toContainText("7");
    });
    await test.step("删除", async () => {
      // 测试删除按键的作用
      await page.getByTestId("delete-button-1").click();
      await page.getByRole("button", { name: "删 除" }).click();
      // 删除的是原第1行(names[0]);原第2行的 names[1] 上移占据 row-1。
      // 断言 row-1 仍是 names[1]:既证明 names[0] 的行已消失(行号前移),又证明没删错人。
      await expect(page.getByTestId("row-name-1")).toContainText(names[1]!);
    });
    await test.step("批量删除", async () => {
      // 测试批量删除功能
      // 未选择之前批量删除按钮禁用;单独删除按钮可用
      await expect(page.getByTestId("batch-delete-button")).toBeDisabled();
      await expect(page.getByTestId("delete-button-1")).not.toBeDisabled();
      // 选择之后单独的删除按钮应该不能使用，避免意外
      await page.getByTestId("row-checkbox-0").locator("label").check();
      await page.getByTestId("row-checkbox-1").locator("label").check();
      await page.getByTestId("row-checkbox-2").locator("label").check();
      await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (3)");
      await expect(page.getByTestId("delete-button-1")).toBeDisabled();
      await page.getByTestId("batch-delete-button").click();
      await page.getByRole("button", { name: "确 定" }).click();
      // 批量删除之后，应该没有记录
      await expect(page.getByRole("img", { name: "暂无数据" })).toBeVisible();
    });
  });
});
