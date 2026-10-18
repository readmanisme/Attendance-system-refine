/**
 * 关系分析 Tab:共现热力 → 搭档网络(阈值可调) → 稳定性散点 → 人×工种桑基。
 * 阈值状态放在本组件内,拖动阈值只重绘这一屏,不会触发整页聚合重算。
 */
import { Alert, InputNumber, Space, Typography } from "antd";
import { useState } from "react";
import type { Relation, SankeyData } from "./compute";
import { MIN_PAIR_CO } from "./compute";
import * as opts from "./options";
import { ChartCard } from "./ChartCard";

interface RelationTabProps {
  relation: Relation;
  sankey: SankeyData;
  /** 点热力格子/网络节点 → 跳到该人的个人分析 */
  onPickWorker: (id: string) => void;
}

export const RelationTab = ({ relation, sankey, onPickWorker }: RelationTabProps) => {
  // 共现阈值(默认 10 天,可调,作用于网络图边与稳定性散点)
  const [coThreshold, setCoThreshold] = useState(10);

  return (
    <div className="flex flex-col gap-2">
      <Alert
        type="info"
        showIcon
        message="共现口径:两人当天各有记录(跨工种去重)即共现一天,与历史分析报告同口径。注意:同一天出勤只代表同期在场,不代表同一工地/班组。"
      />
      <ChartCard
        title="两人共现热力"
        tip="行列取出勤 Top20 对角线以下三角;颜色越深共现越多;点格子跳到该人的个人分析"
        height={560}
        option={opts.coHeatmapOption(relation)}
        onEvents={{
          click: (p: any) => {
            const row = p?.value?.[0];
            const id = typeof row === "number" ? relation.matrixIds[row] : undefined;
            if (id) onPickWorker(id);
          },
        }}
      />
      <ChartCard
        title="搭档网络"
        tip="节点=出勤 ≥5 天的人;阈值同时作用于下方的搭档稳定性散点;点节点跳到该人的个人分析"
        height={560}
        extra={
          <Space size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              共现阈值(天)
            </Typography.Text>
            <div data-testid="tj-co-threshold" className="inline-flex items-center">
              <InputNumber
                size="small"
                min={MIN_PAIR_CO}
                max={999}
                precision={0}
                value={coThreshold}
                onChange={(v) => setCoThreshold(v ?? MIN_PAIR_CO)}
              />
            </div>
          </Space>
        }
        option={opts.graphOption(relation, coThreshold)}
        onEvents={{
          click: (p: any) => {
            const id = p?.dataType === "node" ? p?.data?.name : undefined;
            if (id) onPickWorker(id);
          },
        }}
      />
      <ChartCard
        testId="tj-stable-card"
        title="搭档稳定性散点"
        tip={`共现 ≥${coThreshold} 天(在"搭档网络"卡片可调);右上角组合 = 又活跃又固定的核心搭档`}
        height={420}
        option={opts.stableScatterOption(relation.stable, coThreshold)}
      />
      <ChartCard
        title="人×工种 桑基"
        tip="总工时 Top20 的人流向工种;单线者=单一工种,多线者=常常混岗"
        height={620}
        option={opts.sankeyOption(sankey)}
      />
    </div>
  );
};
