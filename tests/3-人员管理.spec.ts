import { test, expect } from "@playwright/test";
import { appUrl, workers_url } from "./constants";
import { TestDB } from "./helpers/pb";
import { clearPySearchSelect, setPageSize } from "./helpers/ui";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

/** 12 人撑出两页(默认10条/页) */
async function seedPagingWorkers() {
  return db.seedWorkers(
    Array.from({ length: 12 }, (_, i) => `测试工人${String(i + 1).padStart(2, "0")}`),
  );
}

test.describe("人员 列表", () => {
  test("表格显示测试", async ({ page }) => {
    await seedPagingWorkers();
    await page.goto(appUrl(workers_url));
    await test.step("默认显示", async () => {
      await expect(page.getByTestId("delete-alert")).toBeVisible();
      // 排序按 created 逆序: 最后创建的"测试工人12"是第一行；新人记录数量为0
      await expect(page.getByTestId("row-name-0")).toContainText("测试工人12");
      await expect(page.getByTestId("row-num-0")).toContainText("0");
      // 第一页最后一行是最早创建的"测试工人03"(第二页还有10人,所以是row-9)
      await expect(page.getByTestId("row-name-9")).toContainText("测试工人03");
    });
    await test.step("翻页", async () => {
      await page.getByRole("link", { name: "2" }).click();
      // 第二页只有剩余的两个人
      await expect(page.getByTestId("row-name-0")).toContainText("测试工人02");
      await expect(page.getByTestId("row-name-1")).toContainText("测试工人01");
      await page.getByRole("link", { name: "1" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("测试工人12");
    });
    await test.step("分页", async () => {
      await setPageSize(page, "20 条/页");
      // 20条/页下 12 人全在一页
      await expect(page.getByTestId("row-name-11")).toContainText("测试工人01");
      await expect(page.getByTestId("row-num-11")).toContainText("0");
      await setPageSize(page, "10 条/页");
      await expect(page.getByTestId("row-name-0")).toContainText("测试工人12");
    });
  });
  test("搜索测试", async ({ page }) => {
    const workers = await seedPagingWorkers();
    const targetA = workers[0]; // 测试工人01
    const targetB = workers[5]; // 测试工人06
    await page.goto(appUrl(workers_url));
    await page.getByRole("link", { name: "2" }).click();
    await test.step("单个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type(targetA.name.replace("测试", ""));
      await page.getByTitle(targetA.name).click();
      await page.getByTestId("py-search-button").click();
      // 只显示目标一人，且回到第一页
      const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
      expect(names.map((n) => n.trim()), "只显示搜索目标").toEqual([targetA.name]);
      await expect(page.getByRole("link", { name: "2" })).not.toBeVisible();
    });
    await test.step("多个", async () => {
      await page.getByTestId("py-search-select").click();
      await page.keyboard.type(targetB.name.replace("测试", ""));
      await page.getByTitle(targetB.name).click();
      await page.getByTestId("py-search-button").click();
      const names = await page.locator('[data-testid^="row-name-"]').allTextContents();
      expect(new Set(names.map((n) => n.trim())), "显示两个人").toEqual(
        new Set([targetA.name, targetB.name]),
      );
    });
    await test.step("复原", async () => {
      // 用 clear 图标清理已选人(Backspace 清多选有焦点竞态)
      await clearPySearchSelect(page);
      await page.getByTestId("py-search-button").click();
      // 复原后重新出现两页，第一页仍是默认排序
      await expect(page.getByRole("link", { name: "2" })).toBeVisible();
      await expect(page.getByTestId("row-name-0")).toContainText("测试工人12");
    });
  });
});

test.describe("人员 创建", () => {
  /** 提供两个已存在的人员给“已存在”校验使用 */
  async function seedExistingWorkers() {
    return db.seedWorkers(["测试马小琴", "测试魏变变"]);
  }

  test("校验测试", async ({ page }) => {
    await seedExistingWorkers();
    await page.goto(appUrl(workers_url + "/create"));

    await test.step("默认内容", async () => {
      // 显示提示，名字是空的，不能提交
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("unknown-alert")).toBeVisible();
      await expect(page.getByTestId("leave-alert")).toBeVisible();
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("下划线", async () => {
      const texts = ["_郝致远", "郝致远_", "郝_致远"];
      const text = "郝致远";
      texts.push(text);
      // 输入姓名，包含下划线，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下姓名包含下划线：_郝致远郝致远_郝_致远",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不包含下划线，提示成功，可以提交
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
      // 清空，提示未知，不能提交
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
      // 输入姓名，包含特殊字符，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下姓名包含特殊字符：郝.致远郝/致远郝<致远郝>致远郝|致远郝'致远郝\"致远郝`致远郝:致远郝?致远郝*致远郝%致远",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不包含特殊字符，提示成功，可以提交
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("重复", async () => {
      const texts = ["郝致远", "郝致远"];
      const text = "张三";
      texts.push(text);
      // 输入姓名，重复，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText("以下姓名重复或已存在：郝致远");
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不重复，提示成功，可以提交
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      const texts = ["测试马小琴", "测试魏变变"];
      const text = "郝致远";
      texts.push(text);
      // 输入姓名，已存在，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下姓名重复或已存在：测试马小琴测试魏变变",
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不重复，提示成功，可以提交
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

test.describe("人员 编辑", () => {
  test("校验测试", async ({ page }) => {
    const worker = await db.seedWorker("测试魏变变");
    const others = await db.seedWorkers(["测试马小琴"]);
    await page.goto(appUrl(workers_url + `/edit/${worker.id}`));
    await test.step("默认内容", async () => {
      // 显示提示；内容正确；id不能改。
      // 校验逻辑排除自己，所以编辑初始名字不报"已存在"，保存可用
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      await expect(page.getByTestId("name-input")).toHaveValue("测试魏变变");
      await expect(page.getByTestId("id-input")).toBeDisabled();
      expect(others.length).toBe(1);
    });
    // 然后和创建一样测试下划线，特殊字符，已存在。
    await test.step("下划线", async () => {
      const texts = ["_郝致远", "郝致远_", "郝_致远"];
      const text = "郝致远";
      for (const t of texts) {
        await page.getByTestId("name-input").fill(t);
        await expect(page.getByTestId("name-input")).toHaveValue(t);
        await expect(page.getByTestId("error-alert")).toContainText("姓名不能包含下划线");
        await expect(page.getByTestId("save-button")).toBeDisabled();
      }

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();

      await page.getByTestId("name-input").clear();
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("error-alert")).toContainText("姓名不能为空");
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
        await expect(page.getByTestId("error-alert")).toContainText("姓名不能包含特殊字符");
        await expect(page.getByTestId("save-button")).toBeDisabled();
      }

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).not.toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      const text = "测试马小琴";
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).toContainText(
        "姓名已存在，若不想继续编辑可返回",
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

test.describe("人员 创建删除编辑", () => {
  test("创建删除编辑", async ({ page }) => {
    // 预置一个有记录的人员，用于验证"有记录的人的删除提示不一样"
    await db.ensureBaseWork();
    const workA = await db.seedWorkType("测试搬砖");
    const oldWorker = await db.seedWorker("测试有记录的人");
    await db.seedRecord({
      worker_id: oldWorker.id,
      work: workA.id,
      work_date: "2020-01-01",
      work_minutes: 300,
    });
    await page.goto(appUrl(workers_url));
    let names;
    await test.step("创建", async () => {
      // 创建人员，一个有空格用来测试自动去除空格的功能
      await page.getByTestId("create-button").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("测试张三三撒\n   测试李四思思"); //空格用来确定数据处理的时候有没有删掉空格
      await page.getByTestId("save-button").click();
      //成功提示
      await expect(page.getByText("成功创建")).toBeVisible();
      // 两个人的记录数量应该是0.
      await expect(page.getByTestId("row-num-0")).toContainText("0");
      await expect(page.getByTestId("row-num-1")).toContainText("0");
      // 新人按 created 逆序排在最前面，两人先后顺序不固定
      const first_name = await page.getByTestId("row-name-0").textContent();
      const second_name = await page.getByTestId("row-name-1").textContent();
      names = [first_name, second_name];
      expect(names).toContainEqual("测试张三三撒"); //这个断言就是我需要的，适合数组的
      expect(names).toContainEqual("测试李四思思");
    });
    await test.step("删除", async () => {
      // 删除人员，并测试提示；
      await page.getByTestId("delete-button-0").click();
      await expect(page.getByText("确定删除吗？")).toBeVisible();
      await page.getByRole("button", { name: "删 除" }).click();
      // 删除后剩下的第一行是另一个新人
      await expect(page.getByTestId("row-name-0")).toContainText(names[1]);
      // 有记录的人的删除提示应该不一样(此时只剩两行: 新人第0行,旧人员第1行)
      await page.getByTestId("delete-button-1").click();
      await expect(page.getByText("删除此人将一并删除相关考勤记录！")).toBeVisible();
      await page.getByRole("button", { name: "取 消" }).click();
    });
    await test.step("编辑", async () => {
      // 测试编辑功能
      await page.getByTestId("edit-button-0").click();
      // 测试回到主页的功能
      await page.getByRole("button", { name: "bars 人员管理" }).click();
      await expect(page.getByTestId("delete-alert")).toBeVisible();
      // 编辑
      await page.getByTestId("edit-button-0").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("测试李四思思111");
      await page.getByTestId("save-button").click();
      // 判断结果
      await expect(page.getByTestId("row-name-0")).toContainText("测试李四思思111");
    });
  });
});
