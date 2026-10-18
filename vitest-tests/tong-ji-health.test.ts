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
  test("≤ 给定值的占比,含并列", () => {
    expect(percentileRank([], 1)).toBe(0);
    expect(percentileRank([1, 2, 3, 4], 1)).toBe(25);
    expect(percentileRank([1, 2, 3, 4], 4)).toBe(100);
    expect(percentileRank([1, 2, 2, 4], 2)).toBe(75);
  });
});

describe("buildHealth", () => {
  test("空数据没有任何问题", () => {
    expect(buildHealth([], buildOverview([]))).toEqual([]);
  });

  test("未来日期", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("b", "wA", "t1", "2026-12-01", 60, "甲", "搬运"),
    ]);
    expect(find(issues, "future")).toMatchObject({ count: 1, level: "warn" });
    expect(find(issues, "future")?.samples).toEqual(["2026-12-01"]);
  });

  test("单日总工时 >12h(多人合计)", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运"),
      rec("b", "wB", "t1", "2026-08-01", 300, "乙", "搬运"),
    ]);
    const issue = find(issues, "over12");
    expect(issue?.count).toBe(1);
    expect(issue?.samples[0]).toBe("2026-08-01 合计 15h");
  });

  test("单日总工时 <1h", () => {
    const issues = healthOf([rec("a", "wA", "t1", "2026-08-01", 30, "甲", "搬运")]);
    expect(find(issues, "under1")?.count).toBe(1);
  });

  test("只有 1 人出勤的日期", () => {
    const issues = healthOf([rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运")]);
    expect(find(issues, "solo")?.count).toBe(1);
  });

  test("同人同日同工种重复记录", () => {
    const issues = healthOf([
      rec("a", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("b", "wA", "t1", "2026-08-01", 60, "甲", "搬运"),
    ]);
    expect(find(issues, "duplicate")).toMatchObject({ count: 1, level: "warn" });
    expect(find(issues, "duplicate")?.samples).toEqual(["wA / 2026-08-01 / t1"]);
  });

  test("未定价工种带兜底金额", () => {
    const issues = healthOf([rec("a", "wA", "t1", "2026-08-01", 600, "甲", "搬运")]);
    const issue = find(issues, "unpriced");
    expect(issue?.count).toBe(1);
    expect(issue?.samples).toEqual(["搬运"]);
    expect(issue?.hint).toContain("100 元"); // 10h × 基础 10 元
  });

  test("月出勤骤降: 上月 ≥5 天且本月不足一半(末月不参与)", () => {
    const aug = ["01", "02", "03", "04", "05"].map((d, i) =>
      rec(`a${i}`, "wA", "t1", `2026-08-${d}`, 600, "甲", "搬运"),
    );
    const issues = healthOf([
      ...aug,
      rec("b", "wA", "t1", "2026-09-01", 600, "甲", "搬运"),
      rec("c", "wA", "t1", "2026-10-01", 600, "甲", "搬运"),
    ]);
    const issue = find(issues, "drop");
    expect(issue?.count).toBe(1);
    expect(issue?.samples[0]).toContain("2026-08 5天 → 2026-09 1天");
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
