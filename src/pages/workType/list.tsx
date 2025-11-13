import { BaseRecord } from "@refinedev/core";
import {
  useTable,
  List,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space } from "antd";

export const ListWorkType = () => {
  const { tableProps } = useTable({
  });
  return (
    <List headerButtons={<CreateButton>添加工作</CreateButton>}>
      <Table {...tableProps} rowKey="id">
        {/* <Table.Column
                    dataIndex="collectionName"
                    title="Collection Name"
                /> */}
        {/* <Table.Column
                    dataIndex={["created"]}
                    title="Created"
                    render={(value: any) => <DateField value={value} />}
                /> */}
        <Table.Column dataIndex="id" title="Id" />
        <Table.Column dataIndex="name" title="名字" />
        {/* <Table.Column
                    dataIndex={["updated"]}
                    title="Updated"
                    render={(value: any) => <DateField value={value} />}
                /> */}
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton
                hideText
                size="small"
                recordItemId={record.id}
                disabled={record.name === "基础"}
              />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
              <DeleteButton
                disabled={record.name === "基础"}
                hideText
                size="small"
                recordItemId={record.id}
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
