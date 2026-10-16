import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import { AttendanceRecord_TableName, Backend_URL, qiandao_url } from "./constants";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);

test("日期检测检查", async ({ page }) => {
  /**
   * 1、测试日期选择器默认是不是今天，提示是不是显示今天
   * 2、日期切换到2025-11-7，提示是不是显示过去日期，同时判断有没有获取到签到记录
   * 3、日期切换到明天，提示是不是显示明天
   * 4、刷新后日期应该切换到今天，提示是不是显示今天
   */
  await page.goto(qiandao_url);
  // short时间用于选择
  const yesterday_short = "-11-07";
  const tomorrow_short = dayjs().add(1, "day").format("-MM-DD");
  // 完整时间用于判断
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = "2025-11-07";
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  await test.step("是今天", async () => {
    await expect(
      page.getByRole("textbox", { name: "请选择日期" }),
      "选择器应该显示今天",
    ).toHaveValue(today);
    await expect(page.getByTestId("today-alert"), "提示应该显示今天").toBeVisible();
  });

  await test.step("是明天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(tomorrow_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择明天成功").toHaveValue(
      tomorrow,
    );
    await expect(page.getByTestId("future-alert"), "提示应该显示明天").toBeVisible();
  });
  await test.step("是2025-11-7", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByRole("textbox", { name: "请选择日期" }).fill(yesterday);
    // 这是需要fill的原因是一旦日期不是2025-11，就会找不到2025-11-7
    // 而fill之后日期就会转到2025-11月，就能选择了。
    // 也可以考虑加确认，这样子点一下确认就好了
    // 不能直接fill，需要click后fill才能输进去。同时fill也不会改变值，需要点选或确认才行
    await page.getByTitle(yesterday_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择成功").toHaveValue(
      yesterday,
    );
    // 不能fill，内容能塞进去，但是不会触发onChange事件
    await expect(page.getByTestId("past-alert"), "提示应该显示昨天").toBeVisible();
    // 应该获取到那一天的记录（2025-11-07有4条）
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
   * 1、测试+-30min/+10min按钮 hoursInput 的有效性，和工时显示tag是否正确。
   * 2、测试快速设置工时按钮的正确性
   * 3、直接输入小时，包括小数（如1/3小时）
   */
  await page.goto(qiandao_url);
  await test.step("默认值", async () => {
    await expect(page.getByTestId("time-difference"), "默认5小时").toContainText("300分钟");
    await expect(page.getByTestId("hours-input"), "输入框显示5小时").toHaveValue("5小时");
  });
  await test.step("加减分钟", async () => {
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("330分钟");
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("300分钟");
    await page.getByRole("button", { name: "+10min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("310分钟");
    await page.getByRole("button", { name: "-10min" }).click();
    await expect(page.getByTestId("time-difference")).toContainText("300分钟");
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
  await page.goto(qiandao_url);
  // 未选人提示，同时不能提交
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 选人
  await page.getByTestId("py-search-select").click();
  await page.getByTitle("李红红").click();
  // 这里要选择直接能看到的，不然报错，而且会显示为菜单未弹出误导人。
  // 选了人，没选工作，提示。还是不能提交
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 选择工作
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("三轮车司机").click();
  // 现在可以提交
  await expect(page.getByTestId("submit-button")).not.toBeDisabled();
  await expect(page.getByTestId("can-input-alert")).toBeVisible();
  // 清除工作，就不能提交，还会有提示
  await page.getByTestId("work-type-select").hover();
  await page.getByTestId("clear-icon").click();
  await expect(page.getByTestId("no-work-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
  // 删了人，有提示，不能提交
  await page.getByTestId("py-search-select").click();
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("no-worker-alert")).toBeVisible();
  await expect(page.getByTestId("submit-button")).toBeDisabled();
});
test("表格显示", async ({ page }) => {
  await page.goto(qiandao_url);
  // 两个alert
  await expect(page.getByTestId("edit-alert"), "编辑提示").toBeVisible();
  await expect(page.getByTestId("search-alert"), "搜索提示").toBeVisible();
  // 测试表格能不能显示超过10条的（2025-08-26有7条迁移后记录）
  const day = "2025-08-26";
  const day_short = "-08-26";
  await page.getByRole("textbox", { name: "请选择日期" }).click();
  await page.getByRole("textbox", { name: "请选择日期" }).fill(day);
  // 这是需要fill的原因是一旦日期不是2025-11，就会找不到2025-8-26
  // 而fill之后日期就会转到2025-08月，就能选择了。
  await page.getByTitle(day_short).click();
  await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择成功").toHaveValue(day);
  await expect(page.getByTestId("past-alert"), "提示应该显示过去").toBeVisible();
  // 应该获取到那一天的记录
  await expect(page.getByTestId("row-name-6")).toBeVisible();
  // 顺便测试下全选
  await page.getByRole("checkbox", { name: "Select all" }).click();
  await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (7)");
});
test.describe("一条龙", async () => {
  /**
   * 录入、自动合并、编辑、删除人员考勤记录
   */
  const today = dayjs().format("YYYY-MM-DD");
  // 用于在意外失败和其他的情况下清除产生的多余的数据，避免污染数据库
  test.afterEach(async () => {
    const records = await pb.collection(AttendanceRecord_TableName).getFullList({
      filter: 'created > "2025-11-10"',
    });
    const ids = records.map((record) => record.id);
    if (ids.length === 0) return; //空数据发batch也会报错
    // PB 单个batch请求最多999条，分块发送
    for (let i = 0; i < ids.length; i += 250) {
      const batch = pb.createBatch();
      for (const id of ids.slice(i, i + 250)) {
        batch.collection(AttendanceRecord_TableName).delete(id);
      }
      const result = await batch.send();
      expect(result.every((r) => r.status === 204)).toBe(true); //body是null
    }
  });
  test("一条龙", async ({ page }) => {
    await page.goto(qiandao_url);
    // 日期应该是当天
    await expect(page.getByTestId("today-alert")).toBeVisible();
    let names;
    await test.step("录入", async () => {
      // 录入不使用工时按钮而是手动输入的人
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("杜淑平"); //虚拟列表只渲染前10个选项，直接键入名字过滤后再点选
      await page.getByTitle("杜淑平").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("重工").click();
      await page.getByTestId("hours-input").click();
      await page.getByTestId("hours-input").fill("6");
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
      // 成功提示
      await expect(page.getByText("成功创建")).toBeVisible();
      // 选人，多选
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("李红红"); //因为前面选择杜淑平之后再次打开select第一个就会是杜淑平，看不到李红红了。
      await page.getByTitle("李红红").click();
      await page.getByTitle("张着萍").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("基础").click();
      // 2.5小时
      await page.getByTestId("hour-button-2.5").click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
      // 选人，单选；录入之后自动清空人员和工作所以不需要手动清除
      await page.getByTestId("py-search-select").click();
      await page.getByTitle("尤响林").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      // 5小时
      await page.getByTestId("hour-button-5").click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
      // 判断记录是否已经录入及其人员、工时、工作是否正确（新记录在前）
      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-time-0")).toContainText("5");
      await expect(page.getByTestId("row-work-0")).toContainText("三轮车司机");
      // 因为同一批次创建的记录顺序不固定，所以只能这么做
      const first_name = await page.getByTestId("row-name-1").textContent();
      const second_name = await page.getByTestId("row-name-2").textContent();
      names = [first_name, second_name]; //"张着萍"和"李红红"
      // 判断第一条记录是否正确
      await expect(page.getByTestId("row-name-1")).toContainText(first_name!);
      await expect(page.getByTestId("row-time-1")).toContainText("2.5");
      await expect(page.getByTestId("row-work-1")).toContainText("基础");
      // 判断第二条记录是否正确
      await expect(page.getByTestId("row-name-2")).toContainText(second_name!);
      await expect(page.getByTestId("row-time-2")).toContainText("2.5");
      await expect(page.getByTestId("row-work-2")).toContainText("基础");
      // 判断第三条记录
      await expect(page.getByTestId("row-name-3")).toContainText("杜淑平");
      await expect(page.getByTestId("row-time-3")).toContainText("6");
      await expect(page.getByTestId("row-work-3")).toContainText("重工");
    });
    await test.step("同人同工种自动合并", async () => {
      // 尤响林再录一次同样的工作，应该提示合并并且合并为一条（5+2.5=7.5）
      await page.getByTestId("py-search-select").click();
      await page.getByTitle("尤响林").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      await page.getByTestId("hour-button-2.5").click();
      await expect(page.getByTestId("merge-alert")).toContainText("尤响林，当天已有三轮车司机记录");
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
      // 合并后仍然只有一条尤响林记录，工时变为7.5，且不会多出新行
      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-time-0")).toContainText("7.5");
    });
    await test.step("编辑", async () => {
      // 可编辑表格
      await page.getByTestId("edit-button-1").click();
      // 编辑状态下看不到删除按钮
      await expect(page.getByTestId("delete-button-1")).not.toBeVisible();
      // 编辑工时，需要悬浮才会出现上下调整按键
      await page.locator("#workTime").hover();
      await page.getByRole("button", { name: "Increase Value" }).click();
      // 编辑工作
      await page.getByTestId("row-work-1").getByText("基础").click();
      await page.getByTitle("司机").nth(3).click();
      // 保存
      await page.getByTestId("save-button-1").click();
      // 判断编辑是否生效
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      await expect(page.getByTestId("row-work-1")).toContainText("司机");
      // 确定cancel按键是否有效
      await page.getByTestId("edit-button-1").click();
      await page.getByTestId("cancel-button-1").click();
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      await expect(page.locator("#workTime")).not.toBeVisible(); //只有编辑情况下才有这个
      await expect(page.getByTestId("row-work-1")).toContainText("司机"); //选择不好判断，因为其他工种都在页面里面
      // 编辑杜淑平的工时
      await page.getByTestId("edit-button-3").click();
      await page.locator("#workTime").hover();
      await page.getByRole("button", { name: "Increase Value" }).click();
      await page.getByTestId("save-button-3").click();
      // 判断编辑是否生效
      await expect(page.getByTestId("row-time-3")).toContainText("6.5");
    });
    await test.step("删除", async () => {
      // 测试删除按键的作用
      await page.getByTestId("delete-button-1").click();
      await page.getByRole("button", { name: "删 除" }).click();
      await expect(page.getByText(names[0])).not.toBeVisible();
    });
    await test.step("批量删除", async () => {
      // 测试批量删除功能
      // 未选择之前批量删除按钮禁用
      await expect(page.getByTestId("batch-delete-button")).toBeDisabled();
      // 选择之后单独的删除按钮应该不能使用，避免意外
      await expect(page.getByTestId("delete-button-1")).toBeDisabled();
      await page.getByTestId("row-checkbox-0").locator("label").check();
      await page.getByTestId("row-checkbox-1").locator("label").check();
      await page.getByTestId("row-checkbox-2").locator("label").check();
      await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (3)");
      await page.getByTestId("batch-delete-button").click();
      await page.getByRole("button", { name: "确 定" }).click();
      // 批量删除之后，应该没有记录。这个判断只适合完全没有记录的时候
      await page.getByRole("img", { name: "暂无数据" }).click();
    });
  });
});
