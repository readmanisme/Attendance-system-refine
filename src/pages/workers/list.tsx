import { useCallback, useMemo } from "react";
import PySearchSelect from "@/components/PySearchSelect";
import { DeleteButton, EditButton, List, useTable, CreateButton } from "@refinedev/antd";
import { useList, type BaseRecord } from "@refinedev/core";
import { Alert, Space, Table } from "antd";

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
  const WorkerRecordNum = useMemo(
    () => new Map(result.data.map((item: any) => [item.worker_id, item.record_count])),
    [result.data]
  );
  // ✅ 用 useCallback 避免函数每次渲染重建，减少子组件重渲染
  const handleChange = useCallback(
    (values: Array<{ value: string; label: string }> | null) => {
      const filters = values?.length
        ? [
            {
              operator: "or",
              value: values.map((r) => ({
                field: "id",
                operator: "eq",
                value: r.value,
              })),
            },
          ]
        : [];
      // @ts-expect-error，111
      setFilters(filters);
      setCurrentPage(1);
    },
    [setFilters, setCurrentPage]
  );

  // ✅ Table 列定义用 useMemo，避免每次 render 都新建列对象
  const columns = useMemo(
    () => [
      {
        dataIndex: "id",
        title: "ID",
        onCell: (record: any, rowIndex: any) => ({ "data-testid": `row-id-${rowIndex}` }),
      },
      {
        dataIndex: "name",
        title: "姓名",
        onCell: (record: any, rowIndex: any) => ({ "data-testid": `row-name-${rowIndex}` }),
      },
      {
        dataIndex: "num",
        title: "考勤记录数",
        onCell: (record: any, rowIndex: any) => ({ "data-testid": `row-num-${rowIndex}` }),
        render: (text: any, record: any) => WorkerRecordNum.get(record.id),
      },
      {
        title: "操作",
        dataIndex: "actions",
        render: (value: any, record: BaseRecord,index: number) => (
          <Space>
            <EditButton size="small" recordItemId={record.id} data-testid={`edit-button-${index}`}>
              编辑
            </EditButton>
            <DeleteButton
              data-testid={`delete-button-${index}`}
              type={WorkerRecordNum.get(record.id) > 0 ? "link" : "dashed"}
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
    ],
    [WorkerRecordNum]
  );

  return (
    <List headerButtons={<CreateButton data-testid="create-button">添加人员</CreateButton>}>
      <Alert
        data-testid="delete-alert"
        className="mb-2!"
        message="删除人员将一并删除与之相关的考勤记录和薪资计算方式"
        type="warning"
        showIcon
      />
      <PySearchSelect
        // @ts-expect-error，111
        onChangeFn={handleChange}
        placeholder="多选工人，支持拼音"
        mode="multiple"
        onClearFn={() => handleChange(null)}
        needButton
      />

      <Table
        data-testid="table"
        {...tableProps}
        rowKey="id"
        // @ts-expect-error，111
        columns={columns}
        className="mt-2"
        pagination={{ ...tableProps.pagination, showSizeChanger: true }}
        // onRow={(record, index) => {
        //   return { "data-testid": `row-${index}` }; // 确保返回这个对象
        // }}
      />
    </List>
  );
};

export default WorkersList;
