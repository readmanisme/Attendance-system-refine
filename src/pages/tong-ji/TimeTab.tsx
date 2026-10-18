/**
 * 时间模式 Tab:出勤日历 → 人×月热力 → 队伍增长/流失 → 人均强度与超时 →
 * 星期节奏(整体 + 工种) → 月度班制 → 工种结构(堆叠/河流) → 累计与环比。
 * 表格类图表两列并排,避免单列过长。
 */
import { Card, Col, Row, Statistic } from "antd";
import type { Overview } from "./compute";
import * as opts from "./options";
import { ChartCard, cardTitle } from "./ChartCard";

interface TimeTabProps {
  overview: Overview;
}

export const TimeTab = ({ overview }: TimeTabProps) => {
  // 日历热力高度 = 年数 × 单年高度 + 边距
  const calendarHeight = Math.max(200, opts.calendarYears(overview.daily).length * 170 + 20);
  const heatHeight = Math.max(260, Math.min(overview.workerMonthHeat.names.length, 20) * 24 + 120);
  const { silent } = overview;

  return (
    <div className="flex flex-col gap-2">
      <Row gutter={[8, 8]}>
        <Col xs={12} md={6}>
          <Card size="small" data-testid="tj-silent-total">
            <Statistic title="范围内出勤人数" value={silent.total} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" data-testid="tj-silent-30">
            <Statistic title="近 30 天未出勤" value={silent.d30} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="近 60 天未出勤" value={silent.d60} suffix="人" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="近 90 天未出勤" value={silent.d90} suffix="人" />
          </Card>
        </Col>
      </Row>

      <ChartCard
        title="出勤日历热力"
        tip="GitHub 风格:每年一行,颜色=当日总工时;深色即忙碌日"
        height={calendarHeight}
        option={opts.calendarHeatmapOption(overview.daily)}
      />

      <ChartCard
        title="人 × 月 出勤热力"
        tip="行=出勤 Top20 的人,列=月份,颜色=当月出勤天数;空白=该月没来。比桑基更直观地看出谁在哪个阶段在场"
        height={heatHeight}
        option={opts.workerMonthHeatOption(overview.workerMonthHeat)}
      />

      <ChartCard
        title="队伍增长与流失"
        tip="新增=当月首次出勤;回归=当月出勤但非首次;沉默=累计出现过但本月未出勤"
        height={340}
        option={opts.workerGrowthOption(overview.growth)}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="人均强度"
            tip="人均月工时=总工时/当月出勤人数;出勤率=人天/(人数×当月天数)。总量增长时看这两条才知道是真忙还是人多了"
            height={360}
            option={opts.intensityOption(overview.monthly)}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="超时人天"
            tip="单日合计 >10h 记一次超时;占比=超时人天/当月人天"
            height={360}
            option={opts.overtimeOption(overview.monthly)}
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="星期几出勤分布"
            tip="范围整体按星期汇总;人均=总工时/人天,看典型的干法是否有周循环"
            height={340}
            option={opts.weekdayOption(overview.weekday)}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="工种 × 星期"
            tip="记录工时口径;周末偏深的工种要么真忙,要么是周末补录"
            height={340}
            option={opts.workWeekdayOption(overview.workWeekday)}
          />
        </Col>
      </Row>

      <ChartCard
        title="月度班制结构"
        tip="按人天计入四档:全日(≥9h)/近全日(8~9h)/半日(3~8h)/短时(<3h);断档月为 0"
        height={380}
        option={opts.monthlyShiftOption(overview.monthly)}
      />

      <ChartCard
        title="工种工时按月堆叠"
        tip="记录口径;断档月为 0"
        height={380}
        option={opts.workTypeMonthlyOption(overview.workTypeMonthly)}
      />

      <ChartCard
        title="工种工时河流"
        tip="记录口径:主要工种(工时 Top7,其余并入'其他')的月度流量形态"
        height={460}
        option={opts.themeRiverOption(overview.workTypeMonthly)}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="累计工时 & 累计支出"
            tip="自范围首月起逐月累加;断档月按 0 累计"
            height={380}
            option={opts.cumulativeOption(overview.monthly)}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="月度环比"
            tip="相对上月的增长率;首月与上月为 0 的月份不计算"
            height={380}
            option={opts.momOption(overview.monthly)}
          />
        </Col>
      </Row>

      <Card size="small" title={cardTitle("沉默名单", "近 30 天未出勤的人,按姓名排序")}>
        <div className="text-sm text-gray-500">
          {silent.names.length ? silent.names.join("、") : "无(所有人近 30 天都出勤过)"}
        </div>
      </Card>
    </div>
  );
};
