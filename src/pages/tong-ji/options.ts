/**
 * 统计图表页的全部 ECharts option 构建器(纯函数:数据 → 配置)。
 * 图表口径:
 * - 人数/天数类(每日趋势/Top/月度)用人天口径(一人一天跨工种去重);
 * - 时长/工种类用记录口径(人×天×工种),在轴/提示语里注明;
 * - 断档月按 0 显示;每日序列无记录日以 null 留白不连线(与 报告.md 一致)。
 */
import type { Relation, SankeyData, WorkerProfile } from "./compute";
import { minutesToHours, type Overview } from "./compute";
import type { ChartOption } from "./EChart";

/** 公共 grid(标签留足空间) */
const grid = { left: 48, right: 56, top: 48, bottom: 64, containLabel: true };

// ======================== 概览 ========================

/** 每日出勤人数 & 总工时 双轴趋势(人天口径;无人数据日留白) */
export const dailyChartOption = (daily: Overview["daily"]): ChartOption => {
  const ts = (day: string) => new Date(`${day}T00:00:00`).getTime();
  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number | null) => (v == null ? "无记录" : String(v)),
    },
    legend: { top: 12 },
    grid,
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
      },
    ],
  };
};

/** 月度总览:人天/总工时(左轴) + 支出(右轴);断档月 0 */
export const monthlyOverviewOption = (monthly: Overview["monthly"]): ChartOption => ({
  tooltip: { trigger: "axis" },
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
      minInterval: 1,
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

// ======================== 概览追加:累计 / 支出 Top ========================

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

/** 支出 Top10(横条:估算支出;提示带总工时/出勤天) */
export const salaryTopOption = (top: Overview["salaryTop"]): ChartOption => {
  const asc = [...top].reverse();
  return {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const item = asc[params?.[0]?.dataIndex];
        return `${item?.name}<br/>支出:${item?.salary}元<br/>总工时:${item?.hours}h / 出勤 ${item?.days} 天`;
      },
    },
    grid: { left: 16, right: 72, top: 24, bottom: 24, containLabel: true },
    xAxis: { type: "value", name: "元" },
    yAxis: { type: "category", data: asc.map((x) => x.name) },
    series: [
      {
        name: "支出(估算)",
        type: "bar",
        data: asc.map((x) => x.salary),
        label: { show: true, position: "right" },
        barWidth: "60%",
      },
    ],
  };
};

/** 个人出勤 Top15(横条:出勤天数;提示里带工时/主工种) */
export const topWorkerChartOption = (top: Overview["topWorkers"]): ChartOption => {
  const asc = [...top].reverse();
  return {
    title: {
      text: "口径:一人一天跨工种去重(人天)",
      left: 8,
      top: 0,
      textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const days = params?.[0]?.value ?? 0;
        const item = asc[params?.[0]?.dataIndex];
        return `${item?.name}<br/>出勤天:${days}<br/>总工时:${item?.hours}h<br/>主工种:${item?.topWork}`;
      },
    },
    grid: { left: 16, right: 48, top: 40, bottom: 24, containLabel: true },
    xAxis: { type: "value", name: "天" },
    yAxis: { type: "category", data: asc.map((w) => w.name) },
    series: [
      {
        name: "出勤天数",
        type: "bar",
        data: asc.map((w) => w.days),
        label: { show: true, position: "right" },
        minInterval: 1,
      },
    ],
  };
};

/** 出勤天数分布(每人出勤多少天,20 天一档) */
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
  title: {
    text: "口径:每条记录(人×天×工种)的合计工时",
    left: 8,
    top: 0,
    textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
  },
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

/** 班制占比(按人天:≥9h 全日 / 3~7.5h 半日 / 其他) */
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

/** 工种工时占比(记录口径) */
export const workTypePieOption = (pie: Overview["workTypePie"]): ChartOption => ({
  tooltip: { trigger: "item", formatter: "{b}: {c}h ({d}%)" },
  legend: { top: 12 },
  series: [
    {
      name: "工种工时",
      type: "pie",
      radius: ["36%", "62%"],
      center: ["50%", "56%"],
      label: { formatter: "{b}\n{d}%" },
      data: pie.map((x) => ({ name: x.name, value: x.hours })),
    },
  ],
});

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
    title: {
      text: "口径:两人当天均出勤(跨工种去重)",
      left: 8,
      top: 0,
      textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
    },
    tooltip: {
      position: "top",
      formatter: (p: any) =>
        `${matrixNames[p.value[0]]} × ${matrixNames[p.value[1]]}<br/>共现 ${p.value[2]} 天`,
    },
    grid: { left: 110, right: 60, top: 48, bottom: 110, containLabel: false },
    xAxis: { type: "category", data: matrixNames, axisLabel: { rotate: 60, fontSize: 11 } },
    yAxis: { type: "category", data: matrixNames, axisLabel: { fontSize: 11 } },
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

/** 搭档网络(force 布局):节点=出勤 ≥5 天的人,边按 coThreshold 过滤 */
export const graphOption = (relation: Relation, coThreshold: number): ChartOption => ({
  title: {
    text: `边 = 共现 ≥${coThreshold} 天,连线越粗共现越多;节点大小 ∝ 出勤天数`,
    left: 8,
    top: 0,
    textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
  },
  tooltip: {
    formatter: (p: any) =>
      p.dataType === "edge"
        ? `${p.data.source} × ${p.data.target}<br/>共现 ${p.data.value} 天`
        : `${p.name}:出勤 ${p.data.days} 天`,
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
      label: { show: true, position: "right", fontSize: 11 },
      edgeLabel: { show: false },
      lineStyle: {
        width: 1,
        curveness: 0.05,
        color: "source",
        opacity: 0.7,
      },
      emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
      data: relation.graph.nodes.map((n) => ({
        name: n.name,
        value: n.days,
        symbolSize: n.size,
        days: n.days,
        itemStyle: {},
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
export const stableScatterOption = (stable: Relation["stable"], coThreshold: number): ChartOption => {
  const pairs = [...stable].filter((s) => s.coDays >= coThreshold).sort((a, b) => b.ratio - a.ratio);
  return {
    title: {
      text: `共现 ≥${coThreshold} 天的搭档对:越靠右越活跃,越靠上越固定(搭档绑定紧密)`,
      left: 8,
      top: 0,
      textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
    },
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

/** 出勤覆盖的年份序列(日历热力每年一个日历格) */
export const calendarYears = (daily: Overview["daily"]): string[] => [
  ...new Set(daily.filter((d) => d.minutes != null).map((d) => d.day.slice(0, 4))),
];

/** 出勤日历热力:#GitHub 风格,每年一行,颜色=当日总工时(h) */
export const calendarHeatmapOption = (daily: Overview["daily"]): ChartOption => {
  const years = calendarYears(daily);
  const points = daily
    .filter((d) => d.minutes != null)
    .map((d) => [d.day, minutesToHours(d.minutes as number)] as [string, number]);
  const maxVal = Math.max(1, ...points.map((p) => p[1]));
  return {
    tooltip: {
      formatter: (p: any) => `${p.value?.[0]}<br/>当日总工时 ${p.value?.[1]}h`,
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: false,
      orient: "vertical",
      right: 8,
      top: "middle",
      text: [`${maxVal}h`, "0h"],
      inRange: { color: ["#f0f0f0", "#8ab4ff", "#3a72d4"] },
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

/** 月度班制结构堆叠(数据源头即 MonthPoint 的 fullDays/halfDays/otherDays) */
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
      name: "半日(3~7.5h)",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.halfDays),
    },
    {
      name: "其他",
      type: "bar",
      stack: "shift",
      emphasis: { focus: "series" },
      data: monthly.map((m) => m.otherDays),
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
      smooth: true,
      lineStyle: { width: 2 },
      data: weekday.map((w) => w.hours),
    },
  ],
});

/** 队伍增长:当月首次出勤人数(柱) + 累计出勤人数(线) */
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
      data: growth.map((g) => g.newWorkers),
      label: { show: true, position: "top" },
    },
    {
      name: "累计人数",
      type: "line",
      smooth: true,
      lineStyle: { width: 2 },
      data: growth.map((g) => g.totalWorkers),
    },
  ],
});

/** 工种工时主题河流:工种 × 月 工时流量(记录口径;超过 topN 的工种并入"其他") */
export const themeRiverOption = (workTypeMonthly: Overview["workTypeMonthly"], topN = 7): ChartOption => {
  const totals = new Map<string, number>();
  for (const m of workTypeMonthly)
    for (const [name, minutes] of Object.entries(m.workMinutes))
      totals.set(name, (totals.get(name) ?? 0) + minutes);
  const topNames = new Set(
    [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([n]) => n),
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
        const rows = params?.map((p) => `${p?.data?.[2]}: ${p?.data?.[1]}h`).filter((s) => !s.endsWith("0h")) ?? [];
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

/** 人→工种 工时流向桑基(蓝=人,绿=工种;悬浮看流向工时) */
export const sankeyOption = (sankey: SankeyData): ChartOption => ({
  title: {
    text: `总工时 Top${sankey.topN} 的人 → 工种;连线越粗工时越多`,
    left: 8,
    top: 0,
    textStyle: { fontSize: 12, fontWeight: "normal", color: "#999" },
  },
  tooltip: {
    formatter: (p: any) =>
      p.dataType === "edge"
        ? `${p.data.source} → ${p.data.target}<br/>工时 ${p.data.value}h`
        : `${p.name}<br/>工时 ${p.value}h`,
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
      label: { fontSize: 11 },
      lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.55 },
      data: sankey.nodes.map((n) => ({
        name: n.name,
        value: n.hours,
        itemStyle: n.isWorker ? { color: "#5470c6" } : { color: "#91cc75" },
      })),
      links: sankey.links.map((l) => ({ source: l.source, target: l.target, value: l.hours })),
    },
  ],
});

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
      smooth: true,
      lineStyle: { width: 2 },
      data: series.map((s) => s.hours),
    },
    {
      name: "收入(估算)",
      type: "line",
      yAxisIndex: 1,
      smooth: true,
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

/** Top5 工人画像雷达:各维刻度上限取 Top5 中最大值,面积半透明便于叠加对比 */
export const radarOption = (list: WorkerProfile[], topN = 5): ChartOption => {
  const top = list.slice(0, topN);
  const dims = [
    { name: "出勤天数", get: (w: WorkerProfile) => w.days },
    { name: "总工时(h)", get: (w: WorkerProfile) => w.hours },
    { name: "工种广度", get: (w: WorkerProfile) => w.workCount },
    { name: "收入(元)", get: (w: WorkerProfile) => Number(w.salary) },
    { name: "日均工时(h)", get: (w: WorkerProfile) => w.avgDayHours },
  ];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12, type: "scroll" },
    radar: {
      center: ["50%", "58%"],
      radius: "60%",
      indicator: dims.map((d) => ({
        name: d.name,
        max: Math.max(1, ...top.map((w) => d.get(w))),
      })),
      axisName: { fontSize: 11, color: "#666" },
    },
    series: [
      {
        type: "radar",
        emphasis: { focus: "series" },
        areaStyle: { opacity: 0.12 },
        data: top.map((w) => ({ name: w.name, value: dims.map((d) => d.get(w)) })),
      },
    ],
  };
};

/** 各人单日工时箱线(出勤 Top15;盒须=min/Q1/Q2/Q3/max,悬浮显示样本数) */
export const dayHoursBoxOption = (boxData: Overview["boxData"]): ChartOption => ({
  tooltip: {
    formatter: (p: any) => {
      const item = boxData[p?.dataIndex];
      const [min, q1, q2, q3, max] = p?.value ?? [];
      return `${item?.name}<br/>样本 ${item?.count} 天<br/>最低:${min}h / Q1:${q1}h<br/>中位:${q2}h / Q3:${q3}h<br/>最高:${max}h`;
    },
  },
  grid,
  xAxis: { type: "category", data: boxData.map((b) => b.name), axisLabel: { rotate: 45 } },
  yAxis: { type: "value", name: "单日工时(h)" },
  series: [
    {
      name: "单日工时",
      type: "boxplot",
      data: boxData.map((b) => b.box),
      itemStyle: { color: "#a8c7f0", borderColor: "#3a72d4" },
      emphasis: { itemStyle: { borderColor: "#1f4db5" } },
    },
  ],
});
