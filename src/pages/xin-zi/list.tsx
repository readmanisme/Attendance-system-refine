import { BaseRecord } from "@refinedev/core";
import {
  useTable,
  List,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Alert } from "antd";
import { useMemo } from "react";

 const SalaryTypeList = () => {
  const { tableProps } = useTable({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // 重新排序，让["expand", "work_type", "name"]为“基础”的排在第一行
  const sortedDataSource = useMemo(() => {
    return [...(tableProps?.dataSource || [])].sort((a, b) => {
      if (a.expand?.work_type?.name === "基础" && b.expand?.work_type?.name !== "基础") {
        return -1;
      }
      if (b.expand?.work_type?.name === "基础" && a.expand?.work_type?.name !== "基础") {
        return 1;
      }
      return 0;
    });
  }, [tableProps?.dataSource]); // 依赖项：仅当 dataSource 变化时重新计算

  return (
    <List headerButtons={<CreateButton>添加记录</CreateButton>}>
      <Alert className="mb-2!" message="没有设置薪资的工作会按照基础工作的时薪计算" type="info" showIcon/>
      <Table {...tableProps} dataSource={sortedDataSource} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex={["expand", "worker_name", "name"]} title="工人" />
        <Table.Column dataIndex={["expand", "work_type", "name"]} title="工作" />
        <Table.Column dataIndex="SalaryNum" title="时薪" />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton
                hideText
                size="small"
                recordItemId={record.id}
                // disabled={record.expand?.work_type?.name === "基础"}
              />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
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
export default SalaryTypeList;