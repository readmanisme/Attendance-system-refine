import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
  CreateButton,} from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";

export const WorkersList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  return (
    <List
    headerButtons={<CreateButton>添加人员</CreateButton>}
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title={"ID"} />
        <Table.Column dataIndex="name" title={"姓名"} />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton  size="small" recordItemId={record.id} >编辑</EditButton>
              <ShowButton  size="small" recordItemId={record.id} >查看</ShowButton>
              <DeleteButton  size="small" recordItemId={record.id} >删除</DeleteButton>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
