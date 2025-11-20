import { xinzi_url, SalaryType_TableName, API_URL, Backend_URL } from "./constants";
import { test, expect } from "@playwright/test";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);
test("表格显示", async ({ page }) => {
  // mock数据的用途是//对于有工人的基础工种不禁止删除
  page.route(
    API_URL +
      "/collections/SalaryType_test/records?page=1&perPage=10&filter=&expand=worker_name%2Cwork_type",
    async (route) => {
      const json = {
        items: [
          {
            SalaryNum: 10,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-22 08:09:51.658Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-22 08:07:35.370Z",
                id: "1tds1872f8v6866",
                name: "基础",
                updated: "2025-01-22 08:07:35.370Z",
              },
            },
            id: "62nyyri2e0np05d",
            updated: "2025-01-22 08:09:51.658Z",
            work_type: "1tds1872f8v6866",
            worker_name: "",
          },
          {
            SalaryNum: 20,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-26 01:22:10.262Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-25 10:13:17.896Z",
                id: "43ymx595z40s89g",
                name: "司机",
                updated: "2025-01-25 10:13:17.896Z",
              },
            },
            id: "h9pqyz3950a31c6",
            updated: "2025-01-26 01:22:10.262Z",
            work_type: "43ymx595z40s89g",
            worker_name: "",
          },
          {
            SalaryNum: 28,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-26 01:22:30.563Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-25 10:13:33.348Z",
                id: "u33556815b6m172",
                name: "三轮车司机",
                updated: "2025-01-25 10:13:33.348Z",
              },
            },
            id: "ara31u88462y859",
            updated: "2025-01-26 01:22:30.563Z",
            work_type: "u33556815b6m172",
            worker_name: "",
          },
          {
            SalaryNum: 12,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-11-18 01:30:39.386Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-22 08:07:35.370Z",
                id: "1tds1872f8v6866",
                name: "基础",
                updated: "2025-01-22 08:07:35.370Z",
              },
              worker_name: {
                collectionId: "pbc_3188403080",
                collectionName: "workers_test",
                created: "2025-11-04 12:55:34.185Z",
                id: "7532s7t15y9r3c5",
                name: "李红红",
                updated: "2025-11-04 12:55:34.185Z",
              },
            },
            id: "4f40enq5u4oh1ki",
            updated: "2025-11-18 01:30:39.386Z",
            work_type: "1tds1872f8v6866",
            worker_name: "7532s7t15y9r3c5",
          },
        ],
        page: 1,
        perPage: 10,
        totalItems: 4,
        totalPages: 1,
      };
      await route.fulfill({ json });
    }
  );
  await page.goto(xinzi_url);
  // 确认数据
  await expect(page.getByTestId("row-id-0")).toContainText("62nyyri2e0np05d");
  await expect(page.getByTestId("row-id-1")).toContainText("h9pqyz3950a31c6");
  await expect(page.getByTestId("row-id-2")).toContainText("ara31u88462y859");
  // 确认警告
  await expect(page.getByTestId("alert")).toBeVisible();
  await expect(page.getByTestId("un-salary-work-alert")).toContainText(
    "未设置工资的工作类型：重工，请设置其对应的工资,否则按照基础工资计算。"
  );
  // 基础不能删
  await expect(page.getByTestId("delete-button-0")).toBeDisabled();
  await expect(page.getByTestId("delete-button-1")).not.toBeDisabled(); //对于有工人的基础工种不禁止删除
});
test("添加校验", async ({ page }) => {
  await page.goto(xinzi_url + "/create");
  // 默认时薪10
  await expect(page.getByTestId("salary-input")).toHaveValue("10");
  // 不能全空警告，不能保存
  await expect(page.getByTestId("error-alert")).toContainText("工人和工种不能全为空");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 选人
  await page.getByTestId("worker-select").click();
  await page.getByTitle("张孝刚").click();
  // 有人就可以保存
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  // 选工种
  await page.locator(".anticon.anticon-close-circle > svg").nth(0).click();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("重工").click();
  // 有工种也就能保存
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  // 清除工种，应该重新出现警告
  await page.locator(".anticon.anticon-close-circle > svg").click();
  await expect(page.getByTestId("error-alert")).toContainText("工人和工种不能全为空");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 检查工种重复判定
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("三轮车司机").click();
  await expect(page.getByTestId("error-alert")).toContainText(
    "当前记录与 无工人 / 三轮车司机 重复"
  );
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 只有≥0的时薪才可以设置
  await page.getByTestId("salary-input").fill("-2");
  await page.keyboard.press("Enter"); //不回车值不会被应用
  await expect(page.getByTestId("salary-input")).toHaveValue("0");
  // 伪造数据用来测试工人重复和工人工种重复
  page.route(
    API_URL +
      "/collections/SalaryType_test/records?page=1&perPage=500&skipTotal=1&expand=worker_name%2Cwork_type",
    async (route) => {
      const json = {
        items: [
          {
            SalaryNum: 10,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-22 08:09:51.658Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-22 08:07:35.370Z",
                id: "1tds1872f8v6866",
                name: "基础",
                updated: "2025-01-22 08:07:35.370Z",
              },
            },
            id: "62nyyri2e0np05d",
            updated: "2025-01-22 08:09:51.658Z",
            work_type: "1tds1872f8v6866",
            worker_name: "",
          },
          {
            SalaryNum: 20,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-26 01:22:10.262Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-25 10:13:17.896Z",
                id: "43ymx595z40s89g",
                name: "司机",
                updated: "2025-01-25 10:13:17.896Z",
              },
            },
            id: "h9pqyz3950a31c6",
            updated: "2025-01-26 01:22:10.262Z",
            work_type: "43ymx595z40s89g",
            worker_name: "",
          },
          {
            SalaryNum: 28,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-01-26 01:22:30.563Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-01-25 10:13:33.348Z",
                id: "u33556815b6m172",
                name: "三轮车司机",
                updated: "2025-01-25 10:13:33.348Z",
              },
            },
            id: "ara31u88462y859",
            updated: "2025-01-26 01:22:30.563Z",
            work_type: "u33556815b6m172",
            worker_name: "",
          },
          {
            SalaryNum: 10,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-11-18 00:56:50.334Z",
            expand: {
              worker_name: {
                collectionId: "pbc_3188403080",
                collectionName: "workers_test",
                created: "2025-01-25 10:10:23.361Z",
                id: "qcuh2efmj1l7uk2",
                name: "张孝刚",
                updated: "2025-01-25 10:10:23.361Z",
              },
            },
            id: "hodgkcdefnsosqt",
            updated: "2025-11-18 00:56:50.334Z",
            work_type: "",
            worker_name: "qcuh2efmj1l7uk2",
          },
          {
            SalaryNum: 12,
            collectionId: "pbc_3616351690",
            collectionName: "SalaryType_test",
            created: "2025-11-18 00:57:04.949Z",
            expand: {
              work_type: {
                collectionId: "pbc_3310633731",
                collectionName: "workType_test",
                created: "2025-04-08 14:20:34.839Z",
                id: "q6kxhr15809d89c",
                name: "重工",
                updated: "2025-04-08 14:20:34.839Z",
              },
              worker_name: {
                collectionId: "pbc_3188403080",
                collectionName: "workers_test",
                created: "2025-01-25 10:10:23.361Z",
                id: "qcuh2efmj1l7uk2",
                name: "张孝刚",
                updated: "2025-01-25 10:10:23.361Z",
              },
            },
            id: "d1yumnn0ymw5s8c",
            updated: "2025-11-18 00:57:04.949Z",
            work_type: "q6kxhr15809d89c",
            worker_name: "qcuh2efmj1l7uk2",
          },
        ],
        page: 1,
        perPage: 500,
        totalItems: -1,
        totalPages: -1,
      };
      await route.fulfill({ json });
    }
  );
  await page.reload();
  // 工人重复判定
  await page.getByTestId("worker-select").click();
  await page.getByTitle("张孝刚").click();
  await expect(page.getByTestId("error-alert")).toContainText("当前记录与 张孝刚 / 无工种 重复");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  // 工人工种重复判定
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("重工").click();
  await expect(page.getByTestId("error-alert")).toContainText("当前记录与 张孝刚 / 重工 重复");
  await expect(page.getByTestId("save-button")).toBeDisabled();
});
test("编辑校验", async ({ page }) => {
  await test.step("基础", async () => {
    await page.goto(xinzi_url + "/edit/62nyyri2e0np05d"); // 基础工种
    // 确定内容；不能提交
    await expect(page.getByTestId("id-input")).toHaveValue("62nyyri2e0np05d");
    await expect(page.getByTestId("id-input")).toBeDisabled();
    // 确认工人和工种被禁用
    await page.getByTestId("work-select").click();
    await expect(page.getByTitle("张孝刚")).not.toBeVisible();
    await page.getByTestId("work-select").click();
    await expect(page.getByTitle("重工")).not.toBeVisible();
    // 确认工种和时薪内容
    await expect(page.getByTestId("work-select")).toContainText("基础");
    await expect(page.getByTestId("salary-input")).toHaveValue("10");
    // 未改变警告；不能提交；其他警告
    await expect(page.getByTestId("no-change-alert")).toBeVisible();
    await expect(page.getByTestId("save-button")).toBeDisabled();
    await expect(page.getByTestId("warning-alert")).toBeVisible();
    // 修改内容之后就可以提交而且没有未改变警告
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await expect(page.getByTestId("save-button")).not.toBeDisabled();
    await expect(page.getByTestId("no-change-alert")).not.toBeVisible();
  });
});
test.describe("添加编辑删除", () => {
  // 数据清理
  test.afterEach(async ({ page }) => {
    const records = await pb.collection(SalaryType_TableName).getFullList({
      filter: 'created > "2025-11-10"',
    });
    const ids = records.map((record) => record.id);
    if (ids.length === 0) return; //空数据发batch也会报错
    const batch = pb.createBatch();
    for (const id of ids) {
      batch.collection(SalaryType_TableName).delete(id);
    }
    const result = await batch.send();
    expect(result.every((r) => r.status === 204)).toBe(true); //body是null
  });
  test("添加编辑删除", async ({ page }) => {
    await page.goto(xinzi_url);
    // 创建
    await page.getByTestId("create-button").click();
    await page.getByTestId("worker-select").click();
    await page.getByTitle("陈玉琴").click();
    // 选择工作
    await page.getByTestId("work-type-select").click();
    await page.getByTitle("重工").click();
    // 设置时薪
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await page.getByRole("button", { name: "Increase Value" }).click();
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
      await expect(page.getByText('成功创建')).toBeVisible();
    // 检查内容
    await expect(page.getByTestId("row-worker-3")).toContainText("陈玉琴");
    await expect(page.getByTestId('row-work-3')).toContainText("重工");
    await expect(page.getByTestId("row-salary-3")).toContainText("12");
    // 编辑
    await page.getByTestId("edit-button-3").click();
    // 测试回到主页
    await page.getByRole("button", { name: "bars 薪资设置" }).click();
    await expect(page.getByTestId("alert")).toBeVisible();
    // 编辑
    await page.getByTestId("edit-button-3").click();
    // 修改时薪
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    // 保存
    await page.getByTestId("save-button").click();
          // 成功提示
      // await expect(page.getByText('成功编辑')).toBeVisible();
    // 检查内容
    await expect(page.getByTestId("row-worker-3")).toContainText("陈玉琴");
    await expect(page.getByTestId("row-salary-3")).toContainText("13");
    // 删除
    await page.getByTestId("delete-button-3").click();
    await page.getByRole("button", { name: "删 除" }).click();
          // 成功提示
      // await expect(page.getByText('成功删除')).toBeVisible();
    await expect(page.getByText("陈玉琴")).not.toBeVisible();
  });
});
