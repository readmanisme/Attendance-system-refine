import { xinzi_url, SalaryType_TableName, API_URL, Backend_URL } from "./constants";
import { test, expect } from "@playwright/test";
import PocketBase from "pocketbase";
const pb = new PocketBase(Backend_URL);
test("表格显示", async ({ page }) => {
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
  await expect(page.getByTestId("row-id-0")).toContainText("62nyyri2e0np05d");
  await expect(page.getByTestId("row-id-2")).toContainText("h9pqyz3950a31c6");
  await expect(page.getByTestId("row-id-3")).toContainText("ara31u88462y859");
  await expect(page.getByTestId("alert")).toBeVisible();
  await expect(page.getByTestId("delete-button-0")).toBeDisabled();
  await expect(page.getByTestId("delete-button-1")).not.toBeDisabled(); //对于有工人的基础工种不禁止删除
});
test("添加校验", async ({ page }) => {
  await page.goto(xinzi_url + "/create");
  await expect(page.getByTestId("salary-input")).toHaveValue("10");
  await expect(page.getByTestId("error-alert")).toContainText("工人和工种不能全为空");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  await page.getByTestId("worker-select").click();
  await page.getByTitle("张孝刚").click();
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  await page.locator(".anticon.anticon-close-circle > svg").nth(0).click();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("重工").click();
  await expect(page.getByTestId("error-alert")).not.toBeVisible();
  await expect(page.getByTestId("save-button")).not.toBeDisabled();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("三轮车司机").click();
  await expect(page.getByTestId("error-alert")).toContainText(
    "当前记录与 无工人 / 三轮车司机 重复"
  );
  await expect(page.getByTestId("save-button")).toBeDisabled();
  await page.getByTestId("salary-input").fill("-2");
  await page.keyboard.press("Enter"); //不回车值不会被应用
  await expect(page.getByTestId("salary-input")).toHaveValue("0");
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
  await page.getByTestId("worker-select").click();
  await page.getByTitle("张孝刚").click();
  await expect(page.getByTestId("error-alert")).toContainText("当前记录与 张孝刚 / 无工种 重复");
  await expect(page.getByTestId("save-button")).toBeDisabled();
  await page.getByTestId("work-type-select").click();
  await page.getByTitle("重工").click();
  await expect(page.getByTestId("error-alert")).toContainText("当前记录与 张孝刚 / 重工 重复");
  await expect(page.getByTestId("save-button")).toBeDisabled();
});
test("编辑校验", async ({ page }) => {
  await test.step("基础", async () => {
    await page.goto(xinzi_url + "/edit/62nyyri2e0np05d"); // 基础工种
    await expect(page.getByTestId("id-input")).toHaveValue("62nyyri2e0np05d");
    await expect(page.getByTestId("id-input")).toBeDisabled();
    await page.getByTestId("work-select").click();
    await expect(page.getByTitle("张孝刚")).not.toBeVisible();
    await page.getByTestId("work-select").click();
    await expect(page.getByTitle("重工")).not.toBeVisible();
    await expect(page.getByTestId("work-select")).toContainText("基础");
    await expect(page.getByTestId("salary-input")).toHaveValue("10");
    await expect(page.getByTestId("no-change-alert")).toBeVisible();
    await expect(page.getByTestId("save-button")).toBeDisabled();
    await expect(page.getByTestId("warning-alert")).toBeVisible();
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await expect(page.getByTestId("save-button")).not.toBeDisabled();
    await expect(page.getByTestId("no-change-alert")).not.toBeVisible();
  });
});
test.describe("添加编辑删除", () => {
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
    await page.getByTestId("create-button").click();
    await page.getByTestId("worker-select").click();
    await page.getByTitle("陈玉琴").click();
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("row-worker-3")).toContainText("陈玉琴");
    await expect(page.getByTestId("row-salary-3")).toContainText("12");
    await page.getByTestId("edit-button-3").click();
    await page.getByTestId("salary-input").hover();
    await page.getByRole("button", { name: "Increase Value" }).click();
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("row-worker-3")).toContainText("陈玉琴");
    await expect(page.getByTestId("row-salary-3")).toContainText("13");
    await page.getByTestId("delete-button-3").click();
    await page.getByRole("button", { name: "删 除" }).click();
    await expect(page.getByText("陈玉琴")).not.toBeVisible();
  });
});
