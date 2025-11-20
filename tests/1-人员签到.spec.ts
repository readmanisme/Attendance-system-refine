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
  const today_short = dayjs().format("-MM-DD");
  const yesterday_short = "-11-07";
  const tomorrow_short = dayjs().add(1, "day").format("-MM-DD");
  // 完整时间用于判断
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = "2025-11-07";
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  await test.step("是今天", async () => {
    await expect(
      page.getByRole("textbox", { name: "请选择日期" }),
      "选择器应该显示今天"
    ).toHaveValue(today);
    await expect(page.getByTestId("today-alert"), "提示应该显示今天").toBeVisible();
  });

  await test.step("是明天", async () => {
    await page.getByRole("textbox", { name: "请选择日期" }).click();
    await page.getByTitle(tomorrow_short).click();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择明天成功").toHaveValue(
      tomorrow
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
      yesterday
    );
    // 不能fill，内容能塞进去，但是不会触发onChange事件
    await expect(page.getByTestId("past-alert"), "提示应该显示昨天").toBeVisible();
    // 应该获取到那一天的记录
    await expect(page.getByTestId("row-in-0")).toContainText("2025-11-07 07:00:00");
  });
  await test.step("还是今天", async () => {
    // await page.getByRole("textbox", { name: "请选择日期" }).click();
    // await page.getByTitle(today_short).click();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "请选择日期" }), "刷新后显示今天").toHaveValue(
      today
    );
    await expect(page.getByTestId("today-alert"), "提示应该显示今天").toBeVisible();
  });
});

test("时间测试", async ({ page }) => {
  /**
   * 1、测试+-30min按钮的时间约束，结束时间不能早于开始时间，也不能超出今天，因为时间选择器可以超出的；
   * 如果不使用按钮而是手动设置那么是不可能出现时间混乱的，因为选择器本身会保证时间有效。
   * 2、测试+-30min按钮的有效性，和工时提示tag显示时间是否正确。
   * 3、测试快速设置工时按钮的正确性
   */
  await page.goto(qiandao_url);
  await test.step("时间约束", async () => {
    // 切换到方便测试的时间
    await page.getByRole("textbox", { name: "开始时间" }).click();
    await page.getByRole("textbox", { name: "开始时间" }).fill("23:00");
    await page.getByRole("button", { name: "确 定" }).click();
    await page.getByRole("textbox", { name: "结束时间" }).fill("23:30");
    await page.getByRole("button", { name: "确 定" }).click();
    // 确认时间切换到要求值
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("23:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
    // 测试+，因为+30就会超出24小时，所以应该不会发生
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" }), "时间不会超出24小时").toHaveValue(
      "23:30"
    );
    // 测试-，因为-30就会早于开始时间，所以应该不会发生。【这里相等也不行，无所谓都一样】
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(
      page.getByRole("textbox", { name: "结束时间" }),
      "结束时间不会早于开始时间"
    ).toHaveValue("23:30");
  });
  await test.step("时间加减与工时计算", async () => {
    // 切换开始时间到18:00，结束时间上面调整到了23:30
    await page.getByRole("textbox", { name: "开始时间" }).click();
    await page.getByRole("textbox", { name: "开始时间" }).fill("18:00");
    await page.getByRole("button", { name: "确 定" }).click();
    await page.getByRole("button", { name: "确 定" }).click();
    // 此时工时应该是5.5小时
    await expect(page.getByTestId("time-difference")).toContainText("5.5小时");
    // 点击-30min，工时应该是5小时，结束时间也应该发生变化
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:00");
    await expect(page.getByTestId("time-difference")).toContainText("5小时");
    // 继续-30min
    await page.getByRole("button", { name: "-30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("22:30");
    await expect(page.getByTestId("time-difference")).toContainText("4.5小时");
    // +30min
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:00");
    await expect(page.getByTestId("time-difference")).toContainText("5小时");
    // +30min
    await page.getByRole("button", { name: "+30min" }).click();
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("23:30");
    await expect(page.getByTestId("time-difference")).toContainText("5.5小时");
  });
  await test.step("快速工时", async () => {
    // 测试tooltip显示
    await page.getByTestId("hour-tooltip").hover();
    await expect(page.getByRole("tooltip", { name: "从7:00开始" })).toBeVisible();
    // 设置2小时，确定时间选择器的值和工时计算tag
    await page.getByTestId("hour-button-2").click();
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("07:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("09:00");
    await expect(page.getByTestId("time-difference")).toContainText("2小时");
    // 7.5小时
    await page.getByTestId("hour-button-7.5").click();
    await expect(page.getByRole("textbox", { name: "开始时间" })).toHaveValue("07:00");
    await expect(page.getByRole("textbox", { name: "结束时间" })).toHaveValue("14:30");
    await expect(page.getByTestId("time-difference")).toContainText("7.5小时");
  });
});

test("录入校验", async ({ page }) => {
  /**
   * 测试录入记录的相关校验，包括人员校验，工作校验
   * 时间因为默认存在所以不检查
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
  // 测试表格能不能显示超过10条的
  const day = "2025-08-26";
  const day_short = "-08-26";
  await page.getByRole("textbox", { name: "请选择日期" }).click();
  await page.getByRole("textbox", { name: "请选择日期" }).fill(day);
  // 这是需要fill的原因是一旦日期不是2025-11，就会找不到2025-11-7
  // 而fill之后日期就会转到2025-11月，就能选择了。
  // 也可以考虑加确认，这样子点一下确认就好了
  // 不能直接fill，需要click后fill才能输进去。同时fill也不会改变值，需要点选或确认才行
  await page.getByTitle(day_short).click();
  await expect(page.getByRole("textbox", { name: "请选择日期" }), "选择成功").toHaveValue(day);
  // 不能fill，内容能塞进去，但是不会触发onChange事件
  await expect(page.getByTestId("past-alert"), "提示应该显示昨天").toBeVisible();
  // 应该获取到那一天的记录
  await expect(page.getByTestId("row-in-23")).toContainText("2025-08-26 07:00:00");
  // 顺便测试下全选
  await page.getByRole("checkbox", { name: "Select all" }).click();
  await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (24)");
});
test.describe("一条龙", async () => {
  /**
   * 添加人员，编辑人员，删除人员
   */
  const today = dayjs().format("YYYY-MM-DD");
  // 用于在意外失败和其他的情况下清除产生的多余的数据，避免污染数据库
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
  test("一条龙", async ({ page }) => {
    await page.goto(qiandao_url);
    // 日期应该是当天
    await expect(page.getByTestId("today-alert")).toBeVisible();
    let names;
    await test.step("录入", async () => {
      // 录入不使用工时按钮而是手动输入的人，后面也用于测试调整工时后会不会回到7点
      await page.getByTestId("py-search-select").click();
      await page.getByTitle("杜淑平").click();
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("重工").click();
      await page.getByRole("textbox", { name: "开始时间" }).click();
      await page.getByRole("textbox", { name: "开始时间" }).fill("09:00"); //这里必须写09而不是9,9会被当成18:00
      await page.getByRole("button", { name: "确 定" }).click();
      await page.getByRole("textbox", { name: "结束时间" }).fill("15:00");
      await page.getByRole("button", { name: "确 定" }).click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
            // 成功提示
      await expect(page.getByText('成功创建')).toBeVisible();
      // 选人，多选
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type("李红红");//因为前面选择杜淑平之后再次打开select第一个就会是杜淑平，看不到李红红了。
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
      // await page.keyboard.press("Backspace");
      // await page.keyboard.press("Backspace");
      await page.getByTitle("尤响林").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      // 5小时
      await page.getByTestId("hour-button-5").click();
      await page.getByTestId("submit-button").click();
      await page.getByRole("button", { name: "确 认" }).click();
      // 判断记录是否已经录入及其人员、状态、时间、工时、工作是否正确
      await expect(page.getByTestId("row-name-0")).toContainText("尤响林");
      await expect(page.getByTestId("row-status-0")).toContainText("已签退");
      // await expect(page.getByTestId("row-in-0")).toContainText("2025-11-17 07:00:00");
      // await expect(page.getByTestId("row-out-0")).toContainText("2025-11-17 12:00:00");
      await expect(page.getByTestId("row-in-0")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-0")).toContainText(today + " 12:00:00");
      await expect(page.getByTestId("row-time-0")).toContainText("5");
      await expect(page.getByTestId("row-work-0")).toContainText("三轮车司机");
      // 测试时间交叉检测，不允许冲突的记录产生
      // 选人
      await page.getByTestId("py-search-select").click();
      await page.getByTitle("尤响林").click();
      // 选工作
      await page.getByTestId("work-type-select").click();
      await page.getByTitle("三轮车司机").click();
      // 选时间，和之前的记录存在交叉
      await page.getByRole("textbox", { name: "开始时间" }).fill("6:00");
      await page.getByRole("textbox", { name: "结束时间" }).fill("8:00");
      // 相应的提示，以及不能提交
      await expect(page.getByTestId("overlap-alert")).toBeVisible();
      await expect(page.getByTestId("overlap-alert")).toContainText(
        `尤响林，所选时间与历史签到时间${today} 07:00:00至${today} 12:00:00有重叠`
      );
      await expect(page.getByTestId("submit-button")).toBeDisabled();
      // 选时间，和之前的记录存在交叉
      await page.getByRole("textbox", { name: "开始时间" }).fill("8:00");
      await page.getByRole("textbox", { name: "结束时间" }).fill("13:00");
      // // 相应的提示，以及不能提交
      await expect(page.getByTestId("overlap-alert")).toBeVisible();
      await expect(page.getByTestId("overlap-alert")).toContainText(
        `尤响林，所选时间与历史签到时间${today} 07:00:00至${today} 12:00:00有重叠`
      );
      await expect(page.getByTestId("submit-button")).toBeDisabled();
      // 因为同一批次创建的记录顺序不固定，所以只能这么做
      const first_name = await page.getByTestId("row-name-1").textContent();
      const second_name = await page.getByTestId("row-name-2").textContent();
      names = [first_name, second_name]; //"张着萍"和"李红红"
      // 判断第一条记录是否正确
      await expect(page.getByTestId("row-name-1")).toContainText(first_name);
      await expect(page.getByTestId("row-status-1")).toContainText("已签退");
      await expect(page.getByTestId("row-in-1")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-1")).toContainText(today + " 09:30:00");
      await expect(page.getByTestId("row-time-1")).toContainText("2.5");
      await expect(page.getByTestId("row-work-1")).toContainText("基础");
      // 判断第二条记录是否正确
      await expect(page.getByTestId("row-name-2")).toContainText(second_name);
      await expect(page.getByTestId("row-status-2")).toContainText("已签退");
      await expect(page.getByTestId("row-in-2")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-2")).toContainText(today + " 09:30:00");
      await expect(page.getByTestId("row-time-2")).toContainText("2.5");
      await expect(page.getByTestId("row-work-2")).toContainText("基础");
      // 判断第三条记录
      await expect(page.getByTestId("row-name-3")).toContainText("杜淑平");
      await expect(page.getByTestId("row-status-3")).toContainText("已签退");
      await expect(page.getByTestId("row-in-3")).toContainText(today + " 09:00:00");
      await expect(page.getByTestId("row-out-3")).toContainText(today + " 15:00:00");
      await expect(page.getByTestId("row-time-3")).toContainText("6");
      await expect(page.getByTestId("row-work-3")).toContainText("重工");
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
            // 成功提示
      // await expect(page.getByText('成功编辑')).toBeVisible();
      // 判断编辑是否生效
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      await expect(page.getByTestId("row-work-1")).toContainText("司机");
      // 确定cancel按键是否有效
      await page.getByTestId("edit-button-1").click();
      await page.getByTestId("cancel-button-1").click();
      await expect(page.getByTestId("row-time-1")).toContainText("3");
      // await expect(page.getByTestId("row-time-1")).not.toBeEditable();//这东西此时不是input，所以不能判断
      await expect(page.locator("#workTime")).not.toBeVisible();//只有编辑情况下才有这个
      await expect(page.getByTestId("row-work-1")).toContainText("司机"); //选择不好判断，因为其他工种都在页面里面
      // 编辑非七点开始的工时，编辑后应该从7点开始
      await page.getByTestId("edit-button-3").click();
      // 编辑工时，需要悬浮才会出现上下调整按键
      await page.locator("#workTime").hover();
      await page.getByRole("button", { name: "Increase Value" }).click();
      // 保存
      await page.getByTestId("save-button-3").click();
      // 判断编辑是否生效
      await expect(page.getByTestId("row-time-3")).toContainText("6.5");
      await expect(page.getByTestId("row-in-3")).toContainText(today + " 07:00:00");
      await expect(page.getByTestId("row-out-3")).toContainText(today + " 13:30:00");
    });
    await test.step("删除", async () => {
      // 测试删除按键的作用
      await page.getByTestId("delete-button-1").click();
      await page.getByRole("button", { name: "删 除" }).click();
            // 成功提示
      // await expect(page.getByText('成功删除')).toBeVisible();
      await expect(page.getByText(names[0])).not.toBeVisible();
    });
    await test.step("批量删除", async () => {
      // 测试批量删除功能
      // 未选择之前批量删除按钮禁用
      await expect(page.getByTestId("batch-delete-button")).toBeDisabled();
      // await page.getByTestId("row-checkbox-0").check();
      await page.getByTestId("row-checkbox-0").locator("label").check();
      await page.getByTestId("row-checkbox-1").locator("label").check();
      await page.getByTestId("row-checkbox-2").locator("label").check();
      // 选择之后单独的删除按钮应该不能使用，避免意外
      await expect(page.getByTestId("delete-button-1")).toBeDisabled();
      await expect(page.getByTestId("batch-delete-button")).toContainText("删除选中 (3)");
      await page.getByTestId("batch-delete-button").click();
      await page.getByRole("button", { name: "确 定" }).click();
            // 成功提示
      // await expect(page.getByText('成功删除')).toBeVisible();
      // 批量删除之后，应该没有记录。这个判断只适合完全没有记录的时候
      await page.getByRole("img", { name: "暂无数据" }).click();
    });
  });
});
