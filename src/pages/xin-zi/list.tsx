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
  const [helpOpen, setHelpOpen] = React.useState(false);
  return (
    <List
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button type="primary" onClick={() => setHelpOpen(true)}>
            查看帮助
          </Button>
          <Drawer
            title="帮助"
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
          >
            <Paragraph>
              1、此处可设置不同人员或不同工作的时薪，也就是人员和工作只能同时填写一个。
            </Paragraph>
            <Paragraph>2、暂不支持同时设置人员与工作的时薪。</Paragraph>
            <Paragraph>
              3、“基础”工作为系统内置，不可删除，其用于计算未设置具体时薪的情况下的薪资。
            </Paragraph>
          </Drawer>
        </>
      )}
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
