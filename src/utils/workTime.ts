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

/** 分钟(整数) -> "8h" / "7h 30m" / "20m" 形式的紧凑文本,用于标签等空间紧张处。
 * 整小时只给小时位,不足 1 小时只给分钟位。
 */
export const formatHoursHm = (minutes?: number | null): string => {
  if (minutes == null) return "--";
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `${sign}${h}h`;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
};

/** 分钟(整数) -> 工时文本:整数 "8"、一位小数 "10.5"、恰两位 "0.05";
 * 超过两位小数时保留两位(half-up)并附括号精确值,如 "0.33 (0h 20m)"。
 * 括号由整数分钟整除/取余精确得出,与小数位无关。
 */
export const formatHoursExact = (minutes?: number | null): string => {
  if (minutes == null) return "--";
  const hours = new Decimal(minutes).dividedBy(60);
  const rounded = hours.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (hours.equals(rounded)) return rounded.toString();
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${rounded.toString()} (${sign}${Math.floor(abs / 60)}h ${abs % 60}m)`;
};
