/**
 * 图表配置构建器(options.ts)单测。
 * 这些函数是"数据 → ECharts option"的纯映射,页面只能靠 canvas 冒烟验证,
 * 一旦轴/系列映射写错,图照样画得出来,所以这里锁两类契约:
 *  1) 所有函数对空数据不抛错(空状态是真实场景);
 *  2) 阈值过滤、TopN 截断、排序、null 留白等关键映射与数据一致。
 */
import { describe, expect, test } from "vitest";
import type { Relation, SankeyData, TeamAverage, WorkerProfile } from "@/pages/tong-ji/compute";
import {
  attendDistChartOption,
  calendarHeatmapOption,
  calendarYears,
  coHeatmapOption,
  cumulativeOption,
  dailyChartOption,
  dayCalendarYears,
  dayHoursBoxOption,
  graphOption,
  monthlyOverviewOption,
  monthlyShiftOption,
  personalCalendarOption,
  personalCumulativeOption,
  personalDayHoursDistOption,
  personalMonthlyOption,
  personalPartnerOption,
  personalRadarOption,
  personalWeekdayOption,
  radarOption,
  recordDistChartOption,
  salaryTopOption,
  sankeyOption,
  shiftPieOption,
  stableScatterOption,
  themeRiverOption,
  topWorkerChartOption,
  weekdayOption,
  workerGrowthOption,
  workTypeMonthlyOption,
  workTypePieOption,
} from "@/pages/tong-ji/options";

/** EChartsCoreOption 是索引签名类型,测试里统一用 any 读嵌套字段 */
const opt = (o: unknown) => o as any;

const emptyRelation: Relation = {
  matrixNames: [],
  coMatrix: [],
  graph: { nodes: [], links: [] },
  stable: [],
  partnerPairs: new Map(),
};
const emptySankey: SankeyData = { nodes: [], links: [], topN: 20 };

const relation = (over: Partial<Relation> = {}): Relation => ({ ...emptyRelation, ...over });
const sankey = (over: Partial<SankeyData> = {}): SankeyData => ({ ...emptySankey, ...over });

const worker = (over: Partial<WorkerProfile> = {}): WorkerProfile => ({
  id: "w1",
  name: "甲",
  days: 1,
  hours: 8,
  salary: "160",
  avgDayHours: 8,
  topWork: "搬运",
  workCount: 1,
  firstDay: "2026-08-01",
  ...over,
});

const teamAvg: TeamAverage = {
  days: 2,
  hours: 10,
  salary: 100,
  avgDayHours: 5,
  workCount: 2,
};

describe("空数据:所有图表配置都不抛错", () => {
  test("概览类", () => {
    expect(() => dailyChartOption([])).not.toThrow();
    expect(() => monthlyOverviewOption([])).not.toThrow();
    expect(() => cumulativeOption([])).not.toThrow();
    expect(() => salaryTopOption([])).not.toThrow();
    expect(() => topWorkerChartOption([])).not.toThrow();
    expect(() => attendDistChartOption([])).not.toThrow();
    expect(() => recordDistChartOption([])).not.toThrow();
    expect(() => shiftPieOption([])).not.toThrow();
    expect(() => workTypePieOption([])).not.toThrow();
    expect(() => workTypeMonthlyOption([])).not.toThrow();
    expect(() => weekdayOption([])).not.toThrow();
    expect(() => workerGrowthOption([])).not.toThrow();
    expect(() => monthlyShiftOption([])).not.toThrow();
    expect(() => calendarHeatmapOption([])).not.toThrow();
    expect(() => themeRiverOption([])).not.toThrow();
    expect(() => dayHoursBoxOption([])).not.toThrow();
  });

  test("关系/结构/个人类", () => {
    expect(() => coHeatmapOption(emptyRelation)).not.toThrow();
    expect(() => graphOption(emptyRelation, 10)).not.toThrow();
    expect(() => stableScatterOption([], 10)).not.toThrow();
    expect(() => sankeyOption(emptySankey)).not.toThrow();
    expect(() => radarOption([])).not.toThrow();
    expect(() => personalMonthlyOption([])).not.toThrow();
    expect(() => personalPartnerOption([])).not.toThrow();
    expect(() => personalRadarOption(worker(), teamAvg)).not.toThrow();
    expect(() => personalWeekdayOption([])).not.toThrow();
    expect(() => personalDayHoursDistOption([])).not.toThrow();
    expect(() => personalCumulativeOption([])).not.toThrow();
    expect(() => personalCalendarOption([])).not.toThrow();
  });

  test("空数据下的轴/系列仍是空数组", () => {
    expect(opt(dailyChartOption([])).series[0].data).toEqual([]);
    expect(opt(monthlyOverviewOption([])).xAxis.data).toEqual([]);
    expect(opt(radarOption([])).series[0].data).toEqual([]);
    expect(opt(sankeyOption(emptySankey)).series[0].data).toEqual([]);
    expect(opt(graphOption(emptyRelation, 10)).series[0].links).toEqual([]);
  });
});

describe("概览映射", () => {
  test("每日趋势: null 留白保留,分钟换算成小时", () => {
    const o = opt(
      dailyChartOption([
        { day: "2026-08-01", minutes: 600, persons: 2 },
        { day: "2026-08-02", minutes: null, persons: null },
      ]),
    );
    expect(o.series[0].data[0][1]).toBe(2);
    expect(o.series[0].data[1][1]).toBeNull();
    expect(o.series[1].data[0][1]).toBe(10);
    expect(o.series[1].data[1][1]).toBeNull();
    // 断线而不是连过去
    expect(o.series[1].connectNulls).toBe(false);
  });

  test("累计曲线: 工时与支出逐月累加", () => {
    const o = opt(
      cumulativeOption([
        {
          month: "2026-07",
          personDays: 1,
          workers: 1,
          minutes: 600,
          salary: 200,
          workDays: 1,
          fullDays: 1,
          halfDays: 0,
          otherDays: 0,
        },
        {
          month: "2026-08",
          personDays: 1,
          workers: 1,
          minutes: 300,
          salary: 100.5,
          workDays: 1,
          fullDays: 0,
          halfDays: 0,
          otherDays: 1,
        },
      ]),
    );
    expect(o.series[0].data).toEqual([10, 15]);
    expect(o.series[1].data).toEqual([200, 300.5]);
  });

  test("支出 Top 与出勤 Top 都反转成升序(横条从上到下)", () => {
    const salary = opt(
      salaryTopOption([
        { name: "甲", salary: 300, days: 3, hours: 20 },
        { name: "乙", salary: 100, days: 1, hours: 5 },
      ]),
    );
    expect(salary.yAxis.data).toEqual(["乙", "甲"]);
    expect(salary.series[0].data).toEqual([100, 300]);

    const top = opt(
      topWorkerChartOption([
        { id: "w1", name: "甲", days: 3, hours: 20, topWork: "搬运" },
        { id: "w2", name: "乙", days: 1, hours: 5, topWork: "挖土" },
      ]),
    );
    expect(top.yAxis.data).toEqual(["乙", "甲"]);
  });

  test("记录时长分布的横轴带 h 后缀", () => {
    const o = opt(
      recordDistChartOption([
        { bucket: "0~1", count: 2 },
        { bucket: "14+", count: 1 },
      ]),
    );
    expect(o.xAxis.data).toEqual(["0~1h", "14+h"]);
    expect(o.series[0].data).toEqual([2, 1]);
  });

  test("工种按月堆叠: 工种取并集,缺月补 0", () => {
    const o = opt(
      workTypeMonthlyOption([
        { month: "2026-07", workMinutes: { 搬运: 600 } },
        { month: "2026-08", workMinutes: { 挖土: 300 } },
        { month: "2026-09", workMinutes: {} },
      ]),
    );
    expect(o.series.map((s: any) => s.name)).toEqual(["搬运", "挖土"]);
    expect(o.series[0].data).toEqual([10, 0, 0]);
    expect(o.series[1].data).toEqual([0, 5, 0]);
  });
});

describe("关系分析映射", () => {
  test("共现热力只画下三角,visualMap 上限取最大共现", () => {
    const o = opt(
      coHeatmapOption(
        relation({
          matrixNames: ["甲", "乙", "丙"],
          coMatrix: [
            [0, 3, 1],
            [3, 0, 1],
            [1, 1, 0],
          ],
        }),
      ),
    );
    // i>=j 才保留: (0,0) (1,0) (1,1) (2,0) (2,1) (2,2)
    expect(o.series[0].data).toEqual([
      [0, 0, 0],
      [1, 0, 3],
      [1, 1, 0],
      [2, 0, 1],
      [2, 1, 1],
      [2, 2, 0],
    ]);
    expect(o.visualMap.max).toBe(3);
  });

  test("搭档网络: 边按阈值过滤,线宽随共现增长且有上限", () => {
    const r = relation({
      graph: {
        nodes: [{ name: "甲", days: 10, size: 7.25 }],
        links: [
          { source: "甲", target: "乙", value: 3 },
          { source: "甲", target: "丙", value: 12 },
        ],
      },
    });
    const filtered = opt(graphOption(r, 5));
    expect(filtered.series[0].links.map((l: any) => l.target)).toEqual(["丙"]);
    expect(filtered.series[0].links[0].lineStyle.width).toBeCloseTo(1 + 12 / 25, 5);
    expect(filtered.title.text).toContain("共现 ≥5 天");

    const wide = opt(
      graphOption(
        relation({ graph: { nodes: [], links: [{ source: "甲", target: "乙", value: 1000 }] } }),
        2,
      ),
    );
    expect(wide.series[0].links[0].lineStyle.width).toBe(6); // 上限 6
  });

  test("稳定性散点: 过滤阈值并按 ratio 降序", () => {
    const o = opt(
      stableScatterOption(
        [
          { a: "甲", b: "乙", coDays: 3, ratio: 0.5 },
          { a: "甲", b: "丙", coDays: 5, ratio: 1 },
          { a: "乙", b: "丙", coDays: 2, ratio: 0.9 },
        ],
        3,
      ),
    );
    expect(o.series[0].data).toEqual([
      [5, 1],
      [3, 0.5],
    ]);
    expect(o.title.text).toContain("共现 ≥3 天");
  });

  test("桑基: 节点按人/工种着色,链接 value = 工时", () => {
    const o = opt(
      sankeyOption(
        sankey({
          nodes: [
            { name: "甲", hours: 10, isWorker: true },
            { name: "搬运", hours: 10, isWorker: false },
          ],
          links: [{ source: "甲", target: "搬运", hours: 10 }],
        }),
      ),
    );
    expect(o.series[0].data[0].itemStyle.color).toBe("#5470c6");
    expect(o.series[0].data[1].itemStyle.color).toBe("#91cc75");
    expect(o.series[0].links).toEqual([{ source: "甲", target: "搬运", value: 10 }]);
    expect(o.title.text).toContain("Top20");
  });
});

describe("时间模式映射", () => {
  test("日历年份去重且跳过无记录日", () => {
    expect(
      calendarYears([
        { day: "2025-12-31", minutes: 60, persons: 1 },
        { day: "2026-01-01", minutes: null, persons: null },
        { day: "2026-01-02", minutes: 30, persons: 1 },
        { day: "2026-12-31", minutes: 60, persons: 1 },
      ]),
    ).toEqual(["2025", "2026"]);
  });

  test("日历热力: 每年一个 calendar 与一个 series,只放本年的点", () => {
    const o = opt(
      calendarHeatmapOption([
        { day: "2025-12-31", minutes: 60, persons: 1 },
        { day: "2026-01-02", minutes: 30, persons: 1 },
      ]),
    );
    expect(o.calendar).toHaveLength(2);
    expect(o.series).toHaveLength(2);
    expect(o.series[0].data).toEqual([["2025-12-31", 1]]);
    expect(o.series[1].data).toEqual([["2026-01-02", 0.5]]);
  });

  test("星期分布: 固定 7 轴,数据按序映射", () => {
    const o = opt(
      weekdayOption(
        ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((key, i) => ({
          key,
          personDays: i,
          hours: i * 2,
        })),
      ),
    );
    expect(o.xAxis.data).toHaveLength(7);
    expect(o.series[0].data).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("个人分析映射", () => {
  test("雷达图: topN 截断,指标上限取 TopN 最大值且至少为 1", () => {
    const o = opt(
      radarOption(
        [
          worker({
            id: "w1",
            name: "甲",
            days: 10,
            hours: 80,
            workCount: 3,
            salary: "1600",
            avgDayHours: 8,
          }),
          worker({
            id: "w2",
            name: "乙",
            days: 2,
            hours: 16,
            workCount: 1,
            salary: "0",
            avgDayHours: 8,
          }),
          worker({
            id: "w3",
            name: "丙",
            days: 1,
            hours: 8,
            workCount: 1,
            salary: "0",
            avgDayHours: 8,
          }),
        ],
        2,
      ),
    );
    expect(o.series[0].data.map((d: any) => d.name)).toEqual(["甲", "乙"]);
    const indicator = o.radar.indicator;
    expect(indicator.map((i: any) => i.name)).toEqual([
      "出勤天数",
      "总工时(h)",
      "工种广度",
      "收入(元)",
      "日均工时(h)",
    ]);
    expect(indicator[0].max).toBe(10);
    expect(indicator[1].max).toBe(80);
    expect(indicator[3].max).toBe(1600);
    // 收入全为 0 时下限兜底 1,避免 ECharts 除以 0
    const zero = opt(radarOption([worker({ salary: "0" })]));
    expect(zero.radar.indicator[3].max).toBe(1);
  });

  test("个人月度: 三个系列分别取 days/hours/salary", () => {
    const o = opt(personalMonthlyOption([{ month: "2026-08", days: 2, hours: 12, salary: 120 }]));
    expect(o.series.map((s: any) => s.data)).toEqual([[2], [12], [120]]);
  });

  test("个人搭档: 反转成升序,并取 Top10 的数据源", () => {
    const o = opt(
      personalPartnerOption([
        { name: "乙", co: 5 },
        { name: "丙", co: 3 },
        { name: "丁", co: 1 },
      ]),
    );
    expect(o.yAxis.data).toEqual(["丁", "丙", "乙"]);
    expect(o.series[0].data).toEqual([1, 3, 5]);
  });

  test("箱线图: 直接使用五数概括", () => {
    const o = opt(dayHoursBoxOption([{ name: "甲", count: 4, box: [2, 3.5, 5, 6.5, 8] }]));
    expect(o.xAxis.data).toEqual(["甲"]);
    expect(o.series[0].data).toEqual([[2, 3.5, 5, 6.5, 8]]);
  });

  test("个人对比雷达: 本人 + 团队人均两条,指标上限留 15% 余量", () => {
    const o = opt(
      personalRadarOption(
        worker({ name: "甲", days: 4, hours: 32, avgDayHours: 8, workCount: 3, salary: "640" }),
        teamAvg,
      ),
    );
    expect(o.radar.indicator.map((i: any) => i.name)).toEqual([
      "出勤天数",
      "总工时(h)",
      "日均工时(h)",
      "工种广度",
      "收入(元)",
    ]);
    expect(o.series[0].data.map((d: any) => d.name)).toEqual(["甲", "团队人均"]);
    // 出勤天数 max(4, 2)=4 → ceil(4*1.15)=5;收入 max(640,100) → 736
    expect(o.radar.indicator[0].max).toBe(5);
    expect(o.radar.indicator[4].max).toBe(736);
    expect(o.series[0].data[1].value).toEqual([2, 10, 5, 2, 100]);
    // 全 0 时兜底 1,避免 ECharts 除零
    const zero = opt(
      personalRadarOption(
        worker({ days: 0, hours: 0, salary: "0", avgDayHours: 0, workCount: 0 }),
        {
          days: 0,
          hours: 0,
          salary: 0,
          avgDayHours: 0,
          workCount: 0,
        },
      ),
    );
    expect(zero.radar.indicator.every((i: any) => i.max === 1)).toBe(true);
  });

  test("个人星期几节奏: 柱=出勤天数,线=日均工时(无出勤留空)", () => {
    const o = opt(
      personalWeekdayOption([
        { key: "周一", days: 2, hours: 16 },
        { key: "周二", days: 0, hours: 0 },
      ]),
    );
    expect(o.series[0].data).toEqual([2, 0]);
    expect(o.series[1].data).toEqual([8, null]);
  });

  test("个人单日工时分布: 横轴带 h 后缀,数据取天数", () => {
    const o = opt(
      personalDayHoursDistOption([
        { bucket: "8~9", days: 3 },
        { bucket: "14+", days: 1 },
      ]),
    );
    expect(o.xAxis.data).toEqual(["8~9h", "14+h"]);
    expect(o.series[0].data).toEqual([3, 1]);
  });

  test("个人累计: 工时与收入逐月累加", () => {
    const o = opt(
      personalCumulativeOption([
        { month: "2026-07", hours: 10, salary: 200 },
        { month: "2026-08", hours: 5.5, salary: 110.5 },
        { month: "2026-09", hours: 0, salary: 0 },
      ]),
    );
    expect(o.series[0].data).toEqual([10, 15.5, 15.5]);
    expect(o.series[1].data).toEqual([200, 310.5, 310.5]);
  });

  test("个人日历: 每年一格,只放该人的出勤日", () => {
    const o = opt(
      personalCalendarOption([
        { day: "2025-12-31", hours: 8 },
        { day: "2026-01-02", hours: 5.5 },
      ]),
    );
    expect(dayCalendarYears(["2026-01-02", "2026-03-01", "2025-12-31"])).toEqual(["2026", "2025"]);
    expect(o.calendar).toHaveLength(2);
    expect(o.series).toHaveLength(2);
    expect(o.series[0].data).toEqual([["2025-12-31", 8]]);
    expect(o.series[1].data).toEqual([["2026-01-02", 5.5]]);
    expect(o.visualMap.max).toBe(8);
  });
});

describe("tooltip / 轴格式化回调", () => {
  test("每日趋势与累计曲线: null 有专门文案", () => {
    const daily = opt(dailyChartOption([]));
    expect(daily.tooltip.valueFormatter(null)).toBe("无记录");
    expect(daily.tooltip.valueFormatter(5)).toBe("5");

    const cum = opt(cumulativeOption([]));
    expect(cum.tooltip.valueFormatter(null)).toBe("-");
    expect(cum.tooltip.valueFormatter(3)).toBe("3");
  });

  test("支出 Top 与出勤 Top 的提示取反转后的行", () => {
    const salary = opt(
      salaryTopOption([
        { name: "甲", salary: 300, days: 3, hours: 20 },
        { name: "乙", salary: 100, days: 1, hours: 5 },
      ]),
    );
    expect(salary.tooltip.formatter([{ dataIndex: 0 }])).toContain("乙");

    const top = opt(
      topWorkerChartOption([{ id: "w1", name: "甲", days: 3, hours: 20, topWork: "搬运" }]),
    );
    expect(top.tooltip.formatter([{ dataIndex: 0, value: 3 }])).toContain("主工种:搬运");
  });

  test("热力图提示显示两人名字与共现天数", () => {
    const o = opt(coHeatmapOption(relation({ matrixNames: ["甲", "乙"] })));
    expect(o.tooltip.formatter({ value: [0, 1, 3] })).toContain("甲 × 乙");
    expect(o.tooltip.formatter({ value: [0, 1, 3] })).toContain("共现 3 天");
  });

  test("搭档网络提示区分边与节点", () => {
    const o = opt(graphOption(relation(), 10));
    expect(
      o.tooltip.formatter({ dataType: "edge", data: { source: "甲", target: "乙", value: 6 } }),
    ).toContain("共现 6 天");
    expect(o.tooltip.formatter({ dataType: "node", name: "甲", data: { days: 9 } })).toContain(
      "出勤 9 天",
    );
  });

  test("稳定性散点提示取排序后的搭档对", () => {
    const o = opt(stableScatterOption([{ a: "甲", b: "乙", coDays: 5, ratio: 0.8 }], 3));
    const text = o.tooltip.formatter({ dataIndex: 0 });
    expect(text).toContain("甲 × 乙");
    expect(text).toContain("占较小方出勤 0.8");
  });

  test("日历热力提示显示日期与当日工时", () => {
    const o = opt(calendarHeatmapOption([]));
    expect(o.tooltip.formatter({ value: ["2026-01-02", 2] })).toContain("2026-01-02");
    expect(o.tooltip.formatter({ value: ["2026-01-02", 2] })).toContain("2h");
  });

  test("班制与工种月度的数值单位", () => {
    expect(opt(monthlyShiftOption([])).tooltip.valueFormatter(3)).toBe("3 人天");
    expect(opt(workTypeMonthlyOption([])).tooltip.valueFormatter(2.5)).toBe("2.5h");
  });

  test("星期提示: 有人天时算人均,无人天显示 -", () => {
    const o = opt(
      weekdayOption([
        { key: "周一", personDays: 2, hours: 10 },
        { key: "周二", personDays: 0, hours: 0 },
      ]),
    );
    expect(o.tooltip.formatter([{ dataIndex: 0 }])).toContain("人均:5.0h/人天");
    expect(o.tooltip.formatter([{ dataIndex: 1 }])).toContain("人均:-");
    expect(o.tooltip.formatter([])).toContain("人均:-"); // 越界也不炸
  });

  test("桑基提示区分边与节点", () => {
    const o = opt(sankeyOption(emptySankey));
    expect(
      o.tooltip.formatter({ dataType: "edge", data: { source: "甲", target: "搬运", value: 10 } }),
    ).toContain("甲 → 搬运");
    expect(o.tooltip.formatter({ name: "甲", value: 10 })).toContain("工时 10h");
  });

  test("个人搭档提示与箱线提示", () => {
    const partner = opt(personalPartnerOption([{ name: "乙", co: 5 }]));
    expect(partner.tooltip.formatter([{ dataIndex: 0 }])).toContain("共同出勤 5 天");

    const box = opt(dayHoursBoxOption([{ name: "甲", count: 4, box: [2, 3.5, 5, 6.5, 8] }]));
    const text = box.tooltip.formatter({ dataIndex: 0, value: [2, 3.5, 5, 6.5, 8] });
    expect(text).toContain("样本 4 天");
    expect(text).toContain("Q1:3.5h");
  });
});

describe("主题河流: TopN 与补零", () => {
  /** 构造 8 个工种,每个只有一个月有工时 → 第 8 名应并入"其他" */
  const monthly = Array.from({ length: 8 }, (_, i) => ({
    month: `2026-0${i + 1}`,
    workMinutes: { [`工种${i + 1}`]: (8 - i) * 60 },
  }));

  test("超过 topN 的工种并入其他", () => {
    const o = opt(themeRiverOption(monthly));
    const names = new Set(o.series[0].data.map((d: any) => d[2]));
    expect(names.has("其他")).toBe(true);
    expect(names.has("工种8")).toBe(false);
    expect(names.has("工种1")).toBe(true);
    // 8 个月 × 8 层 = 64 个点(每层每月都有值,缺月补 0)
    expect(o.series[0].data).toHaveLength(64);
  });

  test("自定义 topN 与 0 分钟跳过", () => {
    const o = opt(
      themeRiverOption(
        [
          { month: "2026-01", workMinutes: { 甲: 60, 乙: 0 } },
          { month: "2026-02", workMinutes: { 甲: 120 } },
        ],
        1,
      ),
    );
    const names = new Set(o.series[0].data.map((d: any) => d[2]));
    expect(names).toEqual(new Set(["甲", "其他"]));
    expect(o.series[0].data.filter((d: any) => d[2] === "甲")).toEqual([
      ["2026-01", 1, "甲"],
      ["2026-02", 2, "甲"],
    ]);
  });

  test("提示过滤 0h,轴标签回格式化 YYYY-MM", () => {
    const o = opt(themeRiverOption([{ month: "2026-01", workMinutes: { 甲: 60 } }]));
    const text = o.tooltip.formatter([
      { data: ["2026-01", 1, "甲"] },
      { data: ["2026-01", 0, "其他"] },
    ]);
    expect(text).toContain("2026-01");
    expect(text).toContain("甲: 1h");
    expect(text).not.toContain("其他");
    expect(o.tooltip.formatter([])).toBe("");
    expect(o.singleAxis.axisLabel.formatter(new Date("2026-03-01T00:00:00").getTime())).toBe(
      "2026-03",
    );
  });
});
