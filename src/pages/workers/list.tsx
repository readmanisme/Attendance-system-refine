import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
  CreateButton,
  SaveButton,
} from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Form, Input, Space, Table  } from "antd";

export const WorkersList = () => {
  const { tableProps, searchFormProps } = useTable({
    syncWithLocation: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSearch: (values:any) => {
      return [
        {
          field: "name",
          operator: "contains",
          value: values.name,
        },
      ];
    },
  });

  return (
    <List headerButtons={<CreateButton>添加人员</CreateButton>}>
      <Form {...searchFormProps} layout="inline" className="mb-2">
        <Form.Item name="name" label="搜索人名">
          <Input allowClear placeholder="不支持拼音" />
        </Form.Item>
        <SaveButton onClick={searchFormProps.form?.submit}>搜索</SaveButton>
      </Form>
      <Table
        {...tableProps}
        rowKey="id"
        // pagination={{
        //   ...tableProps.pagination,
        //   position: ["bottomCenter"],
        //   size: "small",
        // }}
      >
        <Table.Column dataIndex="id" title={"ID"} />
        <Table.Column dataIndex="name" title={"姓名"} />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton size="small" recordItemId={record.id}>
                编辑
              </EditButton>
              <ShowButton size="small" recordItemId={record.id}>
                查看
              </ShowButton>
              <DeleteButton size="small" recordItemId={record.id}>
                删除
              </DeleteButton>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
