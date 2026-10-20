import dayjs, { Dayjs } from "dayjs";
import { Table, Button, Form, Select, Popconfirm, Flex, Card } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  DeleteButton,
  EditButton,
  List,
  SaveButton,
  TextField,
  useEditableTable,
  useSelect,
} from "@refinedev/antd";
import { BaseRecord, useDeleteMany } from "@refinedev/core";
import { useState } from "react";
import { formatHoursExact } from "@/utils/workTime";
import WorkMinutesInput from "@/components/WorkMinutesInput";
import PySearchSelect from "@/components/PySearchSelect";
import { cellTestId, buildEqOrFilter } from "@/utils/tableHelpers";
import { useBatchRowSelection } from "../useBatchRowSelection";
import { EmptyState } from "@/components/ui/EmptyState";
import { BatchEntryPanel } from "./BatchEntryPanel";
import { DayStatsBar } from "./DayStatsBar";
import { useBatchEntry } from "./useBatchEntry";

export default function QianDaoPage() {
  // ======================== 所选日期(状态在页面:记录表和批量录入都用) ========================
  const [checkDate, setCheckDate] = useState<Dayjs>(dayjs().minute(0).second(0).millisecond(0));

  // 工作选择器:录入面板和表格编辑行共用
  const { selectProps: workTypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  // ======================== 当天记录表 ========================
  const {
    tableProps,
    formProps,
    setFilters,
    isEditing,
    saveButtonProps,
    cancelButtonProps,
    editButtonProps,
  } = useEditableTable({
    resource: __AttendanceRecord_TableName,
    pagination: {
      mode: "off",
    },
    sorters: {
      permanent: [{ field: "created", order: "desc" }],
    },
    filters: {
      permanent: [
        {
          field: "work_date",
          operator: "eq",
          value: checkDate.format("YYYY-MM-DD"),
        },
      ],
    },
    meta: {
      expand: ["work", "worker_id"],
    },
  });

  // 批量录入(传入当天记录,用于"同键合并"的判断与提示)
  const batch = useBatchEntry({
    checkDate,
    setCheckDate,
    existingRecords: tableProps.dataSource,
  });

  // 批量删除:等删除成功再清空选择,失败保留选中便于重试
  const selection = useBatchRowSelection();
  const { mutateAsync: deleteManyAsync } = useDeleteMany();
  const { selectedRowKeys, clearSelection } = selection;
  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await deleteManyAsync({
        resource: __AttendanceRecord_TableName,
        ids: selectedRowKeys as number[],
      });
      clearSelection();
    } catch {
      // 删除失败:refine 已弹出错误通知,保留选中让用户直接重试
    }
  };

  // 表格内编辑行的工时组件 value 就是整数分钟,直接写 work_minutes
  const handleOnFinish = (values: any) => {
    const rest: any = { ...values };
    if (rest.workTime != null) {
      rest.work_minutes = rest.workTime;
    }
    delete rest.workTime;
    if (formProps.onFinish) {
      formProps.onFinish(rest);
    }
  };

  // ======================== UI ========================
  return (
    <List
      title="工时录入系统"
      breadcrumb={false}
      headerProps={{ subTitle: "选择人员、日期、工种与工时，一次录入多人" }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        {/* 左：录入 + 当天汇总 */}
        <div style={{ width: 420, flex: "none" }}>
          <BatchEntryPanel batch={batch} workTypeSelectProps={workTypeSelectProps} />
        </div>

        {/* 右：当天记录 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card
            size="small"
            style={{ height: "100%" }}
            title="当天记录"
            extra={
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {checkDate.format("YYYY-MM-DD")}
              </span>
            }
          >
            {/* 说明压成一行小字：保留 testid 供 E2E 断言，但不再用大块 Alert 占据首屏 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 16px",
                marginBottom: 12,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              <span data-testid="edit-alert">同人同日同工种自动合并为总工时</span>
              <span data-testid="search-alert">可用搜索筛选人员，快速确认某人当天是否已记录</span>
            </div>

            {/* 当天汇总：和记录表放一起，"记了多少、还差谁"一眼能对上 */}
            <DayStatsBar checkDate={checkDate} />

            <Flex justify="space-between" align="center" gap={8} style={{ marginBottom: 12 }}>
              <PySearchSelect
                onChangeFn={(values) => {
                  const ids = (Array.isArray(values) ? values : [values]).map((v) => v.value);
                  setFilters(buildEqOrFilter("worker_id", ids), "replace");
                }}
                placeholder="按人员筛选当天记录，支持拼音"
                mode="multiple"
                labelPlaceholder=""
                width="100%"
                onClearFn={() => setFilters([], "replace")}
                type="qiandao"
              />

              <Popconfirm
                title="确认删除选中记录？"
                onConfirm={handleBatchDelete}
                disabled={!selection.selectedRowKeys.length}
              >
                <Button
                  type="primary"
                  data-testid="batch-delete-button"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selection.selectedRowKeys.length}
                  style={{ flex: "none" }}
                >
                  删除选中 ({selection.selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Flex>

            <Form {...formProps} onFinish={handleOnFinish}>
              <Table
                data-testid="table"
                {...tableProps}
                rowKey="id"
                size="middle"
                tableLayout="fixed"
                // 行内编辑时整行换底色，避免"点开编辑但看不出在改哪一行"
                rowClassName={(record) =>
                  record.id && isEditing(record.id) ? "row-editing" : ""
                }
                locale={{
                  emptyText: (
                    <EmptyState
                      compact
                      title="当天还没有记录"
                      description="在左侧选择人员、工种与工时后点击「录入」"
                    />
                  ),
                }}
                // @ts-expect-error,111
                rowSelection={selection.rowSelection}
              >
                <Table.Column
                  dataIndex={["expand", "worker_id", "name"]}
                  title="人员姓名"
                  width={180}
                  onCell={cellTestId((i) => `row-name-${i}`)}
                />
                <Table.Column
                  dataIndex="workTime"
                  title="工时(h)"
                  width={150}
                  onCell={cellTestId((i) => `row-time-${i}`)}
                  render={(value, record) => {
                    if (isEditing(record.id)) {
                      return (
                        <Form.Item
                          name="workTime"
                          style={{ margin: 0 }}
                          initialValue={record.work_minutes}
                        >
                          <WorkMinutesInput showHint={false} />
                        </Form.Item>
                      );
                    }
                    return <TextField value={formatHoursExact(record.work_minutes)} />;
                  }}
                />
                <Table.Column
                  dataIndex={["expand", "work", "name"]}
                  title="工作类型"
                  width={180}
                  onCell={cellTestId((i) => `row-work-${i}`)}
                  render={(value, record) => {
                    if (isEditing(record.id)) {
                      return (
                        <Form.Item name="work" style={{ margin: 0 }}>
                          {/* 编辑行内的 initialValue 由表单根据 name 自动设置 */}
                          <Select {...workTypeSelectProps} />
                        </Form.Item>
                      );
                    }
                    return <TextField value={value} />;
                  }}
                />
                <Table.Column
                  title="操作"
                  dataIndex="actions"
                  width={120}
                  align="right"
                  render={(_, record: BaseRecord, index) => {
                    // @ts-expect-error,111
                    if (isEditing(record.id)) {
                      return (
                        <Flex gap={6} justify="flex-end">
                          <SaveButton
                            data-testid={`save-button-${index}`}
                            {...saveButtonProps}
                            hideText
                            size="small"
                          />
                          <Button
                            data-testid={`cancel-button-${index}`}
                            {...cancelButtonProps}
                            size="small"
                          >
                            取消
                          </Button>
                        </Flex>
                      );
                    }
                    return (
                      <Flex gap={6} justify="flex-end">
                        <EditButton
                          // @ts-expect-error,111
                          {...editButtonProps(record.id)}
                          data-testid={`edit-button-${index}`}
                          hideText
                          size="small"
                          resource={__AttendanceRecord_TableName}
                          recordItemId={record.id}
                        />
                        <DeleteButton
                          data-testid={`delete-button-${index}`}
                          className="danger-hover"
                          hideText
                          disabled={selection.hasSelection}
                          size="small"
                          resource={__AttendanceRecord_TableName}
                          recordItemId={record.id}
                        />
                      </Flex>
                    );
                  }}
                />
              </Table>
            </Form>
          </Card>
        </div>
      </div>
    </List>
  );
}
