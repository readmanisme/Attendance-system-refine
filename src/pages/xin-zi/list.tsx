import { BaseRecord, useList } from "@refinedev/core";
import { useTable, List, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Space } from "antd";
import { cellTestId } from "@/utils/tableHelpers";
import { BASE_WORK_TYPE_NAME } from "@/constants";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

const SalaryTypeList = () => {
  const { tableProps } = useTable({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const { result } = useList({
    resource: __WorkTypes_TableName,
    pagination: { mode: "off" },
  });

  const workTypes = result.data.map((item: any) => item.name);
  const salaryWorkTypes =
    tableProps.dataSource
      ?.filter((item) => item.worker_name === "")
      .map((item: any) => item.expand?.work_type?.name) || [];
  const unSalaryWorkTypes = workTypes.filter((item) => !salaryWorkTypes.includes(item));
  const unSalaryText = unSalaryWorkTypes.length
    ? `未设置工资的工作类型：${unSalaryWorkTypes.join(",")}，请设置其对应的工资，否则按照基础工资计算。`
    : "";

  // 基础（全局）时薪置顶：用 findLastIndex 因为基础在后面的可能性更大
  const dataSource = [...(tableProps?.dataSource || [])];
  const baseIndex = dataSource.findLastIndex(
    (item) => item.expand?.work_type?.name === BASE_WORK_TYPE_NAME && !item.worker_name,
  );
  if (baseIndex > 0) {
    const [item] = dataSource.splice(baseIndex, 1);
    dataSource.unshift(item);
  }

  return (
    <List
      breadcrumb={false}
      headerProps={{ subTitle: "设置不同人员 / 工种的时薪；未单独设置的按基础时薪计算" }}
      headerButtons={<CreateButton data-testid="create-button">添加记录</CreateButton>}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 16px",
          marginBottom: 10,
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        <span data-testid="alert">没有设置薪资的工作会按照基础工作的时薪计算</span>
        {unSalaryText !== "" && (
          <span data-testid="un-salary-work-alert" style={{ color: "var(--warning)" }}>
            {unSalaryText}
          </span>
        )}
      </div>

      <DataTable
        {...tableProps}
        dataSource={dataSource}
        rowKey="id"
        tableLayout="fixed"
        locale={{
          emptyText: (
            <EmptyState compact title="还没有薪资设置" description="点右上角「添加记录」设置时薪" />
          ),
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
          dataIndex={["expand", "worker_name", "name"]}
          title="工人"
          render={(value: string) =>
            value || (
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>全部人员（默认）</span>
            )
          }
          onCell={cellTestId((i) => `row-worker-${i}`)}
        />
        <DataTable.Column
          dataIndex={["expand", "work_type", "name"]}
          title="工作"
          width={200}
          onCell={cellTestId((i) => `row-work-${i}`)}
        />
        <DataTable.Column
          dataIndex="SalaryNum"
          title="时薪(元/时)"
          className="num"
          width={120}
          onCell={cellTestId((i) => `row-salary-${i}`)}
        />
        <DataTable.Column
          title="操作"
          dataIndex="actions"
          width={110}
          align="right"
          render={(_value, record: BaseRecord, index: number) => (
            <Space>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
              />
              <DeleteButton
                data-testid={`delete-button-${index}`}
                className="danger-hover"
                type="text"
                disabled={
                  record.expand?.work_type?.name === BASE_WORK_TYPE_NAME && record.worker_name === ""
                }
                hideText
                size="small"
                recordItemId={record.id}
              />
            </Space>
          )}
        />
      </DataTable>
    </List>
  );
};

export default SalaryTypeList;
