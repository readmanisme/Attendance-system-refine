/**
 * 统计页的导出小工具:图表 PNG、表格 CSV。
 * 不引第三方库,直接走 canvas.toDataURL 与 Blob 下载。
 */
import type { EChartsType } from "echarts/core";

/** 触发浏览器下载 */
const saveAs = (url: string, filename: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/** 文件名里的非法字符统一替换掉(Windows 下 : / \ * ? " < > | 都不合法) */
export const safeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "");

/** 图表导出 PNG(白底,2 倍像素) */
export const downloadChartPng = (chart: EChartsType | null, name: string): void => {
  if (!chart) return;
  const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
  saveAs(url, `${safeFileName(name)}.png`);
};

/** 表格导出 CSV(带 BOM,Excel 打开不乱码) */
export const downloadCsv = (name: string, header: string[], rows: (string | number)[][]): void => {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  saveAs(url, `${safeFileName(name)}.csv`);
  // 交给浏览器后再回收,避免下载被取消
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
