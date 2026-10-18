/**
 * 统计图表页(4 个 Tab,结论优先):
 * - 概览:关键卡 + 未定价提示 + 数据体检 + 每日趋势 + 月度总览 + 排行(三种排序)+
 *   班制/工种结构,分布与画像类图折叠在末尾
 * - 时间模式:日历热力、人×月热力、队伍增长与流失、人均强度、超时、星期节奏、
 *   工种×星期、月度班制、工种堆叠/河流、累计与环比
 * - 关系分析:共现热力、搭档网络(阈值可调)、稳定性散点、人×工种桑基
 * - 个人分析:选人 → 指标+百分位、月度趋势、工种构成/收入、星期节奏、单日分布、
 *   班制、与团队中位数雷达、日历、累计、搭档排名
 * 数据:考勤记录全量(useList 分页关闭,expand 工种/人员),薪资设置全量;
 * 聚合复用"工时&薪资"页同一份支出引擎(computeSalaryStats),口径永远一致。
 * 时间范围:本页局部状态(持久化在 config store 的本页专用字段),月份粒度,
 * 默认全部历史,不影响其他页面。
 * 性能:聚合全部走 useMemo,且概览/画像共用同一份上下文(buildContext),
 * 切换 Tab、拖动共现阈值都不会重复跑全量遍历。
 */
import { List } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Empty, Segmented, Spin, Tabs, Typography } from "antd";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useConfigStore } from "@/stores";
import {
  buildContext,
  buildHealth,
  buildOverview,
  buildProfiles,
  buildRelation,
  buildSankey,
  filterRecordsByMonth,
} from "./compute";
import { OverviewTab } from "./OverviewTab";
import { TimeTab } from "./TimeTab";
import { RelationTab } from "./RelationTab";
import { PersonalTab } from "./PersonalTab";

/** 快捷范围(以当前月为终点) */
const QUICK_RANGES = [
  { label: "全部", value: "all" },
  { label: "近 3 月", value: "3m" },
  { label: "近 6 月", value: "6m" },
  { label: "近 12 月", value: "12m" },
  { label: "今年", value: "ytd" },
];

/** 快捷范围 → 月份区间 */
const rangeOfQuick = (key: string): [string | null, string | null] => {
  const now = dayjs();
  const end = now.format("YYYY-MM");
  if (key === "all") return [null, null];
  if (key === "ytd") return [`${now.year()}-01`, end];
  const n = Number(key.replace("m", "")) || 3;
  return [now.subtract(n - 1, "month").format("YYYY-MM"), end];
};

export default function TongJiPage() {
  // 月份范围持久化在 config store(本页专用字段),与记录页/工时页的范围互不影响
  const { tongjiMonthRange: monthRange, setTongjiMonthRange: setMonthRange } = useConfigStore();
  // 快捷范围按钮的选中态(手动选月份后归为 custom)
  const [quick, setQuick] = useState<string>(
    monthRange[0] === null && monthRange[1] === null ? "all" : "custom",
  );
  // Tab 与选中工人:提到父级,供"点排行/热力跳个人分析"联动
  const [activeTab, setActiveTab] = useState("overview");
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
  const records = recordResult?.data;
  const salaryRecords = salaryResult?.data;

  // ======================== 聚合(全部记忆化) ========================
  const filtered = useMemo(() => filterRecordsByMonth(records, monthRange), [records, monthRange]);
  // 概览与画像共用同一份名称映射/薪资字典/单条支出,避免重复跑两遍 computeSalaryStats
  const ctx = useMemo(() => buildContext(filtered, salaryRecords), [filtered, salaryRecords]);
  const overview = useMemo(
    () => buildOverview(filtered, salaryRecords, ctx),
    [filtered, salaryRecords, ctx],
  );
  const relation = useMemo(() => buildRelation(filtered), [filtered]);
  const profiles = useMemo(
    () => buildProfiles(filtered, salaryRecords, ctx),
    [filtered, salaryRecords, ctx],
  );
  const sankey = useMemo(() => buildSankey(filtered), [filtered]);
  const health = useMemo(() => buildHealth(filtered, overview), [filtered, overview]);

  const hasData = overview.recordCount > 0;

  /** 点排行/热力/网络 → 选中该人并切到个人分析 */
  const pickWorker = (id: string) => {
    setSelectedWorkerId(id);
    setActiveTab("personal");
  };

  // ======================== 局部时间范围选择器 ========================
  const rangeButtons = (
    <div className="flex flex-wrap flex-row items-center gap-2">
      <Typography.Text type="secondary" className="hidden sm:inline">
        月份范围(仅影响本页)
      </Typography.Text>
      <Segmented
        size="small"
        value={quick}
        onChange={(v) => {
          const key = String(v);
          setQuick(key);
          if (key !== "custom") setMonthRange(rangeOfQuick(key));
        }}
        options={QUICK_RANGES}
      />
      <DatePicker.RangePicker
        picker="month"
        allowEmpty={[true, true]}
        value={[
          monthRange[0] ? dayjs(`${monthRange[0]}-01`) : null,
          monthRange[1] ? dayjs(`${monthRange[1]}-01`) : null,
        ]}
        placeholder={["起始月", "截止月"]}
        onChange={(dates) => {
          setQuick("custom");
          setMonthRange([
            dates?.[0]?.format("YYYY-MM") ?? null,
            dates?.[1]?.format("YYYY-MM") ?? null,
          ]);
        }}
      />
    </div>
  );

  // ======================== 页面 ========================
  return (
    <List headerButtons={rangeButtons}>
      <Spin spinning={isLoading}>
        {hasData ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            destroyInactiveTabPane
            items={[
              {
                key: "overview",
                label: "概览",
                children: (
                  <OverviewTab
                    overview={overview}
                    profiles={profiles}
                    health={health}
                    onPickWorker={pickWorker}
                  />
                ),
              },
              { key: "time", label: "时间模式", children: <TimeTab overview={overview} /> },
              {
                key: "relation",
                label: "关系分析",
                children: (
                  <RelationTab relation={relation} sankey={sankey} onPickWorker={pickWorker} />
                ),
              },
              {
                key: "personal",
                label: "个人分析",
                children: (
                  <PersonalTab
                    profiles={profiles}
                    relation={relation}
                    selectedWorkerId={selectedWorkerId}
                    onSelectWorker={setSelectedWorkerId}
                  />
                ),
              },
            ]}
          />
        ) : (
          <Empty description={isLoading ? "加载中..." : "所选范围内没有记录"} />
        )}
      </Spin>
    </List>
  );
}
