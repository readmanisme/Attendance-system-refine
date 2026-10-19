/**
 * 统计图表页的全部 ECharts option 构建器(纯函数:数据 → 配置)。
 * 图表口径:
 * - 人数/天数类(每日趋势/Top/月度)用人天口径(一人一天跨工种去重);
 * - 时长/工种类用记录口径(人×天×工种),在轴/提示语里注明;
 * - 断档月按 0 显示;每日序列无记录日以 null 留白不连线(与 报告.md 一致);
 * - 关系图/桑基的节点 name 一律用 id(避免重名合并),展示名走 data.display。
 */
import type {
  HealthIssue,
  MonthPoint,
  Overview,
  PersonalBucket,
  PersonalWeekday,
  Relation,
  SankeyData,
  TeamAverage,
  WorkerProfile,
} from "./compute";
import { minutesToHours } from "./compute";
import type { ChartOption } from "./EChart";

/** 公共 grid(标签留足空间) */
const grid = { left: 48, right: 56, top: 48, bottom: 64, containLabel: true };

/** 副标题样式(口径说明) */
const note = (text: string) => ({
  text,
  left: 8,
  top: 0,
  textStyle: { fontSize: 12, fontWeight: "normal" as const, color: "#999" },
});

/** 百分比展示(0.123 → "12.3%") */
const pct = (v: number | null | undefined): string =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v}%`;

// ======================== 概览 ========================

/** 每日出勤人数 & 总工时 双轴趋势(人天口径;无人数据日留白,有人单日 >12h 标红点) */
export const dailyChartOption = (
  daily: Overview["daily"],
  anomalyDays: Overview["anomalyDays"] = [],
): ChartOption => {
  const ts = (day: string) => new Date(`${day}T00:00:00`).getTime();
  // 红点画在"当天总工时"这条线上,点的高度用总工时,value 保留异常的那个人的工时
  const totalHoursOf = new Map(
    daily.map((d) => [d.day, d.minutes == null ? null : minutesToHours(d.minutes)]),
  );
  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number | null) => (v == null ? "无记录" : String(v)),
    },
    legend: { top: 12 },
    grid: { ...grid, bottom: daily.length > 120 ? 80 : 64 },
    // 数据点多时给滑块,避免两年 700+ 天挤在一起
    dataZoom: daily.length > 120 ? [{ type: "slider", bottom: 8, height: 22 }] : undefined,
    xAxis: { type: "time", name: "" },
    yAxis: [
      { type: "value", name: "出勤人数(人)", minInterval: 1 },
      { type: "value", name: "总工时(小时)" },
    ],
    series: [
      {
        name: "出勤人数",
        type: "line",
        yAxisIndex: 0,
        showSymbol: false,
        connectNulls: false,
        data: daily.map((d) => [ts(d.day), d.persons]),
        lineStyle: { width: 2 },
      },
      {
        name: "总工时",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        connectNulls: false,
        data: daily.map((d) => [ts(d.day), d.minutes == null ? null : minutesToHours(d.minutes)]),
        lineStyle: { width: 2 },
        markPoint: {
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color: "#e24b4a" },
          label: { show: false },
          data: anomalyDays.map((d) => ({
            coord: [ts(d.day), totalHoursOf.get(d.day) ?? d.hours],
            value: d.hours,
          })),
        },
      },
    ],
  };
};

/** 月度总览:人天/总工时(左轴) + 支出(右轴);断档月 0;提示里带环比 */
export const monthlyOverviewOption = (monthly: Overview["monthly"]): ChartOption => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: any[]) => {
      const m = monthly[params?.[0]?.dataIndex];
      if (!m) return "";
      return [
        m.month,
        `出勤人天:${m.personDays}(环比 ${pct(m.personDaysMom)})`,
        `总工时:${minutesToHours(m.minutes)}h(环比 ${pct(m.hoursMom)})`,
        `支出:${m.salary} 元(环比 ${pct(m.salaryMom)})`,
        `人均工时:${m.avgHoursPerWorker}h / 出勤率:${(m.attendanceRate * 100).toFixed(1)}%`,
      ].join("<br/>");
    },
  },
  legend: { top: 12 },
  grid: { ...grid, bottom: 80 },
  dataZoom: [{ type: "slider", bottom: 8, height: 22 }],
  xAxis: { type: "category", data: monthly.map((m) => m.month), axisLabel: { rotate: 45 } },
  yAxis: [
    { type: "value", name: "人天/工时" },
    { type: "value", name: "支出(元)" },
  ],
  series: [
    {
      name: "出勤人天",
      type: "bar",
      yAxisIndex: 0,
      data: monthly.map((m) => m.personDays),
    },
    {
      name: "总工时(h)",
      type: "bar",
      yAxisIndex: 0,
      data: monthly.map((m) => minutesToHours(m.minutes)),
    },
    {
      name: "支出(元)",
      type: "line",
      yAxisIndex: 1,
      data: monthly.map((m) => m.salary),
      lineStyle: { width: 2 },
    },
  ],
});

/** 累计工时 & 累计支出曲线(按月递增) */
export const cumulativeOption = (monthly: Overview["monthly"]): ChartOption => {
  let cumHours = 0;
  let cumSalary = 0;
  const acc = monthly.map((m) => ({
    month: m.month,
    cumHours: (cumHours += minutesToHours(m.minutes)),
    cumSalary: Math.round((cumSalary += m.salary) * 100) / 100,
  }));
  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => (v == null ? "-" : String(v)),
    },
    legend: { top: 12 },
    grid,
    xAxis: { type: "category", data: acc.map((a) => a.month), axisLabel: { rotate: 45 } },
    yAxis: [
      { type: "value", name: "累计工时(h)" },
      { type: "value", name: "累计支出(元)" },
    ],
    series: [
      {
        name: "累计工时",
        type: "line",
        yAxisIndex: 0,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
        data: acc.map((a) => a.cumHours),
      },
      {
        name: "累计支出(估算)",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
        data: acc.map((a) => a.cumSalary),
      },
    ],
  };
};

/** 排行口径 */
export type RankMode = "days" | "hours" | "salary";

/** 排行口径展示名 */
export const RANK_LABELS: Record<RankMode, string> = {
  days: "出勤天数(天)",
  hours: "总工时(h)",
  salary: "支出(元)",
};

/**
 * 工人排行(横条,替代原来分开的"出勤 Top15"与"支出 Top10")。
 * 一张图三种排序,减少概览里的重复榜单。
 */
export const rankOption = (
  list: WorkerProfile[],
  mode: RankMode = "days",
  topN = 15,
): ChartOption => {
  const valueOf = (w: WorkerProfile) =>
    mode === "days" ? w.days : mode === "hours" ? w.hours : Number(w.salary) || 0;
  const items = [...list].sort((a, b) => valueOf(b) - valueOf(a)).slice(0, topN);
  const asc = items.reverse();
  return {
    title: note(`口径:${RANK_LABELS[mode]};悬浮显示三项指标与主工种`),
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const w = asc[params?.[0]?.dataIndex];
        if (!w) return "";
        return `${w.name}<br/>出勤:${w.days} 天<br/>工时:${w.hours}h<br/>支出:${w.salary} 元<br/>主工种:${w.topWork}`;
      },
    },
    grid: { left: 16, right: 72, top: 40, bottom: 24, containLabel: true },
    xAxis: { type: "value", name: RANK_LABELS[mode] },
    yAxis: { type: "category", data: asc.map((w) => w.name) },
    series: [
      {
        name: RANK_LABELS[mode],
        type: "bar",
        // 带上 id,点击条形可直接联动到该人的个人分析
        data: asc.map((w) => ({ value: valueOf(w), id: w.id })),
        label: { show: true, position: "right" },
        barWidth: "60%",
      },
    ],
  };
};

/** 出勤天数分布(每人出勤多少天,按跨度自适应档宽) */
export const attendDistChartOption = (dist: Overview["attendDist"]): ChartOption => ({
  tooltip: { trigger: "axis" },
  grid,
  xAxis: { type: "category", data: dist.map((d) => d.bucket), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "人数", minInterval: 1 },
  series: [
    {
      name: "人数",
      type: "bar",
      data: dist.map((d) => d.workers),
      label: { show: true, position: "top" },
    },
  ],
});

/** 单条记录时长分布(记录口径:人×天×工种) */
export const recordDistChartOption = (dist: Overview["recordDist"]): ChartOption => ({
  title: note("口径:每条记录(人×天×工种)的合计工时"),
  tooltip: { trigger: "axis" },
  grid: { ...grid, top: 56 },
  xAxis: { type: "category", data: dist.map((d) => `${d.bucket}h`), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "记录条数", minInterval: 1 },
  series: [
    {
      name: "记录条数",
      type: "bar",
      data: dist.map((d) => d.count),
      label: { show: true, position: "top" },
    },
  ],
});

/** 班制占比(按人天:全日/近全日/半日/短时) */
export const shiftPieOption = (shiftPie: Overview["shiftPie"]): ChartOption => ({
  tooltip: {
    trigger: "item",
    formatter: "{b}: {c} 人天 ({d}%)",
  },
  legend: { top: 12 },
  series: [
    {
      name: "班制",
      type: "pie",
      radius: ["36%", "62%"],
      center: ["50%", "56%"],
      label: { formatter: "{b}\n{d}%" },
      data: shiftPie,
    },
  ],
});

/** 工种工时占比(记录口径;超过 8 类折叠成"其他",避免图例爆炸) */
export const workTypePieOption = (pie: Overview["workTypePie"]): ChartOption => {
  const top = pie.slice(0, 8);
  const restHours = pie.slice(8).reduce((s, x) => s + x.hours, 0);
  const data = restHours > 0 ? [...top, { name: "其他", hours: restHours }] : top;
  return {
    tooltip: { trigger: "item", formatter: "{b}: {c}h ({d}%)" },
    legend: { top: 12, type: "scroll" },
    series: [
      {
        name: "工种工时",
        type: "pie",
        radius: ["36%", "62%"],
        center: ["50%", "56%"],
        label: { formatter: "{b}\n{d}%" },
        data: data.map((x) => ({ name: x.name, value: x.hours })),
      },
    ],
  };
};

/** 工种工时按月堆叠(断档月 0) */
export const workTypeMonthlyOption = (data: Overview["workTypeMonthly"]): ChartOption => {
  const workNames = [...new Set(data.flatMap((m) => Object.keys(m.workMinutes)))];
  return {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v}h` },
    legend: { top: 12, type: "scroll" },
    grid: { ...grid, bottom: 96 },
    dataZoom: [{ type: "slider", bottom: 24, height: 22 }],
    xAxis: { type: "category", data: data.map((m) => m.month), axisLabel: { rotate: 45 } },
    yAxis: { type: "value", name: "工时(h)" },
    series: workNames.map((name) => ({
      name,
      type: "bar",
      stack: "total",
      emphasis: { focus: "series" },
      data: data.map((m) => minutesToHours(m.workMinutes[name] ?? 0)),
    })),
  };
};

// ======================== 关系分析 ========================

/** 共现热力(人天口径:两人当天均出勤即共现一天) */
export const coHeatmapOption = (relation: Relation): ChartOption => {
  const { matrixNames, coMatrix } = relation;
  const maxCo = Math.max(1, ...coMatrix.flat());
  return {
    title: note("口径:两人当天均出勤(跨工种去重);点格子可跳到该人的个人分析"),
    tooltip: {
      position: "top",
      formatter: (p: any) =>
        `${matrixNames[p.value[0]]} × ${matrixNames[p.value[1]]}<br/>共现 ${p.value[2]} 天`,
    },
    grid: { left: 110, right: 60, top: 48, bottom: 110, containLabel: false },
    xAxis: { type: "category", data: matrixNames, axisLabel: { rotate: 60, fontSize: 11 } },
    // 类目轴默认从下往上,加 inverse 让第 0 个人显示在最上面,与名单顺序一致
    yAxis: { type: "category", data: matrixNames, inverse: true, axisLabel: { fontSize: 11 } },
    visualMap: {
      min: 0,
      max: maxCo,
      calculable: true,
      orient: "vertical",
      right: 8,
      bottom: 100,
      inRange: { color: ["#fff", "#3a72d4"] },
    },
    series: [
      {
        name: "共现天数",
        type: "heatmap",
        data: coMatrix.flatMap((row, i) =>
          row.map((v, j) => (i >= j ? [i, j, v] : null)).filter(Boolean),
        ),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8 } },
      },
    ],
  };
};

/**
 * 搭档网络(force 布局):节点 name = workerId(避免重名合并),
 * 展示名走 data.display;边按 coThreshold 过滤。
 */
export const graphOption = (relation: Relation, coThreshold: number): ChartOption => ({
  title: note(`边 = 共现 ≥${coThreshold} 天,连线越粗共现越多;节点大小 ∝ 出勤天数`),
  tooltip: {
    formatter: (p: any) =>
      p.dataType === "edge"
        ? `${p.data.sourceName ?? p.data.source} × ${p.data.targetName ?? p.data.target}<br/>共现 ${p.data.value} 天`
        : `${p.data?.display ?? p.name}:出勤 ${p.data.days} 天`,
  },
  legend: [],
  series: [
    {
      name: "搭档网络",
      type: "graph",
      layout: "force",
      roam: true,
      top: 36,
      bottom: 24,
      force: { repulsion: 220, edgeLength: [50, 160], gravity: 0.12 },
      label: {
        show: true,
        position: "right",
        fontSize: 11,
        formatter: (p: any) => p.data?.display ?? p.name,
      },
      edgeLabel: { show: false },
      lineStyle: {
        width: 1,
        curveness: 0.05,
        color: "source",
        opacity: 0.7,
      },
      emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
      data: relation.graph.nodes.map((n) => ({
        name: n.id,
        display: n.name,
        value: n.days,
        symbolSize: n.size,
        days: n.days,
      })),
      links: relation.graph.links
        .filter((l) => l.value >= coThreshold)
        .map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
          lineStyle: { width: Math.min(1 + l.value / 25, 6) },
        })),
    },
  ],
});

/** 稳定性散点:横轴共现天数,纵轴共现占两人出勤较小值的比例;按 coThreshold 过滤 */
export const stableScatterOption = (
  stable: Relation["stable"],
  coThreshold: number,
): ChartOption => {
  const pairs = [...stable]
    .filter((s) => s.coDays >= coThreshold)
    .sort((a, b) => b.ratio - a.ratio);
  return {
    title: note(`共现 ≥${coThreshold} 天的搭档对:越靠右越活跃,越靠上越固定(搭档绑定紧密)`),
    tooltip: {
      formatter: (p: any) => {
        const s = pairs[p.dataIndex];
        return `${s.a} × ${s.b}<br/>共现 ${s.coDays} 天,占较小方出勤 ${s.ratio}`;
      },
    },
    grid: { ...grid, top: 56 },
    xAxis: { type: "value", name: "共现天数" },
    yAxis: { type: "value", name: "共现占比", min: 0, max: 1.05 },
    series: [
      {
        name: "搭档对",
        type: "scatter",
        symbolSize: (v: number[]) => 6 + (v[0] as number) / 4,
        data: pairs.map((s) => [s.coDays, s.ratio]),
      },
    ],
  };
};

// ======================== 时间模式 ========================

/** 日期序列覆盖的年份(日历热力每年一个日历格) */
export const dayCalendarYears = (days: string[]): string[] => [
  ...new Set(days.map((d) => d.slice(0, 4))),
];

/** 出勤覆盖的年份序列(概览/时间模式口径:跳过无记录日) */
export const calendarYears = (daily: Overview["daily"]): string[] =>
  dayCalendarYears(daily.filter((d) => d.minutes != null).map((d) => d.day));

/** 日历热力公共构造:points = [日期, 数值],每年一行(概览与个人分析共用) */
const calendarCore = (
  points: [string, number][],
  tooltipFormatter: (p: any) => string,
  colors: string[] = ["#f0f0f0", "#8ab4ff", "#3a72d4"],
): ChartOption => {
  const years = dayCalendarYears(points.map((p) => p[0] as string));
  const maxVal = Math.max(1, ...points.map((p) => p[1]));
  return {
    tooltip: { formatter: tooltipFormatter },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: false,
      orient: "vertical",
      right: 8,
      top: "middle",
      text: [`${maxVal}h`, "0h"],
      inRange: { color: colors },
    },
    calendar: years.map((y, i) => ({
      range: y,
      left: 48,
      right: 64,
      top: i * 170 + 24,
      cellSize: ["auto", 16],
      itemStyle: { borderColor: "#fff", color: "#fafafa" },
      splitLine: { show: false },
      dayLabel: { firstDay: 1, nameMap: "cn", fontSize: 10 },
      monthLabel: { nameMap: "cn", fontSize: 11 },
    })),
    series: years.map((y, i) => ({
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: i,
      data: points.filter((p) => (p[0] as string).startsWith(y)),
    })),
  };
};

/** 出勤日历热力:GitHub 风格,每年一行,颜色=当日总工时(h) */
export const calendarHeatmapOption = (daily: Overview["daily"]): ChartOption => {
  const points = daily
    .filter((d) => d.minutes != null)
    .map((d) => [d.day, minutesToHours(d.minutes as number)] as [string, number]);
  return calendarCore(points, (p: any) => `${p.value?.[0]}<br/>当日总工时 ${p.value?.[1]}h`);
};

/** 月度班制结构堆叠(四档,首尾相接) */
export const monthlyShiftOption = (monthly: Overview["monthly"]): ChartOption => ({
  tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v} 人天` },
  legend: { top: 12 },
  grid,
  xAxis: { type: "category", data: monthly.map((m) => m.month), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "人天", minInterval: 1 },
  series: [
    {
      name: "全日(≥9h)",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.fullDays),
    },
    {
      name: "近全日(8~9h)",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.nearFullDays),
    },
    {
      name: "半日(3~8h)",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.halfDays),
    },
    {
      name: "短时(<3h)",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.shortDays),
    },
  ],
});

/** 星期几出勤分布:人天(柱,左) + 总工时(线,右) */
export const weekdayOption = (weekday: Overview["weekday"]): ChartOption => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: any) => {
      const item = weekday[params?.[0]?.dataIndex];
      const avg = item && item.personDays > 0 ? (item.hours / item.personDays).toFixed(1) : "-";
      return `${item?.key}<br/>出勤:${item?.personDays} 人天<br/>总工时:${item?.hours}h<br/>人均:${avg}h/人天`;
    },
  },
  legend: { top: 12 },
  grid,
  xAxis: { type: "category", data: weekday.map((w) => w.key) },
  yAxis: [
    { type: "value", name: "人天", minInterval: 1 },
    { type: "value", name: "工时(h)" },
  ],
  series: [
    {
      name: "出勤人天",
      type: "bar",
      yAxisIndex: 0,
      data: weekday.map((w) => w.personDays),
      label: { show: true, position: "top" },
    },
    {
      name: "总工时",
      type: "line",
      yAxisIndex: 1,
      lineStyle: { width: 2 },
      data: weekday.map((w) => w.hours),
    },
  ],
});

/** 队伍增长:新增/回归(堆叠柱) + 沉默人数(线) */
export const workerGrowthOption = (growth: Overview["growth"]): ChartOption => ({
  tooltip: { trigger: "axis" },
  legend: { top: 12 },
  grid,
  xAxis: { type: "category", data: growth.map((g) => g.month), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "人数", minInterval: 1 },
  series: [
    {
      name: "当月新增",
      type: "bar",
      stack: "team",
      emphasis: { focus: "series" },
      data: growth.map((g) => g.newWorkers),
    },
    {
      name: "当月回归",
      type: "bar",
      stack: "team",
      emphasis: { focus: "series" },
      data: growth.map((g) => g.returningWorkers),
    },
    {
      name: "沉默人数",
      type: "line",
      lineStyle: { width: 2, type: "dashed" },
      data: growth.map((g) => g.silentWorkers),
    },
  ],
});

/** 人 × 月 出勤热力(行=人,列=月,值=人天;数据坐标为 [月, 人, 值]) */
export const workerMonthHeatOption = (heat: Overview["workerMonthHeat"]): ChartOption => ({
  title: note("口径:人天;空白=该月没出勤。一眼看出谁在哪个阶段在场"),
  tooltip: {
    position: "top",
    formatter: (p: any) =>
      `${heat.names[p.value[1]]} · ${heat.months[p.value[0]]}<br/>出勤 ${p.value[2]} 天`,
  },
  grid: { left: 80, right: 72, top: 48, bottom: 56, containLabel: true },
  xAxis: { type: "category", data: heat.months, axisLabel: { rotate: 45, fontSize: 11 } },
  yAxis: { type: "category", data: heat.names, inverse: true, axisLabel: { fontSize: 11 } },
  visualMap: {
    min: 0,
    max: Math.max(1, ...heat.data.map((d) => d[2])),
    calculable: true,
    orient: "vertical",
    right: 8,
    top: "middle",
    text: ["多", "少"],
    inRange: { color: ["#f0f4ff", "#8ab4ff", "#3a72d4"] },
  },
  series: [{ type: "heatmap", data: heat.data, emphasis: { itemStyle: { shadowBlur: 8 } } }],
});

/** 工种 × 星期 工时热力(行=工种,列=星期,值=工时;数据坐标为 [星期, 工种, 值]) */
export const workWeekdayOption = (heat: Overview["workWeekday"]): ChartOption => ({
  title: note("口径:记录工时;周末偏深说明该类活集中在周末(也可能是补录)"),
  tooltip: {
    position: "top",
    formatter: (p: any) =>
      `${heat.works[p.value[1]]} · ${heat.weekdays[p.value[0]]}<br/>工时 ${p.value[2]}h`,
  },
  grid: { left: 96, right: 72, top: 48, bottom: 40, containLabel: true },
  xAxis: { type: "category", data: heat.weekdays, axisLabel: { fontSize: 11 } },
  yAxis: { type: "category", data: heat.works, inverse: true, axisLabel: { fontSize: 11 } },
  visualMap: {
    min: 0,
    max: Math.max(1, ...heat.data.map((d) => d[2])),
    calculable: true,
    orient: "vertical",
    right: 8,
    top: "middle",
    text: ["多", "少"],
    inRange: { color: ["#f0f4ff", "#8ab4ff", "#3a72d4"] },
  },
  series: [{ type: "heatmap", data: heat.data, emphasis: { itemStyle: { shadowBlur: 8 } } }],
});

/** 人均强度:人均月工时(柱,左) + 出勤率(线,右,%) */
export const intensityOption = (monthly: MonthPoint[]): ChartOption => ({
  title: note("人均月工时 = 总工时/当月出勤人数;出勤率 = 人天/(人数×当月天数)"),
  tooltip: {
    trigger: "axis",
    formatter: (params: any[]) => {
      const m = monthly[params?.[0]?.dataIndex];
      if (!m) return "";
      return `${m.month}<br/>人均工时:${m.avgHoursPerWorker}h<br/>出勤率:${(
        m.attendanceRate * 100
      ).toFixed(1)}%<br/>出勤人数:${m.workers} 人`;
    },
  },
  legend: { top: 12 },
  grid: { ...grid, top: 56 },
  xAxis: { type: "category", data: monthly.map((m) => m.month), axisLabel: { rotate: 45 } },
  yAxis: [
    { type: "value", name: "人均工时(h)" },
    { type: "value", name: "出勤率(%)", min: 0, max: 100 },
  ],
  series: [
    {
      name: "人均月工时",
      type: "bar",
      data: monthly.map((m) => m.avgHoursPerWorker),
      label: { show: true, position: "top", fontSize: 10 },
    },
    {
      name: "出勤率",
      type: "line",
      yAxisIndex: 1,
      lineStyle: { width: 2 },
      data: monthly.map((m) => Number((m.attendanceRate * 100).toFixed(1))),
    },
  ],
});

/** 超时:单日 >10h 的人天(柱) + 占人天比例(线) */
export const overtimeOption = (monthly: MonthPoint[]): ChartOption => ({
  title: note("单日合计 >10h 记一次超时;占比 = 超时人天/当月人天"),
  tooltip: {
    trigger: "axis",
    formatter: (params: any[]) => {
      const m = monthly[params?.[0]?.dataIndex];
      if (!m) return "";
      return `${m.month}<br/>超时人天:${m.over10Days}<br/>占比:${(m.over10Rate * 100).toFixed(1)}%`;
    },
  },
  legend: { top: 12 },
  grid: { ...grid, top: 56 },
  xAxis: { type: "category", data: monthly.map((m) => m.month), axisLabel: { rotate: 45 } },
  yAxis: [
    { type: "value", name: "人天", minInterval: 1 },
    { type: "value", name: "占比(%)", min: 0 },
  ],
  series: [
    { name: "超时人天", type: "bar", data: monthly.map((m) => m.over10Days) },
    {
      name: "占比",
      type: "line",
      yAxisIndex: 1,
      lineStyle: { width: 2 },
      data: monthly.map((m) => Number((m.over10Rate * 100).toFixed(1))),
    },
  ],
});

/** 月度环比:工时环比(柱) + 支出环比(线),0 线为基准 */
export const momOption = (monthly: MonthPoint[]): ChartOption => ({
  title: note("相对上月的增长率;首月与上月为 0 的月份不计算(留空)"),
  tooltip: {
    trigger: "axis",
    formatter: (params: any[]) => {
      const m = monthly[params?.[0]?.dataIndex];
      if (!m) return "";
      return `${m.month}<br/>人天环比:${pct(m.personDaysMom)}<br/>工时环比:${pct(
        m.hoursMom,
      )}<br/>支出环比:${pct(m.salaryMom)}`;
    },
  },
  legend: { top: 12 },
  grid: { ...grid, top: 56 },
  xAxis: { type: "category", data: monthly.map((m) => m.month), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "环比(%)" },
  series: [
    {
      name: "工时环比",
      type: "bar",
      data: monthly.map((m) => m.hoursMom),
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "#bbb", type: "dashed" },
        label: { show: false },
        data: [{ yAxis: 0 }],
      },
    },
    {
      name: "支出环比",
      type: "line",
      lineStyle: { width: 2 },
      connectNulls: false,
      data: monthly.map((m) => m.salaryMom),
    },
  ],
});

/** 工种工时主题河流:工种 × 月 工时流量(记录口径;超过 topN 的工种并入"其他") */
export const themeRiverOption = (
  workTypeMonthly: Overview["workTypeMonthly"],
  topN = 7,
): ChartOption => {
  const totals = new Map<string, number>();
  for (const m of workTypeMonthly)
    for (const [name, minutes] of Object.entries(m.workMinutes))
      totals.set(name, (totals.get(name) ?? 0) + minutes);
  const topNames = new Set(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([n]) => n),
  );
  const hasOther = totals.size > topNames.size;
  if (hasOther) topNames.add("其他");

  // 主题河流要求每层(工种)在每个时刻(月份)都有数据点,须补全为完整矩阵:
  // 某工种某月无产出则填 0,否则坑位错位导致整图 NaN 空白。
  // 注意:singleAxis 必须用 time 型 —— category 型与 themeRiver 的维度解析不兼容(静默空白,已用 SSR 渲染验证)。
  const names = [...topNames];
  const data: [string, number, string][] = [];
  for (const m of workTypeMonthly) {
    const merged = new Map<string, number>();
    for (const [name, minutes] of Object.entries(m.workMinutes)) {
      if (minutes <= 0) continue;
      const n = topNames.has(name) ? name : "其他";
      merged.set(n, (merged.get(n) ?? 0) + minutesToHours(minutes));
    }
    for (const n of names) data.push([m.month, merged.get(n) ?? 0, n]);
  }
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: "transparent" } },
      formatter: (params: any[]) => {
        const rows =
          params
            ?.map((p) => `${p?.data?.[2]}: ${p?.data?.[1]}h`)
            .filter((s) => !s.endsWith("0h")) ?? [];
        return `${params?.[0]?.data?.[0] ?? ""}${rows.length ? `<br/>${rows.join("<br/>")}` : ""}`;
      },
    },
    singleAxis: {
      type: "time",
      top: 48,
      bottom: 56,
      axisTick: { show: false },
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        // 月字符串按时间解析后格式化回 "YYYY-MM"
        formatter: (v: number) => {
          const d = new Date(v);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        },
      },
    },
    series: [
      {
        type: "themeRiver",
        data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: "rgba(58,114,212,0.35)" } },
      },
    ],
  };
};

// ======================== 关系追加:桑基 ========================

/** 人→工种 工时流向桑基(蓝=人,绿=工种;节点 name 用 id,label 用 display) */
export const sankeyOption = (sankey: SankeyData): ChartOption => {
  const displayOf = new Map(sankey.nodes.map((n) => [n.id, n.name]));
  return {
    title: note(`总工时 Top${sankey.topN} 的人 → 工种;连线越粗工时越多`),
    tooltip: {
      formatter: (p: any) =>
        p.dataType === "edge"
          ? `${displayOf.get(p.data.source) ?? p.data.source} → ${
              displayOf.get(p.data.target) ?? p.data.target
            }<br/>工时 ${p.data.value}h`
          : `${p.data?.display ?? p.name}<br/>工时 ${p.value}h`,
    },
    series: [
      {
        type: "sankey",
        left: 40,
        right: 150,
        top: 32,
        bottom: 24,
        nodeWidth: 14,
        nodeGap: 12,
        emphasis: { focus: "adjacency" },
        label: {
          fontSize: 11,
          formatter: (p: any) => p.data?.display ?? p.name,
        },
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.55 },
        data: sankey.nodes.map((n) => ({
          name: n.id,
          display: n.name,
          value: n.hours,
          itemStyle: n.isWorker ? { color: "#5470c6" } : { color: "#91cc75" },
        })),
        links: sankey.links.map((l) => ({ source: l.source, target: l.target, value: l.hours })),
      },
    ],
  };
};

// ======================== 个人分析 ========================

/** 个人月度:出勤天数(柱,左) + 工时(线,左) + 收入(线,右);断档月补 0 */
export const personalMonthlyOption = (
  series: { month: string; days: number; hours: number; salary: number }[],
): ChartOption => ({
  tooltip: { trigger: "axis" },
  legend: { top: 12 },
  grid: { ...grid, bottom: 84 },
  dataZoom: [{ type: "slider", bottom: 24, height: 22 }],
  xAxis: { type: "category", data: series.map((s) => s.month), axisLabel: { rotate: 45 } },
  yAxis: [
    { type: "value", name: "出勤天/工时h" },
    { type: "value", name: "收入(元)" },
  ],
  series: [
    {
      name: "出勤天数",
      type: "bar",
      yAxisIndex: 0,
      data: series.map((s) => s.days),
    },
    {
      name: "工时(h)",
      type: "line",
      yAxisIndex: 0,
      lineStyle: { width: 2 },
      data: series.map((s) => s.hours),
    },
    {
      name: "收入(估算)",
      type: "line",
      yAxisIndex: 1,
      lineStyle: { width: 2 },
      data: series.map((s) => s.salary),
    },
  ],
});

/** 个人搭档排名 Top10(横条:共同出勤天数) */
export const personalPartnerOption = (partners: { name: string; co: number }[]): ChartOption => {
  const asc = [...partners].reverse();
  return {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const item = asc[params?.[0]?.dataIndex];
        return `${item?.name}<br/>共同出勤 ${item?.co} 天`;
      },
    },
    grid: { left: 16, right: 48, top: 24, bottom: 24, containLabel: true },
    xAxis: { type: "value", name: "共同出勤天", minInterval: 1 },
    yAxis: { type: "category", data: asc.map((x) => x.name) },
    series: [
      {
        name: "搭档",
        type: "bar",
        data: asc.map((x) => x.co),
        label: { show: true, position: "right" },
        barWidth: "60%",
      },
    ],
  };
};

/** 个人工种收入构成(横条:该人各工种的估算收入) */
export const personalWorkSalaryOption = (
  items: { name: string; salary: number }[],
): ChartOption => {
  const asc = [...items].reverse();
  return {
    title: note("口径:该人各工种工时 × 时薪(与总支出同口径)"),
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const item = asc[params?.[0]?.dataIndex];
        return `${item?.name}<br/>收入 ${item?.salary} 元`;
      },
    },
    grid: { left: 16, right: 72, top: 40, bottom: 24, containLabel: true },
    xAxis: { type: "value", name: "元" },
    yAxis: { type: "category", data: asc.map((x) => x.name) },
    series: [
      {
        name: "收入",
        type: "bar",
        data: asc.map((x) => x.salary),
        label: { show: true, position: "right" },
        barWidth: "60%",
      },
    ],
  };
};

/** 雷达五维定义(顺序固定,概览与个人共用) */
const RADAR_DIMS = [
  { key: "days" as const, name: "出勤天数" },
  { key: "hours" as const, name: "总工时(h)" },
  { key: "workCount" as const, name: "工种广度" },
  { key: "salary" as const, name: "收入(元)" },
  { key: "avgDayHours" as const, name: "日均工时(h)" },
];

/** 画像指标数值(收入转 number) */
const metricOf = (w: WorkerProfile): TeamAverage => ({
  days: w.days,
  hours: w.hours,
  salary: Number(w.salary) || 0,
  avgDayHours: w.avgDayHours,
  workCount: w.workCount,
});

/**
 * Top5 工人画像雷达:各维统一归一化到 0~100(除以全员 P95),
 * 这样五维面积可比;悬浮显示原始值。
 */
export const radarOption = (
  list: WorkerProfile[],
  scaleMax?: TeamAverage,
  topN = 5,
): ChartOption => {
  const top = list.slice(0, topN);
  const scale = scaleMax ?? maxOfProfiles(top);
  const norm = (v: number, max: number) => Math.min(100, Math.round((v / Math.max(1, max)) * 100));
  return {
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        const raw = p.data.raw as number[];
        const rows = RADAR_DIMS.map((d, i) => `${d.name}:${raw[i]}`).join("<br/>");
        return `${p.name}<br/>${rows}`;
      },
    },
    legend: { top: 12, type: "scroll" },
    radar: {
      center: ["50%", "58%"],
      radius: "60%",
      indicator: RADAR_DIMS.map((d) => ({ name: d.name, max: 100 })),
      axisName: { fontSize: 11, color: "#666" },
    },
    series: [
      {
        type: "radar",
        emphasis: { focus: "series" },
        areaStyle: { opacity: 0.12 },
        data: top.map((w) => {
          const m = metricOf(w);
          return {
            name: w.name,
            value: RADAR_DIMS.map((d) => norm(m[d.key], scale[d.key])),
            raw: RADAR_DIMS.map((d) => m[d.key]),
          };
        }),
      },
    ],
  };
};

/** 没有外部 P95 时,用这组人自身的最大值兜底 */
const maxOfProfiles = (list: WorkerProfile[]): TeamAverage => {
  const max = (pick: (w: WorkerProfile) => number) => Math.max(1, ...list.map(pick));
  return {
    days: max((w) => w.days),
    hours: max((w) => w.hours),
    salary: max((w) => Number(w.salary) || 0),
    avgDayHours: max((w) => w.avgDayHours),
    workCount: max((w) => w.workCount),
  };
};

/**
 * 各人单日工时箱线(出勤 Top15;盒须=min/Q1/Q2/Q3/max)。
 * 样本 < minCount 天的人不画(1~3 天算不出有意义的四分位);
 * 若全员都不足 minCount,则退化为全部展示并在标题里注明。
 */
export const dayHoursBoxOption = (boxData: Overview["boxData"], minCount = 5): ChartOption => {
  const enough = boxData.filter((b) => b.count >= minCount);
  const useFallback = enough.length === 0;
  const data = useFallback ? boxData : enough;
  return {
    title: useFallback
      ? note(`样本均不足 ${minCount} 天,四分位参考意义有限`)
      : note(`仅显示单日样本 ≥${minCount} 天的人`),
    tooltip: {
      formatter: (p: any) => {
        const item = data[p?.dataIndex];
        const [min, q1, q2, q3, max] = p?.value ?? [];
        return `${item?.name}<br/>样本 ${item?.count} 天<br/>最低:${min}h / Q1:${q1}h<br/>中位:${q2}h / Q3:${q3}h<br/>最高:${max}h`;
      },
    },
    grid: { ...grid, top: 56 },
    xAxis: { type: "category", data: data.map((b) => b.name), axisLabel: { rotate: 45 } },
    yAxis: { type: "value", name: "单日工时(h)" },
    series: [
      {
        name: "单日工时",
        type: "boxplot",
        data: data.map((b) => b.box),
        itemStyle: { color: "#a8c7f0", borderColor: "#3a72d4" },
        emphasis: { itemStyle: { borderColor: "#1f4db5" } },
      },
    ],
  };
};

/**
 * 个人 vs 团队基线 雷达:同样归一化到 0~100(用全员 P95),
 * 基线取中位数,避免被少数极端工人拉偏。
 */
export const personalRadarOption = (
  profile: WorkerProfile,
  baseline: TeamAverage,
  scaleMax?: TeamAverage,
): ChartOption => {
  const self = metricOf(profile);
  const scale = scaleMax ?? maxOfProfiles([profile]);
  const norm = (v: number, max: number) => Math.min(100, Math.round((v / Math.max(1, max)) * 100));
  const dims = [
    { key: "days" as const, name: "出勤天数" },
    { key: "hours" as const, name: "总工时(h)" },
    { key: "avgDayHours" as const, name: "日均工时(h)" },
    { key: "workCount" as const, name: "工种广度" },
    { key: "salary" as const, name: "收入(元)" },
  ];
  return {
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        const raw = p.data.raw as number[];
        return `${p.name}<br/>${dims.map((d, i) => `${d.name}:${raw[i]}`).join("<br/>")}`;
      },
    },
    legend: { top: 12 },
    radar: {
      center: ["50%", "58%"],
      radius: "62%",
      indicator: dims.map((d) => ({ name: d.name, max: 100 })),
      axisName: { fontSize: 11, color: "#666" },
    },
    series: [
      {
        type: "radar",
        emphasis: { focus: "series" },
        symbolSize: 4,
        data: [
          {
            name: profile.name,
            value: dims.map((d) => norm(self[d.key], scale[d.key])),
            raw: dims.map((d) => self[d.key]),
            areaStyle: { opacity: 0.22 },
            lineStyle: { width: 2 },
          },
          {
            name: "团队中位数",
            value: dims.map((d) => norm(baseline[d.key], scale[d.key])),
            raw: dims.map((d) => baseline[d.key]),
            areaStyle: { opacity: 0.08 },
            lineStyle: { width: 1.5, type: "dashed" },
          },
        ],
      },
    ],
  };
};

/** 个人星期几节奏:出勤天数(柱,左) + 该星期几的日均工时(线,右) */
export const personalWeekdayOption = (weekday: PersonalWeekday[]): ChartOption => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: any) => {
      const item = weekday[params?.[0]?.dataIndex];
      const avg = item && item.days > 0 ? (item.hours / item.days).toFixed(1) : "-";
      return `${item?.key}<br/>出勤:${item?.days} 天<br/>工时:${item?.hours}h<br/>日均:${avg}h`;
    },
  },
  legend: { top: 12 },
  grid,
  xAxis: { type: "category", data: weekday.map((w) => w.key) },
  yAxis: [
    { type: "value", name: "出勤天数", minInterval: 1 },
    { type: "value", name: "日均工时(h)" },
  ],
  series: [
    {
      name: "出勤天数",
      type: "bar",
      data: weekday.map((w) => w.days),
      label: { show: true, position: "top" },
    },
    {
      name: "日均工时",
      type: "line",
      yAxisIndex: 1,
      lineStyle: { width: 2 },
      data: weekday.map((w) => (w.days > 0 ? Number((w.hours / w.days).toFixed(2)) : null)),
    },
  ],
});

/** 个人单日工时分布(1h 一档;样本=人天,当日跨工种合计) */
export const personalDayHoursDistOption = (dist: PersonalBucket[]): ChartOption => ({
  title: note("口径:每个出勤日的合计工时(人天)"),
  tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v} 天` },
  grid: { ...grid, top: 56 },
  xAxis: { type: "category", data: dist.map((d) => `${d.bucket}h`), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "天数", minInterval: 1 },
  series: [
    {
      name: "天数",
      type: "bar",
      data: dist.map((d) => d.days),
      label: { show: true, position: "top" },
    },
  ],
});

/** 个人累计工时 & 累计收入(自首个出勤月逐月累加;断档月按 0 累计) */
export const personalCumulativeOption = (
  series: { month: string; hours: number; salary: number }[],
): ChartOption => {
  let cumHours = 0;
  let cumSalary = 0;
  const acc = series.map((s) => ({
    month: s.month,
    cumHours: Math.round((cumHours += s.hours) * 100) / 100,
    cumSalary: Math.round((cumSalary += s.salary) * 100) / 100,
  }));
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 12 },
    grid,
    xAxis: { type: "category", data: acc.map((a) => a.month), axisLabel: { rotate: 45 } },
    yAxis: [
      { type: "value", name: "累计工时(h)" },
      { type: "value", name: "累计收入(元)" },
    ],
    series: [
      {
        name: "累计工时",
        type: "line",
        yAxisIndex: 0,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
        data: acc.map((a) => a.cumHours),
      },
      {
        name: "累计收入(估算)",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
        data: acc.map((a) => a.cumSalary),
      },
    ],
  };
};

/** 个人出勤日历热力:该人每个出勤日的工时(橙色调,与全局蓝色日历区分) */
export const personalCalendarOption = (series: { day: string; hours: number }[]): ChartOption =>
  calendarCore(
    series.map((s) => [s.day, s.hours] as [string, number]),
    (p: any) => `${p.value?.[0]}<br/>当日工时 ${p.value?.[1]}h`,
    ["#f0f0f0", "#ffd591", "#fa8c16"],
  );

/** 体检问题的等级色(表格 Tag 用) */
export const healthLevelText = (level: HealthIssue["level"]): string =>
  level === "warn" ? "需核对" : "提示";
