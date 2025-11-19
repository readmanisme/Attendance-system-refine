import { BaseRecord, useCreate, useList } from "@refinedev/core";
import {
  useTable,
  List,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Alert, Button, Result } from "antd";
import { useMemo } from "react";

const ListWorkType = () => {
  const { tableProps } = useTable({
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
    pagination: { mode: "off" },
  });
  const { mutate } = useCreate({
    resource: __WorkTypes_TableName,
  });
  const { mutate: mutate2 } = useCreate({
    resource: __SalaryType_TableName,
  });

  const sortedDataSource = useMemo(() => {
    const dataSource = [...(tableProps?.dataSource || [])];
    // 找到符合条件的项的索引
    const index = dataSource.findLastIndex(
      (item) => item.name === "基础"
    );
    // 这里用findLastIndex而不是findIndex，因为基础在后面的可能性很大

    if (index > 0) {
      // 如果找到了且不在第一位，则将其移动到数组开头
      const [item] = dataSource.splice(index, 1);
      dataSource.unshift(item);
    }

    return dataSource;
  }, [tableProps.dataSource]);
  // 乐观警告显示不能通过提前设置true来解决，因为马上会被覆盖。
  const HaveBaseWork = tableProps.dataSource?.some((item: any) => item.name == "基础") ?? true;
  const { result } = useList({ resource: __WorkRecordNum_TableName, pagination: { mode: "off" } });
  const WorkRecordNum = new Map(result.data.map((item: any) => [item.work_id, item.record_count]));
  if (!HaveBaseWork) {
    return (
      <List headerButtons={<CreateButton data-testid="create-button">添加工作</CreateButton>}>
        <Result
          data-testid="no-Base-result"
          status="warning"
          title="缺少基础工作，点击下方按钮添加基础工作及其时薪（时薪后续可修改）"
          extra={
            <Button
              data-testid="add-base-work-button"
              type="primary"
              onClick={() => {
                mutate({
                  values: {
                    id: "basebasebase",
                    name: "基础",
                  },
                });
                mutate({
                  values: {
                    id: "basebasebase1",
                    work_type: "basebasebase",
                    SalaryNum: 10,
                  },
                });
              }}
            >
              添加 “基础” 工作及其时薪
            </Button>
          }
        />
      </List>
    );
  }
  return (
    <List headerButtons={<CreateButton data-testid="create-button">添加工作</CreateButton>}>
      <Alert
        data-testid="Base-alert"
        className="mb-2!"
        message="基础工作类型一经创建便不可编辑和删除"
        type="info"
        showIcon
      />
      <Alert
        data-testid="delete-alert"
        className="mb-2!"
        message="删除工作将一并删除与之相关的考勤记录和薪资计算方式"
        type="warning"
        showIcon
      />

      <Table {...tableProps} dataSource={sortedDataSource} rowKey="id">
        {/* <Table.Column
                    dataIndex="collectionName"
                    title="Collection Name"
                /> */}
        {/* <Table.Column
                    dataIndex={["created"]}
                    title="Created"
                    render={(value: any) => <DateField value={value} />}
                /> */}
        <Table.Column
          dataIndex="id"
          title="Id"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-id-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="name"
          title="名字"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-name-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="num"
          title="考勤记录数"
          render={(text: any, record: any) => WorkRecordNum.get(record.id)}
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-num-${rowIndex}` })}
        />
        {/* <Table.Column
                    dataIndex={["updated"]}
                    title="Updated"
                    render={(value: any) => <DateField value={value} />}
                /> */}
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(value, record: BaseRecord, index: number) => (
            <Space>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
                disabled={record.name === "基础"}
              />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}

              <DeleteButton
                data-testid={`delete-button-${index}`}
                disabled={record.name === "基础"}
                type={WorkRecordNum.get(record.id) > 0 ? "link" : "dashed"}
                confirmTitle={
                  WorkRecordNum.get(record.id) > 0
                    ? "删除工作将一并删除相关考勤记录！"
                    : "确定删除吗？"
                }
                size="small"
                recordItemId={record.id}
              ></DeleteButton>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
export default ListWorkType;
