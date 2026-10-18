/**
 * 统计页的图表卡片:标题 + 口径提示 + 右上角"下载 PNG"。
 * 统一包一层,避免每张图重复写 Card/EChart/导出逻辑。
 */
import { Button, Card, Space, Tooltip } from "antd";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { useRef, type ReactNode } from "react";
import type { EChartsType } from "echarts/core";
import { EChart, type ChartEvents, type ChartOption } from "./EChart";
import { downloadChartPng } from "./download";

/** 卡片标题 + 口径提示(悬浮显示) */
export const cardTitle = (title: string, tip?: string) => (
  <span className="flex flex-row items-center gap-1">
    {title}
    {tip ? (
      <Tooltip title={tip}>
        <IconInfoCircle size={15} color="#999" />
      </Tooltip>
    ) : null}
  </span>
);

interface ChartCardProps {
  title: string;
  /** 口径说明,悬浮在标题后的 info 图标上 */
  tip?: string;
  /** 标题右侧额外内容(如阈值输入框) */
  extra?: ReactNode;
  height?: number;
  option: ChartOption;
  onEvents?: ChartEvents;
  testId?: string;
  /** 导出文件名,默认用标题 */
  exportName?: string;
}

/** 图表卡片:高度由调用方给,导出按钮直接拿 ECharts 实例出图 */
export const ChartCard = ({
  title,
  tip,
  extra,
  height = 320,
  option,
  onEvents,
  testId,
  exportName,
}: ChartCardProps) => {
  const chartRef = useRef<EChartsType | null>(null);
  return (
    <Card
      size="small"
      data-testid={testId}
      title={cardTitle(title, tip)}
      extra={
        <Space size={2}>
          {extra}
          <Tooltip title="下载 PNG">
            <Button
              type="text"
              size="small"
              aria-label={`下载${title}`}
              icon={<IconDownload size={15} />}
              onClick={() => downloadChartPng(chartRef.current, exportName ?? title)}
            />
          </Tooltip>
        </Space>
      }
    >
      <EChart
        option={option}
        height={height}
        onEvents={onEvents}
        onReady={(chart) => {
          chartRef.current = chart;
        }}
      />
    </Card>
  );
};
