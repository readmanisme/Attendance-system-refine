import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
  DateField,
} from "@refinedev/antd";
import { useList, type BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";

export const AttendanceRecordList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  const {
    data: names,
    isLoading,
    isError,
  } = useList({
    resource: "workers_test",
    pagination: {
      mode: "off",
      // 此处只能是off,client无法获取全部内容
    },
  });
  // 从names中取出id和name，构建字典
  const nameDict = {};
  if (names) {
    names.data.map((item) => {
      if (item.id && item.name) {
      }
      nameDict[item.id] = item.name;
    });
  }
  // console.log("names", names);

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title={"ID"} />
        {/* <Table.Column dataIndex="worker_id" title={"人员ID"} /> */}
        <Table.Column
          dataIndex="worker_id"
          title={"人员姓名"}
          render={(_, record: BaseRecord) => {
            return <div>{nameDict[record.worker_id]}</div>;
          }}
        />
        <Table.Column
          dataIndex="check_in"
          title={"上班时间"}
          // DateField只显示到日期
          // slice(0,-5)去掉.000Z
          render={(_, record: BaseRecord) => {
            return <>{record.check_in.slice(0,-5)}</>;
          }}
        />
        <Table.Column
          dataIndex="check_out"
          title={"下班时间"}
          render={(_, record: BaseRecord) => {
            return <>{record.check_out.slice(0,-5)}</>;
          }}
        />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
