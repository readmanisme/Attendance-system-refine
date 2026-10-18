/**
 * 签到页"所选日期"的统计条:出勤人数 / 记录条数 / 总工时 / 人均工时 + 工种分布。
 * 数据来自 useDayStats(当天全部记录,不受表格的人员筛选影响)。
 */
import { Card, Flex, Space, Statistic, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { formatHoursExact } from "@/utils/workTime";
import { useDayStats } from "./useDayStats";

const valueStyle = { fontSize: 20 };

export function DayStatsBar({ checkDate }: { checkDate: Dayjs }) {
  const { stats, isLoading } = useDayStats(checkDate);

  return (
    <Card
      size="small"
      data-testid="day-stats"
      className="mt-3!"
      title={
        <span className="flex flex-row items-center gap-2">
          当天汇总
          <Typography.Text type="secondary" className="text-xs font-normal">
            按所选日期的全部记录统计，不受下方人员筛选影响
          </Typography.Text>
        </span>
      }
    >
      {isLoading ? (
        <Typography.Text type="secondary">统计加载中…</Typography.Text>
      ) : stats.recordCount === 0 ? (
        <Typography.Text type="secondary" data-testid="day-stats-empty">
          所选日期暂无记录
        </Typography.Text>
      ) : (
        <Flex wrap gap="large" align="center" justify="space-between">
          <Flex wrap gap="large" align="center">
            <Statistic
              data-testid="day-stats-workers"
              title="出勤人数"
              value={stats.workerCount}
              suffix="人"
              valueStyle={valueStyle}
            />
            <Statistic
              data-testid="day-stats-records"
              title="记录条数"
              value={stats.recordCount}
              suffix="条"
              valueStyle={valueStyle}
            />
            <Statistic
              data-testid="day-stats-hours"
              title="总工时（小时）"
              value={formatHoursExact(stats.totalMinutes)}
              valueStyle={valueStyle}
            />
            <Statistic
              data-testid="day-stats-avg"
              title="人均工时（小时）"
              value={formatHoursExact(stats.avgMinutes)}
              valueStyle={valueStyle}
            />
          </Flex>
          <Space wrap size={[4, 4]} data-testid="day-stats-works">
            <Typography.Text type="secondary">工种（小时）：</Typography.Text>
            {stats.works.map((work) => (
              <Tag key={work.name} color="blue">
                {work.name} {formatHoursExact(work.minutes)} · {work.workers}人
              </Tag>
            ))}
          </Space>
        </Flex>
      )}
    </Card>
  );
}
