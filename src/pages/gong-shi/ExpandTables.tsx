/**
 * "工时&薪资"页的三级展开表:某工人 月 → 日 → 当天明细。
 * 数据全部来自 computeSalaryStats 的聚合结果(与 Excel 导出同一口径)。
 * testid 形态与 playwright 用例约定保持一致,不要改动:
 *   row-month-{工人名}-{行序号} / row-day-{工人名}-{行序号} / row-d3-{日期}-{行序号}
 */
import { Table, Tooltip } from "antd";
import { IconHelp } from "@tabler/icons-react";
import Decimal from "decimal.js";
import { formatHoursExact } from "@/utils/workTime";
import { cellTestId } from "@/utils/tableHelpers";
import { UNKNOWN_NAME } from "@/constants";
import type { SalaryStats } from "@/utils/salary";

interface WorkerExpandTablesProps {
  workerId: string;
  workerMap: Map<string, string>;
  workTypeMap: Map<string, string>;
  stats: SalaryStats;
  /** 该工人的考勤记录 */
  records: any[];
}

/** 月表列(第一级展开) */
const columnsMonth = [
  {
    title: "月份",
    dataIndex: "month",
    key: "month",
    onCell: cellTestId((_i, r) => `row-month-${r.worker}-${_i}`),
  },
  { title: "工人", dataIndex: "worker", key: "worker" },
  {
    title: "总工时",
    dataIndex: "total_work_hours",
    key: "total_work_hours",
    onCell: cellTestId((_i, r) => `row-month-hours-${r.worker}-${_i}`),
  },
  { title: "薪资", dataIndex: "xinzi", key: "xinzi" },
];

/** 日表列(第二级展开) */
const columnsDay = [
  {
    title: "日期",
    dataIndex: "date",
    key: "date",
    onCell: cellTestId((_i, r) => `row-day-${r.worker}-${_i}`),
  },
  { title: "工人", dataIndex: "worker", key: "worker" },
  {
    title: "总工时",
    dataIndex: "total_work_hours",
    key: "total_work_hours",
    onCell: cellTestId((_i, r) => `row-day-hours-${r.worker}-${_i}`),
  },
  { title: "薪资", dataIndex: "xinzi", key: "xinzi" },
];

/** 明细表"薪资"列:悬浮显示计算依据 */
const salaryCell = (value: any, rec: any) => (
  <Tooltip title={rec.matchvalue}>
    <div className="flex flex-row items-center gap-2">
      {value}
      <IconHelp size={16} />
    </div>
  </Tooltip>
);

/** 明细表列(第三级展开);testid 需要展开日期,只能按日期生成 */
const columnsDetail = (workDate: string) => [
  {
    title: "工人",
    dataIndex: "worker",
    key: "worker",
    onCell: cellTestId((i) => `row-d3-${workDate}-${i}`),
  },
  { title: "工作类型", dataIndex: "work", key: "work" },
  { title: "总工时", dataIndex: "total_work_hours", key: "total_work_hours" },
  { title: "薪资", dataIndex: "xinzi", key: "xinzi", render: salaryCell },
];

export function WorkerExpandTables({
  workerId,
  workerMap,
  workTypeMap,
  stats,
  records,
}: WorkerExpandTablesProps) {
  const workerName = workerMap.get(workerId) || UNKNOWN_NAME;
  const monthEntries = [...(stats.monthMinutesMap.get(workerId) ?? new Map())].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  );
  const dayEntries = [...(stats.dayMinutesMap.get(workerId) ?? new Map())].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  );

  // 第三级:某天明细(一条考勤记录一行)
  const renderDetailTable = (d2Record: any) => {
    const workDate = d2Record.date as string;
    const recs = records.filter((r: any) => r.work_date === workDate);
    const dataSource = recs.map((r: any) => {
      const dbID = String(r.id);
      return {
        key: dbID,
        worker: workerMap.get(r.worker_id) || UNKNOWN_NAME,
        work: workTypeMap.get(r.work) || UNKNOWN_NAME,
        total_work_hours: formatHoursExact(r.work_minutes),
        matchvalue: stats.recordMap.get(dbID)?.basis ?? "",
        xinzi: (stats.recordMap.get(dbID)?.salary ?? new Decimal(0)).toString(),
      };
    });
    return (
      <Table
        // 每日具体记录
        columns={columnsDetail(workDate)}
        dataSource={dataSource}
        size="small"
        pagination={false}
        onRow={cellTestId((i) => `row-d3-${workDate}-${i}`)}
      />
    );
  };

  // 第二级:某月内的日记录
  const renderDayTable = (workMonth: string) => {
    const dataSource = dayEntries
      .filter(([date]) => date.startsWith(workMonth))
      .map(([date, minutes]) => ({
        key: date,
        worker: workerName,
        date,
        total_work_hours: formatHoursExact(minutes),
        xinzi: (stats.daySalaryMap.get(workerName)?.get(date) || new Decimal(0)).toString(),
      }));
    return (
      <Table
        // 每日记录
        columns={columnsDay}
        dataSource={dataSource}
        size="small"
        pagination={{ showSizeChanger: true }}
        expandable={{
          expandedRowRender: renderDetailTable,
          expandRowByClick: true,
        }}
      />
    );
  };

  // 第一级:某工人按月
  const monthDataSource = monthEntries.map(([month, minutes]) => ({
    key: month,
    worker: workerName,
    month,
    total_work_hours: formatHoursExact(minutes),
    xinzi: (stats.monthSalaryMap.get(workerName)?.get(month) || new Decimal(0)).toString(),
  }));

  return (
    <Table
      // 每月记录
      columns={columnsMonth}
      dataSource={monthDataSource}
      size="small"
      expandable={{
        expandedRowRender: (d1Record: any) => renderDayTable(d1Record.month),
        expandRowByClick: true,
      }}
    />
  );
}
