import {
  Space,
  Typography,
  Button as AntdButton,
  Table,
  Alert,
  Select,
  DatePicker,
  Popconfirm,
  Flex,
  Tag,
  Button,
  Tooltip,
  Form,
  InputNumber,
} from "antd";
import { IconHelp } from "@tabler/icons-react";
import { useMemo, useState, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import { BaseRecord, useCreateMany, useDeleteMany, useUpdate } from "@refinedev/core";
import { CloseCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  DeleteButton,
  EditButton,
  List,
  SaveButton,
  TextField,
  useEditableTable,
  useSelect,
} from "@refinedev/antd";
import PySearchSelect from "@/components/PySearchSelect";
import { formatMinutes, hoursToMinutes, minutesToHours } from "@/utils/workTime";

const { Title: AntdTitle } = Typography;
type WorkerOption = { key: string; label: string; value: string };
type WorkTypeValue = { value: string; label: string } | undefined;

// 快捷工时(小时)
const hourChips = [2, 2.5, 5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 12, 13];

export default function QianDaoPage() {
  // ======================== useState ========================

  // 录入的工时(整数分钟)
  const [minutes, setMinutes] = useState<number>(0);
  const [CheckDate, setCheckDate] = useState<Dayjs>(dayjs().minute(0).second(0).millisecond(0));
  const IsPast = useMemo(() => CheckDate.isBefore(dayjs(), "day"), [CheckDate]);
  const IsFuture = useMemo(() => CheckDate.isAfter(dayjs(), "day"), [CheckDate]);
  const [work_type, set_work_type] = useState<WorkTypeValue>(undefined); //签到的时候要用
  const [PiLiangNames, setPiLiangNames] = useState<WorkerOption[]>([]);

  const { mutate: CreateBatchRecord } = useCreateMany({
    resource: __AttendanceRecord_TableName,
  });
  const { mutate: updateRecord } = useUpdate();

  const { selectProps: workTypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  // ======================== 计算衍生数据 ========================

  const adjustMinutes = useCallback(
    (delta: number) => setMinutes((m) => Math.min(24 * 60, Math.max(0, m + delta))),
    [],
  );
  const setHoursValue = useCallback((hours: number) => setMinutes(hoursToMinutes(hours)), []);

  // 当作为date filter传给useTable时，生成固定的字符串（避免每次渲染都变）
  const dateRangeFilter = useMemo(
    () => ({
      work_date: CheckDate.format("YYYY-MM-DD"),
    }),
    [CheckDate],
  );

  // ======================== 获取数据 ========================
  const {
    tableProps,
    formProps,
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
          value: dateRangeFilter.work_date,
        },
      ],
    },
    meta: {
      expand: ["work", "worker_id"],
    },
  });

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

  // 当前页面(选定日期)内,同一工人+同一工种的已有记录,用于判断"同键合并"
  const recordsByKey = useMemo(() => {
    const map = new Map<string, any>();
    for (const record of tableProps.dataSource ?? []) {
      if (record.worker_id && record.work) {
        map.set(`${record.worker_id}|${record.work}`, record);
      }
    }
    return map;
  }, [tableProps.dataSource]);

  const {
    luruDisabled,
    alertDescription: AlertDescription,
    alertType: AlertType,
    dataTestid,
  } = useMemo(() => {
    if (!PiLiangNames || PiLiangNames.length === 0) {
      return {
        luruDisabled: true,
        alertDescription: "请选择考勤人员",
        alertType: "warning" as const,
        dataTestid: "no-worker-alert",
      };
    }
    if (!work_type) {
      return {
        luruDisabled: true,
        alertDescription: "请选择工作",
        alertType: "warning" as const,
        dataTestid: "no-work-alert",
      };
    }
    // 同人同天同工种 → 会在库里自动合并(工时叠加)
    const mergeDescs: React.ReactNode[] = [];
    for (const name of PiLiangNames) {
      const existing = recordsByKey.get(`${name.key}|${work_type?.value}`);
      if (existing) {
        mergeDescs.push(
          <div key={`${name.key}-${existing.id}`}>
            {name.label}，当天已有{work_type?.label}记录（
            {formatMinutes(existing.work_minutes)}小时），录入后自动合并为
            {formatMinutes((existing.work_minutes ?? 0) + minutes)}小时
          </div>,
        );
      }
    }
    if (mergeDescs.length > 0) {
      return {
        luruDisabled: false,
        alertDescription: mergeDescs,
        alertType: "info" as const,
        dataTestid: "merge-alert",
      };
    }
    return {
      luruDisabled: false,
      alertDescription: "可以录入",
      alertType: "success" as const,
      dataTestid: "can-input-alert",
    };
  }, [PiLiangNames, recordsByKey, work_type, minutes]);

  // ======================== 批量录入 ========================

  const handleQiandao_PILIANG = () => {
    if (!work_type) {
      return; // 按钮已禁用，这里只是防御。（注意：不要用 `!` 非空断言，react-compiler 会把读取提升到渲染期）
    }
    const workDate = CheckDate.format("YYYY-MM-DD");
    const workId = work_type.value;
    const creates: any[] = [];
    for (const name of PiLiangNames) {
      const existing = recordsByKey.get(`${name.key}|${workId}`);
      if (existing) {
        // 同人同天同工种：在原记录上叠加工时
        updateRecord({
          resource: __AttendanceRecord_TableName,
          id: existing.id,
          values: { work_minutes: (existing.work_minutes ?? 0) + minutes },
        });
      } else {
        creates.push({
          worker_id: name.key,
          work_date: workDate,
          work_minutes: minutes,
          work: workId,
        });
      }
    }
    if (creates.length) {
      CreateBatchRecord({ values: creates });
    }
  };

  // ======================== 批量删除 ========================
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { mutate: deleteMany } = useDeleteMany();
  const handleBatchDelete = useCallback(() => {
    if (!selectedRowKeys.length) return;
    deleteMany({
      resource: __AttendanceRecord_TableName,
      ids: selectedRowKeys as number[],
    });
    setSelectedRowKeys([]);
  }, [deleteMany, selectedRowKeys]);
  const canNotDelete = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);
  // ✅ 用 useMemo 固定 rowSelection 对象引用，避免 tableProps 导致 re-render
  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: setSelectedRowKeys,
      onCell: (record: any, rowIndex: any) => ({ "data-testid": `row-checkbox-${rowIndex}` }),
    }),
    [selectedRowKeys],
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
            <>
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6 mt-2">
                <Space direction="vertical" className="w-full">
                  <Flex gap="small">
                    <Alert
                      data-testid={
                        IsPast ? "past-alert" : IsFuture ? "future-alert" : "today-alert"
                      }
                      className="flex-1"
                      message={
                        IsPast
                          ? "你正在过去日期中进行操作"
                          : IsFuture
                            ? "你正在未来日期中进行操作"
                            : "你正在录入今日数据"
                      }
                      type={IsPast ? "warning" : IsFuture ? "error" : "success"}
                      showIcon
                    />
                  </Flex>
                  <PySearchSelect
                    // data-testid="worker-select" //无效的
                    onChangeFn={(value: any) => {
                      setPiLiangNames(value);
                    }}
                    placeholder="多选工人,支持拼音"
                    Laberplaceholder=""
                    mode="multiple"
                    width="100%"
                    value={PiLiangNames}
                    type="qiandao"
                    // 传不传PiLiangNames，对性能影响似乎不大。如果影响大可以考虑用ref
                  />
                </Space>
                <Space direction="vertical">
                  <Space direction="vertical">
                    <Tooltip title="工时可以精确到分钟">
                      <div data-testid="hour-tooltip" className="flex flex-row items-center gap-2">
                        快速选择工时：
                        <IconHelp size={16} />
                      </div>
                    </Tooltip>
                    <Space wrap>
                      {hourChips.map((hour) => (
                        <Button
                          data-testid={`hour-button-${hour}`}
                          color="blue"
                          variant="filled"
                          key={hour}
                          size="small"
                          onClick={() => setHoursValue(hour)}
                        >
                          {hour}
                        </Button>
                      ))}
                    </Space>
                    <Space>
                      <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(30)}>
                        +30min
                      </Button>
                      <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(-30)}>
                        -30min
                      </Button>
                      <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(10)}>
                        +10min
                      </Button>
                      <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(-10)}>
                        -10min
                      </Button>
                    </Space>
                  </Space>
                  <Space>
                    <InputNumber
                      data-testid="hours-input"
                      min={0}
                      max={24}
                      step={0.5}
                      value={minutesToHours(minutes)}
                      onChange={(v) => v != null && setHoursValue(v)}
                      formatter={(v) => `${v}小时`}
                      parser={(v) => Math.round(Number(String(v).replace(/[^0-9.]/g, "")) * 100) / 100}
                      style={{ width: 110 }}
                    />
                    <Tag data-testid="time-difference" color="blue" style={{ width: 90 }}>
                      {minutes}分钟
                    </Tag>
                  </Space>

                  <Space>
                    <DatePicker
                      style={{ width: 120 }}
                      allowClear={false}
                      value={CheckDate}
                      onChange={(value) => {
                        setCheckDate(value);
                      }}
                    />

                    <Select
                      placeholder="工作"
                      data-testid="work-type-select"
                      {...workTypeSelectProps}
                      style={{ width: 120 }}
                      allowClear={{ clearIcon: <CloseCircleOutlined data-testid="clear-icon" /> }}
                      // 自定义图标使得可以被良好的选择，否则会是很长的选择器
                      labelInValue
                      value={work_type}
                      onChange={set_work_type}
                    />

                    <Popconfirm
                      title="确认要录入吗？"
                      description="请确保信息准确"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => {
                        handleQiandao_PILIANG();
                        setPiLiangNames([]);
                        // setPiliangTime(dayjs());
                        set_work_type(undefined);
                      }}
                    >
                      <AntdButton
                        data-testid="submit-button"
                        type="primary"
                        // icon={<LogoutOutlined />}
                        disabled={luruDisabled}
                      >
                        录入
                      </AntdButton>
                    </Popconfirm>
                  </Space>
                </Space>
              </div>

              <Alert
                // message="校验情况"
                data-testid={dataTestid}
                description={AlertDescription}
                type={AlertType}
                showIcon
              />
            </>
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
                disabled={!selectedRowKeys.length}
              >
                <Button
                  type="primary"
                  data-testid="batch-delete-button"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedRowKeys.length}
                >
                  删除选中 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Space>
            <Alert
              data-testid="search-alert"
              type="info"
              message="要确定某人是否已经记录，可以使用Ctrl+F搜索" //还是说已经有记录的显示已录入tag？不推荐，那样的话拼音搜索组件又要改了
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
              rowSelection={rowSelection}
            >
              {/* <Table.Column dataIndex="id" title="ID" /> */}
              <Table.Column
                dataIndex={["expand", "worker_id", "name"]}
                title="人员姓名"
                // @ts-expect-error,111
                onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-name-${rowIndex}` })}
              />
              <Table.Column
                dataIndex="workTime"
                title="工时"
                // @ts-expect-error,111
                onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-time-${rowIndex}` })}
                render={(value, record) => {
                  if (isEditing(record.id)) {
                    return (
                      <Form.Item name="workTime" style={{ margin: 0 }} initialValue={minutesToHours(record.work_minutes)}>
                        <InputNumber min={0} max={24} step={0.5} changeOnWheel />
                      </Form.Item>
                    );
                  }
                  return <TextField value={formatMinutes(record.work_minutes)} />;
                }}
              />
              <Table.Column
                dataIndex={["expand", "work", "name"]}
                title="工作类型"
                // @ts-expect-error,111
                onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-work-${rowIndex}` })}
                render={(value, record) => {
                  if (isEditing(record.id)) {
                    return (
                      <Form.Item
                        name="work"
                        style={{ margin: 0 }}
                        // initialValue={record.work} //这里不需要设置，表单根据name自动设置了
                      >
                        {/* 这里initialValue要用record.work而不是value，value是汉字，用这个会导致保存的时候保存的是汉字而不是work的id */}
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
                      {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
                      <DeleteButton
                        data-testid={`delete-button-${index}`}
                        hideText
                        disabled={canNotDelete}
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
