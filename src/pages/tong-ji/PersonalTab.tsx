/**
 * 个人分析 Tab:选人 → 关键指标 + 全员百分位 → 月度趋势/工种构成 →
 * 星期节奏/单日分布 → 班制/团队基线雷达 → 出勤日历 → 累计曲线 →
 * 搭档排名 → 工种收入构成。
 * 只放与该人相关的图;选人状态由父级持有,便于从排行/热力联动跳转。
 */
import { Alert, Card, Col, Empty, Row, Select, Statistic, Typography } from "antd";
import type { Profiles, Relation, WorkerProfile } from "./compute";
import * as opts from "./options";
import { ChartCard } from "./ChartCard";

interface PersonalTabProps {
  profiles: Profiles;
  relation: Relation;
  selectedWorkerId?: string;
  onSelectWorker: (id: string) => void;
}

/** 百分位文案 */
const percentileText = (p: WorkerProfile): string =>
  `出勤天数超过 ${p.percentile.days}% 的人 · 总工时超过 ${p.percentile.hours}% · 收入超过 ${p.percentile.salary}%`;

export const PersonalTab = ({
  profiles,
  relation,
  selectedWorkerId,
  onSelectWorker,
}: PersonalTabProps) => {
  const selectedId = selectedWorkerId ?? profiles.list[0]?.id;
  const selected = selectedId ? profiles.byId.get(selectedId) : undefined;
  if (!selected) return <Empty description="所选范围内没有工人数据" />;

  const monthly = profiles.monthSeries.get(selected.id) ?? [];
  const workPie = profiles.workTypeMinutes.get(selected.id) ?? [];
  const workSalary = profiles.workTypeSalary.get(selected.id) ?? [];
  const daily = profiles.dailySeries.get(selected.id) ?? [];
  const weekday = profiles.weekday.get(selected.id) ?? [];
  const dayDist = profiles.dayHoursDist.get(selected.id) ?? [];
  const shift = profiles.shiftPie.get(selected.id) ?? [];
  const partners = (relation.partnerPairs.get(selected.id) ?? []).slice(0, 10);
  // 日历热力高度 = 年数 × 单年高度 + 边距
  const calendarHeight = Math.max(
    200,
    opts.dayCalendarYears(daily.map((d) => d.day)).length * 170 + 20,
  );

  return (
    <div className="flex flex-col gap-2">
      <Row gutter={[8, 8]} className="items-center">
        <Col xs={24} md={6}>
          <Select
            showSearch
            data-testid="tj-person-select"
            placeholder="选择工人"
            value={selected.id}
            onChange={onSelectWorker}
            style={{ width: "100%" }}
            optionFilterProp="label"
            options={profiles.list.map((w) => ({
              value: w.id,
              label: `${w.name}(出勤 ${w.days} 天)`,
            }))}
          />
        </Col>
        <Col xs={8} md={3} data-testid="tj-p-days">
          <Statistic title="出勤天数" value={selected.days} suffix="天" />
        </Col>
        <Col xs={8} md={3} data-testid="tj-p-hours">
          <Statistic title="总工时" value={selected.hours} suffix="h" precision={1} />
        </Col>
        <Col xs={8} md={3} data-testid="tj-p-salary">
          <Statistic title="收入(估算)" value={selected.salary} suffix="元" />
        </Col>
        <Col xs={12} md={3} data-testid="tj-p-avg">
          <Statistic title="日均工时" value={selected.avgDayHours} suffix="h" precision={1} />
        </Col>
        <Col xs={12} md={3} data-testid="tj-p-rate">
          <Statistic
            title="出勤率"
            value={Number((selected.attendanceRate * 100).toFixed(1))}
            suffix="%"
          />
        </Col>
        <Col xs={12} md={3} data-testid="tj-p-top">
          <Statistic
            title="主工种/广度"
            value={selected.topWork}
            suffix={selected.workCount > 1 ? ` +${selected.workCount - 1}` : ""}
          />
        </Col>
      </Row>
      <Alert
        type="info"
        showIcon
        message={`首日 ${selected.firstDay || "—"} / 末日 ${selected.lastDay || "—"};${percentileText(selected)}。收入与"概览/工时&薪资"同口径(工时×时薪估算)。`}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} lg={14}>
          <ChartCard
            title="个人月度趋势"
            tip="出勤天/工时左轴,收入右轴;不出的月份补 0"
            height={380}
            option={opts.personalMonthlyOption(monthly)}
          />
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            title="个人工种构成"
            tip="记录口径;按工时排序,超过 8 类折叠为'其他'"
            height={380}
            option={opts.workTypePieOption(workPie)}
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="星期几节奏"
            tip="该人按星期汇总:出勤天数(柱)+ 日均工时(线)"
            height={360}
            option={opts.personalWeekdayOption(weekday)}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="单日工时分布"
            tip="1h 一档;看该人一天通常干多长(人天口径)"
            height={360}
            option={opts.personalDayHoursDistOption(dayDist)}
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="班制占比"
            tip="该人四档构成:全日(≥9h)/近全日(8~9h)/半日(3~8h)/短时(<3h)"
            height={340}
            option={opts.shiftPieOption(shift)}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="与团队中位数对比"
            tip="实线=本人,虚线=全员中位数;五维统一归一化到 0~100(全员 P95),悬浮看原始值"
            height={340}
            option={opts.personalRadarOption(selected, profiles.teamMedian, profiles.scaleMax)}
          />
        </Col>
      </Row>

      <ChartCard
        title="出勤日历热力"
        tip="该人每个出勤日的工时;颜色越深当天干得越久"
        height={calendarHeight}
        option={opts.personalCalendarOption(daily)}
      />

      <ChartCard
        title="累计工时 & 累计收入"
        tip="自该人首个出勤月起逐月累加;断档月按 0 累计"
        height={380}
        option={opts.personalCumulativeOption(monthly)}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            title="搭档排名 Top10"
            tip="共同出勤最多的人;共现 1 天也计入"
            height={420}
            option={opts.personalPartnerOption(partners.map((p) => ({ name: p.name, co: p.co })))}
          />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard
            title="工种收入构成"
            tip="该人各工种的估算收入,看钱主要从哪类活来"
            height={420}
            option={opts.personalWorkSalaryOption(workSalary)}
          />
        </Col>
      </Row>

      <Card size="small">
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          百分位基于当前筛选范围内的全部工人计算,不是全历史。
        </Typography.Text>
      </Card>
    </div>
  );
};
