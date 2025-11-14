import {
  Space,
  Typography,
  Button as AntdButton,
  Table,
  Badge,
  Alert,
  Select,
  DatePicker,
  Popconfirm,
  Flex,
  TimePicker,
  Tag,
  Button,
  Tooltip,
  Form,
  InputNumber,
} from "antd";
import { IconHelp } from "@tabler/icons-react";
import { useState, useCallback, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card } from "@mantine/core";
import { BaseRecord, useCreateMany, useDeleteMany } from "@refinedev/core";
import { ClockCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  DeleteButton,
  EditButton,
  List,
  SaveButton,
  TextField,
  useEditableTable,
  useSelect,
  useTable,
} from "@refinedev/antd";
import PySearchSelect from "@/components/PySearchSelect";
const { Title: AntdTitle } = Typography;
type WorkerOption = { key: string; label: string; value: string };
type WorkTypeValue = { value: string; label: string } | undefined;

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待签退", color: "warning" },
  "checked-out": { text: "已签退", color: "default" },
};
const hours = [2, 2.5, 5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 12, 13];

export default function QianDaoPage() {
  // ======================== useState ========================

  const [RangeTime, setRangeTime] = useState<Dayjs[]>([
    dayjs().minute(0).second(0).millisecond(0),
    dayjs().minute(0).second(0).millisecond(0),
  ]);
  const TimeDifference = useMemo(
    () => RangeTime[1].diff(RangeTime[0], "hour", true),
    [RangeTime]
  );
  const [CheckDate, setCheckDate] = useState<Dayjs>(
    dayjs().minute(0).second(0).millisecond(0)
  );
  const IsPast = useMemo(() => CheckDate.isBefore(dayjs(), "day"), [CheckDate]);
  const [work_type, set_work_type] = useState<WorkTypeValue>(undefined); //签到的时候要用
  const [PiLiangNames, setPiLiangNames] = useState<WorkerOption[]>([]);

  const { mutate: CreateBatchRecord } = useCreateMany({
    resource: __AttendanceRecord_TableName,
  });

  const { selectProps: workTypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  // ======================== 暂存 ========================
  // helper: 格式化为后端所需字符串（去除毫秒）
  const formatForDB = useCallback((d?: Dayjs) => {
    if (!d) return "";
    return d.millisecond(0).toISOString().replace("T", " ");
  }, []);

  // 当作为date filter传给useTable时，先用useMemo生成固定的字符串（避免每次渲染都变）
  const dateRangeFilter = useMemo(() => {
    const start = CheckDate.startOf("day");
    const end = CheckDate.endOf("day");
    return {
      gte: formatForDB(start),
      lte: formatForDB(end),
    };
  }, [CheckDate, formatForDB]);
  const formatDateTime = useCallback(
    (date?: string) =>
      date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : "--",
    []
  );
  // ======================== 获取数据 ========================
  const {
    tableProps,
    formProps,
    isEditing,
    setId: setEditId,
    saveButtonProps,
    cancelButtonProps,
    editButtonProps,
    result,
  } = useEditableTable({
    resource: __AttendanceRecord_TableName,
    pagination: {
      mode: "off",
    },
    // autoSave: { //不能用autoSave实现在提交之前更改数据，因为你每次修改他都会发送保存请求；如果关掉save那就没这功能了
    //   enabled: false,
    //   onFinish: (values) => {
    //     const hours = values.workTime;
    //     const check_in = CheckDate.hour(7).minute(0).second(0).millisecond(0);
    //     const check_out = check_in.add(hours, "hour");
    //     const r= {
    //       ...values,
    //       check_in: formatForDB(check_in),
    //       check_out: formatForDB(check_out),
    //     };
    //     // 去除workTime字段
    //     const { workTime,...rest } = r;
    //     return rest;
    //   },
    // },
    sorters: {
      permanent: [
        {
          field: "created",
          order: "desc",
        },
        // check_out排序时候，空的条目会按照创建时间从早到晚排序
        // 添加多个sort可以符合排序
        // 后签到的显示在前面，符合期望
      ],
    },
    filters: {
      permanent: [
        {
          operator: "and",
          value: [
            {
              field: "check_in",
              operator: "gte",
              value: dateRangeFilter.gte,
            },
            {
              field: "check_in",
              operator: "lte",
              value: dateRangeFilter.lte,
            },
          ],
        },
      ],
    },
    meta: {
      expand: ["work", "worker_id"],
    },
  });
  const handleOnFinish = useCallback(
    (values: any) => {
      const hours = values.workTime;
      const check_in = CheckDate.set("hour", 7)
        .set("minute", 0)
        .set("second", 0)
        .set("millisecond", 0);
      const check_out = check_in.add(hours, "hour");
      const r = {
        ...values,
        check_in: formatForDB(check_in),
        check_out: formatForDB(check_out),
      };
      const { workTime, ...rest } = r;
      if (formProps.onFinish) {
        formProps.onFinish(rest);
      }
    },
    [CheckDate, formatForDB, formProps]
  );
  const dataSourceWithWorkTime = useMemo(() => {
    const ds = tableProps.dataSource ?? [];
    return ds.map((item: any) => {
      if (!item.check_out) return item;
      const checkIn = dayjs(item.check_in);
      const checkOut = dayjs(item.check_out);
      return {
        ...item,
        workTime: checkOut.diff(checkIn, "hour", true),
        statuss: "checked-out",
      };
    });
  }, [tableProps.dataSource]);

  const { tableProps: kaoqingjilu } = useTable({
    resource: __AttendanceRecord_TableName,
    filters: {
      // 这里operator是null的实际是不等于null，nnull实际上是等于null
      permanent: [
        {
          field: "check_out",
          operator: "eq",
          value: "",
        },
      ],
    },
  });

  // ======================== 计算衍生数据 ========================
  const dates = useMemo(
    () =>
      (kaoqingjilu?.dataSource ?? []).map((item) =>
        dayjs(item.check_in).format("YYYY-MM-DD")
      ),
    [kaoqingjilu?.dataSource]
  );
  const uniqueDates = useMemo(() => Array.from(new Set(dates)), [dates]);

  const datesWithoutToday = useMemo(
    () => uniqueDates.filter((date) => date !== CheckDate.format("YYYY-MM-DD")),
    [uniqueDates, CheckDate]
  );

  // ======================== 表格定义 ========================

  // ======================== 设置按钮和提示 ========================
  const checkOverlap = useCallback(
    (range2: any) => {
      const [y, m, d] = [CheckDate.year(), CheckDate.month(), CheckDate.date()];
      // 确保传入的是dayjs对象
      // const [start1, end1] = RangeTime; //rangetime
      // 设置start1, end1的年月日
      const start1 = RangeTime[0].set("year", y).set("month", m).set("date", d);
      const end1 = RangeTime[1].set("year", y).set("month", m).set("date", d);
      // const [start2, end2] = range2.map((time) => dayjs(time));
      const [start2, end2] = range2;

      // 判断是否有重叠的逻辑
      return (
        // (start1.isBefore(end2) || start1.isSame(end2)) &&
        // (end1.isAfter(start2) || end1.isSame(start2))
        start1.isBefore(end2) && end1.isAfter(start2)
      );
    },
    [CheckDate, RangeTime]
  );
  const recordsByWorkerId = useMemo(() => {
    const map = new Map();
    if (tableProps.dataSource) {
      for (const record of tableProps.dataSource) {
        if (record.worker_id) {
          // 预先创建 dayjs 对象
          const processedRecord = {
            ...record,
            recordCheckIn: dayjs(record.check_in),
            recordCheckOut: dayjs(record.check_out),
          };

          if (map.has(record.worker_id)) {
            map.get(record.worker_id).push(processedRecord);
          } else {
            map.set(record.worker_id, [processedRecord]);
          }
        }
      }
    }
    return map;
  }, [tableProps.dataSource]); // 依赖项是 dataSource

  const {
    luruDisabled,
    alertDescription: AlertDescription,
    alertType: AlertType,
  } = useMemo(() => {
    // 默认
    if (!PiLiangNames || PiLiangNames.length === 0) {
      return {
        luruDisabled: true,
        alertDescription: "请选择考勤人员",
        alertType: "warning" as const,
      };
    }
    if (!work_type) {
      return {
        luruDisabled: true,
        alertDescription: "请选择工作",
        alertType: "warning" as const,
      };
    }
    const descs: React.ReactNode[] = [];
    for (const name of PiLiangNames) {
      // O(1) 查找所有历史记录
      const allRecords = recordsByWorkerId.get(name.key);

      if (allRecords && allRecords.length > 0) {
        // 检查每条历史记录
        for (const record of allRecords) {
          // 直接使用预处理的 dayjs 对象
          const { recordCheckIn, recordCheckOut } = record;

          if (checkOverlap([recordCheckIn, recordCheckOut])) {
            descs.push(
              <div key={`${name.key}-${record.id}`}>
                {name.label}，所选时间与历史签到时间
                {recordCheckIn.format("YYYY-MM-DD HH:mm:ss")}至
                {recordCheckOut.format("YYYY-MM-DD HH:mm:ss")}有重叠
              </div>
            );
          }
        }
      }
    }

    if (descs.length > 0) {
      return {
        luruDisabled: true,
        alertDescription: descs,
        alertType: "error" as const,
      };
    }
    return {
      luruDisabled: false,
      alertDescription: "可以录入",
      alertType: "success" as const,
    };
  }, [PiLiangNames, checkOverlap, tableProps.dataSource, work_type]);

  // ======================== 批量上下班 ========================

  const handleQiandao_PILIANG = () => {
    const [y, m, d] = [CheckDate.year(), CheckDate.month(), CheckDate.date()];
    const CheckIn = RangeTime[0]
      .set("year", y)
      .set("month", m)
      .set("date", d)
      .set("millisecond", 0);
    const CheckOut = RangeTime[1]
      .set("year", y)
      .set("month", m)
      .set("date", d)
      .set("millisecond", 0);

    const checkInStr = formatForDB(CheckIn);
    const checkOutStr = formatForDB(CheckOut);
    // 不设置millisecond为0的话会有一个随机值，这是dayjs的行为；这会导致出现看起来一个时间但是出现早于上班时间的错误，不过只有在同一个时间才会这样，正常使用中不会触发bug
    const records = PiLiangNames.map((name) => {
      return {
        worker_id: name.key,
        check_in: checkInStr,
        check_out: checkOutStr,
        // @ts-expect-error,111
        work: work_type.value,
      };
    });
    CreateBatchRecord({
      values: records,
    });
  };
  // ======================== 暂存 ========================
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

  // ✅ 用 useMemo 固定 rowSelection 对象引用，避免 tableProps 导致 re-render
  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: setSelectedRowKeys,
    }),
    [selectedRowKeys]
  );
  const setRangeForHour = useCallback(
    (hour: number) => {
      const base = CheckDate.set("hour", 7)
        .set("minute", 0)
        .set("second", 0)
        .set("millisecond", 0);
      const end = base.add(hour, "hour");
      setRangeTime([base, end]);
    },
    [CheckDate]
  );
  // +30 / -30 按钮的安全实现（使用函数式 setState，并且基于 prev 保持不变性）
  const addThirty = useCallback(() => {
    setRangeTime((prev) => {
      const nextEnd = prev[1].add(30, "minute");
      // 超出当天结束则不变
      const dayEnd = prev[0]
        .set("hour", 23)
        .set("minute", 59)
        .set("second", 59);
      if (nextEnd.isAfter(dayEnd)) return prev;
      return [prev[0], nextEnd];
    });
  }, []);
  const subThirty = useCallback(() => {
    setRangeTime((prev) => {
      const nextEnd = prev[1].subtract(30, "minute");
      if (nextEnd.isSameOrBefore(prev[0])) return prev;
      return [prev[0], nextEnd];
    });
  }, []);
  // ======================== UI ========================

  return (
    <List>
      <div className={`min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8`}>
        <Card className="max-w-6xl mx-auto">
          <div className="mb-6">
            <AntdTitle level={3} className="mb-6! text-center">
              签到录入系统
            </AntdTitle>
            <>
              <Alert
                className={datesWithoutToday.length ? "" : "hidden!"}
                message={
                  "以下日期存在未下班人员：" + datesWithoutToday.join(", ")
                }
                type="error"
                showIcon
              />
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6 mt-2">
                <Space direction="vertical" className="w-full">
                  <Flex gap="small">
                    <Alert
                      className="flex-1"
                      message={
                        datesWithoutToday.length > 0
                          ? `以下日期存在未下班人员：${datesWithoutToday.join(
                              ", "
                            )}`
                          : "往日不存在未下班人员"
                      }
                      type={datesWithoutToday.length > 0 ? "error" : "success"}
                      showIcon
                    />

                    <Alert
                      className="flex-1"
                      message={
                        IsPast
                          ? "你正在过去日期中进行操作"
                          : "你正在录入今日数据"
                      }
                      type={IsPast ? "warning" : "success"}
                      showIcon
                    />
                  </Flex>
                  <PySearchSelect
                    onChangeFn={(value: any) => {
                      setPiLiangNames(value);
                    }}
                    placeholder="多选工人,支持拼音"
                    Laberplaceholder=""
                    mode="multiple"
                    width={702}
                    value={PiLiangNames}
                    type="qiandao"
                    // 传不传PiLiangNames，对性能影响似乎不大。如果影响大可以考虑用ref
                  />
                </Space>
                <Space direction="vertical">
                  <Space direction="vertical">
                    <Tooltip title="从7:00开始">
                      <div className="flex flex-row items-center gap-2">
                        快速选择工时：
                        <IconHelp size={16} />
                      </div>
                    </Tooltip>
                    <Space wrap>
                      {hours.map((hour) => (
                        <Button
                          color="blue"
                          variant="filled"
                          key={hour}
                          size="small"
                          onClick={() => setRangeForHour(hour)}
                        >
                          {hour}
                        </Button>
                      ))}
                      <Button
                        color="blue"
                        variant="dashed"
                        size="small"
                        onClick={addThirty}
                      >
                        +30min
                      </Button>
                      <Button
                        color="blue"
                        variant="dashed"
                        size="small"
                        onClick={subThirty}
                      >
                        -30min
                      </Button>
                    </Space>
                  </Space>
                  <Space>
                    <TimePicker.RangePicker
                      style={{ width: 240 }}
                      allowClear={false}
                      // @ts-expect-error,111
                      value={RangeTime}
                      // @ts-expect-error,111
                      onChange={(time: Dayjs, timeString: string) => {
                        // @ts-expect-error,111
                        setRangeTime(time); //这个dayjs仍然有年月日的部分
                      }}
                      format="HH:mm"
                    />
                    <Tag color="blue" style={{ width: 60 }}>
                      {TimeDifference}小时
                    </Tag>
                  </Space>

                  <Space>
                    <DatePicker
                      style={{ width: 120 }}
                      allowClear={false}
                      value={CheckDate}
                      onChange={(value, dateString) => {
                        setCheckDate(value);
                      }}
                    />

                    <Select
                      placeholder="工作"
                      {...workTypeSelectProps}
                      style={{ width: 100 }}
                      allowClear
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
                description={AlertDescription}
                type={AlertType}
                showIcon
              />
            </>
          </div>
          <Space direction="vertical">
            <Space>
              <Alert
                type="info"
                message="在表格中修改工时会使得签到时间变为7:00,如有其他需求可以删除记录然后手动选择时间录入"
                showIcon
              />
              <Popconfirm
                title="确认删除选中记录？"
                onConfirm={handleBatchDelete}
                disabled={!selectedRowKeys.length}
              >
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedRowKeys.length}
                >
                  删除选中 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Space>
            <Alert
              type="info"
              message="要确定某人是否已经记录，可以1使用Ctrl+F搜索" //还是说已经有记录的显示已录入tag？不推荐，那样的话拼音搜索组件又要改了
              // showIcon
            />
          </Space>
          <Form {...formProps} onFinish={handleOnFinish}>
            <Table
              {...tableProps}
              className="mt-2"
              dataSource={dataSourceWithWorkTime}
              rowKey="id"
              rowClassName={(record) =>
                record.check_out === "" ? "bg-blue-50" : ""
              }
              rowSelection={rowSelection}
            >
              {/* <Table.Column dataIndex="id" title="ID" /> */}
              <Table.Column
                dataIndex={["expand", "worker_id", "name"]}
                title="人员姓名"
              />
              <Table.Column
                dataIndex="statuss"
                title="状态"
                render={(value) => {
                  const current = statusMap[value];
                  return (
                    <Badge status={current.color as any} text={current.text} />
                  );
                }}
              />
              <Table.Column
                dataIndex="check_in"
                title="上班时间"
                render={(value: string) => formatDateTime(value)}
              />
              <Table.Column
                dataIndex="check_out"
                title="下班时间"
                render={(value: string) => formatDateTime(value)}
              />
              <Table.Column
                dataIndex="workTime"
                title="工时"
                render={(value, record) => {
                  if (isEditing(record.id)) {
                    return (
                      <Form.Item
                        name="workTime"
                        style={{ margin: 0 }}
                        initialValue={value}
                      >
                        <InputNumber
                          min={0}
                          max={16.5}
                          step={0.5}
                          changeOnWheel
                        />
                      </Form.Item>
                    );
                  }
                  return <TextField value={value} />;
                }}
              />
              <Table.Column
                dataIndex={["expand", "work", "name"]}
                title="工作类型"
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
                render={(_, record: BaseRecord) => {
                  // @ts-expect-error,111
                  if (isEditing(record.id)) {
                    return (
                      <Space>
                        <SaveButton
                          {...saveButtonProps}
                          hideText
                          size="small"
                        />
                        <Button {...cancelButtonProps} size="small">
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
                        hideText
                        size="small"
                        resource={__AttendanceRecord_TableName}
                        recordItemId={record.id}
                      />
                      {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
                      <DeleteButton
                        hideText
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
        </Card>
      </div>
    </List>
  );
}
