import { useCallback, useMemo } from "react";
import PySearchSelect from "@/components/PySearchSelect";
import {
  DeleteButton,
  EditButton,
  List,
  useTable,
  CreateButton,
} from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";

export const WorkersList = () => {
  const { tableProps, setFilters, setCurrentPage } = useTable({
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
    filters: { defaultBehavior: "replace" },
  });

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
      { dataIndex: "id", title: "ID" },
      { dataIndex: "name", title: "姓名" },
      {
        title: "操作",
        dataIndex: "actions",
        render: (_: any, record: BaseRecord) => (
          <Space>
            <EditButton size="small" recordItemId={record.id}>
              编辑
            </EditButton>
            <DeleteButton size="small" recordItemId={record.id}>
              删除
            </DeleteButton>
          </Space>
        ),
      },
    ],
    []
  );

  return (
    <List headerButtons={<CreateButton>添加人员</CreateButton>}>
      <PySearchSelect
      // @ts-expect-error，111
        onChangeFn={handleChange}
        placeholder="多选工人，支持拼音"
        mode="multiple"
        onClearFn={() => handleChange(null)}
        needButton
      />

      <Table
        {...tableProps}
        rowKey="id"
        columns={columns}
        className="mt-2"
        pagination={tableProps.pagination}
      />
    </List>
  );
};
