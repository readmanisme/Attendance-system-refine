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
import { useMemo } from "react";

const SalaryTypeList = () => {
  const { tableProps } = useTable({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const { result, query } = useList({
    resource: __WorkTypes_TableName,
    pagination: { mode: "off" },
  });
  const get_un_salary_work = useMemo(() => {
    const work_types = result.data.map((item: any) => item.name);
    const salary_work_types= tableProps.dataSource?.filter(item => item.worker_name === "").
    map((item: any) => item.expand?.work_type?.name) || [];
    const un_salary_work_types = work_types.filter((item) => !salary_work_types.includes(item));
    if (!un_salary_work_types.length) return "";
    return `未设置工资的工作类型：${un_salary_work_types.join(
      ","
    )}，请设置其对应的工资,否则按照基础工资计算。`;
  }, [result.data, tableProps.dataSource]);

  // 让["expand", "work_type", "name"]为“基础”的并且worker_name为空的放在第一行
  // 不通过排序的方法
  const sortedDataSource = useMemo(() => {
    const dataSource = [...(tableProps?.dataSource || [])];
    // 找到符合条件的项的索引
    const index = dataSource.findLastIndex(
      (item) => item.expand?.work_type?.name === "基础" && !item.worker_name
    );
    // 这里用findLastIndex而不是findIndex，因为基础在后面的可能性很大

    if (index > 0) {
      // 如果找到了且不在第一位，则将其移动到数组开头
      const [item] = dataSource.splice(index, 1);
      dataSource.unshift(item);
    }

    return dataSource;
  }, [tableProps.dataSource]);

  return (
    <List headerButtons={<CreateButton data-testid="create-button">添加记录</CreateButton>}>
      <Alert
        data-testid="alert"
        className="mb-2!"
        message="没有设置薪资的工作会按照基础工作的时薪计算"
        type="info"
        showIcon
      />
      {get_un_salary_work !== "" && (
        <Alert
          data-testid="un-salary-work-alert"
          message={get_un_salary_work}
          type="warning"
          showIcon
          className="mb-2! mr-2! w-full"
        />
      )}
      <Table {...tableProps} dataSource={sortedDataSource} rowKey="id">
        <Table.Column
          dataIndex="id"
          title="ID"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-id-${rowIndex}` })}
        />
        <Table.Column
          dataIndex={["expand", "worker_name", "name"]}
          title="工人"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-worker-${rowIndex}` })}
        />
        <Table.Column
          dataIndex={["expand", "work_type", "name"]}
          title="工作"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-work-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="SalaryNum"
          title="时薪"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-salary-${rowIndex}` })}
        />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord, index) => (
            <Space>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
                // disabled={record.expand?.work_type?.name === "基础"}
              />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
              <DeleteButton
                data-testid={`delete-button-${index}`}
                disabled={record.expand?.work_type?.name === "基础" && record.worker_name === ""}
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
