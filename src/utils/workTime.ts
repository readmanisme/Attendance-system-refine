/**
 * 工时(分钟)相关的换算与显示工具。
 * 数据库统一存整数分钟 work_minutes,显示层换算为小时。
 */
import Decimal from "decimal.js";

/** 分钟 -> 小时(number),供 InputNumber 等编辑控件使用 */
export const minutesToHours = (minutes?: number | null): number | undefined =>
  minutes == null ? undefined : minutes / 60;

/** 小时 -> 分钟(整数),录入时统一取整到分钟 */
export const hoursToMinutes = (hours: number): number => Math.round(hours * 60);

/** 分钟 -> 小时(Decimal),用于薪资等精确计算 */
export const minutesToHoursDecimal = (minutes?: number | null): Decimal =>
  new Decimal(minutes ?? 0).dividedBy(60);

/** 分钟 -> 小时文本:整小时 "5",半小时 "2.5",20分钟 "0.33"(两位小数,去尾零) */
export const formatMinutes = (minutes?: number | null): string => {
  if (minutes == null) return "--";
  return String(Math.round((minutes / 60) * 100) / 100);
};
