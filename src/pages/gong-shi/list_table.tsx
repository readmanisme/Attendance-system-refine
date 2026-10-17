import { List as LList, useTable } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Space, Table } from "antd";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useState, type Key } from "react";
import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import { buildSalaryDict } from "@/utils/salary";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { BASE_WORK_TYPE_NAME } from "@/constants";
import { WorkerExpandTables } from "./ExpandTables";
import { ExportPopover } from "./ExportPopover";

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

  const workerMap = useMemo(() => {
    const m = new Map<string, string>();
    workerData.dataSource?.forEach((w: any) => {
      if (w?.id !== undefined) m.set(w.id, w.name);
    });
    return m;
  }, [workerData.dataSource]);

  const selectedIds = useMemo(() => SelectedPerson.map((p) => p.value), [SelectedPerson]);

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
  // 真 loading：render 期间直接派生，避免 useState+useEffect。
  // (考勤记录已下沉到展开行按需查询,不再参与页面级 loading)
  const isDataLoading = !!workerData.loading || query.isLoading || querySalary.isLoading;

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

  const get_un_salary_work = useMemo(() => {
    const work_types = [...workTypeMap.values()];
    const un_salary_work_types = work_types.filter((item) => !(item in salaryDict));
    // 这里的判断很精准，不会混淆没人的工作和有人的工作
    if (!un_salary_work_types.length) return "";
    return `未设置工资的工作类型：${un_salary_work_types.join(
      ",",
    )}，请设置其对应的工资,否则按照基础工资计算。`;
  }, [workTypeMap, salaryDict]);

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
          expandedRowKeys,
          onExpandedRowsChange: (keys: readonly Key[]) => setExpandedRowKeys([...keys]),
          expandRowByClick: true,
        }}
      >
        <Table.Column dataIndex="id" title="ID" onCell={cellTestId((i) => `row-id-${i}`)} />
        <Table.Column dataIndex="name" title="姓名" onCell={cellTestId((i) => `row-name-${i}`)} />
      </Table>
    </LList>
  );
}
