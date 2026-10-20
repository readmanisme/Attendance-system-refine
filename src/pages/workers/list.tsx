import PySearchSelect from "@/components/PySearchSelect";
import { DeleteButton, EditButton, List, useTable, CreateButton } from "@refinedev/antd";
import { useList, type BaseRecord, type CrudFilter } from "@refinedev/core";
import { Space } from "antd";
import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

type SearchValue = { value: string; label: string };

const WorkersList = () => {
  const { tableProps, setFilters, setCurrentPage } = useTable({
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
    filters: { defaultBehavior: "replace" },
  });
  const { result } = useList({
    resource: __WorkerRecordNum_TableName,
    pagination: { mode: "off" },
  });
  const WorkerRecordNum = new Map(result.data.map((item: any) => [item.worker_id, item.record_count]));

  const handleChange = (values: SearchValue | Array<{ value: string; label: string }> | null) => {
    const optionValues = (Array.isArray(values) ? values : values ? [values] : []).map(
      (r) => r.value,
    );
    setFilters(buildEqOrFilter("id", optionValues) as CrudFilter[]);
    setCurrentPage(1);
  };

  const columns = [
    {
      dataIndex: "id",
      title: "ID",
      // ID 对个人使用没有意义，压窄 + 灰字，别让它抢走第一眼的注意力
      width: 96,
      className: "id-col",
      ellipsis: true,
      onCell: cellTestId((i) => `row-id-${i}`),
    },
    {
      dataIndex: "name",
      title: "姓名",
      // 不设宽度：吸收剩余空间，避免 ID 列被等比撑宽
      onCell: cellTestId((i) => `row-name-${i}`),
    },
    {
      dataIndex: "num",
      title: "考勤记录数",
      className: "num",
      width: 130,
      onCell: cellTestId((i) => `row-num-${i}`),
      render: (_text: any, record: any) => WorkerRecordNum.get(record.id),
    },
    {
      title: "操作",
      dataIndex: "actions",
      width: 110,
      align: "right" as const,
      render: (_value: any, record: BaseRecord, index: number) => (
        <Space>
          <EditButton size="small" recordItemId={record.id} data-testid={`edit-button-${index}`}>
            编辑
          </EditButton>
          <DeleteButton
            data-testid={`delete-button-${index}`}
            className="danger-hover"
            type="text"
            confirmTitle={
              WorkerRecordNum.get(record.id) > 0
                ? "删除此人将一并删除相关考勤记录！"
                : "确定删除吗？"
            }
            size="small"
            recordItemId={record.id}
          >
            删除
          </DeleteButton>
        </Space>
      ),
    },
  ];

  return (
    <List
      breadcrumb={false}
      headerProps={{ subTitle: "维护工人名单；删除人员会一并清理其考勤记录与薪资设置" }}
      headerButtons={<CreateButton data-testid="create-button">添加人员</CreateButton>}
    >
      {/* 原大块 Alert 压成一行小字，保留 testid */}
      <div
        data-testid="delete-alert"
        style={{ marginBottom: 10, fontSize: 12, color: "var(--text-tertiary)" }}
      >
        删除人员将一并删除与之相关的考勤记录和薪资计算方式
      </div>

      <FilterBar
        left={
          <PySearchSelect
            onChangeFn={handleChange}
            placeholder="多选工人，支持拼音"
            mode="multiple"
            onClearFn={() => handleChange(null)}
            needButton
          />
        }
      />

      <DataTable
        data-testid="table"
        {...tableProps}
        rowKey="id"
        columns={columns}
        tableLayout="fixed"
        locale={{
          emptyText: (
            <EmptyState compact title="还没有人员" description="点右上角「添加人员」开始记工" />
          ),
        }}
        pagination={{ ...tableProps.pagination, showSizeChanger: true }}
      />
    </List>
  );
};

export default WorkersList;
