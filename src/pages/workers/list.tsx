import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
  CreateButton,
  SaveButton,
  useSelect,
} from "@refinedev/antd";
import _ from "lodash";
import type { BaseRecord, CrudFilter, CrudFilters } from "@refinedev/core";
import { Form, Input, Select, Space, Table } from "antd";

export const WorkersList = () => {
  const get_filter = (values: any) => {
    // console.log(values)
    let names = values.name;
    if (!_.isArray(names)) {
      names = [names];
    }
    return [
      {
        operator: "or",
        value: names.map((name: string) => ({
          field: "id",
          operator: "eq",
          value: name,
        })),
      },
    ];
  };
  const { tableProps, searchFormProps } = useTable({
    syncWithLocation: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSearch: (values: any) => {
      // console.log(get_filter(values))
      return get_filter(values) as CrudFilters;
      // return get_filter(values) as any;
    },
  });
  const { selectProps: workerSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
    optionValue: "id",
  });
  return (
    <List headerButtons={<CreateButton>添加人员</CreateButton>}>
      <Form {...searchFormProps} layout="inline" className="mb-2">
        <Form.Item name="name" label="搜索人名">
          <Select
            className="min-w-52"
            mode="multiple"
            {...workerSelectProps}
            allowClear
            placeholder="不支持拼音"
            onClear={() => {
              searchFormProps.form?.submit();
            }}
          />
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
