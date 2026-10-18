/**
 * 统计图表页的全部 ECharts option 构建器(纯函数:数据 → 配置)。
 * 图表口径:
 * - 人数/天数类(每日趋势/Top/月度)用人天口径(一人一天跨工种去重);
 * - 时长/工种类用记录口径(人×天×工种),在轴/提示语里注明;
 * - 断档月按 0 显示;每日序列无记录日以 null 留白不连线(与 报告.md 一致)。
 */
import type { Relation } from "./compute";
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

/** 搭档网络(force 布局):节点=出勤较多的人,边=共现天数 ≥10 */
export const graphOption = (relation: Relation): ChartOption => ({
  title: {
    text: "边 = 共现 ≥10 天,连线越粗共现越多;节点大小 ∝ 出勤天数",
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
      links: relation.graph.links.map((l) => ({
        source: l.source,
        target: l.target,
        value: l.value,
        lineStyle: { width: Math.min(1 + l.value / 25, 6) },
      })),
    },
  ],
});

/** 稳定性散点:横轴共现天数,纵轴共现占两人出勤较小值的比例 */
export const stableScatterOption = (stable: Relation["stable"]): ChartOption => {
  const pairs = [...stable].sort((a, b) => b.ratio - a.ratio);
  return {
    title: {
      text: "越靠右越活跃,越靠上越固定(搭档绑定紧密)",
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
