import React from "react";
import { BaseRecord } from "@refinedev/core";
import { useTable, List, DateField, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Button, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";

export const SalaryTypeTestList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    resource: "SalaryType_test",
    meta:{
        expand:["work_name","work_type"]
    }
  });
  return (
    <List


    >
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex={["expand", "work_name", "name"]} title="工人" />
        <Table.Column dataIndex={["expand", "work_type", "name"]} title="工作" />
        <Table.Column dataIndex="SalaryNum" title="时薪" />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id}
              
              />
              <DeleteButton
              disabled={record.expand?.work_type?.name === "基础"}
              hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
