/**
 * 统计图表页(4 个 Tab)。
 * - 概览:顶部卡片 + 出勤趋势/Top/分布/班制/工种结构/月度总览/累计曲线/支出 Top
 * - 时间模式:出勤日历热力、月度班制堆叠、星期几分布、队伍增长、工种主题河流
 * - 关系分析:共现热力、搭档网络(阈值可调)、搭档稳定性散点、人×工种桑基
 * - 个人分析:选人 → 画像四联卡/月度趋势/工种构成/搭档排名/Top5 雷达/各人工时箱线
 * 数据:考勤记录全量(useList 分页关闭,expand 工种/人员),薪资设置全量;
 * 聚合复用"工时&薪资"页同一份支出引擎(computeSalaryStats),口径永远一致。
 * 时间范围:本页局部状态,月份粒度,默认全部历史(不写全局 store,不影响其他页面)。
 */
import { List } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import {
  Alert,
  Card,
  Col,
  DatePicker,
  Empty,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useConfigStore } from "@/stores";
import {
  buildOverview,
  buildProfiles,
  buildRelation,
  buildSankey,
  filterRecordsByMonth,
  MIN_PAIR_CO,
  minutesToHours,
} from "./compute";
import type { SankeyData } from "./compute";
import { EChart } from "./EChart";
import * as opts from "./options";

const cardTitle = (title: string, tip?: string) => (
  <span className="flex flex-row items-center gap-1">
    {title}
    {tip ? (
      <Tooltip title={tip}>
        <IconInfoCircle size={15} color="#999" />
      </Tooltip>
    ) : null}
  </span>
);

export default function TongJiPage() {
  // 月份范围持久化在 config store(本页专用字段),与记录页/工时页的范围互不影响
  const { tongjiMonthRange: monthRange, setTongjiMonthRange: setMonthRange } = useConfigStore();

  // 关系分析:共现阈值(默认 10 天,可调,作用于网络图边与稳定性散点)
  const [coThreshold, setCoThreshold] = useState(10);
  // 个人分析:选中工人 id(默认取榜单第一位)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>();

  // ======================== 数据 ========================
  const { result: recordResult, query: recordQuery } = useList({
    resource: __AttendanceRecord_TableName,
    pagination: { mode: "off" },
    meta: { expand: ["work", "worker_id"] },
  });
  const { result: salaryResult, query: salaryQuery } = useList({
    resource: __SalaryType_TableName,
    pagination: { mode: "off" },
    meta: { expand: ["worker_name", "work_type"] },
  });

  const isLoading = recordQuery.isLoading || salaryQuery.isLoading;

  // ======================== 聚合 ========================
  const records = recordResult?.data;
  const salaryRecords = salaryResult?.data;
  const filtered = filterRecordsByMonth(records, monthRange);
  const overview = buildOverview(filtered, salaryRecords);
  const relation = buildRelation(filtered);
  const profiles = buildProfiles(filtered, salaryRecords);
  const sankey: SankeyData = buildSankey(filtered);

  const hasData = overview.recordCount > 0;

  // ======================== 个人分析局部 ========================
  const selectedId = selectedWorkerId ?? profiles.list[0]?.id;
  const selected = selectedId ? profiles.byId.get(selectedId) : undefined;
  const selectedMonthly = selectedId ? (profiles.monthSeries.get(selectedId) ?? []) : [];
  const selectedWorkPie = selectedId ? (profiles.workTypeMinutes.get(selectedId) ?? []) : [];
  const selectedPartners = selectedId
    ? (relation.partnerPairs.get(selectedId) ?? []).slice(0, 10)
    : [];
  // 日历热力高度 = 年数 × 单年高度 + 边距
  const calendarHeight = Math.max(200, opts.calendarYears(overview.daily).length * 170 + 20);

  // ======================== 局部时间范围选择器 ========================
  const rangeButtons = (
    <div className="flex flex-row items-center gap-2">
      <Typography.Text type="secondary" className="hidden sm:inline">
        月份范围(仅影响本页)
      </Typography.Text>
      <DatePicker.RangePicker
        picker="month"
        allowEmpty={[true, true]}
        value={[
          monthRange[0] ? dayjs(`${monthRange[0]}-01`) : null,
          monthRange[1] ? dayjs(`${monthRange[1]}-01`) : null,
        ]}
        placeholder={["起始月", "截止月"]}
        onChange={(dates) =>
          setMonthRange([
            dates?.[0]?.format("YYYY-MM") ?? null,
            dates?.[1]?.format("YYYY-MM") ?? null,
          ])
        }
      />
    </div>
  );

  // ======================== 概览 Tab 内容 ========================
  const overviewTab = (
    <div className="flex flex-col gap-2">
      {/* 顶部统计卡片 */}
      <Row gutter={[8, 8]}>
        <Col xs={12} md={4}>
          <Card size="small" data-testid="tj-total-hours">
            <Statistic
              title="总工时"
              value={minutesToHours(overview.totalMinutes)}
              suffix="h"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card size="small" data-testid="tj-total-salary">
            <Statistic
              title="支出(估算)"
              value={overview.totalSalary.toDecimalPlaces(2).toString()}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={8} md={5}>
          <Card size="small" data-testid="tj-person-days">
            <Statistic title="出勤人天" value={overview.personDays} suffix="人天" />
          </Card>
        </Col>
        <Col xs={8} md={5}>
          <Card size="small" data-testid="tj-worker-count">
            <Statistic title="出勤人数" value={overview.workerCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small" data-testid="tj-record-count">
            <Statistic title="记录条数" value={overview.recordCount} suffix="条" />
          </Card>
        </Col>
      </Row>

      {overview.unPriced.names.length > 0 && (
        <Alert
          data-testid="tj-unpriced-alert"
          type="warning"
          showIcon
          message={`已按"工时&薪资"页同口径计算支出,其中未单独定价的工种兜底按"基础"时薪计: ${overview.unPriced.names.join(", ")}（${overview.unPriced.records} 条 / ${minutesToHours(overview.unPriced.minutes)}h）。请到"薪资设置"补价,补价后此处自动修正。`}
        />
      )}

      <Card
        size="small"
        title={cardTitle("每日出勤人数 & 总工时趋势", "人天口径;无记录日期如实留白不连线")}
      >
        <EChart option={opts.dailyChartOption(overview.daily)} height={360} />
      </Card>

      <Row gutter={[8, 8]}>
        <Col xs={24} lg={14}>
          <Card size="small" title={cardTitle("个人出勤 Top15", "人天口径;悬浮显示总工时/主工种")}>
            <EChart option={opts.topWorkerChartOption(overview.topWorkers)} height={430} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={cardTitle("班制占比", "按人天统计:当日合计 ≥9h 全日,3~7.5h 半日")}
          >
            <EChart option={opts.shiftPieOption(overview.shiftPie)} height={430} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={cardTitle("出勤天数分布", "20 天一档;出勤少的人多说明散工/临时性质强")}
          >
            <EChart option={opts.attendDistChartOption(overview.attendDist)} height={340} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={cardTitle(
              "单条记录工时分布",
              "记录口径:人×天×工种,同键录入已合并;5h/10h 两主档",
            )}
          >
            <EChart option={opts.recordDistChartOption(overview.recordDist)} height={340} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <Card size="small" title={cardTitle("工种工时占比", "记录口径")}>
            <EChart option={opts.workTypePieOption(overview.workTypePie)} height={340} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="工种汇总" data-testid="tj-worktype-table">
            <Table
              size="small"
              pagination={false}
              rowKey="name"
              dataSource={overview.workTypeTable}
              columns={[
                { title: "工种", dataIndex: "name", key: "name" },
                { title: "记录数", dataIndex: "recordCount", key: "recordCount" },
                { title: "总工时(h)", dataIndex: "hours", key: "hours" },
                { title: "支出(估算)", dataIndex: "salary", key: "salary" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title={cardTitle("工种工时按月堆叠", "记录口径;断档月为 0")}>
        <EChart option={opts.workTypeMonthlyOption(overview.workTypeMonthly)} height={380} />
      </Card>

      <Card size="small" title={cardTitle("月度总览", "人天/工时左轴,支出右轴;断档月如实为 0")}>
        <EChart option={opts.monthlyOverviewOption(overview.monthly)} height={420} />
      </Card>

      <Card
        size="small"
        title={cardTitle("累计工时 & 累计支出", "自范围首月起逐月累加;断档月按 0 累计")}
      >
        <EChart option={opts.cumulativeOption(overview.monthly)} height={380} />
      </Card>

      <Card size="small" title={cardTitle("支出 Top10", "估算支出排序;悬浮显示总工时/出勤天")}>
        <EChart option={opts.salaryTopOption(overview.salaryTop)} height={360} />
      </Card>
    </div>
  );

  // ======================== 时间模式 Tab 内容 ========================
  const timeTab = (
    <div className="flex flex-col gap-2">
      <Card
        size="small"
        title={cardTitle("出勤日历热力", "GitHub 风格:每年一行,颜色=当日总工时;深色即忙碌日")}
      >
        <EChart option={opts.calendarHeatmapOption(overview.daily)} height={calendarHeight} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "月度班制结构",
          "同班制口径:按人天计入全日(≥9h)/半日(3~7.5h)/其他;断档月为 0",
        )}
      >
        <EChart option={opts.monthlyShiftOption(overview.monthly)} height={380} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "星期几出勤分布",
          "范围整体按星期汇总;人均=总工时/人天,看典型的干法是否有周循环",
        )}
      >
        <EChart option={opts.weekdayOption(overview.weekday)} height={340} />
      </Card>
      <Card
        size="small"
        title={cardTitle("队伍增长", "当月首次出勤=新增;累计=截至该月出现过的出勤人数")}
      >
        <EChart option={opts.workerGrowthOption(overview.growth)} height={340} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "工种工时河流",
          "记录口径:主要工种(工时 Top7,其余并入'其他')的月度流量形态",
        )}
      >
        <EChart option={opts.themeRiverOption(overview.workTypeMonthly)} height={460} />
      </Card>
    </div>
  );

  // ======================== 关系分析 Tab 内容 ========================
  const relationTab = (
    <div className="flex flex-col gap-2">
      <Alert
        type="info"
        showIcon
        message="共现口径:两人当天各有记录(跨工种去重)即共现一天,与历史分析报告同口径。"
      />
      <Card
        size="small"
        title={cardTitle("两人共现热力", "行列取出勤 Top20 对角线以下三角;颜色越深共现越多")}
      >
        <EChart option={opts.coHeatmapOption(relation)} height={560} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "搭档网络",
          "节点=出勤 ≥5 天的人;阈值同时作用于下方的搭档稳定性散点",
        )}
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
      >
        <EChart option={opts.graphOption(relation, coThreshold)} height={560} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "搭档稳定性散点",
          `共现 ≥${coThreshold} 天(在"搭档网络"卡片可调);右上角组合 = 又活跃又固定的核心搭档`,
        )}
      >
        <EChart option={opts.stableScatterOption(relation.stable, coThreshold)} height={420} />
      </Card>
      <Card
        size="small"
        title={cardTitle(
          "人×工种 桑基",
          "总工时 Top20 的人流向工种;单线者=单一工种,多线者=常常混岗",
        )}
      >
        <EChart option={opts.sankeyOption(sankey)} height={620} />
      </Card>
    </div>
  );

  // ======================== 个人分析 Tab 内容 ========================
  const personalTab = selected ? (
    <div className="flex flex-col gap-2">
      <Row gutter={[8, 8]} className="items-center">
        <Col xs={24} md={6}>
          <Select
            showSearch
            placeholder="选择工人"
            value={selected.id}
            onChange={setSelectedWorkerId}
            style={{ width: "100%" }}
            optionFilterProp="label"
            options={profiles.list.map((w) => ({
              value: w.id,
              label: `${w.name}(出勤 ${w.days} 天)`,
            }))}
          />
        </Col>
        <Col xs={8} md={4} data-testid="tj-p-days">
          <Statistic title="出勤天数" value={selected.days} suffix="天" />
        </Col>
        <Col xs={8} md={4} data-testid="tj-p-hours">
          <Statistic title="总工时" value={selected.hours} suffix="h" precision={1} />
        </Col>
        <Col xs={8} md={4} data-testid="tj-p-salary">
          <Statistic title="收入(估算)" value={selected.salary} suffix="元" />
        </Col>
        <Col xs={12} md={3} data-testid="tj-p-avg">
          <Statistic title="日均工时" value={selected.avgDayHours} suffix="h" precision={1} />
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
        message={`首日 ${selected.firstDay || "—"};收入与"概览/工时&薪资"同口径(工时×时薪估算)。`}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title={cardTitle("个人月度趋势", "出勤天/工时左轴,收入右轴;不出的月份补 0")}
          >
            <EChart option={opts.personalMonthlyOption(selectedMonthly)} height={380} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title={cardTitle("个人工种构成", "记录口径;按工时排序")}>
            <EChart option={opts.workTypePieOption(selectedWorkPie)} height={340} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={cardTitle("搭档排名 Top10", "共同出勤最多的人;共现 1 天也计入")}
          >
            <EChart
              option={opts.personalPartnerOption(
                selectedPartners.map((p) => ({ name: p.name, co: p.co })),
              )}
              height={420}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={cardTitle("Top5 工人画像雷达", "出勤/工时/工种广度/收入/日均工时;与选人无关")}
          >
            <EChart option={opts.radarOption(profiles.list)} height={420} />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={cardTitle(
          "各人单日工时箱线",
          "出勤 Top15;盒须=单日合计工时的 min/Q1/Q2/Q3/max,看谁稳定谁浮动",
        )}
      >
        <EChart option={opts.dayHoursBoxOption(overview.boxData)} height={420} />
      </Card>
    </div>
  ) : (
    <Empty description="所选范围内没有工人数据" />
  );

  // ======================== 页面 ========================
  return (
    <List headerButtons={rangeButtons}>
      <Spin spinning={isLoading}>
        {hasData ? (
          <Tabs
            defaultActiveKey="overview"
            destroyInactiveTabPane
            items={[
              { key: "overview", label: "概览", children: overviewTab },
              { key: "time", label: "时间模式", children: timeTab },
              { key: "relation", label: "关系分析", children: relationTab },
              { key: "personal", label: "个人分析", children: personalTab },
            ]}
          />
        ) : (
          <Empty description={isLoading ? "加载中..." : "所选范围内没有记录"} />
        )}
      </Spin>
    </List>
  );
}
