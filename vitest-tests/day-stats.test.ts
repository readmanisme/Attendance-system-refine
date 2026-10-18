import { describe, expect, test } from "vitest";
import { computeDayStats, EMPTY_DAY_STATS } from "@/pages/qian-dao/dayStats";

/** 构造一条记录(默认带 expand.work.name) */
const rec = (workerId: string, workName: string | null, minutes: number | null) => ({
  worker_id: workerId,
  work_minutes: minutes,
  expand: workName == null ? undefined : { work: { name: workName } },
});

describe("computeDayStats", () => {
  test("空数据返回空统计", () => {
    expect(computeDayStats(undefined)).toBe(EMPTY_DAY_STATS);
    expect(computeDayStats(null)).toBe(EMPTY_DAY_STATS);
    expect(computeDayStats([])).toBe(EMPTY_DAY_STATS);
  });

  test("人数按 worker_id 去重,人均 = 总工时 / 人数", () => {
    const stats = computeDayStats([
      rec("w1", "搬运", 300),
      rec("w1", "挖土", 240), // 同一人跨工种:人数不重复计
      rec("w2", "搬运", 180),
    ]);
    expect(stats.workerCount).toBe(2);
    expect(stats.recordCount).toBe(3);
    expect(stats.totalMinutes).toBe(720);
    // 720 / 2 = 360 分钟
    expect(stats.avgMinutes).toBe(360);
  });

  test("人均工时四舍五入到分钟", () => {
    const stats = computeDayStats([rec("w1", "搬运", 100), rec("w2", "搬运", 101), rec("w3", "搬运", 101)]);
    // 302 / 3 = 100.67 → 101
    expect(stats.avgMinutes).toBe(101);
  });

  test("工种分布按工时降序,并统计该工种人数", () => {
    const stats = computeDayStats([
      rec("w1", "搬运", 120),
      rec("w2", "搬运", 60),
      rec("w1", "挖土", 480),
      rec("w3", "砌墙", 240),
    ]);
    expect(stats.works).toEqual([
      { name: "挖土", minutes: 480, workers: 1 },
      { name: "砌墙", minutes: 240, workers: 1 },
      { name: "搬运", minutes: 180, workers: 2 },
    ]);
  });

  test("工时相同时按工种名排序,保证展示顺序稳定", () => {
    const stats = computeDayStats([rec("w1", "挖土", 60), rec("w2", "搬运", 60)]);
    expect(stats.works.map((w) => w.name)).toEqual(["搬运", "挖土"]);
  });

  test("缺 expand 时工种兜底为未知;工时缺失按 0 计但仍算一条记录", () => {
    const stats = computeDayStats([rec("w1", null, null), rec("w1", "搬运", 60)]);
    expect(stats.recordCount).toBe(2);
    expect(stats.workerCount).toBe(1);
    expect(stats.totalMinutes).toBe(60);
    expect(stats.works.map((w) => [w.name, w.minutes])).toEqual([
      ["搬运", 60],
      ["未知", 0],
    ]);
  });

  test("没有 worker_id 的记录计入记录数,但不计入人数与人均", () => {
    const stats = computeDayStats([{ work_minutes: 120, expand: { work: { name: "搬运" } } }]);
    expect(stats.recordCount).toBe(1);
    expect(stats.workerCount).toBe(0);
    expect(stats.totalMinutes).toBe(120);
    expect(stats.avgMinutes).toBe(0);
    expect(stats.works[0]).toEqual({ name: "搬运", minutes: 120, workers: 0 });
  });
});
