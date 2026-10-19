/**
 * 统计图表页聚合层(compute.ts)的单测。
 * 页面/图表在 e2e 里只能断言"画了没崩",这里用种子数据把引擎数值锁死。
 * 记录形态与 refine useList 的产物一致: expand.worker_id.name / expand.work.name。
 */
import { expect, test, describe } from "vitest";
import {
  buildOverview,
  buildProfiles,
  buildRelation,
  buildSankey,
  filterRecordsByMonth,
} from "@/pages/tong-ji/compute";

/** 帮手: 构造一条带 expand 的记录 */
const rec = (id: string, worker: string, work: string, date: string, minutes: number) => ({
  id,
  worker_id: worker,
  work,
  work_date: date,
  work_minutes: minutes,
  expand: {
    worker_id: { id: worker, name: worker.replace("w", "测试") },
    work: { id: work, name: work.replace("t", "工种") },
  },
});

const wA = "wA";
const wB = "wB";
const tBy = "tby"; // 搬运
const tWt = "twt"; // 挖土
const nameOf = (id: string) => (id === wA ? "测试A" : "测试B");
const nameOfWork = (id: string) => (id === tBy ? "工种by" : "工种wt");

/** buildOverview/buildProfiles 共用种子:
 *  r1 A 08-01 搬运 600 → 甲_搬运价20 → 10h×20 = 200
 *  r2 A 08-02 搬运 300 → 5h×20 = 100
 *  r3 A 08-02 挖土 200 → 未定价兜底基础10 → 3.3333h×10 = 33.3333
 *  r4 B 08-01 搬运 240 → 兜底基础10 → 4h×10 = 40
 *  r5 B 08-03 挖土 480 → 兜底 → 8h×10 = 80
 *  r6 B 09-10 搬运  90 → 兜底 → 1.5h×10 = 15
 *  合计: 分钟 1910, 支出 468.3333, 人天 5, 人数 2, 记录 6 */
const salaries = [
  {
    SalaryNum: 20,
    expand: { worker_name: { name: nameOf(wA) }, work_type: { name: nameOfWork(tBy) } },
  },
  { SalaryNum: 10, expand: { worker_name: null, work_type: { name: "基础" } } },
];
const records = [
  rec("r1", wA, tBy, "2026-08-01", 600),
  rec("r2", wA, tBy, "2026-08-02", 300),
  rec("r3", wA, tWt, "2026-08-02", 200),
  rec("r4", wB, tBy, "2026-08-01", 240),
  rec("r5", wB, tWt, "2026-08-03", 480),
  rec("r6", wB, tBy, "2026-09-10", 90),
];
// 单测里的名字与上面 rec() 的名字映射绑定: wA→测试A 等
const nameA = "测试A";
const nameB = "测试B";
const nameBy = "工种by";
const nameWt = "工种wt";

describe("filterRecordsByMonth", () => {
  test("含首尾月边界,支持 null 不筛选", () => {
    expect(filterRecordsByMonth(records, [null, null])).toHaveLength(6);
    const aug = filterRecordsByMonth(records, ["2026-08", "2026-08"]);
    expect(aug.map((r) => r.id)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
    expect(filterRecordsByMonth(records, ["2026-09", "2026-09"]).map((r) => r.id)).toEqual(["r6"]);
    expect(filterRecordsByMonth(undefined, [null, null])).toEqual([]);
  });
});

describe("buildOverview", () => {
  const o = buildOverview(records, salaries);

  test("顶部卡数值", () => {
    expect(o.totalMinutes).toBe(1910);
    expect(o.totalSalary.toDecimalPlaces(2).toString()).toBe("468.33");
    expect(o.personDays).toBe(5);
    expect(o.workerCount).toBe(2);
    expect(o.recordCount).toBe(6);
  });

  test("每日序列补空白(留 null)", () => {
    expect(o.daily[0]).toEqual({ day: "2026-08-01", minutes: 840, persons: 2 });
    expect(o.daily[1]).toEqual({ day: "2026-08-02", minutes: 500, persons: 1 });
    // 08-04~09-09 是断档日 → null 留白
    const gap = o.daily.find((d) => d.day === "2026-08-04");
    expect(gap).toEqual({ day: "2026-08-04", minutes: null, persons: null });
  });

  test("月度序列含断档月,人天/班制口径", () => {
    expect(o.monthly.map((m) => m.month)).toEqual(["2026-08", "2026-09"]);
    const aug = o.monthly[0];
    expect(aug.minutes).toBe(1820);
    expect(aug.personDays).toBe(4); // 甲2人天 + 乙2人天
    expect(aug.workers).toBe(2);
    expect(aug.salary).toBe(453.33); // 200+100+33.3333+40+80
    // 班制四档(首尾相接): 甲08-01 10h 全日 / 甲08-02 8.33h 近全日 /
    // 乙08-01 4h 半日 / 乙08-03 8h 近全日
    expect(aug.fullDays).toBe(1);
    expect(aug.nearFullDays).toBe(2);
    expect(aug.halfDays).toBe(1);
    expect(aug.shortDays).toBe(0);
    // 人均强度:8月 1820 分钟 / 2 人 = 15.17h;出勤率 4 人天 / (2 人 × 31 天)
    expect(aug.avgHoursPerWorker).toBe(15.17);
    expect(aug.attendanceRate).toBe(0.065);
    // 超时:10h 不算(>10h 才计)
    expect(aug.over10Days).toBe(0);
    const sep = o.monthly[1];
    expect(sep.minutes).toBe(90);
    expect(sep.salary).toBe(15);
    // 9月只有 1.5h 的短时
    expect(sep.shortDays).toBe(1);
    // 环比:人天 1 vs 4 → -75%;工时 90 vs 1820
    expect(sep.personDaysMom).toBe(-75);
    expect(sep.hoursMom).toBe(-95.1);
    expect(sep.salaryMom).toBe(-96.7);
    // 首月没有环比
    expect(aug.hoursMom).toBeNull();
  });

  test("个人 Top 按人天排序,主工种/工时", () => {
    // 乙 3 天 > 甲 2 天
    expect(o.topWorkers.map((w) => w.name)).toEqual([nameB, nameA]);
    expect(o.topWorkers[0]).toMatchObject({ days: 3, hours: 13.5, topWork: nameWt });
    expect(o.topWorkers[1]).toMatchObject({ days: 2, hours: 18.33, topWork: nameBy });
  });

  test("工种汇总表(记录数/工时/支出)", () => {
    expect(o.workTypeTable[0]).toEqual({
      name: nameBy,
      recordCount: 4,
      hours: 20.5,
      salary: "355",
    });
    expect(o.workTypeTable[1]).toEqual({
      name: nameWt,
      recordCount: 2,
      hours: 11.33,
      salary: "113.33",
    });
  });

  test("未定价兜底: 挖土+搬运(仅乙侧)", () => {
    // 甲_搬运 已定价; 未定价的记录 = r3,r5(挖土) + r4,r6(乙的搬运) = 4 条 1010 分钟
    expect(o.unPriced.names).toEqual([nameWt, nameBy]);
    expect(o.unPriced.records).toBe(4);
    expect(o.unPriced.minutes).toBe(1010);
  });

  test("班制占比/分布兜底结构", () => {
    // 四档首尾相接:10h 全日 / 8.33h+8h 近全日 / 4h 半日 / 1.5h 短时
    expect(o.shiftPie).toEqual([
      { name: "全日(≥9h)", value: 1 },
      { name: "近全日(8~9h)", value: 2 },
      { name: "半日(3~8h)", value: 1 },
      { name: "短时(<3h)", value: 1 },
    ]);
    // 出勤天数最多 3 天 → 档宽 5
    expect(o.attendDist).toEqual([{ bucket: "0-4", workers: 2 }]);
    expect(o.recordDist).toHaveLength(6);
    // 未定价金额:兜底 4 条按基础 10 元 = 33.3333+80+40+15 = 168.33
    expect(o.unPriced.salary).toBe("168.33");
    expect(o.unPriced.share).toBeCloseTo(0.359, 2);
  });

  test("支出 Top / 队伍增长与流失", () => {
    expect(o.salaryTop[0]).toMatchObject({ name: nameA, salary: 333.33, days: 2 });
    expect(o.salaryTop[1]).toMatchObject({ name: nameB, salary: 135, days: 3 });
    // 8 月两人都是首次出勤;9 月乙回归(非首次),甲沉默
    expect(o.growth).toEqual([
      {
        month: "2026-08",
        newWorkers: 2,
        activeWorkers: 2,
        returningWorkers: 0,
        silentWorkers: 0,
        totalWorkers: 2,
      },
      {
        month: "2026-09",
        newWorkers: 0,
        activeWorkers: 1,
        returningWorkers: 1,
        silentWorkers: 1,
        totalWorkers: 2,
      },
    ]);
  });

  test("整体人均强度", () => {
    // 1910 分钟 / 2 人 / 2 个有出勤月 = 7.96h
    expect(o.perCapita.avgHoursPerWorker).toBe(7.96);
    // 5 人天 / (2 人 × 41 天:08-01~09-10)
    expect(o.perCapita.spanDays).toBe(41);
    expect(o.perCapita.attendanceRate).toBe(0.061);
  });

  test("异常日/人月热力/工种×星期", () => {
    // 08-01 合计 840 分钟 = 14h,但拆到两个人(甲 10h + 乙 4h)→ 不算异常
    expect(o.anomalyDays).toEqual([]);
    expect(o.personDayOver).toEqual([]);
    expect(o.workerMonthHeat.months).toEqual(["2026-08", "2026-09"]);
    expect(o.workerMonthHeat.names).toEqual([nameB, nameA]);
    expect(o.workerMonthHeat.data).toContainEqual([0, 0, 2]); // 乙 8 月 2 天
    expect(o.workWeekday.works).toEqual([nameBy, nameWt]);
    expect(o.workWeekday.data.every(([, , v]) => v > 0)).toBe(true);
  });

  test("单人单日 >12h 才算异常(多人合计不算)", () => {
    const o = buildOverview([
      // 同一天两人各 10h:合计 20h,但每人都不超 12h
      rec("o1", wA, tBy, "2026-08-01", 600),
      rec("o2", wB, tBy, "2026-08-01", 600),
      // 甲 08-02 跨两个工种 10h + 3.33h = 13.33h → 异常
      rec("o3", wA, tBy, "2026-08-02", 600),
      rec("o4", wA, tWt, "2026-08-02", 200),
      // 乙 08-02 只有 4h
      rec("o5", wB, tBy, "2026-08-02", 240),
    ]);
    expect(o.personDayOver).toEqual([
      { workerId: wA, name: nameA, day: "2026-08-02", hours: 13.33 },
    ]);
    // 趋势图按天去重,取当天最长的那个人
    expect(o.anomalyDays).toEqual([{ day: "2026-08-02", hours: 13.33 }]);
  });

  test("空数据不炸", () => {
    const empty = buildOverview([], []);
    expect(empty.recordCount).toBe(0);
    expect(empty.daily).toEqual([]);
    expect(empty.monthly).toEqual([]);
    expect(empty.salaryTop).toEqual([]);
  });
});

describe("buildRelation", () => {
  /** 甲出勤5天,乙出勤3天(与甲共3天),丙只1天 */
  const rel = buildRelation([
    rec("c1", wA, tBy, "2026-08-01", 300),
    rec("c2", wA, tWt, "2026-08-02", 300),
    rec("c3", wA, tBy, "2026-08-03", 300),
    rec("c4", wA, tWt, "2026-08-04", 300),
    rec("c5", wA, tBy, "2026-08-05", 300),
    rec("c6", wB, tBy, "2026-08-01", 300),
    rec("c7", wB, tBy, "2026-08-02", 300),
    rec("c8", wB, tBy, "2026-08-03", 300),
    rec("c9", "wC", tBy, "2026-08-01", 300),
    rec("c10", wA, tWt, "2026-08-01", 100), // 同人同天多工种: 共现仍按人天去重,c1 与 c10 同一天只算 1 次
  ]);

  test("热力矩阵按出勤 Top 排序,对角线 0", () => {
    expect(rel.matrixNames).toEqual(["测试A", "测试B", "测试C"]);
    expect(rel.coMatrix).toEqual([
      [0, 3, 1],
      [3, 0, 1],
      [1, 1, 0],
    ]);
  });

  test("网络节点=出勤≥5天,边候选=共现≥2(节点/边都用 id)", () => {
    expect(rel.graph.nodes).toEqual([
      { id: wA, name: "测试A", days: 5, size: expect.closeTo(6.625, 3) },
    ]);
    expect(rel.graph.links).toEqual([{ source: wA, target: wB, value: 3 }]);
    // 展示名映射:重名不会互相覆盖
    expect(rel.nameOf.get(wA)).toBe("测试A");
  });

  test("稳定性散点: ratio=co/min(双方出勤天)", () => {
    expect(rel.stable).toEqual([{ a: "测试A", b: "测试B", coDays: 3, ratio: 1.0 }]);
  });

  test("partnerPairs: 双向收录,按共现降序", () => {
    const pairsA = rel.partnerPairs.get(wA)!;
    expect(pairsA[0]).toEqual({ id: wB, name: "测试B", co: 3 });
    expect(pairsA).toContainEqual({ id: "wC", name: "测试C", co: 1 });
    expect(rel.partnerPairs.get("wC")).toEqual([
      { id: wA, name: "测试A", co: 1 },
      { id: wB, name: "测试B", co: 1 },
    ]);
  });
});

describe("buildSankey", () => {
  test("人→工种流向与 TopN", () => {
    const data = buildSankey([
      rec("k1", wA, tBy, "2026-08-01", 600), // 甲→搬运 10h
      rec("k2", wA, tWt, "2026-08-02", 200), // 甲→挖土 3.33h
      rec("k3", wB, tBy, "2026-08-01", 300), // 乙→搬运 5h
    ]);
    expect(data.topN).toBe(20);
    // 工人节点(总工时): 甲 13.33, 乙 5
    const nodeHours = Object.fromEntries(data.nodes.map((n) => [n.name, n.hours]));
    expect(nodeHours["测试A"]).toBe(13.33);
    expect(nodeHours["测试B"]).toBe(5);
    expect(nodeHours["工种by"]).toBe(15);
    expect(nodeHours["工种wt"]).toBeCloseTo(3.33, 2);
    // 每人链接按工种工时降序;source/target 都是 id
    const links = data.links.map((l) => [l.source, l.target, l.hours]);
    expect(links).toContainEqual([wA, tBy, 10]);
    expect(links).toContainEqual([wA, tWt, 3.33]);
    expect(links).toContainEqual([wB, tBy, 5]);
    // 工种节点 id 用 workId,展示名仍是工种名
    expect(data.nodes.find((n) => n.id === tBy)?.name).toBe("工种by");
  });

  test("topN=1 只保留最活跃的人", () => {
    const data = buildSankey(
      [rec("k1", wA, tBy, "2026-08-01", 600), rec("k3", wB, tBy, "2026-08-01", 300)],
      1,
    );
    expect(data.nodes.filter((n) => n.isWorker)).toHaveLength(1);
    expect(data.links.every((l) => l.source !== wB)).toBe(true);
  });
});

describe("buildProfiles", () => {
  const p = buildProfiles(records, salaries);

  test("画像数值与概览同口径", () => {
    // 出勤天降序: 乙(3) 在前
    expect(p.list.map((x) => x.name)).toEqual([nameB, nameA]);
    expect(p.byId.get(wA)).toMatchObject({
      name: nameA,
      days: 2,
      hours: 18.33,
      salary: "333.33", // 200+100+33.3333
      avgDayHours: 9.17, // round(1100/2)=550 → 9.1667
      topWork: nameBy,
      workCount: 2,
      firstDay: "2026-08-01",
    });
    expect(p.byId.get(wB)).toMatchObject({
      days: 3,
      hours: 13.5,
      salary: "135",
      avgDayHours: 4.5, // round(810/3)=270
      topWork: nameWt,
      workCount: 2,
      firstDay: "2026-08-01",
    });
  });

  test("月度序列补断档/工种构成排序", () => {
    expect(p.monthSeries.get(wB)).toEqual([
      { month: "2026-08", days: 2, hours: 12, salary: 120 }, // 40+80
      { month: "2026-09", days: 1, hours: 1.5, salary: 15 },
    ]);
    expect(p.workTypeMinutes.get(wA)).toEqual([
      { name: nameBy, hours: 15 }, // 600+300 分钟
      { name: nameWt, hours: 3.33 },
    ]);
  });

  test("无记录工人不出现", () => {
    expect(buildProfiles([], []).list).toEqual([]);
  });

  test("逐日出勤:只含有出勤的日期,当日跨工种合计", () => {
    expect(p.dailySeries.get(wA)).toEqual([
      { day: "2026-08-01", hours: 10 }, // 600 分钟
      { day: "2026-08-02", hours: 8.33 }, // 300+200 分钟
    ]);
    expect(p.dailySeries.get(wB)).toEqual([
      { day: "2026-08-01", hours: 4 },
      { day: "2026-08-03", hours: 8 },
      { day: "2026-09-10", hours: 1.5 },
    ]);
  });

  test("星期几节奏:固定 7 项,按星期汇总天数与工时", () => {
    /** 周一=0 … 周日=6,与聚合口径一致 */
    const idxOf = (day: string) => {
      const wd = new Date(`${day}T00:00:00`).getDay();
      return wd === 0 ? 6 : wd - 1;
    };
    const a = p.weekday.get(wA)!;
    expect(a.map((w) => w.key)).toEqual(["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);
    expect(a).toHaveLength(7);
    expect(a[idxOf("2026-08-01")]).toMatchObject({ days: 1, hours: 10 });
    expect(a[idxOf("2026-08-02")]).toMatchObject({ days: 1, hours: 8.33 });
    // 其余星期几为 0
    expect(a.reduce((s, w) => s + w.days, 0)).toBe(2);
    expect(a.reduce((s, w) => s + w.hours, 0)).toBeCloseTo(18.33, 2);
  });

  test("单日工时分布与班制占比:人天口径,按当日合计工时分类", () => {
    // 甲: 10h / 8.33h → 10~11 与 8~9 各一天
    expect(p.dayHoursDist.get(wA)).toEqual([
      { bucket: "8~9", days: 1 },
      { bucket: "10~11", days: 1 },
    ]);
    // 10h 全日;8.33h 落在 8~9 → 近全日(不再掉进"其他")
    expect(p.shiftPie.get(wA)).toEqual([
      { name: "全日(≥9h)", value: 1 },
      { name: "近全日(8~9h)", value: 1 },
    ]);
    // 乙: 4h 半日 / 8h 近全日 / 1.5h 短时
    expect(p.shiftPie.get(wB)).toEqual([
      { name: "近全日(8~9h)", value: 1 },
      { name: "半日(3~8h)", value: 1 },
      { name: "短时(<3h)", value: 1 },
    ]);
    expect(p.dayHoursDist.get(wB)?.map((b) => b.bucket)).toEqual(["1~2", "4~5", "8~9"]);
  });

  test("百分位/中位数/P95 与工种收入构成", () => {
    // "超过多少人":出勤 3 天的乙超过 1/2 的人;甲 2 天谁也没超过
    expect(p.byId.get(wB)!.percentile.days).toBe(50);
    expect(p.byId.get(wA)!.percentile.days).toBe(0);
    // 出勤率 = 出勤天 / 首末跨度天数
    expect(p.byId.get(wA)!.attendanceRate).toBe(1); // 08-01~08-02 两天都出勤
    expect(p.byId.get(wB)!.attendanceRate).toBe(0.073); // 3 天 / 41 天
    // 雷达基线用中位数,P95 作为归一化上限
    expect(p.teamMedian.days).toBe(2.5);
    expect(p.scaleMax.days).toBeCloseTo(2.95, 2);
    expect(p.scaleMax.salary).toBeCloseTo(323.41, 1);
    // 工种收入构成:甲的搬运 300(15h×20),挖土 33.33(兜底 10)
    expect(p.workTypeSalary.get(wA)).toEqual([
      { name: nameBy, salary: 300 },
      { name: nameWt, salary: 33.33 },
    ]);
  });

  test("团队人均 = 全员算术平均(个人雷达基线)", () => {
    expect(p.teamAvg.days).toBe(2.5); // (2+3)/2
    expect(p.teamAvg.hours).toBeCloseTo(15.92, 1); // (18.33+13.5)/2
    expect(p.teamAvg.salary).toBeCloseTo(234.17, 0); // (333.33+135)/2
    expect(p.teamAvg.avgDayHours).toBeCloseTo(6.84, 1); // (9.17+4.5)/2
    expect(p.teamAvg.workCount).toBe(2);
    // 空数据不除零
    expect(buildProfiles([], []).teamAvg).toEqual({
      days: 0,
      hours: 0,
      salary: 0,
      avgDayHours: 0,
      workCount: 0,
    });
  });
});
