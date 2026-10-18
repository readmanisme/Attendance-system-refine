/**
 * 统计聚合层(compute.ts)的边界单测。
 * 与 tong-ji-compute.test.ts 互补:那边锁常规口径,这边专攻
 * 跨年月份补齐、分布桶边界(200+/14+)、星期映射、箱线分位数、
 * 关系图空数据与 Top20 截断、桑基图 0 工时跳过、月份筛选的月末边界。
 */
import { describe, expect, test } from "vitest";
import {
  buildOverview,
  buildProfiles,
  buildRelation,
  buildSankey,
  filterRecordsByMonth,
  WEEKDAY_KEYS,
} from "@/pages/tong-ji/compute";

/** 一条带 expand 的记录(与 refine useList 产物同形) */
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

/** 从 start 起连续 n 天("YYYY-MM-DD"),用于构造大样本 */
const daysFrom = (start: string, n: number): string[] => {
  const [y, m, d] = start.split("-").map(Number);
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10),
  );
};

describe("filterRecordsByMonth 边界", () => {
  const records = [
    rec("a", "w", "t", "2026-01-31", 60),
    rec("b", "w", "t", "2026-02-01", 60),
    rec("c", "w", "t", "2026-02-28", 60),
    rec("d", "w", "t", "2026-03-01", 60),
  ];

  test("含起始月 1 日与结束月最后一天", () => {
    expect(filterRecordsByMonth(records, ["2026-02", "2026-02"]).map((r) => r.id)).toEqual([
      "b",
      "c",
    ]);
    expect(filterRecordsByMonth(records, ["2026-02", "2026-03"]).map((r) => r.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  test("只给起始月时,结束月不设限", () => {
    expect(filterRecordsByMonth(records, ["2026-02", null]).map((r) => r.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  test("只给结束月时,起始月不设限", () => {
    expect(filterRecordsByMonth(records, [null, "2026-02"]).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("缺日期的记录被排除(不参与筛选)", () => {
    expect(
      filterRecordsByMonth(
        [{ id: "x", work_date: undefined }, ...records],
        ["2026-02", "2026-02"],
      ).map((r) => r.id),
    ).toEqual(["b", "c"]);
  });

  test("闰年 2 月按 29 天算", () => {
    const leap = [rec("l1", "w", "t", "2028-02-29", 60), rec("l2", "w", "t", "2028-03-01", 60)];
    expect(filterRecordsByMonth(leap, ["2028-02", "2028-02"]).map((r) => r.id)).toEqual(["l1"]);
  });
});

describe("buildOverview 跨年与分布桶", () => {
  test("月份序列跨年补齐(12 月 → 次年 1 月)", () => {
    const o = buildOverview([
      rec("x1", "w1", "t1", "2026-12-31", 600, "甲", "搬运"),
      rec("x2", "w1", "t1", "2027-01-02", 300, "甲", "搬运"),
    ]);
    expect(o.monthly.map((m) => m.month)).toEqual(["2026-12", "2027-01"]);
    expect(o.fromMonth).toBe("2026-12");
    expect(o.toMonth).toBe("2027-01");
    // 每日序列也要跨年连续(12-31、01-01 留白、01-02)
    expect(o.daily.map((d) => d.day)).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(o.daily[1]).toEqual({ day: "2027-01-01", minutes: null, persons: null });
  });

  test("跨年时断档月补 0", () => {
    const o = buildOverview([
      rec("y1", "w1", "t1", "2026-11-05", 60, "甲", "搬运"),
      rec("y2", "w1", "t1", "2027-02-05", 60, "甲", "搬运"),
    ]);
    expect(o.monthly.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(o.monthly[1]).toMatchObject({ minutes: 0, personDays: 0, salary: 0, workDays: 0 });
    expect(o.monthly[2]).toMatchObject({ minutes: 0, personDays: 0 });
  });

  test("出勤分布: 档宽按跨度自适应(≤30 天用 5 天档)与 200+ 桶", () => {
    // 21 天 → 20-24 桶(档宽 5)
    const days21 = daysFrom("2026-03-01", 21);
    const o21 = buildOverview(days21.map((d, i) => rec(`a${i}`, "w1", "t1", d, 60, "甲", "搬运")));
    expect(o21.attendDist).toEqual([{ bucket: "20-24", workers: 1 }]);

    // 200 天 → 200+ 桶(不再细分为 200-219)
    const days200 = daysFrom("2026-01-01", 200);
    const o200 = buildOverview(
      days200.map((d, i) => rec(`b${i}`, "w1", "t1", d, 60, "甲", "搬运")),
    );
    expect(o200.attendDist).toEqual([{ bucket: "200+", workers: 1 }]);
    expect(o200.personDays).toBe(200);
  });

  test("记录时长分布: 0 分钟落在 0~1,超过 14h 归入 14+", () => {
    const o = buildOverview([
      rec("z0", "w1", "t1", "2026-05-01", 0, "甲", "搬运"),
      rec("z1", "w1", "t2", "2026-05-02", 59, "甲", "挖土"),
      rec("z2", "w1", "t3", "2026-05-03", 60, "甲", "砌墙"),
      rec("z3", "w1", "t4", "2026-05-04", 15 * 60, "甲", "浇筑"),
      rec("z4", "w1", "t5", "2026-05-05", 20 * 60, "甲", "运输"),
    ]);
    expect(o.recordDist).toEqual([
      { bucket: "0~1", count: 2 }, // 0 分钟与 59 分钟
      { bucket: "1~2", count: 1 },
      { bucket: "14+", count: 2 }, // 15h 与 20h
    ]);
  });

  test("星期分布: 周一=0 … 周日=6", () => {
    // 2026-08-03 是周一, 2026-08-09 是周日
    const o = buildOverview([
      rec("m1", "w1", "t1", "2026-08-03", 600, "甲", "搬运"),
      rec("m2", "w1", "t1", "2026-08-09", 300, "甲", "搬运"),
    ]);
    expect(o.weekday.map((w) => w.key)).toEqual(WEEKDAY_KEYS);
    expect(o.weekday).toHaveLength(7);
    expect(o.weekday[0]).toEqual({ key: "周一", personDays: 1, hours: 10 });
    expect(o.weekday[6]).toEqual({ key: "周日", personDays: 1, hours: 5 });
    expect(o.weekday[3]).toEqual({ key: "周四", personDays: 0, hours: 0 });
  });

  test("箱线图: 单样本五数相同", () => {
    const o = buildOverview([rec("s1", "w1", "t1", "2026-08-03", 600, "甲", "搬运")]);
    expect(o.boxData).toEqual([{ name: "甲", count: 1, box: [10, 10, 10, 10, 10] }]);
  });

  test("箱线图: 偶数样本线性插值", () => {
    // 4 天 2/4/6/8h → q0=2 q25=3.5 q50=5 q75=6.5 q100=8
    const o = buildOverview([
      rec("q1", "w1", "t1", "2026-08-03", 120, "甲", "搬运"),
      rec("q2", "w1", "t1", "2026-08-04", 240, "甲", "搬运"),
      rec("q3", "w1", "t1", "2026-08-05", 360, "甲", "搬运"),
      rec("q4", "w1", "t1", "2026-08-06", 480, "甲", "搬运"),
    ]);
    expect(o.boxData[0]).toEqual({ name: "甲", count: 4, box: [2, 3.5, 5, 6.5, 8] });
  });

  test("箱线图样本按人天合计,同天多工种先合并", () => {
    const o = buildOverview([
      rec("b1", "w1", "t1", "2026-08-03", 240, "甲", "搬运"),
      rec("b2", "w1", "t2", "2026-08-03", 120, "甲", "挖土"),
    ]);
    // 当日合计 6h,不是 4h 与 2h 两条样本
    expect(o.boxData[0]).toEqual({ name: "甲", count: 1, box: [6, 6, 6, 6, 6] });
  });

  test("无记录工人不进入任何统计", () => {
    const o = buildOverview([]);
    expect(o.workerCount).toBe(0);
    expect(o.personDays).toBe(0);
    expect(o.workTypeTable).toEqual([]);
    expect(o.workTypePie).toEqual([]);
    expect(o.workTypeMonthly).toEqual([]);
    expect(o.growth).toEqual([]);
    expect(o.boxData).toEqual([]);
    expect(o.weekday).toEqual(WEEKDAY_KEYS.map((key) => ({ key, personDays: 0, hours: 0 })));
    expect(o.shiftPie).toEqual([]);
  });

  test("workTypePie 按工时降序,workTypeMonthly 带断档月", () => {
    const o = buildOverview([
      rec("p1", "w1", "t1", "2026-07-01", 600, "甲", "搬运"),
      rec("p2", "w1", "t2", "2026-09-01", 300, "甲", "挖土"),
    ]);
    expect(o.workTypePie).toEqual([
      { name: "搬运", hours: 10 },
      { name: "挖土", hours: 5 },
    ]);
    expect(o.workTypeMonthly.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(o.workTypeMonthly[0].workMinutes).toEqual({ 搬运: 600 });
    expect(o.workTypeMonthly[1].workMinutes).toEqual({});
    expect(o.workTypeMonthly[2].workMinutes).toEqual({ 挖土: 300 });
  });
});

describe("buildRelation 边界", () => {
  test("空数据返回空结构", () => {
    const r = buildRelation(undefined);
    expect(r.matrixNames).toEqual([]);
    expect(r.coMatrix).toEqual([]);
    expect(r.graph.nodes).toEqual([]);
    expect(r.graph.links).toEqual([]);
    expect(r.stable).toEqual([]);
    expect(r.partnerPairs.size).toBe(0);
  });

  test("热力矩阵最多 20 人", () => {
    const records = Array.from({ length: 21 }, (_, i) =>
      rec(`t${i}`, `w${i}`, "t1", "2026-08-01", 60, `工人${i}`, "搬运"),
    );
    const r = buildRelation(records);
    expect(r.matrixNames).toHaveLength(20);
    expect(r.coMatrix).toHaveLength(20);
    // 21 人同一天 → 前 20 人的矩阵除对角线外都是 1
    expect(r.coMatrix[0][1]).toBe(1);
    expect(r.coMatrix[0][0]).toBe(0);
  });

  test("共现 1 天不进入网络边与散点,但进入 partnerPairs", () => {
    const r = buildRelation([
      rec("e1", "w1", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("e2", "w2", "t1", "2026-08-01", 60, "乙", "搬运"),
    ]);
    expect(r.graph.links).toEqual([]);
    expect(r.stable).toEqual([]);
    expect(r.partnerPairs.get("w1")).toEqual([{ id: "w2", name: "乙", co: 1 }]);
  });

  test("稳定性 ratio 以出勤少的一方为分母", () => {
    // 甲 4 天, 乙 2 天, 共现 2 天 → 2/2 = 1
    const r = buildRelation([
      rec("f1", "w1", "t1", "2026-08-01", 60, "甲", "搬运"),
      rec("f2", "w1", "t1", "2026-08-02", 60, "甲", "搬运"),
      rec("f3", "w1", "t1", "2026-08-03", 60, "甲", "搬运"),
      rec("f4", "w1", "t1", "2026-08-04", 60, "甲", "搬运"),
      rec("f5", "w2", "t1", "2026-08-01", 60, "乙", "搬运"),
      rec("f6", "w2", "t1", "2026-08-02", 60, "乙", "搬运"),
    ]);
    expect(r.stable).toEqual([{ a: "甲", b: "乙", coDays: 2, ratio: 1 }]);
  });
});

describe("buildSankey 边界", () => {
  test("空数据返回空节点与默认 TopN", () => {
    const s = buildSankey(undefined);
    expect(s.nodes).toEqual([]);
    expect(s.links).toEqual([]);
    expect(s.topN).toBe(20);
  });

  test("0 分钟记录不产生链接(节点/边用 id)", () => {
    const s = buildSankey([
      rec("g1", "w1", "t1", "2026-08-01", 0, "甲", "搬运"),
      rec("g2", "w1", "t2", "2026-08-02", 60, "甲", "挖土"),
    ]);
    expect(s.links).toEqual([{ source: "w1", target: "t2", hours: 1 }]);
    expect(s.nodes.map((n) => n.name)).toEqual(["甲", "挖土"]);
  });

  test("topN 按总工时截断,未入选者的工种不出现", () => {
    const s = buildSankey(
      [
        rec("h1", "w1", "t1", "2026-08-01", 600, "甲", "搬运"),
        rec("h2", "w2", "t2", "2026-08-01", 60, "乙", "挖土"),
      ],
      1,
    );
    expect(s.nodes.filter((n) => n.isWorker).map((n) => n.name)).toEqual(["甲"]);
    expect(s.nodes.filter((n) => !n.isWorker).map((n) => n.name)).toEqual(["搬运"]);
  });
});

describe("buildProfiles 边界", () => {
  test("平均单日工时按分钟四舍五入后再换算", () => {
    // 1 天 10 分钟 → round(10/1)=10 → 0.17h
    const p = buildProfiles([rec("i1", "w1", "t1", "2026-08-01", 10, "甲", "搬运")]);
    expect(p.byId.get("w1")!.avgDayHours).toBe(0.17);
  });

  test("单人跨年时月度序列补断档月", () => {
    const p = buildProfiles([
      rec("j1", "w1", "t1", "2026-12-01", 60, "甲", "搬运"),
      rec("j2", "w1", "t1", "2027-02-01", 120, "甲", "搬运"),
    ]);
    expect(p.monthSeries.get("w1")).toEqual([
      { month: "2026-12", days: 1, hours: 1, salary: 0 },
      { month: "2027-01", days: 0, hours: 0, salary: 0 },
      { month: "2027-02", days: 1, hours: 2, salary: 0 },
    ]);
  });

  test("缺 worker_id/work/日期 的记录被跳过", () => {
    const p = buildProfiles([
      { id: "k1", work: "t1", work_date: "2026-08-01", work_minutes: 60 },
      { id: "k2", worker_id: "w1", work_date: "2026-08-01", work_minutes: 60 },
      { id: "k3", worker_id: "w1", work: "t1", work_minutes: 60 },
    ]);
    expect(p.list).toEqual([]);
  });
});
