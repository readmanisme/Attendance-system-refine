import { BaseRecord, useList } from "@refinedev/core";
import {
  useTable,
  List,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import { Table, Space, Alert } from "antd";

const ListWorkType = () => {
  const { tableProps } = useTable({
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
  });
  const { result } = useList({ resource: __WorkRecordNum_TableName, pagination: { mode: "off" } });
  const WorkRecordNum = new Map(result.data.map((item: any) => [item.work_id, item.record_count]));
  return (
    <List headerButtons={<CreateButton data-testid="create-button">添加工作</CreateButton>}>
      <Alert
        className="mb-2!"
        message="基础工作类型一经创建便不可编辑和删除"
        type="info"
        showIcon
      />
      <Alert
        className="mb-2!"
        message="删除工作将一并删除与之相关的考勤记录和薪资计算方式"
        type="warning"
        showIcon
      />

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
        <Table.Column
          dataIndex="id"
          title="Id"
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-id-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="name"
          title="名字"
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-name-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="num"
          title="考勤记录数"
          render={(text: any, record: any) => WorkRecordNum.get(record.id)}
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
