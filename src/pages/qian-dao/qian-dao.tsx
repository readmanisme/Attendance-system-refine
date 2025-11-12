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
} from "antd";
import { IconHelp } from "@tabler/icons-react";
import { useState, useCallback, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card } from "@mantine/core";
import { useCreateMany } from "@refinedev/core";
import { ClockCircleOutlined } from "@ant-design/icons";
import { List, useSelect, useTable } from "@refinedev/antd";
import { ColumnsType } from "antd/es/table";
import PySearchSelect from "@/components/PySearchSelect";
import { useSomeStore } from "@/stores";
const { Title: AntdTitle } = Typography;
type WorkerOption = { key: string; label: string; value: string };
type WorkTypeValue = { value: string; label: string } | undefined;

export default function QianDaoPage() {
  // ======================== useState ========================
  const { CommonGrouping, setCommonGrouping, setCommonGroupingAll } =
    useSomeStore();
  const [cr_value, setCrValue] = useState([]);
  const [cr_edit, setCrEdit] = useState([true, true, true, true, true]);
  const [RangeTime, setRangeTime] = useState<Dayjs[]>([
    dayjs().minute(0).second(0).millisecond(0),
    dayjs().minute(0).second(0).millisecond(0),
  ]);
  const TimeDifference = useMemo(
    () => RangeTime[1].diff(RangeTime[0], "hour", true),
    [RangeTime]
  );
  console.log(TimeDifference);
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
  // ======================== 获取数据 ========================
  const { tableProps } = useTable({
    resource: __AttendanceRecord_TableName,
    pagination: {
      mode: "off",
    },
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

  const columns_table: ColumnsType<any> = useMemo(
    () => [
      {
        title: "员工姓名",
        dataIndex: ["expand", "worker_id", "name"],
        key: "name",
      },
      {
        title: "签到时间",
        dataIndex: "check_in",
        key: "checkInTime",
        render: (text: string) => (
          <Space>
            <ClockCircleOutlined />
            {dayjs(text).format("YYYY-MM-DD HH:mm:ss")}
          </Space>
        ),
      },
      {
        title: "工作",
        dataIndex: ["expand", "work", "name"],
        key: "workType",
      },
      {
        title: "状态",
        key: "status",
        dataIndex: "status",
        render: (_: any, record: any) => {
          const statuss = record.check_out ? "checked-out" : "pending";
          const statusMap: Record<string, { text: string; color: string }> = {
            pending: { text: "待签退", color: "warning" },
            "checked-out": { text: "已签退", color: "default" },
          };
          const current = statusMap[statuss];
          return <Badge status={current.color as any} text={current.text} />;
        },
      },
      {
        title: "签退时间",
        dataIndex: "check_out",
        key: "checkOutTime",
        render: (text: string) =>
          text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
      },
    ],
    []
  );

  // ======================== 设置按钮和提示 ========================
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
    return {
      luruDisabled: false,
      alertDescription: "可以录入",
      alertType: "success" as const,
    };
  }, [PiLiangNames, work_type]);

  // ======================== 批量上下班 ========================

  const handleQiandao_PILIANG = () => {
    const [y, m, d] = [CheckDate.year(), CheckDate.month(), CheckDate.date()];
    const CheckIn = RangeTime[0]
      .year(y)
      .month(m)
      .date(d)
      .millisecond(0)
      .toISOString()
      .replace("T", " ");
    const CheckOut = RangeTime[1]
      .year(y)
      .month(m)
      .date(d)
      .millisecond(0)
      .toISOString()
      .replace("T", " ");
    // 不设置millisecond为0的话会有一个随机值，这是dayjs的行为；这会导致出现看起来一个时间但是出现早于上班时间的错误，不过只有在同一个时间才会这样，正常使用中不会触发bug
    const records = PiLiangNames.map((name) => {
      return {
        worker_id: name.key,
        check_in: CheckIn,
        check_out: CheckOut,
        // @ts-expect-error,111
        work: work_type.value,
      };
    });
    CreateBatchRecord({
      values: records,
    });
  };
  // ======================== 暂存 ========================
  const hours = [2, 2.5, 5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 12, 13];

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
                            variant="outlined"
                            key={hour}
                            size="small"
                            onClick={() => {
                              setRangeTime([
                                dayjs()
                                  .hour(7)
                                  .minute(0)
                                  .second(0)
                                  .millisecond(0),
                                dayjs()
                                  .hour(7)
                                  .minute(0)
                                  .second(0)
                                  .millisecond(0)
                                  .add(hour, "hour"),
                              ]);
                            }}
                          >
                            {hour}
                          </Button>
                        ))}
                      </Space>
                      </Space>
                      <Space>
                        <TimePicker.RangePicker
                          style={{ width: 240 }}
                          // @ts-expect-error,111
                          value={RangeTime}
                          // @ts-expect-error,111
                          onChange={(time: Dayjs, timeString: string) => {
                            // @ts-expect-error,111
                            setRangeTime(time); //这个dayjs仍然有年月日的部分
                          }}
                        />
                        <Tag color="blue" style={{ width: 60 }}>{TimeDifference}小时</Tag>
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
              <p className="mt-2! mb-0!">常用分组：</p>
              {/* <Button onClick={()=>setCommonGroupingAll([[],[],[],[],[]])}>修复CommonGrouping</Button> */}
              {CommonGrouping.map((item, index) => (
                <Space className="mt-2">
                  <PySearchSelect
                    key={index + "select"}
                    value={item}
                    onChangeFn={(value: any) => {
                      setCrValue(value);
                    }}
                    placeholder="多选工人,支持拼音"
                    Laberplaceholder=""
                    mode="multiple"
                    width={702}
                    disabeld={cr_edit[index]}
                  />
                  <Button
                    key={index + "b1"}
                    onClick={() => {
                      setCrEdit((prev) => {
                        const newCrEdit = [...prev];
                        newCrEdit[index] = !newCrEdit[index]; // 只切换当前index的状态
                        return newCrEdit;
                      });
                    }}
                  >
                    {cr_edit[index] ? "编辑" : "取消"}
                  </Button>
                  <Button
                    key={index + "b2"}
                    danger
                    onClick={() => {
                      setCommonGrouping([], index);
                    }}
                  >
                    清空
                  </Button>
                  <Button
                    key={index + "b3"}
                    onClick={() => {
                      setCommonGrouping(cr_value, index);
                    }}
                  >
                    保存
                  </Button>
                  <Button
                    key={index + "b4"}
                    type="primary"
                    onClick={() => {
                      setPiLiangNames(item);
                    }}
                  >
                    应用
                  </Button>
                </Space>
              ))}
            </>
          </div>
          <Table
            columns={columns_table}
            {...tableProps}
            rowKey="id"
            rowClassName={(record) =>
              record.check_out === "" ? "bg-blue-50" : ""
            }
            // pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </List>
  );
}
