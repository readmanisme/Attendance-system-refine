import { test, expect } from "@playwright/test";
import { appUrl, workType_url } from "./constants";
import { TestDB } from "./helpers/pb";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

test.describe("工作 列表", () => {
  test("表格显示测试", async ({ page }) => {
    await db.ensureBaseWork();
    // 再造一个有记录的工种
    const worker = await db.seedWorker("测试老王");
    const workB = await db.seedWorkType("测试重工");
    await db.seedRecord({
      worker_id: worker.id,
      work: workB.id,
      work_date: "2020-01-02",
      work_minutes: 600,
    });
    await page.goto(appUrl(workType_url));
    // 显示提示
    await expect(page.getByTestId("delete-alert")).toBeVisible();
    await expect(page.getByTestId("Base-alert")).toBeVisible();
    // “基础”永远排第一行，数值为0
    await expect(page.getByTestId("row-name-0")).toContainText("基础");
    await expect(page.getByTestId("row-num-0")).toContainText("0");
    // 测试重工有1条记录(row-num 是记录条数,不是工时)
    await expect(page.getByTestId("row-name-1")).toContainText("测试重工");
    await expect(page.getByTestId("row-num-1")).toContainText("1");
    // 基础工种不能删除和编辑
    await expect(page.getByTestId("edit-button-0")).toBeDisabled();
    await expect(page.getByTestId("delete-button-0")).toBeDisabled();
  });
});
test.describe("无基础工作提示", () => {
  test("无基础工作提示", async ({ page }) => {
    /**
     * 测试库是空库(没有"基础"工种)，天然覆盖初始场景：
     * 1、进入工作页面应提示缺少基础工作
     * 2、点击"添加基础工作"按钮后应创建"基础"工种(时薪10)并显示
     * 3、薪资页面应出现无工人/基础/10 的条目
     * (UI 创建的数据由 afterEach 的 created 时间范围兜底清理)
     */
    await page.goto(appUrl(workType_url));
    // 数据为空，无行，只有"基础"栏
    await expect(page.locator(".anticon.anticon-warning > svg")).toBeVisible();
    await expect(
      page.getByText("缺少基础工作，点击下方按钮添加基础工作及其时薪（时薪后续可修改）"),
    ).toBeVisible();
    // 点击添加
    await page.getByTestId("add-base-work-button").click();
    // 确认存在
    await expect(page.getByTestId("row-name-0")).toContainText("基础");
    await expect(page.getByTestId("row-num-0")).toContainText("0"); //没有任何考勤记录
    await expect(page.getByTestId("Base-alert")).toBeVisible();
    // 前往薪资页面查看
    await page.getByRole("link", { name: "薪资设置" }).click();
    // 判断信息
    await expect(page.getByTestId("row-work-0")).toContainText("基础");
    await expect(page.getByTestId("row-worker-0")).toBeEmpty();
    await expect(page.getByTestId("row-salary-0")).toContainText("10"); //基础时薪默认10
  });
});
test.describe("工作 创建", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(appUrl(workType_url + "/create"));

    await test.step("默认内容", async () => {
      // 显示提示
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("unknown-alert")).toBeVisible();
      await expect(page.getByTestId("leave-alert")).toBeVisible();
      // 输入是空，不能保存
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("下划线", async () => {
      const texts = ["_郝致远", "郝致远_", "郝_致远"];
      const text = "郝致远";
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作包含下划线：_郝致远郝致远_郝_致远",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
      await page.getByTestId("name-input").clear();
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("unknown-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("特殊符号", async () => {
      const texts = [
        "郝.致远",
        "郝/致远",
        "郝<致远",
        "郝>致远",
        "郝|致远",
        "郝'致远",
        '郝"致远',
        "郝`致远",
        "郝:致远",
        "郝?致远",
        "郝*致远",
        "郝%致远",
      ];
      const text = "郝致远";
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作包含特殊字符：郝.致远郝/致远郝<致远郝>致远郝|致远郝'致远郝\"致远郝`致远郝:致远郝?致远郝*致远郝%致远",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("重复", async () => {
      const texts = ["郝致远", "郝致远"];
      const text = "郝致远新";
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText("以下工作重复或已存在：郝致远");
      await expect(page.getByTestId("save-button")).toBeDisabled();
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      // 预置两个真实存在的工种
      await db.seedWorkType("测试重工");
      await db.seedWorkType("测试三轮车司机");
      const texts = ["测试重工", "测试三轮车司机"];
      const text = "测试新工种";
      texts.push(text);
      // 种子数据创建于页面加载之后，必须整页 reload 让 refine 重新拉取工种列表
      // （goto 相同 URL 是同文档导航，不会重载页面）
      await page.reload();
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作重复或已存在：测试重工测试三轮车司机",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("未保存提醒", async () => {
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("您确定要离开吗？您有未保存的更改。");
        dialog.dismiss().catch(() => {});
      });
      await page.getByRole("button", { name: "arrow-left" }).click();
    });
  });
});
test.describe("工作 编辑", () => {
  test("校验测试", async ({ page }) => {
    const work = await db.seedWorkType("测试司机");
    await db.seedWorkType("测试三轮车司机");
    await page.goto(appUrl(workType_url + `/edit/${work.id}`)); //测试司机
    await test.step("默认内容", async () => {
      // 显示提示
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      // 校验逻辑排除自己，编辑初始名字不报"已存在"，保存可用
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      // 确认内容正确；不能编辑id
      await expect(page.getByTestId("name-input")).toHaveValue("测试司机");
      await expect(page.getByTestId("id-input")).toBeDisabled();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    // 下面和创建一样测试下划线，特殊字符，已存在，未保存提醒
    await test.step("下划线", async () => {
      const texts = ["_郝致远", "郝致远_", "郝_致远"];
      const text = "郝致远";
      for (const t of texts) {
        await page.getByTestId("name-input").fill(t);
        await expect(page.getByTestId("name-input")).toHaveValue(t);
        await expect(page.getByTestId("error-alert")).toContainText("工作不能包含下划线");
        await expect(page.getByTestId("save-button")).toBeDisabled();
      }

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();

      await page.getByTestId("name-input").clear();
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("error-alert")).toContainText("工作不能为空");
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("特殊字符", async () => {
      const texts = [
        "郝.致远",
        "郝/致远",
        "郝<致远",
        "郝>致远",
        "郝|致远",
        "郝'致远",
        '郝"致远',
        "郝`致远",
        "郝:致远",
        "郝?致远",
        "郝*致远",
        "郝%致远",
      ];
      const text = "郝致远";
      for (const t of texts) {
        await page.getByTestId("name-input").fill(t);
        await expect(page.getByTestId("name-input")).toHaveValue(t);
        await expect(page.getByTestId("error-alert")).toContainText("工作不能包含特殊字符");
        await expect(page.getByTestId("save-button")).toBeDisabled();
      }

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      const text = "测试三轮车司机";
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).toContainText(
        "工作已存在，若不想继续编辑可返回",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("未保存提醒", async () => {
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("您确定要离开吗？您有未保存的更改。");
        dialog.dismiss().catch(() => {});
      });
      await page.getByRole("button", { name: "arrow-left" }).click();
    });
  });
});
test.describe("工作 创建删除编辑", () => {
  test("创建删除编辑", async ({ page }) => {
    // 预置一个有记录的工种，用于验证"有记录的工种的删除提示不一样"
    await db.ensureBaseWork();
    const worker = await db.seedWorker("测试老王");
    const oldWork = await db.seedWorkType("测试有记录的工种");
    await db.seedRecord({
      worker_id: worker.id,
      work: oldWork.id,
      work_date: "2020-01-03",
      work_minutes: 240,
    });
    await page.goto(appUrl(workType_url));
    let names;
    await test.step("创建", async () => {
      // 创建，其中一个有空格，以测试提交之前对空格的删除
      await page.getByTestId("create-button").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("测试张三三撒\n   测试李四思思");
      await page.getByTestId("save-button").click();
      // 成功提示
      await expect(page.getByText("成功创建")).toBeVisible();
      // 新工种的记录数应该是0(“基础”是第0行,两个新工种在第1、2行)
      await expect(page.getByTestId("row-num-1")).toContainText("0");
      await expect(page.getByTestId("row-num-2")).toContainText("0");
      // 两人先后顺序不固定
      const first_name = await page.getByTestId("row-name-1").textContent();
      const second_name = await page.getByTestId("row-name-2").textContent();
      names = [first_name, second_name];
      expect(names).toContainEqual("测试张三三撒");
      expect(names).toContainEqual("测试李四思思");
    });
    await test.step("删除", async () => {
      // 删除一个新工种
      await page.getByTestId("delete-button-1").click();
      await expect(page.getByText("确定删除吗？")).toBeVisible();
      await page.getByRole("button", { name: "删 除" }).click();
      // 剩下的行: 基础(0)、另一个新工种(1)、测试有记录的工种(2)
      await expect(page.getByTestId("row-name-1")).toContainText(names[1]);
      // 有记录的工种的删除提醒不一样
      await page.getByTestId("delete-button-2").click();
      await expect(page.getByText("删除工作将一并删除相关考勤记录！")).toBeVisible();
      await page.getByRole("button", { name: "取 消" }).click();
    });
    await test.step("编辑", async () => {
      await page.getByTestId("edit-button-1").click();
      // 测试回到主页
      await page.getByRole("button", { name: "bars 工作管理" }).click();
      await expect(page.getByTestId("Base-alert")).toBeVisible();
      // 编辑
      await page.getByTestId("edit-button-1").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("测试李四思思111");
      await page.getByTestId("save-button").click();
      // 判断结果
      await expect(page.getByTestId("row-name-1")).toContainText("测试李四思思111");
    });
  });
});
