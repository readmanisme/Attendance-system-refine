import { test, expect } from "@playwright/test";

import { workers_url } from "./constants";

const h1h='<span style="color: rgb(65, 105, 225);">何玉芳</span>'
const h1='<span style=\"color: rgb(65, 105, 225);\">何</span><span></span><span style=\"color: rgb(65, 105, 225);\">玉</span><span></span><span style=\"color: rgb(65, 105, 225);\">芳</span>' //因为匹配的是单字，所以就会这样
const h2h='<span style="color: rgb(65, 105, 225);">何玉</span><span>芳</span>'
const h2='<span style=\"color: rgb(65, 105, 225);\">何</span><span></span><span style=\"color: rgb(65, 105, 225);\">玉</span><span>芳</span>'
const h3='<span style="color: rgb(65, 105, 225);">何</span><span>玉芳</span>'

// const h4='<span style="color: rgb(65, 105, 225);">何凡兰</span>'
const h4='<span style=\"color: rgb(65, 105, 225);\">何</span><span></span><span style=\"color: rgb(65, 105, 225);\">凡</span><span></span><span style=\"color: rgb(65, 105, 225);\">兰</span>'
const h5='<span style=\"color: rgb(65, 105, 225);\">何</span><span></span><span style=\"color: rgb(65, 105, 225);\">凡</span><span>兰</span>'

test.describe("拼音搜索组件", () => {
  test("汉字搜索", async ({ page }) => {
    await page.goto(workers_url);
    await page.getByTestId("py-search-select").click();
    // await page.getByTestId("py-search-select").fill("何玉芳"); //因为select组件的id并不是select，所以不能fill；我也找不到让id绑定到真正的select的办法
    await page.keyboard.type("何玉芳");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1h);
    await page.keyboard.press('Backspace');
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h2h);
    await page.keyboard.press('Backspace');
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h3);
    // console.log(await page.getByTitle("何玉芳").innerHTML()) <div class="ant-select-item-option-content"><span><span></span><span style="color: rgb(65, 105, 225);">何玉芳</span><span></span></span></div>
    // <div class="ant-select-item-option-content"><span><span></span><span style="color: rgb(65, 105, 225);">何玉</span><span>芳</span></span></div>
  });
  test("拼音搜索", async ({ page }) => {
    await page.goto(workers_url);
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("hyf");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1);
    // for (let i = 0; i < 'hyf'.length; i++){
    //   await page.keyboard.press('Backspace');
    // }
    await page.keyboard.press('Backspace');
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h2);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type("heyufang");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    await expect(await page.getByTitle("何玉芳").innerHTML()).toContain(h1);
  });
    test("拼音高亮", async ({ page }) => {
      // 检查高亮是否存在滞后
    await page.goto(workers_url);
    await page.getByTestId("py-search-select").click();
    await page.keyboard.type("hfl");
    await expect(page.getByTitle("何凡兰")).toBeVisible();
    await expect(await page.getByTitle("何凡兰").innerHTML()).toContain(h4);
    await page.keyboard.press('Backspace');
    await expect(await page.getByTitle("何凡兰").innerHTML()).toContain(h5);
  });
});
