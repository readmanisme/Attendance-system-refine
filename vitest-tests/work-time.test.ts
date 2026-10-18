/**
 * 工时换算工具单测。
 * formatHoursExact 是页面与 Excel 导出共用的"工时文本"出口,边界多(整数/一位小数/两位小数/
 * 无限小数/负数/null),之前完全没有直接用例,这里把每个分支锁死。
 */
import { describe, expect, test } from "vitest";
import {
  formatHoursExact,
  hoursToMinutes,
  minutesToHours,
  minutesToHoursDecimal,
} from "@/utils/workTime";

describe("minutesToHours", () => {
  test("null/undefined 返回 undefined,其余按 60 进制换算", () => {
    expect(minutesToHours(null)).toBeUndefined();
    expect(minutesToHours(undefined)).toBeUndefined();
    expect(minutesToHours(0)).toBe(0);
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(20)).toBeCloseTo(0.3333, 4);
  });
});

describe("hoursToMinutes", () => {
  test("小时转分钟四舍五入到整数", () => {
    expect(hoursToMinutes(0)).toBe(0);
    expect(hoursToMinutes(8)).toBe(480);
    expect(hoursToMinutes(7.5)).toBe(450);
    expect(hoursToMinutes(1 / 3)).toBe(20); // 0.3333h = 19.998min → 20
    expect(hoursToMinutes(0.3333)).toBe(20);
    expect(hoursToMinutes(0.005)).toBe(0); // 0.3min → 0
    expect(hoursToMinutes(0.0084)).toBe(1); // 0.504min → 1
  });
});

describe("minutesToHoursDecimal", () => {
  test("null/undefined 当 0,其余精确换算", () => {
    expect(minutesToHoursDecimal(null).toString()).toBe("0");
    expect(minutesToHoursDecimal(undefined).toString()).toBe("0");
    expect(minutesToHoursDecimal(90).toString()).toBe("1.5");
    expect(minutesToHoursDecimal(20).toDecimalPlaces(6).toString()).toBe("0.333333");
  });
});

describe("formatHoursExact", () => {
  test("null/undefined 显示 --", () => {
    expect(formatHoursExact(null)).toBe("--");
    expect(formatHoursExact(undefined)).toBe("--");
  });

  test("能被两位小数整除时只显示小数本身", () => {
    expect(formatHoursExact(0)).toBe("0");
    expect(formatHoursExact(60)).toBe("1");
    expect(formatHoursExact(480)).toBe("8");
    expect(formatHoursExact(630)).toBe("10.5");
    expect(formatHoursExact(120)).toBe("2");
    expect(formatHoursExact(6000)).toBe("100");
    expect(formatHoursExact(1440)).toBe("24");
    expect(formatHoursExact(3)).toBe("0.05"); // 0.05h = 3min,恰好两位
  });

  test("超过两位小数时保留两位并附精确的时分", () => {
    expect(formatHoursExact(20)).toBe("0.33 (0h 20m)");
    expect(formatHoursExact(125)).toBe("2.08 (2h 5m)");
    expect(formatHoursExact(121)).toBe("2.02 (2h 1m)");
    expect(formatHoursExact(1)).toBe("0.02 (0h 1m)");
    expect(formatHoursExact(7)).toBe("0.12 (0h 7m)");
    expect(formatHoursExact(59)).toBe("0.98 (0h 59m)");
  });

  test("负数保留符号,时分取绝对值", () => {
    expect(formatHoursExact(-20)).toBe("-0.33 (-0h 20m)");
    expect(formatHoursExact(-90)).toBe("-1.5");
  });

  test("半进位: 0.005h 这一档按 HALF_UP 而不是银行家舍入", () => {
    // 18 分钟 = 0.3h 恰好两位;19 分钟 = 0.31666… → 0.32
    expect(formatHoursExact(18)).toBe("0.3");
    expect(formatHoursExact(19)).toBe("0.32 (0h 19m)");
  });
});
