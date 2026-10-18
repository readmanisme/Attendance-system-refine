/**
 * ECharts 的薄包装:直接用 echarts/core + React 原生生命周期,
 * 不借助第三方挂载库(echarts-for-react 在本项目的 vite/rolldown 预打包下
 * CJS 互操作会把组件变成对象,自实现更可靠,还能省掉它的旧依赖)。
 * 按需注册图表/组件,控制打包体积。
 */
import * as echarts from "echarts/core";
import {
  BarChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([
  BarChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export type ChartOption = EChartsCoreOption;

interface EChartProps {
  option: ChartOption;
  /** 图表区高度(px),默认 320 */
  height?: number;
}

/** 标准图表容器:挂载时 init,卸载时 dispose;option 变化整体重设(等效 notMerge);宽高由容器决定 */
export const EChart = ({ option, height = 320 }: EChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  // 初始化/销毁(React 严格的 double-mount 下 init+dispose 也成对安全)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // 数据更新:notMerge 整体重设,避免残留旧 series
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

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
