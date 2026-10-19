import { BaseRecord, useCreate, useList } from "@refinedev/core";
import { useTable, List, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Button, Space, Result } from "antd";
import { useState } from "react";
import { useInvalidate } from "@refinedev/core";
import { cellTestId } from "@/utils/tableHelpers";
import { BASE_WORK_TYPE_NAME } from "@/constants";
import { DataTable } from "@/components/ui/DataTable";

const ListWorkType = () => {
  const invalidate = useInvalidate();

  const { tableProps } = useTable({
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
    pagination: { mode: "off" },
  });

  const { mutate: mutate2 } = useCreate({
    resource: __SalaryType_TableName,
  });
  const { mutate } = useCreate({
    resource: __WorkTypes_TableName,
  });

  // 基础工作置顶：用 findLastIndex 因为基础在后面的可能性更大
  const dataSource = [...(tableProps?.dataSource || [])];
  const baseIndex = dataSource.findLastIndex((item) => item.name === BASE_WORK_TYPE_NAME);
  if (baseIndex > 0) {
    const [item] = dataSource.splice(baseIndex, 1);
    dataSource.unshift(item);
  }

  // 乐观警告显示不能通过提前设置 true 来解决，因为马上会被覆盖
  const HaveBaseWork =
    tableProps.dataSource?.some((item: any) => item.name == BASE_WORK_TYPE_NAME) ?? true;
  const { result } = useList({ resource: __WorkRecordNum_TableName, pagination: { mode: "off" } });
  const WorkRecordNum = new Map(result.data.map((item: any) => [item.work_id, item.record_count]));

  // 添加基础工作期间禁用按钮，防止双击重复提交
  const [addingBase, setAddingBase] = useState(false);
  const handleAddBaseWork = () => {
    if (addingBase) return;
    setAddingBase(true);
    mutate(
      {
        values: {
          id: "basebasebasebas", // 必须刚好 15 位
          name: BASE_WORK_TYPE_NAME,
        },
      },
      {
        // onSuccess 必须放在 mutate 里面而不是 useCreate 的里面，后者会导致 refine 默认行为被覆盖
        onSuccess: () => {
          // 如果把 mutate2 和 mutate 放在一起，异步会导致顺序错乱从而创建失败
          mutate2({
            values: {
              id: "basebasebaseba1",
              work_type: "basebasebasebas",
              SalaryNum: 10,
            },
          });
          invalidate({
            // 需要手动刷新数据
            resource: __WorkRecordNum_TableName,
            invalidates: ["list"],
          });
        },
        onError: () => setAddingBase(false),
        onSettled: () => setAddingBase(false),
      },
    );
  };

  if (!HaveBaseWork) {
    return (
      <List
        breadcrumb={false}
        headerProps={{ subTitle: "工作类型用于区分不同工种的时薪" }}
        headerButtons={<CreateButton data-testid="create-button">添加工作</CreateButton>}
      >
        <Result
          status="warning"
          title="缺少基础工作，点击下方按钮添加基础工作及其时薪（时薪后续可修改）"
          extra={
            <Button
              data-testid="add-base-work-button"
              type="primary"
              loading={addingBase}
              onClick={handleAddBaseWork}
            >
              添加 “基础” 工作及其时薪
            </Button>
          }
        />
      </List>
    );
  }

  return (
    <List
      breadcrumb={false}
      headerProps={{ subTitle: "维护工作类型；删除工作会一并清理相关考勤记录与薪资设置" }}
      headerButtons={<CreateButton data-testid="create-button">添加工作</CreateButton>}
    >
      {/* 原两个大块 Alert 合并为一行小字，testid 分别保留 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 16px",
          marginBottom: 10,
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        <span data-testid="Base-alert">基础工作类型一经创建便不可编辑和删除</span>
        <span data-testid="delete-alert">删除工作将一并删除与之相关的考勤记录和薪资计算方式</span>
      </div>

      <DataTable {...tableProps} dataSource={dataSource} rowKey="id">
        <DataTable.Column
          dataIndex="id"
          title="ID"
          width={130}
          ellipsis
          onCell={cellTestId((i) => `row-id-${i}`)}
        />
        <DataTable.Column dataIndex="name" title="名字" onCell={cellTestId((i) => `row-name-${i}`)} />
        <DataTable.Column
          dataIndex="num"
          title="考勤记录数"
          className="num"
          width={120}
          render={(_text: any, record: any) => WorkRecordNum.get(record.id)}
          onCell={cellTestId((i) => `row-num-${i}`)}
        />
        <DataTable.Column
          title="操作"
          dataIndex="actions"
          width={120}
          render={(_value, record: BaseRecord, index: number) => (
            <Space>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
                disabled={record.name === BASE_WORK_TYPE_NAME}
              />
              <DeleteButton
                data-testid={`delete-button-${index}`}
                disabled={record.name === BASE_WORK_TYPE_NAME}
                type="text"
                confirmTitle={
                  WorkRecordNum.get(record.id) > 0
                    ? "删除工作将一并删除相关考勤记录！"
                    : "确定删除吗？"
                }
                size="small"
                recordItemId={record.id}
              />
            </Space>
          )}
        />
      </DataTable>
    </List>
  );
};

export default ListWorkType;
