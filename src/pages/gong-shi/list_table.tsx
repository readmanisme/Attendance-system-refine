import { List as LList, useTable } from "@refinedev/antd";
import { Button } from "antd";
import { useList, type CrudFilter } from "@refinedev/core";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useState, type Key } from "react";
import Decimal from "decimal.js";
import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import { buildSalaryDict, computeSalaryStats } from "@/utils/salary";
import { formatHoursExact } from "@/utils/workTime";
import { getWorkDateRange } from "@/utils/get_data_picker_filter";
import { useConfigStore } from "@/stores";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { BASE_WORK_TYPE_NAME } from "@/constants";
import { WorkerExpandTables } from "./ExpandTables";
import { ExportPopover } from "./ExportPopover";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";

export default function GongShiList() {
  // ======================== useState等 ========================
  const [SelectedPerson, setSelectedPerson] = useState<{ value: string; label: string }[]>([]);
  // 受控展开键:切换筛选翻页时保住已展开的行
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly Key[]>([]);

  // ======================== 获取数据 ========================
  const {
    tableProps: workerData,
    setFilters,
    setCurrentPage: setCurrent,
  } = useTable({
    resource: __Workers_TableName,
    syncWithLocation: false,
    filters: {
      defaultBehavior: "replace",
    },
  });

  const workerMap = new Map<string, string>();
  workerData.dataSource?.forEach((w: any) => {
    if (w?.id !== undefined) workerMap.set(w.id, w.name);
  });

  const selectedIds = SelectedPerson.map((p) => p.value);

  // 工人表只显示所选(未选人 = 全部工人)
  useEffect(() => {
    setFilters(buildEqOrFilter("id", selectedIds));
  }, [selectedIds, setFilters]);

  const { result: workTypeList, query } = useList({
    resource: __WorkTypes_TableName,
    pagination: {
      mode: "off",
    },
  });

  // 这个要实现乐观显示的方法和工作页面的不一样，因为如果不判断数据加载,空数据也算不出正确的false
  const hasBaseWorkType = query.isLoading
    ? true
    : workTypeList?.data?.some((t) => t.name === BASE_WORK_TYPE_NAME);

  const { result, query: querySalary } = useList({
    resource: __SalaryType_TableName,
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // 真 loading：render 期间直接派生，避免 useState+useEffect
  const isDataLoading = !!workerData.loading || query.isLoading || querySalary.isLoading;

  // 主表汇总：当前日期范围内每人的合计工时 / 合计薪资。
  // 与展开表、Excel 导出共用 computeSalaryStats 的同一套口径。
  const { recordMonthRange, setRecordMonthRange } = useConfigStore();
  const rangeFilter = useMemo<CrudFilter>(() => {
    const { gte, lte } = getWorkDateRange(recordMonthRange);
    return {
      operator: "and",
      value: [
        { field: "work_date", operator: "gte", value: gte },
        { field: "work_date", operator: "lte", value: lte },
      ],
    };
  }, [recordMonthRange]);
  const { result: rangeRecords, query: rangeQuery } = useList({
    resource: __AttendanceRecord_TableName,
    filters: [rangeFilter],
    pagination: { mode: "off" },
  });
  // 薪资按"工人名"解析，主表汇总必须用全量工人名（分页的 workerMap 只有当前页）
  const { result: allWorkers, query: allWorkersQuery } = useList({
    resource: __Workers_TableName,
    pagination: { mode: "off" },
  });
  const isTableLoading =
    isDataLoading || rangeQuery.isLoading || allWorkersQuery.isLoading;

  // 范围内一条记录都没有时给个出口：默认范围是"本月~下月"，
  // 若最近没记工，整张表全是 -- / 0，看起来像页面坏了
  const { result: latestRecordResult } = useList({
    resource: __AttendanceRecord_TableName,
    pagination: { pageSize: 1 },
    sorters: [{ field: "work_date", order: "desc" }],
  });
  const latestMonth = latestRecordResult?.data?.[0]?.work_date?.slice(0, 7) as string | undefined;
  const rangeIsEmpty = !isTableLoading && (rangeRecords?.data?.length ?? 0) === 0;

  // ======================== 衍生数据计算 ========================
  const workTypeMap = new Map<string, string>();
  workTypeList?.data?.forEach((t: any) => {
    if (t?.id !== undefined) workTypeMap.set(t.id, t.name);
  });

  const hasBaseSalaryType = querySalary.isLoading
    ? true
    : result?.data?.some(
        (t) => t.expand?.work_type?.name === BASE_WORK_TYPE_NAME && t.worker_name === "",
      );

  const salaryDict = buildSalaryDict(result?.data);

  // 按工人汇总当前范围内的工时与薪资（记录 id → 单条薪资 由 computeSalaryStats 提供）
  const allWorkerMap = new Map<string, string>();
  allWorkers?.data?.forEach((w: any) => {
    if (w?.id !== undefined) allWorkerMap.set(w.id, w.name);
  });
  const rangeStats = computeSalaryStats(rangeRecords?.data, {
    workerMap: allWorkerMap,
    workTypeMap,
    salaryDict,
  });
  const rangeTotals = new Map<string, { minutes: number; salary: Decimal }>();
  for (const rec of rangeRecords?.data ?? []) {
    const workerId = String(rec.worker_id);
    const cur = rangeTotals.get(workerId) ?? { minutes: 0, salary: new Decimal(0) };
    cur.minutes += Number(rec.work_minutes) || 0;
    cur.salary = cur.salary.plus(rangeStats.recordMap.get(String(rec.id))?.salary ?? 0);
    rangeTotals.set(workerId, cur);
  }

  const workTypes = [...workTypeMap.values()];
  const unSalaryWorkTypes = workTypes.filter((item) => !(item in salaryDict));
  // 这里的判断很精准，不会混淆没人的工作和有人的工作
  const get_un_salary_work = unSalaryWorkTypes.length
    ? `未设置工资的工作类型：${unSalaryWorkTypes.join(",")}，请设置其对应的工资,否则按照基础工资计算。`
    : "";

  // ======================== 基础记录校验 ========================
  if (!hasBaseWorkType) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          基础工作类型不存在，请先到「工作管理」添加
        </div>
        <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          基础工资类型依赖基础工作，请添加基础工作后再设置其对应的时薪
        </div>
      </div>
    );
  }
  if (!hasBaseSalaryType) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          基础工作的时薪不存在，请先到「薪资设置」添加
        </div>
        <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          如果基础工作类型也不存在，请先添加基础工作类型，并设置其对应的时薪
        </div>
      </div>
    );
  }

  // 展开表:某工人的 月→日→明细 层级。
  // 考勤记录不整页预取,由 WorkerExpandTables 在展开时按"工人+月范围"自行查询并就地聚合。
  const expandedRowRender = (record: any) => (
    <WorkerExpandTables
      workerId={String(record.id)}
      workerMap={workerMap}
      workTypeMap={workTypeMap}
      salaryDict={salaryDict}
    />
  );

  // ======================== UI ========================
  return (
    <LList
      breadcrumb={false}
      headerProps={{ subTitle: "按人员查看每月 / 每日 / 每条的工时与薪资；可导出 Excel" }}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <ExportPopover salaryDict={salaryDict} />
        </>
      )}
    >
      {get_un_salary_work !== "" && (
        <div
          data-testid="un-salary-work-alert"
          style={{
            marginBottom: 10,
            fontSize: 12,
            color: "var(--warning)",
          }}
        >
          {get_un_salary_work}
        </div>
      )}

      <FilterBar
        left={
          <PySearchSelect
            onChangeFn={(value) => {
              setSelectedPerson(value as { value: string; label: string }[]);
              setCurrent(1);
            }}
            placeholder="多选工人，支持拼音"
            mode="multiple"
            needButton={true}
            onClearFn={() => {
              setSelectedPerson([]);
              setCurrent(1);
            }}
          />
        }
        right={<SwitchDataRange />}
      />

      {rangeIsEmpty && (
        <div
          data-testid="range-empty-hint"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 10,
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          <span>
            {recordMonthRange[0]} ~ {recordMonthRange[1]} 内没有考勤记录
          </span>
          {latestMonth && latestMonth !== recordMonthRange[1] && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto", fontSize: 12 }}
              onClick={() => setRecordMonthRange([latestMonth, latestMonth])}
            >
              跳到最近有记录的 {latestMonth}
            </Button>
          )}
        </div>
      )}

      <DataTable
        {...workerData}
        pagination={{
          ...workerData.pagination,
          showSizeChanger: true,
        }}
        loading={isTableLoading}
        rowKey="id"
        tableLayout="fixed"
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpandedRowsChange: (keys: readonly Key[]) => setExpandedRowKeys([...keys]),
          expandRowByClick: true,
        }}
      >
        <DataTable.Column
          dataIndex="id"
          title="ID"
          width={96}
          className="id-col"
          ellipsis
          onCell={cellTestId((i) => `row-id-${i}`)}
        />
        <DataTable.Column
          dataIndex="name"
          title="姓名"
          // 不设宽度：让姓名列吸收剩余空间，ID 列才能保持 96px 不被等比放大
          onCell={cellTestId((i) => `row-name-${i}`)}
        />
        <DataTable.Column
          title="合计工时(h)"
          width={150}
          className="num"
          render={(_: any, record: any) => formatHoursExact(rangeTotals.get(record.id)?.minutes)}
          onCell={cellTestId((i) => `row-hours-${i}`)}
        />
        <DataTable.Column
          title="合计薪资(元)"
          width={150}
          className="num"
          render={(_: any, record: any) =>
            (rangeTotals.get(record.id)?.salary ?? new Decimal(0)).toString()
          }
        />
      </DataTable>
    </LList>
  );
}
