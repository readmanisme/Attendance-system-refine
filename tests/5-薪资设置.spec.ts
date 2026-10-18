import { test, expect } from "@playwright/test";
import { appUrl, xinzi_url } from "./constants";
import { TestDB } from "./helpers/pb";

const db = new TestDB();

test.afterEach(async () => {
  await db.cleanup();
});

test("添加校验", async ({ page }) => {
  /**
   * 预置: 基础(时薪10)、一个工人、一个工种
   * 测试: 空警告、选人/选工种可保存、负数时薪钳位0、工人重复、工人工种重复
   */
  await db.ensureBaseWork();
  const workerA = await db.seedWorker("测试张孝刚");
  const workA = await db.seedWorkType("测试重工");

  await page.goto(appUrl(xinzi_url + "/create"));
  // 默认时薪10
  await expect(page.getByTestId("salary-input")).toHaveValue("10");
  // 不能全空警告，不能保存
  await expect(page.getByTestId("error-alert")).toContainText("工人和工种不能全为空");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 选人
  await page.getByTestId("worker-select").click();
  await page.getByTitle("测试张孝刚").click();
  // 有人就可以保存
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  // 选工种
  await page.locator(".anticon.anticon-close-circle > svg").nth(0).click();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("测试重工").click();
  // 有工种也就能保存
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  // 清除工种，应该重新出现警告
  await page.locator(".anticon.anticon-close-circle > svg").click();
  await expect(page.getByTestId("error-alert")).toContainText("工人和工种不能全为空");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 检查工种重复判定: 数据库里已有"无工人/重工"之外的...先检查真实存在的重复组合
  // 预置两条真实薪资: (测试张孝刚/无工种) 和 (测试张孝刚/测试重工)
  await db.seedSalary({ workerId: workerA.id, salaryNum: 10 });
  await db.seedSalary({ workerId: workerA.id, workTypeId: workA.id, salaryNum: 12 });
  await page.reload();
  // 工人重复判定
  await page.getByTestId("worker-select").click();
  await page.getByTitle("测试张孝刚").click();
  await expect(page.getByTestId("error-alert")).toContainText("当前记录与 测试张孝刚 / 无工种 重复");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 工人工种重复判定
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("测试重工").click();
  await expect(page.getByTestId("error-alert")).toContainText(
    "当前记录与 测试张孝刚 / 测试重工 重复",
  );
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 只有≥0的时薪才可以设置
  await page.getByTestId("salary-input").fill("-2");
  await page.keyboard.press("Enter"); //不回车值不会被应用
  await expect(page.getByTestId("salary-input")).toHaveValue("0");
});

test("编辑校验-基础", async ({ page }) => {
  /**
   * 预置"基础"工种与时薪10 和 一个工人；编辑"基础"的默认薪资条目，
   * 确认工人/工种选择被禁用
   */
  await db.ensureBaseWork();
  await db.seedWorker("测试张孝刚");
  const { salaryId } = await db.ensureBaseWork();
  await page.goto(appUrl(xinzi_url + `/edit/${salaryId}`)); // "基础"工种的默认时薪条目
  // 确定内容；不能提交
  await expect(page.getByTestId("id-input")).toHaveValue(salaryId);
  await expect(page.getByTestId("id-input")).toBeDisabled();
  // 确认工人和工种被禁用: 人员下拉里看不到可选工人
  await page.getByTestId("work-select").click();
  await expect(page.getByTitle("测试张孝刚")).not.toBeVisible();
  await page.getByTestId("work-select").click();
  // 确认工种和时薪内容
  await expect(page.getByTestId("work-select")).toContainText("基础");
  await expect(page.getByTestId("salary-input")).toHaveValue("10");
  // 时薪虽未修改但现在也允许直接保存(新版移除了"未修改警告")；保留修改工人/工种的警告
  await expect(page.getByTestId("no-change-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  await expect(page.getByTestId("warning-alert")).toBeVisible();
  // 修改内容之后同样可以提交，依旧没有未改变警告
  await page.getByTestId("salary-input").hover();
  await page.locator(".ant-input-number-handler-up:visible").click();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  await expect(page.getByTestId("no-change-alert")).not.toBeVisible();
});

test.describe("添加编辑删除", () => {
  test("添加编辑删除", async ({ page }) => {
    await db.ensureBaseWork();
    await db.seedWorker("测试陈玉琴");
    await db.seedWorkType("测试重工");
    await page.goto(appUrl(xinzi_url));
    // 创建
    await page.getByTestId("create-button").click();
    await page.getByTestId("worker-select").click();
    await page.getByTitle("测试陈玉琴").click();
    // 选择工作
    await page.getByTestId("work-type-select").click();
    await page.getByTitle("测试重工").click();
    // 设置时薪
    await page.getByTestId("salary-input").hover();
    await page.locator(".ant-input-number-handler-up:visible").click();
    await page.locator(".ant-input-number-handler-up:visible").click();
    // 未保存提醒
    await test.step("未保存提醒", async () => {
      page.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("您确定要离开吗？您有未保存的更改。");
        dialog.dismiss().catch(() => {});
      });
      await page.getByRole("button", { name: "arrow-left" }).click();
    });
    // 保存
    await page.getByTestId("save-button").click();
    // 成功提示
    await expect(page.getByText("成功创建")).toBeVisible();
    // 检查内容(新数据按创建逆序排在最前面,基础在0行,新条目紧随其后)
    await expect(page.getByTestId("row-worker-1")).toContainText("陈玉琴");
    await expect(page.getByTestId("row-work-1")).toContainText("重工");
    await expect(page.getByTestId("row-salary-1")).toContainText("12");
    // 编辑
    await page.getByTestId("edit-button-1").click();
    // 测试回到主页
    await page.getByRole("button", { name: "bars 薪资设置" }).click();
    await expect(page.getByTestId("alert")).toBeVisible();
    // 编辑
    await page.getByTestId("edit-button-1").click();
    // 修改时薪
    await page.getByTestId("salary-input").hover();
    await page.locator(".ant-input-number-handler-up:visible").click();
    // 保存
    await page.getByTestId("save-button").click();
    // 检查内容
    await expect(page.getByTestId("row-worker-1")).toContainText("陈玉琴");
    await expect(page.getByTestId("row-salary-1")).toContainText("13");
    // 删除
    await page.getByTestId("delete-button-1").click();
    await page.getByRole("button", { name: "删 除" }).click();
    // 删除后该人不再出现
    await expect(page.getByText("测试陈玉琴")).not.toBeVisible();
  });
});
