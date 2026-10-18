/**
 * 统计图表页。
 * - 概览:顶部卡片 + 出勤趋势/Top/分布/班制/工种结构/月度总览
 * - 关系分析:共现热力、搭档网络、搭档稳定性散点
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
  Row,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useConfigStore } from "@/stores";
import { buildOverview, buildRelation, filterRecordsByMonth, minutesToHours } from "./compute";
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

  const hasData = overview.recordCount > 0;

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
          <Card size="small">
            <Statistic
              title="总工时"
              value={minutesToHours(overview.totalMinutes)}
              suffix="h"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card size="small">
            <Statistic
              title="支出(估算)"
              value={overview.totalSalary.toDecimalPlaces(2).toString()}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={8} md={5}>
          <Card size="small">
            <Statistic title="出勤人天" value={overview.personDays} suffix="人天" />
          </Card>
        </Col>
        <Col xs={8} md={5}>
          <Card size="small">
            <Statistic title="出勤人数" value={overview.workerCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small">
            <Statistic title="记录条数" value={overview.recordCount} suffix="条" />
          </Card>
        </Col>
      </Row>

      {overview.unPriced.names.length > 0 && (
        <Alert
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
          <Card size="small" title="工种汇总">
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
        title={cardTitle("搭档网络", "节点=出勤 ≥5 天的人,边=共现 ≥10 天;可拖拽/缩放")}
      >
        <EChart option={opts.graphOption(relation)} height={560} />
      </Card>
      <Card size="small" title={cardTitle("搭档稳定性散点", "右上角组合 = 又活跃又固定的核心搭档")}>
        <EChart option={opts.stableScatterOption(relation.stable)} height={420} />
      </Card>
    </div>
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
              { key: "relation", label: "关系分析", children: relationTab },
            ]}
          />
        ) : (
          <Empty description={isLoading ? "加载中..." : "所选范围内没有记录"} />
        )}
      </Spin>
    </List>
  );
}
