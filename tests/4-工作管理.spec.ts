import { test, expect } from "@playwright/test";
import {
  WorkTypes_TableName,
  Backend_URL,
  workType_url,
  API_URL,
  SalaryType_TableName,
  xinzi_url,
} from "./constants";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);

test.describe("工作 列表", () => {
  test("表格显示测试", async ({ page }) => {
    await page.goto(workType_url);
    // 显示提示
    await expect(page.getByTestId("delete-alert")).toBeVisible();
    await expect(page.getByTestId("Base-alert")).toBeVisible();
    // 表格内容
    await expect(page.getByTestId("row-name-0")).toContainText("基础");
    await expect(page.getByTestId("row-num-1")).toContainText("1671");
    await expect(page.getByTestId("row-name-1")).toContainText("重工");
    await expect(page.getByTestId("row-num-1")).toContainText("243");

    // 基础工种不能删除和编辑
    await expect(page.getByTestId("edit-button-3")).toBeDisabled();
    await expect(page.getByTestId("delete-button-3")).toBeDisabled();
  });
  // test("搜索测试", async ({ page }) => {}); //因为工作很少所以没有搜索
});
test.describe("无基础工作提示", () => {
  test.afterEach(async ({ page }) => {
    // 创建操作涉及到两张表，所以都要处理
    const tables = [WorkTypes_TableName, SalaryType_TableName];
    for (const table of tables) {
      const records = await pb.collection(table).getFullList({
        filter: 'created > "2025-11-10"',
      });
      const ids = records.map((record) => record.id);
      if (ids.length === 0) return; //空数据发batch也会报错
      const batch = pb.createBatch();
      for (const id of ids) {
        batch.collection(table).delete(id);
      }
      const result = await batch.send();
      expect(result.every((r) => r.status === 204)).toBe(true); //body是null
    }
  });
  test("无基础工作提示", async ({ page }) => {
    await page.route(
      API_URL +
        "/collections/workType_test/records?page=1&perPage=500&skipTotal=1&sort=-created&filter=",
      async (route) => {
        const json = {
          items: [],
          page: 1,
          perPage: 500,
          totalItems: -1,
          totalPages: -1,
        };
        await route.fulfill({
          json,
        });
      }
    );
    await page.goto(workType_url);
    await expect(page.getByTestId("no-Base-result")).toContainText(
      "缺少基础工作，点击下方按钮添加基础工作及其时薪（时薪后续可修改）"
    );
    await page.route(
      API_URL +
        "/collections/workType_test/records?page=1&perPage=500&skipTotal=1&sort=-created&filter=",
      async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        // 去除json中所有id不是basebasebase的项
        json.items = json.items.filter((item: any) => item.id === "basebasebase");
        // Fulfill using the original response, while patching the response body
        // with the given JSON object.
        await route.fulfill({ response, json });
      }
    );
    await page.getByTestId("add-base-work-button").click();
    // 确认存在
    await expect(page.getByTestId("row-id-0")).toContainText("basebasebase");
    await expect(page.getByTestId("row-name-0")).toContainText("基础");
    await expect(page.getByTestId("row-num-0")).toContainText("0"); //因为id不是之前哪个基础呢
    // 前往薪资页面查看
    await page.route(
      API_URL +
        "/collections/SalaryType_test/records?page=1&perPage=10&filter=&expand=worker_name%2Cwork_type",
      async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        // 去除json中所有id不是basebasebase的项
        json.items = json.items.filter((item: any) => item.id === "basebasebase1");
        // Fulfill using the original response, while patching the response body
        // with the given JSON object.
        await route.fulfill({ response, json });
      }
    );
    await page.goto(xinzi_url);
    // 判断信息
    await expect(page.getByTestId("row-id-0")).toContainText("basebasebase1");
    await expect(page.getByTestId("row-work-0")).toContainText("基础");
    await expect(page.getByTestId("row-worker-0")).toBeEmpty();
    await expect(page.getByTestId("row-salary-0")).toContainText("10"); //因为id不是之前哪个基础呢
  });
}); // 因为工作很少所以没有搜索
test.describe("工作 创建", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(workType_url + "/create");

    await test.step("默认内容", async () => {
      // 显示提示
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("unknown-alert")).toBeVisible();
      // 输入是空，不能保存
      await expect(page.getByTestId("name-input")).toBeEmpty();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    await test.step("下划线", async () => {
      // 测试下划线
      const texts = ["_郝致远", "郝致远_", "郝_致远"];
      const text = "郝致远";
      texts.push(text);
      // 输入姓名，包含下划线，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作包含下划线：_郝致远郝致远_郝_致远"
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
      // 测试特殊字符
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
        "以下工作包含特殊字符：郝.致远郝/致远郝<致远郝>致远郝|致远郝'致远郝\"致远郝`致远郝:致远郝?致远郝*致远郝%致远"
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不包含特殊字符，提示成功，可以提交
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("重复", async () => {
      // 测试重复
      const texts = ["郝致远", "郝致远"];
      const text = "张三";
      texts.push(text);
      // 输入姓名，重复，提示错误，不能提交
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText("以下工作重复或已存在：郝致远");
      await expect(page.getByTestId("save-button")).toBeDisabled();
      // 输入姓名，不重复，提示成功，可以提交
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      //   测试已存在
      const texts = ["重工", "三轮车司机"];
      const text = "郝致远";
      // 输入姓名，已存在，提示错误，不能提交
      await page.goto(workType_url + "/create"); //因为即便路由更换了，但是数据并没有获取新的，所以需要重开
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作重复或已存在：重工三轮车司机"
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
test.describe("工作 编辑", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(workType_url + "/edit/43ymx595z40s89g"); //司机
    await test.step("默认内容", async () => {
      // 显示提示
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("error-alert")).toContainText(
        "工作已存在，若不想继续编辑可返回"
      );
      // 确认内容正确；不能编辑id；不能提交
      await expect(page.getByTestId("name-input")).toHaveValue("司机");
      await expect(page.getByTestId("id-input")).toBeDisabled();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
    // 下面和之前一样测试下划线，特殊字符，重复，已存在，未保存提醒
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
      const text = "三轮车司机";
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).toContainText(
        "工作已存在，若不想继续编辑可返回"
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
  // 数据清理
  test.afterEach(async ({ page }) => {
    const records = await pb.collection(WorkTypes_TableName).getFullList({
      filter: 'created > "2025-11-10"',
    });
    const ids = records.map((record) => record.id);
    if (ids.length === 0) return; //空数据发batch也会报错
    const batch = pb.createBatch();
    for (const id of ids) {
      batch.collection(WorkTypes_TableName).delete(id);
    }
    const result = await batch.send();
    expect(result.every((r) => r.status === 204)).toBe(true); //body是null
  });
  test("创建删除编辑", async ({ page }) => {
    await page.goto(workType_url);
    let names;
    await test.step("创建", async () => {
      // 创建，其中一个有空格，以测试提交之前对空格的删除；空格在前面这样ui里面方便看得到
      await page.getByTestId("create-button").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("张三三撒\n   李四思思"); //空格用来确定数据处理的时候有没有删掉空格,下面判定也改成相等了
      await page.getByTestId("save-button").click();
      // 记录数应该是0
      await expect(page.getByTestId("row-num-0")).toContainText("0");
      await expect(page.getByTestId("row-num-1")).toContainText("0");
      // await expect(page.getByTestId("row-name-0")).toContainText("李四思思");
      // await expect(page.getByTestId("row-name-1")).toContainText("张三三撒");
      // 获取顺序不确定的姓名
      const first_name = await page.getByTestId("row-name-0").textContent();
      const second_name = await page.getByTestId("row-name-1").textContent();
      names = [first_name, second_name];
      expect(names).toEqual("张三三撒");
      expect(names).toEqual("李四思思");
    });
    await test.step("删除", async () => {
      // 测试删除
      await page.getByTestId("delete-button-0").click();
      // 删除提醒
      await expect(page.getByText("确定删除吗？")).toBeVisible();
      await page.getByRole("button", { name: "删 除" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText(names[1]);
      await page.getByTestId("delete-button-2").click();
      // 有记录的删除提醒不一样
      await expect(page.getByText("删除工作将一并删除相关考勤记录！")).toBeVisible();
      await page.getByRole("button", { name: "取 消" }).click();
    });
    await test.step("编辑", async () => {
      await page.getByTestId("edit-button-0").click();
      // 测试回到主页
      await page.getByRole("button", { name: "bars 考勤记录" }).click();
      await expect(page.getByTestId("Base-alert")).toBeVisible();
      // 编辑
      await page.getByTestId("edit-button-0").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("李四思思111");
      await page.getByTestId("save-button").click();
      // await page.getByText('成功', { exact: true }).click();
      // 判断结果
      await expect(page.getByTestId("row-name-0")).toContainText("李四思思111");
    });
  });
});
