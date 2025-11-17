import { test, expect } from "@playwright/test";

import { workers_url } from "./constants";

test.describe("拼音搜索组件", () => {
  test("汉字搜索", async ({ page }) => {
    await page.goto(workers_url);
    await page.getByTestId("py-search-select").fill("何玉芳");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
  });
  test("拼音搜索搜索", async ({ page }) => {
    await page.goto(workers_url);
    await page.getByTestId("py-search-select").fill("hyf");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
    await page.getByTestId("py-search-select").fill("heyufang");
    await expect(page.getByTitle("何玉芳")).toBeVisible();
  });
});
