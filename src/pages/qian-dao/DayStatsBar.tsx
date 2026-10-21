/**
 * 签到页「所选日期」的统计条：出勤人数 / 记录条数 / 总工时 / 人均工时 + 工种分布。
 * 数据来自 useDayStats(当天全部记录,不受表格的人员筛选影响)。
 *
 * 2026-10-20：从"左栏底部独立卡片"改成"右栏当天记录表上方的一行"——
 * 它回答的是"这天记了多少、还差谁"，和记录表是同一件事，放在一起才看得到；
 * 而且 1366×768 下原位置在折叠线以下，等于白做。
 */
import { Tag } from "antd";
import type { Dayjs } from "dayjs";
import { formatHoursExact } from "@/utils/workTime";
import { useDayStats } from "./useDayStats";

const Metric = ({ testId, label, value }: { testId: string; label: string; value: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
    <span
      data-testid={testId}
      style={{
        fontSize: 14,
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
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px 18px",
        padding: "8px 12px",
        marginBottom: 12,
        background: "var(--bg-subtle)",
        borderRadius: "var(--radius-base)",
        minHeight: 38,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
        当天汇总
      </span>

      {isLoading ? (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>统计加载中…</span>
      ) : stats.recordCount === 0 ? (
        <span data-testid="day-stats-empty" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          所选日期暂无记录
        </span>
      ) : (
        <>
          <Metric testId="day-stats-workers" label="出勤" value={`${stats.workerCount}人`} />
          <Metric testId="day-stats-records" label="记录" value={`${stats.recordCount}条`} />
          <Metric
            testId="day-stats-hours"
            label="总工时"
            value={`${formatHoursExact(stats.totalMinutes)}h`}
          />
          <Metric testId="day-stats-avg" label="人均" value={`${formatHoursExact(stats.avgMinutes)}`} />

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
        </>
      )}
    </div>
  );
}
