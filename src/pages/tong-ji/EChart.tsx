/**
 * ECharts 的薄包装:直接用 echarts/core + React 原生生命周期,
 * 不借助第三方挂载库(echarts-for-react 在本项目的 vite/rolldown 预打包下
 * CJS 互操作会把组件变成对象,自实现更可靠,还能省掉它的旧依赖)。
 * 按需注册图表/组件,控制打包体积。
 */
import * as echarts from "echarts/core";
import {
  BarChart,
  BoxplotChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  ThemeRiverChart,
} from "echarts/charts";
import {
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  SingleAxisComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([
  BarChart,
  BoxplotChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  ThemeRiverChart,
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  SingleAxisComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export type ChartOption = EChartsCoreOption;

/** 图表事件处理器(参数与 ECharts 原生一致) */
export type ChartEvents = Record<string, (params: any) => void>;

interface EChartProps {
  option: ChartOption;
  /** 图表区高度(px),默认 320 */
  height?: number;
  /** 事件绑定(如 click / legendselectchanged);按事件名集合变化重新注册 */
  onEvents?: ChartEvents;
  /** 实例就绪/销毁回调(导出图片用) */
  onReady?: (chart: echarts.EChartsType | null) => void;
}

/** 标准图表容器:挂载时 init,卸载时 dispose;option 变化整体重设(等效 notMerge);宽高由容器决定 */
export const EChart = ({ option, height = 320, onEvents, onReady }: EChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  // 处理器/就绪回调放 ref,注册一次即可始终调用到最新闭包
  const handlersRef = useRef<ChartEvents | undefined>(onEvents);
  const readyRef = useRef(onReady);
  useEffect(() => {
    handlersRef.current = onEvents;
  }, [onEvents]);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  // 初始化/销毁(React 严格的 double-mount 下 init+dispose 也成对安全)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    readyRef.current?.(chart);
    return () => {
      chart.dispose();
      chartRef.current = null;
      readyRef.current?.(null);
    };
  }, []);

  // 数据更新:notMerge 整体重设,避免残留旧 series
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  // 事件注册:事件名集合不变就不重复注册(回调本身走 ref,永远是最新的)
  const eventKey = Object.keys(onEvents ?? {})
    .sort()
    .join(",");
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !eventKey) return;
    const names = eventKey.split(",");
    const wrappers = names.map((name) => {
      const fn = (params: any) => handlersRef.current?.[name]?.(params);
      chart.on(name, fn);
      return [name, fn] as const;
    });
    return () => wrappers.forEach(([name, fn]) => chart.off(name, fn));
  }, [eventKey]);

  // 容器尺寸变化时自适应(卡片折叠/窗口缩放)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
};
