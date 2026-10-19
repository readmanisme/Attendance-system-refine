import { test, expect } from "@playwright/test";
import { appUrl } from "./constants";
import { TestDB } from "./helpers/pb";

const db = new TestDB();

const h1h = '<span style="color: rgb(37, 99, 235);">何玉芳</span>';
const h1 =
  '<span style="color: rgb(37, 99, 235);">何</span><span></span><span style="color: rgb(37, 99, 235);">玉</span><span></span><span style="color: rgb(37, 99, 235);">芳</span>'; //因为匹配的是单字，所以就会这样
const h2h = '<span style="color: rgb(37, 99, 235);">何玉</span><span>芳</span>';
const h2 =
  '<span style="color: rgb(37, 99, 235);">何</span><span></span><span style="color: rgb(37, 99, 235);">玉</span><span>芳</span>';
const h3 = '<span style="color: rgb(37, 99, 235);">何</span><span>玉芳</span>';
const h4 =
  '<span style="color: rgb(37, 99, 235);">何</span><span></span><span style="color: rgb(37, 99, 235);">凡</span><span></span><span style="color: rgb(37, 99, 235);">兰</span>';
const h5 =
  '<span style="color: rgb(37, 99, 235);">何</span><span></span><span style="color: rgb(37, 99, 235);">凡</span><span>兰</span>';

test.beforeEach(async () => {
  // 种子必须在每个测试前创建:全局的 afterEach cleanup 会清掉 beforeAll 创建的数据
  await db.seedWorkers(["何玉芳", "何凡兰"]);
});

test.afterEach(async () => {
  await db.cleanup();
});

test.describe("拼音搜索组件", () => {
  test("汉字搜索", async ({ page }) => {
    // 去工人页面测试搜索组件
    await page.goto(appUrl("/#/workers"));
    // 键盘模拟输入人名
    await page.getByTestId("py-search-select").click();
    // await page.getByTestId("py-search-select").fill("何玉芳"); //因为select组件的id并不是select，所以不能fill；我也找不到让id绑定到真正的select的办法，所以只能模拟键盘输入了
    await page.keyboard.type("何玉芳");
    // 通过这种方式选择人名
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    // 判断高亮是否正确
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1h);
    await page.keyboard.press("Backspace");
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h2h);
    await page.keyboard.press("Backspace");
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h3);
  });
  test("拼音搜索", async ({ page }) => {
    // // 去工人页面测试搜索组件
    await page.goto(appUrl("/#/workers"));
    // // 键盘模拟输入人名
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("hyf");
    // // 通过这种方式选择人名
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    // // 判断高亮是否正确
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1);
    await page.keyboard.press("Backspace");
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h2);
    // 没必要继续测试了，因为再删就剩下 何 了，这样匹配何玉芳都看不到
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    // 试一试全拼
    await page.keyboard.type("heyufang");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1);
  });
  test("拼音高亮", async ({ page }) => {
    // 检查高亮是否存在滞后，删除一个拼音之后状态应该马上更新。
    await page.goto(appUrl("/#/workers"));
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("hfl");
    await expect(page.getByTitle("何凡兰")).toBeVisible();
    await expect(await page.getByTitle("何凡兰").innerHTML()).toContain(h4);
    await page.keyboard.press("Backspace");
    await expect(await page.getByTitle("何凡兰").innerHTML()).toContain(h5);
  });
});
