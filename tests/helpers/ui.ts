import type { Locator, Page } from "@playwright/test";

/**
 * 清空 py-search-select 的已选人(多选标签)。
 * 用 Backspace 逐个删除有竞态(点击 select 会把还开着的下拉关掉,焦点可能移走),
 * 这里 hover 后点 antd 的 clear 图标,一次清空且必触发 onClear。
 */
export async function clearPySearchSelect(page: Page) {
  const select = page.getByTestId("py-search-select").first();
  await select.hover();
  const clear = select.locator(".ant-select-clear");
  // 值为空时没有 clear 图标;有值时 hover 即出现
  await clear.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  if (await clear.isVisible()) {
    await clear.click();
  }
}

/**
 * 悬浮指定的 InputNumber 输入框并点它的"加一"按钮。
 * 页面上可能有多个可见的同款按钮(如工时录入面板的小时框+分钟框)，必须限定在该输入框自己的容器内。
 */
export async function increaseInputNumber(page: Page, inputId: string) {
  const input = page.locator(`#${inputId}`);
  await input.hover();
  await input
    .locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), 'ant-input-number')]")
    .locator(".ant-input-number-handler-up")
    .click();
}

/**
 * 切换表格每页显示条数。
 * "条/页"文本会同时命中下拉选项，所以必须用分页区域里的 select 定位。
 */
export async function setPageSize(page: Page, size: "10 条/页" | "20 条/页" | "50 条/页") {
  await page.locator(".ant-pagination .ant-select-selector").first().click();
  await page.getByRole("option", { name: size }).click();
}

/**
 * 考勤记录/工时薪资页顶部的月份范围筛选是受控 RangePicker，
 * fill 不会触发内部 onChange 导致"应 用"按钮保持禁用。
 * 用户路径是: 点击开始月份输入框 → 在面板里点目标月份格 → 点结束目标格 → 点"应 用"。
 * 面板单元格用 role=cell 的 description(格式 YYYY-MM)精确按年月定位。
 */
export async function applyMonthRange(page: Page, startYM: string, endYM: string) {
  const apply = page.getByRole("button", { name: "应 用" });
  await pickMonthRange(page, startYM, endYM);
  await expectEnabled(page, apply);
  await apply.click();
}

/**
 * 只点选月份范围、不点"应 用"(适用于 onChange 即时生效的 RangePicker:
 * 统计图表页与导出弹窗)。startName/endName 定位输入框;
 * scope 限定查找范围(如导出 Popconfirm 弹层,避免与页面自身筛选器重名)。
 */
export async function pickMonthRange(
  page: Page,
  startYM: string,
  endYM: string | null,
  startName = "开始月份",
  endName = "结束月份",
  scope?: Page | Locator,
) {
  const root = scope ?? page;
  // 输入框按 scope 定位(弹层场景与页面自身筛选器重名);
  // 但 Picker 面板是由 antd 单独 portal 渲染的,不在弹层元素里,必须全局找
  await root.getByRole("textbox", { name: startName }).click();
  await clickMonthCell(page, startYM);
  if (endYM) {
    await root.getByRole("textbox", { name: endName }).click();
    await clickMonthCell(page, endYM);
  }
}

async function expectEnabled(page: Page, apply: import("@playwright/test").Locator) {
  // 点击面板外确保选择完成并等待按钮可用
  await apply.waitFor({ state: "visible" });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await apply.isEnabled()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`应 用按钮始终禁用(范围未生效)`);
}

/** 点击月份单元格; RangePicker 面板一次显示两个连续年份的网格 */
async function clickMonthCell(page: Page, ym: string) {
  const cell = page.getByRole("cell", { description: ym }).first();
  // 绝大多数场景(本月/上月/下个月)格子直接可见，交给 click 自动等待即可
  try {
    await cell.click({ timeout: 3000 });
    return;
  } catch {
    // 目标年份不在当前两块网格里(跨年)，用超级前/后按钮逐年导航
  }
  for (let i = 0; i < 60; i++) {
    // 面板是双网格(两个 header view)，取第一个年份与目标比较
    const view = await page.locator(".ant-picker-header-view").first().textContent();
    const panelYear = Number((view ?? "").match(/\d{4}/)?.[0] ?? NaN);
    const targetYear = Number(ym.split("-")[0]);
    if (Number.isNaN(panelYear)) throw new Error(`读不到月份面板年份: ${view}`);
    if (panelYear < targetYear) {
      // 每个 header 里都有两个 super-next 按钮(一显一隐)，必须用 :visible 过滤，
      // 否则 .first() 会抓到隐藏按钮导致 click 一直等待
      await page.locator(".ant-picker-header-super-next-btn:visible").first().click();
    } else if (panelYear > targetYear) {
      await page.locator(".ant-picker-header-super-prev-btn:visible").first().click();
    } else {
      throw new Error(`年份网格正确但找不到月份单元格: ${ym}`);
    }
    try {
      await cell.click({ timeout: 3000 });
      return;
    } catch {
      // 继续翻年
    }
  }
  throw new Error(`找不到月份单元格: ${ym}`);
}
