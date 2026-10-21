/**
 * 概览 Tab(结论优先):
 * 关键卡 → 未定价提示 → 数据体检 → 每日趋势 → 月度总览 →
 * 排行(三种排序切换)+ 班制占比 → 工种占比 + 汇总表 →
 * 折叠区:出勤/时长分布 + 画像雷达 + 箱线。
 * 长尾的分布类图表默认折叠,让首屏只留"结论"。
 */
import { Alert, Button, Card, Col, Collapse, Row, Segmented, Table, Tag, Tooltip } from "antd";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import type { HealthIssue, Overview, Profiles } from "./compute";
import { minutesToHours } from "./compute";
import type { RankMode } from "./options";
import * as opts from "./options";
import { ChartCard, cardTitle } from "./ChartCard";
import { downloadCsv } from "./download";
import { StatCard } from "@/components/ui/StatCard";
import { ChartNav } from "@/components/ui/ChartNav";

interface OverviewTabProps {
  overview: Overview;
  profiles: Profiles;
  health: HealthIssue[];
  /** 点排行/箱线里的某人 → 跳到个人分析 */
  onPickWorker: (id: string) => void;
}

const healthCsv = (health: HealthIssue[]) =>
  downloadCsv(
    "数据体检",
    ["等级", "问题", "数量", "明细", "建议"],
    // 一条明细一行,方便在表格软件里逐条处理
    health.flatMap((h) =>
      h.details.map((d) => [opts.healthLevelText(h.level), h.title, h.count, d, h.hint]),
    ),
  );

/** 单条体检问题:标题行 + 建议 + 全量明细(超过 8 条默认折叠,可展开看全部) */
const HealthBlock = ({ issue }: { issue: HealthIssue }) => {
  const [expanded, setExpanded] = useState(false);
  const collapsible = issue.details.length > 8;
  return (
    <div
      data-testid={`tj-health-${issue.key}`}
      className="rounded-md border border-solid border-[var(--border)] p-2"
    >
      <div className="flex flex-row flex-wrap items-center gap-2">
        <Tag color={issue.level === "warn" ? "error" : "warning"}>
          {opts.healthLevelText(issue.level)}
        </Tag>
        <span className="font-medium">{issue.title}</span>
        <span className="text-[var(--text-tertiary)]">{issue.count} 处</span>
      </div>
      <div className="mt-1 text-xs text-[var(--text-tertiary)]">{issue.hint}</div>
      <div
        className={
          collapsible && !expanded
            ? "mt-1 max-h-48 overflow-y-auto text-xs leading-6"
            : "mt-1 text-xs leading-6"
        }
      >
        {issue.details.map((d, i) => (
          <div key={`${issue.key}-${i}`} className="border-t border-solid border-[var(--border-subtle)]">
            {d}
          </div>
        ))}
      </div>
      {collapsible && (
        <Button type="link" size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起" : `展开全部 ${issue.details.length} 条`}
        </Button>
      )}
    </div>
  );
};

const NAV_ITEMS = [
  { id: "tj-health", label: "数据体检" },
  { id: "tj-trend", label: "每日趋势" },
  { id: "tj-monthly", label: "月度总览" },
  { id: "tj-rank", label: "工人排行" },
  { id: "tj-shift", label: "班制占比" },
  { id: "tj-worktype", label: "工种结构" },
];

export const OverviewTab = ({ overview, profiles, health, onPickWorker }: OverviewTabProps) => {
  const [rankMode, setRankMode] = useState<RankMode>("days");
  const rankItems = profiles.list;

  const unpriced = overview.unPriced;

  return (
    <div className="flex flex-col gap-2">
      {/* 顶部统计卡片 */}
      <Row gutter={[8, 8]}>
        <Col xs={12} md={4}>
          <StatCard
            testId="tj-total-hours"
            title="总工时"
            value={minutesToHours(overview.totalMinutes)}
            suffix="h"
            precision={1}
          />
        </Col>
        <Col xs={12} md={4}>
          <StatCard
            testId="tj-total-salary"
            title="支出(估算)"
            value={overview.totalSalary.toDecimalPlaces(2).toString()}
            suffix="元"
          />
        </Col>
        <Col xs={8} md={4}>
          <StatCard testId="tj-person-days" title="出勤人天" value={overview.personDays} suffix="人天" />
        </Col>
        <Col xs={8} md={4}>
          <StatCard testId="tj-worker-count" title="出勤人数" value={overview.workerCount} suffix="人" />
        </Col>
        <Col xs={8} md={4}>
          <StatCard testId="tj-record-count" title="记录条数" value={overview.recordCount} suffix="条" />
        </Col>
        <Col xs={24} md={4}>
          <StatCard
            testId="tj-percapita-hours"
            title="人均月工时"
            value={overview.perCapita.avgHoursPerWorker}
            suffix="h"
            precision={1}
          />
        </Col>
      </Row>

      <ChartNav items={NAV_ITEMS} />

      {unpriced.names.length > 0 && (
        <Alert
          data-testid="tj-unpriced-alert"
          type="warning"
          showIcon
          message={`已按"工时&薪资"页同口径计算支出,其中未单独定价的工种兜底按"基础"时薪计: ${unpriced.names.join(", ")}（${unpriced.records} 条 / ${minutesToHours(unpriced.minutes)}h，按基础价折合 ${unpriced.salary} 元，占总支出 ${(unpriced.share * 100).toFixed(1)}%）。请到"薪资设置"补价,补价后此处自动修正。`}
        />
      )}

      {/* 数据体检:先看数据对不对,再看图 */}
      <Card
        id="tj-health"
        size="small"
        data-testid="tj-health-card"
        title={cardTitle("数据体检", "只提示不修改;每条问题都列出全部明细,便于逐条核对,如果确认无异常可忽略")}
        extra={
          health.length ? (
            <Tooltip title="导出 CSV">
              <Button
                type="text"
                size="small"
                aria-label="导出体检结果"
                icon={<IconDownload size={15} />}
                onClick={() => healthCsv(health)}
              />
            </Tooltip>
          ) : null
        }
      >
        {health.length ? (
          <div className="flex flex-col gap-2">
            {health.map((issue) => (
              <HealthBlock key={issue.key} issue={issue} />
            ))}
          </div>
        ) : (
          <Alert type="success" showIcon message="未发现明显的漏录、重复或异常工时。" />
        )}
      </Card>

      <ChartCard
        id="tj-trend"
        title="每日出勤人数 & 总工时趋势"
        tip="人天口径;无记录日期如实留白不连线;红点=当天有人合计 >12h"
        height={360}
        option={opts.dailyChartOption(overview.daily, overview.anomalyDays)}
      />

      <ChartCard
        id="tj-monthly"
        title="月度总览"
        tip="人天/工时左轴,支出右轴;断档月如实为 0;悬浮显示环比、人均工时与出勤率"
        height={420}
        option={opts.monthlyOverviewOption(overview.monthly)}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} lg={14}>
          <ChartCard
            id="tj-rank"
            title="工人排行"
            tip="三种排序共用一张图;点条形跳到该人的个人分析"
            height={430}
            exportName={`工人排行-${opts.RANK_LABELS[rankMode]}`}
            extra={
              <Segmented
                size="small"
                value={rankMode}
                onChange={(v) => setRankMode(v as RankMode)}
                options={[
                  { label: "出勤天", value: "days" },
                  { label: "工时", value: "hours" },
                  { label: "支出", value: "salary" },
                ]}
              />
            }
            option={opts.rankOption(rankItems, rankMode)}
            onEvents={{
              click: (p: any) => {
                const id = p?.data?.id;
                if (id) onPickWorker(id);
              },
            }}
          />
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard
            id="tj-shift"
            title="班制占比"
            tip="按人天统计:全日 ≥9h / 近全日 8~9h / 半日 3~8h / 短时 <3h,四档首尾相接"
            height={430}
            option={opts.shiftPieOption(overview.shiftPie)}
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <ChartCard
            id="tj-worktype"
            title="工种工时占比"
            tip="记录口径;超过 8 类折叠为'其他'"
            height={340}
            option={opts.workTypePieOption(overview.workTypePie)}
          />
        </Col>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title="工种汇总"
            data-testid="tj-worktype-table"
            extra={
              <Tooltip title="导出 CSV">
                <Button
                  type="text"
                  size="small"
                  aria-label="导出工种汇总"
                  icon={<IconDownload size={15} />}
                  onClick={() =>
                    downloadCsv(
                      "工种汇总",
                      ["工种", "记录数", "总工时(h)", "支出(估算,元)"],
                      overview.workTypeTable.map((r) => [r.name, r.recordCount, r.hours, r.salary]),
                    )
                  }
                />
              </Tooltip>
            }
          >
            <Table
              size="small"
              pagination={false}
              rowKey="name"
              dataSource={overview.workTypeTable}
              columns={[
                { title: "工种", dataIndex: "name", key: "name" },
                { title: "记录数", dataIndex: "recordCount", key: "recordCount", className: "num" },
                { title: "总工时(h)", dataIndex: "hours", key: "hours", className: "num" },
                { title: "支出(估算)", dataIndex: "salary", key: "salary", className: "num" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 分布与画像默认收起：首屏只留结论 */}
      <Collapse
        size="small"
        defaultActiveKey="dist" // 默认展开
        items={[
          {
            key: "dist",
            label: "分布与画像(4 张)",
            children: (
              <div className="flex flex-col gap-2">
                <Row gutter={[8, 8]}>
                  <Col xs={24} md={12}>
                    <ChartCard
                      title="出勤天数分布"
                      tip="档宽随跨度自适应(5/10/20 天);出勤少的人多说明散工/临时性质强"
                      height={340}
                      option={opts.attendDistChartOption(overview.attendDist)}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <ChartCard
                      title="单条记录工时分布"
                      tip="记录口径:人×天×工种,同键录入已合并;5h/10h 两主档"
                      height={340}
                      option={opts.recordDistChartOption(overview.recordDist)}
                    />
                  </Col>
                </Row>
                <Row gutter={[8, 8]}>
                  <Col xs={24} lg={10}>
                    <ChartCard
                      title="Top5 工人画像雷达"
                      tip="出勤天数 Top5;五维统一归一化到 0~100(全员 P95),面积可比,悬浮看原始值"
                      height={420}
                      option={opts.radarOption(profiles.list, profiles.scaleMax)}
                    />
                  </Col>
                  <Col xs={24} lg={14}>
                    <ChartCard
                      title="各人单日工时箱线"
                      tip="出勤 Top15;样本 ≥5 天才画(不足者不展示),盒须=min/Q1/Q2/Q3/max"
                      height={420}
                      option={opts.dayHoursBoxOption(overview.boxData)}
                    />
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
