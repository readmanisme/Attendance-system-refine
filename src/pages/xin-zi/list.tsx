import React from "react";
import { BaseRecord } from "@refinedev/core";
import {
  useTable,
  List,
  DateField,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Button, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";

export const SalaryTypeList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // 重新排序，让["expand", "work_type", "name"]为“基础”的排在第一行
  tableProps?.dataSource?.sort((a, b) => {
    if (
      a.expand?.work_type?.name === "基础" &&
      b.expand?.work_type?.name!== "基础"
    ) {
      return -1;
    }
    if (
      b.expand?.work_type?.name === "基础" &&
      a.expand?.work_type?.name!== "基础"
    ) {
      return 1;
    }
    return 0;
  });
  return (
    <List headerButtons={<CreateButton>添加记录</CreateButton>}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column
          dataIndex={["expand", "worker_name", "name"]}
          title="工人"
        />
        <Table.Column
          dataIndex={["expand", "work_type", "name"]}
          title="工作"
        />
        <Table.Column dataIndex="SalaryNum" title="时薪" />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton
                disabled={record.expand?.work_type?.name === "基础"}
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
