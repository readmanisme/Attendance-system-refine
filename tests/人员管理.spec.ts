import { test, expect } from "@playwright/test";
import {
  Workers_TableName,
  Backend_URL,
  workers_url,
  WorkerRecordNum_TableName,
} from "./constants";
import { readFileSync } from "fs";
import { randomInt } from "crypto";

test.describe("人员 列表", () => {
  test("表格显示测试", async ({ page }) => {
    await page.goto(workers_url);
    await test.step("翻页", async () => {
      await expect(page.getByTestId("row-name-0")).toContainText("李红红");
      await expect(page.getByTestId("row-name-9")).toContainText("张列列");
      await page.getByRole("link", { name: "2" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("杨秀英");
      await expect(page.getByTestId("row-name-9")).toContainText("何樱桃");
      await page.getByRole("link", { name: "1" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("李红红");
      await expect(page.getByTestId("row-name-9")).toContainText("张列列");
    });
    await test.step("分页", async () => {
      await page.getByText("条/页").first().click();
      await page.getByRole("option", { name: "20 条/页" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("李红红");
      await expect(page.getByTestId("row-name-19")).toContainText("何樱桃");
      await page.getByText('条/页').nth(1).first().click();
      await page.getByRole("option", { name: "10 条/页" }).click();
      await expect(page.getByTestId("row-name-0")).toContainText("李红红");
      await expect(page.getByTestId("row-name-9")).toContainText("张列列");
    });
  });
  test("搜索测试", async ({ page }) => {});
});

test.describe("人员 创建", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(workers_url + "/create");

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
        "以下姓名包含下划线：_郝致远郝致远_郝_致远"
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
        "以下姓名包含特殊字符：郝.致远郝/致远郝<致远郝>致远郝|致远郝'致远郝\"致远郝`致远郝:致远郝?致远郝*致远郝%致远"
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
      await expect(page.getByTestId("error-alert")).toContainText("以下姓名重复或已存在：郝致远");
      await expect(page.getByTestId("save-button")).toBeDisabled();

      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("success-alert")).toBeVisible();
      await expect(page.getByTestId("save-button")).not.toBeDisabled();
    });
    await test.step("已存在", async () => {
      const texts = ["马小琴", "魏变变"];
      const text = "郝致远";
      await page.goto(workers_url + "/create"); //因为即便路由更换了，但是数据并没有获取新的，所以需要重开
      texts.push(text);
      await page.getByTestId("name-input").fill(texts.join("\n"));
      await expect(page.getByTestId("name-input")).toHaveValue(texts.join("\n"));
      await expect(page.getByTestId("error-alert")).toContainText(
        "以下姓名重复或已存在：马小琴魏变变"
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
test.describe("人员 编辑", () => {
  test("校验测试", async ({ page }) => {
    await page.goto(workers_url + "/edit/5w268d0ekgd5zas"); //魏变变
    await test.step("默认内容", async () => {
      await expect(page.getByTestId("format-requirement-alert")).toBeVisible();
      await expect(page.getByTestId("error-alert")).toContainText(
        "姓名已存在，若不想继续编辑可返回"
      );
      await expect(page.getByTestId("name-input")).toHaveValue("魏变变");
      await expect(page.getByTestId("id-input")).toBeDisabled();
      await expect(page.getByTestId("save-button")).toBeDisabled();
    });
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
      const text = "马小琴";
      await page.getByTestId("name-input").fill(text);
      await expect(page.getByTestId("name-input")).toHaveValue(text);
      await expect(page.getByTestId("error-alert")).toContainText(
        "姓名已存在，若不想继续编辑可返回"
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
test.describe("人员 删除", () => {});
