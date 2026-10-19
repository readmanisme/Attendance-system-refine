import { Card, Statistic } from "antd";
import type { ReactNode } from "react";

interface StatCardProps {
  title: ReactNode;
  value: string | number;
  suffix?: ReactNode;
  precision?: number;
  testId?: string;
  /** 标题下方的一行补充说明 */
  hint?: ReactNode;
}

/** 统一统计卡：同高、同内边距、数字等宽，避免各页 Row+Col+Card+Statistic 各写一套 */
export function StatCard({ title, value, suffix, precision, testId, hint }: StatCardProps) {
  return (
    <Card
      size="small"
      data-testid={testId}
      style={{ height: "100%" }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <Statistic title={title} value={value} suffix={suffix} precision={precision} />
      {hint ? (
        <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-tertiary)" }}>{hint}</div>
      ) : null}
    </Card>
  );
}
