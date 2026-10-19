/**
 * 签到页「所选日期」的统计条：出勤人数 / 记录条数 / 总工时 / 人均工时 + 工种分布。
 * 数据来自 useDayStats(当天全部记录,不受表格的人员筛选影响)。
 * 视觉上压成一条，避免四个大号 Statistic 卡片占掉半屏。
 */
import { Tag } from "antd";
import type { Dayjs } from "dayjs";
import { formatHoursExact } from "@/utils/workTime";
import { useDayStats } from "./useDayStats";

const Metric = ({ testId, label, value }: { testId: string; label: string; value: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
    <span
      data-testid={testId}
      style={{
        fontSize: 15,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: "var(--text)",
      }}
    >
      {value}
    </span>
  </div>
);

export function DayStatsBar({ checkDate }: { checkDate: Dayjs }) {
  const { stats, isLoading } = useDayStats(checkDate);

  return (
    <div
      data-testid="day-stats"
      style={{
        marginTop: 12,
        padding: "12px 16px",
        background: "var(--bg-container)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
          当天汇总
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          按所选日期的全部记录，不受人员筛选影响
        </span>
      </div>

      {isLoading ? (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>统计加载中…</span>
      ) : stats.recordCount === 0 ? (
        <span data-testid="day-stats-empty" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          所选日期暂无记录
        </span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 24px" }}>
          <Metric testId="day-stats-workers" label="出勤" value={`${stats.workerCount}人`} />
          <Metric testId="day-stats-records" label="记录" value={`${stats.recordCount}条`} />
          <Metric
            testId="day-stats-hours"
            label="总工时"
            value={`${formatHoursExact(stats.totalMinutes)}h`}
          />
          <Metric testId="day-stats-avg" label="人均" value={`${formatHoursExact(stats.avgMinutes)}h`} />

          {stats.works.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {stats.works.map((work) => (
                <Tag
                  key={work.name}
                  bordered={false}
                  style={{ marginInlineEnd: 0, fontSize: 12 }}
                  data-testid="day-stats-works"
                >
                  {work.name} {formatHoursExact(work.minutes)}h · {work.workers}人
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
