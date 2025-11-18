import { test, expect } from "@playwright/test";
import { WorkTypes_TableName, Backend_URL, workType_url } from "./constants";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);

test.describe("工作 列表", () => {
  test("表格显示测试", async ({ page }) => {
    await page.goto(workType_url);
    await expect(page.getByTestId("delete-alert")).toBeVisible();
    await expect(page.getByTestId("Base-alert")).toBeVisible();
    await expect(page.getByTestId("row-name-0")).toContainText("重工");
    await expect(page.getByTestId("row-num-0")).toContainText("243");
    await expect(page.getByTestId("row-name-3")).toContainText("基础");
    await expect(page.getByTestId("row-num-3")).toContainText("1671");
    await expect(page.getByTestId("edit-button-3")).toBeDisabled();
    await expect(page.getByTestId("delete-button-3")).toBeDisabled();
  });
  // test("搜索测试", async ({ page }) => {});
});

test.describe("工作 创建", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(workType_url + "/create");

    await test.step("默认内容", async () => {
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("unknown-alert")).toBeVisible();
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
        "以下工作包含下划线：_郝致远郝致远_郝_致远"
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
        "以下工作包含特殊字符：郝.致远郝/致远郝<致远郝>致远郝|致远郝'致远郝\"致远郝`致远郝:致远郝?致远郝*致远郝%致远"
      );
      await expect(page.getByTestId("save-button")).toBeDisabled();

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("重复", async () => {
      const texts = ["郝致远", "郝致远"];
      const text = "张三";
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
      const texts = ["重工", "三轮车司机"];
      const text = "郝致远";
      await page.goto(workType_url + "/create"); //因为即便路由更换了，但是数据并没有获取新的，所以需要重开
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下工作重复或已存在：重工三轮车司机"
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
    await page.goto(workType_url + "/edit/43ymx595z40s89g"); //司机
    await test.step("默认内容", async () => {
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("error-alert")).toContainText(
        "工作已存在，若不想继续编辑可返回"
      );
      await expect(page.getByTestId("name-input")).toHaveValue("司机");
      await expect(page.getByTestId("id-input")).toBeDisabled();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
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
      await page.getByTestId("create-button").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("张三三撒\n李四思思");
      await page.getByTestId("save-button").click();
      await expect(page.getByTestId("row-num-0")).toContainText("0");
      await expect(page.getByTestId("row-num-1")).toContainText("0");
      // await expect(page.getByTestId("row-name-0")).toContainText("李四思思");
      // await expect(page.getByTestId("row-name-1")).toContainText("张三三撒");
      const first_name = await page.getByTestId("row-name-0").textContent();
      const second_name = await page.getByTestId("row-name-1").textContent();
      names = [first_name, second_name];
      expect(names).toContain("张三三撒");
      expect(names).toContain("李四思思");
    });
    await test.step("删除", async () => {
      await page.getByRole("button", { name: "delete 删除" }).first().click();
      await expect(page.getByText("确定删除吗？")).toBeVisible();
      await page.getByRole("button", { name: "删 除" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText(names[1]);
    });
    await test.step("编辑", async () => {
      await page.getByTestId("edit-button-0").click();
      await page.getByTestId("name-input").click();
      await page.getByTestId("name-input").fill("李四思思111");
      await page.getByTestId("save-button").click();
      // await page.getByText('成功', { exact: true }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("李四思思111");
    });
  });
});
