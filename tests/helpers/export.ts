import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { appUrl } from "../constants";
import { pickMonthRange } from "./ui";

/**
 * "工时&薪资"页导出流程的公共封装。
 * 8-Excel导出 与 11-金额一致性 共用,避免两处各写一份下载/落盘/解析的坑。
 */

/** 打开导出弹窗,并把范围缩到指定月份(默认本月) */
export async function openExportPopover(page: Page, month = dayjs().format("YYYY-MM")) {
  await page.goto(appUrl("gongshi"));
  await page.getByRole("button", { name: "导出考勤记录到Excel" }).click();
  const pop = page.getByRole("tooltip");
  await pop.waitFor({ state: "visible" });
  await pickMonthRange(page, month, month, "开始月份", "结束月份", pop);
}

/**
 * 点击"进行导出",等真实浏览器下载完成后解析工作簿。
 * (XLSX.writeFile 浏览器端触发 download 事件,无需 mock)
 * 注意:不能直接读 download.path() 的临时工件——Windows 上该文件在读取时
 * 可能不可访问(ENOENT),必须先 saveAs 落到自己的输出目录再解析。
 */
export async function exportAndRead(page: Page): Promise<XLSX.WorkBook> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "进行导出" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("工时记录.xlsx");
  const dest = path.join(test.info().outputDir, "工时记录.xlsx");
  await download.saveAs(dest);
  // Windows 上刚落盘的 xlsx 可能被杀软实时扫描短暂占用(单独进程里
  // 重现不了,只有紧跟其后的读取会撞上),读不到就小步重试。
  let wb: XLSX.WorkBook | undefined;
  for (let i = 0; i < 10; i++) {
    try {
      wb = XLSX.read(fs.readFileSync(dest), { type: "buffer" });
      break;
    } catch (e) {
      if (i === 9) throw e;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  expect(wb!.SheetNames, "工作簿应有三个 sheet").toEqual(["工时(月)", "工时(日)", "考勤记录"]);
  return wb!;
}

export const rowsOf = (wb: XLSX.WorkBook, sheet: string) =>
  XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheet]);
