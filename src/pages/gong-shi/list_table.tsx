import { List as LList, useTable } from "@refinedev/antd";
import { CrudFilter, useList } from "@refinedev/core";
import { Alert, Space, Table } from "antd";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useState } from "react";
import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import {
  buildSalaryDict,
  computeSalaryStats,
  groupByWorkerId,
  type SalaryStats,
} from "@/utils/salary";
import { useConfigStore } from "@/stores";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { getWorkDateRange } from "@/utils/get_data_picker_filter";
import { BASE_WORK_TYPE_NAME } from "@/constants";
import { WorkerExpandTables } from "./ExpandTables";
import { ExportPopover } from "./ExportPopover";

export default function GongShiList() {
  // ======================== useState等 ========================
  const { recordMonthRange } = useConfigStore();
  const [SelectedPerson, setSelectedPerson] = useState<{ value: string; label: string }[]>([]);

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

  const workerMap = useMemo(() => {
    const m = new Map<string, string>();
    workerData.dataSource?.forEach((w: any) => {
      if (w?.id !== undefined) m.set(w.id, w.name);
    });
    return m;
  }, [workerData.dataSource]);

  const selectedIds = useMemo(() => SelectedPerson.map((p) => p.value), [SelectedPerson]);

  // 未选人时取全部工人,选了人就只查所选
  // 注意这是给考勤记录用的,字段是 worker_id(工人表的筛选才用 id)
  const idFilters = useMemo(
    () => buildEqOrFilter("worker_id", selectedIds.length ? selectedIds : [...workerMap.keys()]),
    [selectedIds, workerMap],
  );

  useEffect(() => {
    setFilters(buildEqOrFilter("id", selectedIds));
  }, [selectedIds, setFilters]);

  // 月范围 → work_date 起止边界,再叠加工人的 or 筛选
  const attendanceFilter = useMemo(() => {
    const { gte, lte } = getWorkDateRange(recordMonthRange);
    const andValue: any[] = [
      { field: "work_date", operator: "gte", value: gte },
      { field: "work_date", operator: "lte", value: lte },
    ];
    if (idFilters.length) {
      andValue.unshift(idFilters[0]); // idFilters[0] 即 or 连接的工人筛选
    }
    return {
      operator: "and",
      value: andValue,
    };
  }, [recordMonthRange, idFilters]);

  const { result: attendance_record_data, query: queryAttendance } = useList({
    resource: __AttendanceRecord_TableName,
    filters: [attendanceFilter as CrudFilter],
    pagination: {
      mode: "off",
    },
  });

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
  // 真 loading：render 期间直接派生，避免 useState+useEffect。
  const isDataLoading =
    !!workerData.loading || queryAttendance.isLoading || query.isLoading || querySalary.isLoading;

  // ======================== 衍生数据计算 ========================

  const workTypeMap = useMemo(() => {
    const m = new Map<string, string>();
    workTypeList?.data?.forEach((t: any) => {
      if (t?.id !== undefined) m.set(t.id, t.name);
    });
    return m;
  }, [workTypeList?.data]);

  const hasBaseSalaryType = querySalary.isLoading
    ? true
    : result?.data?.some(
        (t) => t.expand?.work_type?.name === BASE_WORK_TYPE_NAME && t.worker_name === "",
      );

  const salaryDict = useMemo(() => buildSalaryDict(result?.data), [result?.data]);

  // 页面与导出共用的同一套薪资/工时聚合引擎
  const stats: SalaryStats = useMemo(
    () =>
      computeSalaryStats(attendance_record_data?.data, {
        workerMap,
        workTypeMap,
        salaryDict,
      }),
    [attendance_record_data?.data, workerMap, workTypeMap, salaryDict],
  );

  const recordsByWorker = useMemo(
    () => groupByWorkerId(attendance_record_data?.data),
    [attendance_record_data?.data],
  );

  const get_un_salary_work = useMemo(() => {
    const work_types = [...workTypeMap.values()];
    const un_salary_work_types = work_types.filter((item) => !(item in salaryDict));
    // 这里的判断很精准，不会混淆没人的工作和有人的工作
    if (!un_salary_work_types.length) return "";
    return `未设置工资的工作类型：${un_salary_work_types.join(
      ",",
    )}，请设置其对应的工资,否则按照基础工资计算。`;
  }, [workTypeMap, salaryDict]);

  // 使用稳定的 key 来避免强制全表重渲染时的取值时机问题（GongShiData 由 store 提供，取 valueOf）
  const gongShiKey = useMemo(() => {
    try {
      return `${recordMonthRange?.[0]?.valueOf?.() ?? ""}-${recordMonthRange?.[1]?.valueOf?.() ?? ""}`;
    } catch {
      return "gs-default";
    }
  }, [recordMonthRange]);

  // ======================== 基础记录校验 ========================
  if (!hasBaseWorkType) {
    return (
      <Alert
        message="基础工作类型不存在，请添加"
        type="error"
        showIcon
        description="如果基础工资类型不存在，也请添加基础工作后添加"
      />
    );
  }
  if (!hasBaseSalaryType) {
    return (
      <Alert
        message="基础工作的时薪 不存在，请添加"
        type="error"
        showIcon
        description="如果基础工作类型不存在，请添加基础工作类型，并设置其对应的时薪。"
      />
    );
  }

  // 展开表:某工人的 月→日→明细 层级
  const expandedRowRender = (record: any) => (
    <WorkerExpandTables
      workerId={String(record.id)}
      workerMap={workerMap}
      workTypeMap={workTypeMap}
      stats={stats}
      records={recordsByWorker.get(record.id) ?? []}
    />
  );

  // ======================== UI ========================
  return (
    <LList
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Space>
            <ExportPopover salaryDict={salaryDict} />
          </Space>
        </>
      )}
    >
      {get_un_salary_work !== "" && (
        <Alert
          data-testid="un-salary-work-alert"
          message={get_un_salary_work}
          type="warning"
          showIcon
          className="mb-2! mr-2! w-full"
        />
      )}
      <div className="flex items-center justify-between mb-2">
        <PySearchSelect
          onChangeFn={(value) => {
            setSelectedPerson(value as { value: string; label: string }[]);
            setCurrent(1);
          }}
          placeholder="多选工人,支持拼音"
          mode="multiple"
          needButton={true}
          onClearFn={() => {
            setSelectedPerson([]);
            setCurrent(1);
          }}
        />
        <SwitchDataRange />
      </div>
      <Table
        key={gongShiKey}
        // !!!通过强制重渲染避免在还未计算完成的时候取值导致错误
        {...workerData}
        pagination={{
          ...workerData.pagination,
          showSizeChanger: true,
          size: "default",
        }}
        loading={isDataLoading}
        rowKey="id"
        size="small"
        expandable={{
          expandedRowRender,
          expandRowByClick: true,
        }}
      >
        <Table.Column dataIndex="id" title="ID" onCell={cellTestId((i) => `row-id-${i}`)} />
        <Table.Column dataIndex="name" title="姓名" onCell={cellTestId((i) => `row-name-${i}`)} />
      </Table>
    </LList>
  );
}
