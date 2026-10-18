/**
 * 概览 Tab(结论优先):
 * 关键卡 → 未定价提示 → 数据体检 → 每日趋势 → 月度总览 →
 * 排行(三种排序切换)+ 班制占比 → 工种占比 + 汇总表 →
 * 折叠区:出勤/时长分布 + 画像雷达 + 箱线。
 * 长尾的分布类图表默认折叠,让首屏只留"结论"。
 */
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Row,
  Segmented,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import type { HealthIssue, Overview, Profiles } from "./compute";
import { minutesToHours } from "./compute";
import type { RankMode } from "./options";
import * as opts from "./options";
import { ChartCard, cardTitle } from "./ChartCard";
import { downloadCsv } from "./download";

interface OverviewTabProps {
  overview: Overview;
  profiles: Profiles;
  health: HealthIssue[];
  /** 点排行/箱线里的某人 → 跳到个人分析 */
  onPickWorker: (id: string) => void;
}

const healthColumns = [
  {
    title: "等级",
    dataIndex: "level",
    key: "level",
    width: 84,
    render: (level: HealthIssue["level"]) => (
      <Tag color={level === "warn" ? "error" : "warning"}>{opts.healthLevelText(level)}</Tag>
    ),
  },
  { title: "问题", dataIndex: "title", key: "title", width: 180 },
  { title: "数量", dataIndex: "count", key: "count", width: 72 },
  {
    title: "样例",
    dataIndex: "samples",
    key: "samples",
    render: (samples: string[]) => (samples.length ? samples.join(" / ") : "—"),
  },
  { title: "建议", dataIndex: "hint", key: "hint" },
];

export const OverviewTab = ({ overview, profiles, health, onPickWorker }: OverviewTabProps) => {
  const [rankMode, setRankMode] = useState<RankMode>("days");
  const rankItems = profiles.list;

  const unpriced = overview.unPriced;
  const healthCsv = () =>
    downloadCsv(
      "数据体检",
      ["等级", "问题", "数量", "样例", "建议"],
      health.map((h) => [
        opts.healthLevelText(h.level),
        h.title,
        h.count,
        h.samples.join(" / "),
        h.hint,
      ]),
    );

  return (
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
        <Col xs={8} md={4}>
          <Card size="small" data-testid="tj-person-days">
            <Statistic title="出勤人天" value={overview.personDays} suffix="人天" />
          </Card>
        </Col>
        <Col xs={8} md={4}>
          <Card size="small" data-testid="tj-worker-count">
            <Statistic title="出勤人数" value={overview.workerCount} suffix="人" />
          </Card>
        </Col>
        <Col xs={8} md={4}>
          <Card size="small" data-testid="tj-record-count">
            <Statistic title="记录条数" value={overview.recordCount} suffix="条" />
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card size="small" data-testid="tj-percapita-hours">
            <Statistic
              title="人均月工时"
              value={overview.perCapita.avgHoursPerWorker}
              suffix="h"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

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
        size="small"
        data-testid="tj-health-card"
        title={cardTitle("数据体检", "只提示不修改;每条都给出核对建议")}
        extra={
          health.length ? (
            <Tooltip title="导出 CSV">
              <Button
                type="text"
                size="small"
                aria-label="导出体检结果"
                icon={<IconDownload size={15} />}
                onClick={healthCsv}
              />
            </Tooltip>
          ) : null
        }
      >
        {health.length ? (
          <Table
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={health}
            columns={healthColumns}
          />
        ) : (
          <Alert type="success" showIcon message="未发现明显的漏录、重复或异常工时。" />
        )}
      </Card>

      <ChartCard
        title="每日出勤人数 & 总工时趋势"
        tip="人天口径;无记录日期如实留白不连线;红点=当日合计 >12h"
        height={360}
        option={opts.dailyChartOption(overview.daily, overview.anomalyDays)}
      />

      <ChartCard
        title="月度总览"
        tip="人天/工时左轴,支出右轴;断档月如实为 0;悬浮显示环比、人均工时与出勤率"
        height={420}
        option={opts.monthlyOverviewOption(overview.monthly)}
      />

      <Row gutter={[8, 8]}>
        <Col xs={24} lg={14}>
          <ChartCard
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
                { title: "记录数", dataIndex: "recordCount", key: "recordCount" },
                { title: "总工时(h)", dataIndex: "hours", key: "hours" },
                { title: "支出(估算)", dataIndex: "salary", key: "salary" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Collapse
        size="small"
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
