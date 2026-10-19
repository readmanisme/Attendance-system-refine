/**
 * 数据体检(buildHealth)与班制分类的单测。
 * 体检是"看图之前先看数据对不对"的入口,每条判定都要有明确口径,
 * 所以这里逐条构造最小数据集,把命中条件与样例文案锁死。
 */
import { describe, expect, test } from "vitest";
import {
  buildHealth,
  buildOverview,
  classifyShift,
  percentileRank,
  SHIFT_LABELS,
} from "@/pages/tong-ji/compute";

const rec = (
  id: string,
  workerId: string,
  workId: string,
  date: string,
  minutes: number,
  workerName = workerId,
  workName = workId,
) => ({
  id,
  worker_id: workerId,
  work: workId,
  work_date: date,
  work_minutes: minutes,
  expand: {
    worker_id: { id: workerId, name: workerName },
    work: { id: workId, name: workName },
  },
});

/** 只有"基础"价,其余工种都算未定价 */
const salaries = [{ SalaryNum: 10, expand: { worker_name: null, work_type: { name: "基础" } } }];

const healthOf = (records: any[], today = "2026-09-01") =>
  buildHealth(records, buildOverview(records, salaries), today);

const find = (issues: ReturnType<typeof buildHealth>, key: string) =>
  issues.find((i) => i.key === key);

describe("classifyShift: 四档首尾相接,无空档", () => {
  test("边界值", () => {
    expect(classifyShift(0)).toBe("short");
    expect(classifyShift(179)).toBe("short"); // 2.98h
    expect(classifyShift(180)).toBe("half"); // 3h
    expect(classifyShift(479)).toBe("half"); // 7.98h
    expect(classifyShift(480)).toBe("nearFull"); // 8h 不再掉进"其他"
    expect(classifyShift(539)).toBe("nearFull"); // 8.98h
    expect(classifyShift(540)).toBe("full"); // 9h
    expect(classifyShift(600)).toBe("full"); // 10h
  });

  test("四档都有展示名", () => {
    expect(Object.values(SHIFT_LABELS)).toHaveLength(4);
    expect(SHIFT_LABELS.nearFull).toContain("8~9h");
  });
});

describe("percentileRank", () => {
  test("严格低于给定值的占比(并列不算超过)", () => {
    expect(percentileRank([], 1)).toBe(0);
    expect(percentileRank([1, 2, 3, 4], 1)).toBe(0);
    expect(percentileRank([1, 2, 3, 4], 4)).toBe(75);
    expect(percentileRank([1, 2, 2, 4], 2)).toBe(25);
  });
});

describe("buildHealth", () => {
  test("空数据没有任何问题", () => {
    expect(buildHealth([], buildOverview([]))).toEqual([]);
  });

  test("未来日期:明细逐条列出日期与记录数", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("b", "wA", "t1", "2026-12-01", 60, "甲", "搬运"),
      rec("c", "wB", "t1", "2026-12-01", 60, "乙", "搬运"),
      rec("d", "wA", "t1", "2026-11-05", 60, "甲", "搬运"),
    ]);
    const issue = find(issues, "future");
    expect(issue).toMatchObject({ count: 2, level: "warn" });
    expect(issue?.details).toEqual(["2026-11-05 · 1 条记录", "2026-12-01 · 2 条记录"]);
  });

  test("单人单日 >12h:明细带姓名/日期/小时;多人合计不算", () => {
    // 同一天两人各 10h,合计 20h —— 正常,不报
    const normal = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运"),
      rec("b", "wB", "t1", "2026-08-01", 600, "乙", "搬运"),
    ]);
    expect(find(normal, "over12")).toBeUndefined();

    // 甲当天跨两个工种 10h + 3.33h = 13.33h —— 才算异常
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运"),
      rec("b", "wA", "t2", "2026-08-01", 200, "甲", "挖土"),
      rec("c", "wB", "t1", "2026-08-01", 600, "乙", "搬运"),
    ]);
    const issue = find(issues, "over12");
    expect(issue?.count).toBe(1);
    expect(issue?.title).toContain("单人单日");
    expect(issue?.details).toEqual(["甲 · 2026-08-01 · 13.33h"]);
  });

  test("单日总工时 <1h:明细带当天出勤的人", () => {
    const issues = healthOf([rec("a", "wA", "t1", "2026-08-01", 30, "甲", "搬运")]);
    expect(find(issues, "under1")?.details).toEqual(["2026-08-01 · 合计 0.5h · 甲"]);
  });

  test("同人同日同工种重复记录:明细用姓名/日期/工种", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("b", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
    ]);
    const issue = find(issues, "duplicate");
    expect(issue).toMatchObject({ count: 1, level: "warn" });
    expect(issue?.details).toEqual(["甲 · 2026-08-01 · 搬运 · 2 条"]);
  });

  test("未定价工种:按工种列出条数/工时/兜底金额", () => {
    const issues = healthOf([rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运")]);
    const issue = find(issues, "unpriced");
    expect(issue?.count).toBe(1); // 按工种数计
    expect(issue?.details).toEqual(["搬运 · 1 条 · 10h · 折合 100 元"]); // 10h × 基础 10 元
    expect(issue?.hint).toContain("占总支出 100.0%");
  });

  test("单人出勤日与月出勤骤降不再算异常", () => {
    const aug = ["01", "02", "03", "04", "05"].map((d, i) =>
      rec(`a${i}`, "wA", "t1", `2026-08-${d}`, 600, "甲", "搬运"),
    );
    const issues = healthOf([
      ...aug,
      rec("b", "wA", "t1", "2026-09-01", 600, "甲", "搬运"),
      rec("c", "wA", "t1", "2026-10-01", 600, "甲", "搬运"),
    ]);
    expect(find(issues, "solo")).toBeUndefined();
    expect(find(issues, "drop")).toBeUndefined();
  });

  test("warn 排在 info 之前", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-12-01", 30, "甲", "搬运"),
      rec("b", "wA", "t1", "2026-08-01", 30, "甲", "搬运"),
    ]);
    expect(issues[0].level).toBe("warn");
    expect(issues.at(-1)?.level).toBe("info");
  });
});
