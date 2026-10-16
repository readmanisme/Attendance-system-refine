import dayjs, { Dayjs } from "dayjs";
import {
  Typography,
  Table,
  Alert,
  Button,
  Space,
  Form,
  InputNumber,
  Select,
  Popconfirm,
} from "antd";
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
import { useCallback, useState } from "react";
import { formatHoursExact, hoursToMinutes, minutesToHours } from "@/utils/workTime";
import { cellTestId } from "@/utils/tableHelpers";
import { useBatchRowSelection } from "../useBatchRowSelection";
import { BatchEntryPanel } from "./BatchEntryPanel";
import { useBatchEntry } from "./useBatchEntry";

const { Title: AntdTitle } = Typography;

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
  const { tableProps, formProps, isEditing, saveButtonProps, cancelButtonProps, editButtonProps } =
    useEditableTable({
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

  // ======================== 批量删除 ========================
  const selection = useBatchRowSelection();
  const { mutate: deleteMany } = useDeleteMany();
  const { selectedRowKeys, clearSelection } = selection;
  const handleBatchDelete = useCallback(() => {
    if (!selectedRowKeys.length) return;
    deleteMany({
      resource: __AttendanceRecord_TableName,
      ids: selectedRowKeys as number[],
    });
    clearSelection();
  }, [deleteMany, selectedRowKeys, clearSelection]);

  // 表格内编辑行时,把"小时"换算成整数分钟存库
  const handleOnFinish = useCallback(
    (values: any) => {
      const rest: any = { ...values };
      if (rest.workTime != null) {
        rest.work_minutes = hoursToMinutes(rest.workTime);
      }
      delete rest.workTime;
      if (formProps.onFinish) {
        formProps.onFinish(rest);
      }
    },
    [formProps],
  );

  // ======================== UI ========================

  return (
    <List>
      <div className={`min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <AntdTitle level={3} className="mb-6! text-center">
              工时录入系统
            </AntdTitle>
            <BatchEntryPanel batch={batch} workTypeSelectProps={workTypeSelectProps} />
          </div>
          <Space direction="vertical">
            <Space>
              <Alert
                data-testid="edit-alert"
                type="info"
                message="同一人同一天的相同工作不会产生第二条记录，而是自动叠加为一个总工时"
                showIcon
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
                >
                  删除选中 ({selection.selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Space>
            <Alert
              data-testid="search-alert"
              type="info"
              message="要确定某人是否已经记录，可以使用Ctrl+F搜索"
              showIcon
            />
          </Space>
          <Form {...formProps} onFinish={handleOnFinish}>
            <Table
              data-testid="table"
              {...tableProps}
              className="mt-2"
              rowKey="id"
              // @ts-expect-error,111
              rowSelection={selection.rowSelection}
            >
              <Table.Column
                dataIndex={["expand", "worker_id", "name"]}
                title="人员姓名"
                onCell={cellTestId((i) => `row-name-${i}`)}
              />
              <Table.Column
                dataIndex="workTime"
                title="工时"
                onCell={cellTestId((i) => `row-time-${i}`)}
                render={(value, record) => {
                  if (isEditing(record.id)) {
                    return (
                      <Form.Item
                        name="workTime"
                        style={{ margin: 0 }}
                        initialValue={minutesToHours(record.work_minutes)}
                      >
                        <InputNumber min={0} max={24} step={0.5} changeOnWheel />
                      </Form.Item>
                    );
                  }
                  return <TextField value={formatHoursExact(record.work_minutes)} />;
                }}
              />
              <Table.Column
                dataIndex={["expand", "work", "name"]}
                title="工作类型"
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
                render={(_, record: BaseRecord, index) => {
                  // @ts-expect-error,111
                  if (isEditing(record.id)) {
                    return (
                      <Space>
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
                          Cancel
                        </Button>
                      </Space>
                    );
                  }
                  return (
                    <Space>
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
                        hideText
                        disabled={selection.hasSelection}
                        size="small"
                        resource={__AttendanceRecord_TableName}
                        recordItemId={record.id}
                      />
                    </Space>
                  );
                }}
              />
            </Table>
          </Form>
        </div>
      </div>
    </List>
  );
}
