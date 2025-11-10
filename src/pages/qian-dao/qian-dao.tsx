import {
  Space,
  Typography,
  Button as AntdButton,
  Table,
  Badge,
  Alert,
  Tag,
  Select,
  DatePicker,
  Popconfirm,
  Tooltip,
} from "antd";

import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card } from "@mantine/core";
import { useCreateMany, useUpdateMany } from "@refinedev/core";
import {
  CheckOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { List, useSelect, useTable } from "@refinedev/antd";
import { ColumnsType } from "antd/es/table";

const { Title: AntdTitle } = Typography;

type WorkerOption = { key: string; label: string; value: string };
type WorkTypeValue = { value: string; label: string } | undefined;

export default function QianDaoPage() {
  // ======================== useState ========================
  const [PiliangTime, setPiliangTime] = useState<Dayjs>(
    dayjs().minute(0).second(0).millisecond(0) // 设置为整点，不然选起来会有点麻烦
  );

  const [work_type, set_work_type] = useState<WorkTypeValue>(undefined); //签到的时候要用
  const [PiLiangNames, setPiLiangNames] = useState<WorkerOption[]>([]);

  const { mutate: CreateBatchRecord } = useCreateMany({
    resource: __AttendanceRecord_TableName,
  });
  const { mutate: UpdateBatchRecord } = useUpdateMany({
    resource: __AttendanceRecord_TableName,
  });
  const { selectProps: workTypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
  });

  const { selectProps: WorkersSelectProps } = useSelect({
    resource: __Workers_TableName,
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
    const start = PiliangTime.startOf("day");
    const end = PiliangTime.endOf("day");
    return {
      gte: formatForDB(start),
      lte: formatForDB(end),
    };
  }, [PiliangTime, formatForDB]);
  // ======================== 获取数据 ========================
  const { tableProps } = useTable({
    resource: __AttendanceRecord_TableName,
    pagination: {
      // mode: "off",
      mode: "server", //因为现在排序是服务器进行的，所以设置分页也OK
    },
    sorters: {
      permanent: [
        {
          field: "check_out",
          order: "asc",
        },
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
    () =>
      uniqueDates.filter((date) => date !== PiliangTime.format("YYYY-MM-DD")),
    [uniqueDates, PiliangTime]
  );

  const All_checkOut = useMemo(
    () => uniqueDates.some((date) => date === PiliangTime.format("YYYY-MM-DD")),
    [uniqueDates, PiliangTime]
  );

  const dataSource = useMemo(() => tableProps?.dataSource ?? [], [tableProps]);

  const last_records = useMemo(
    () => dataSource.filter((item) => item.check_out === ""),
    [dataSource]
  );
  //筛选出PiLiangNames中含有的worker
  // ?.filter((item) =>
  //   PiLiangNames.some((name) => name.key === item.worker_id)
  // );
  // 我觉得没有必要，因为其他人的记录存在也应该没有影响
  const UnCheckOutNames = useMemo(
    () =>
      last_records.map((item) => item.expand?.worker_id?.name).filter(Boolean),
    [last_records]
  );
  const full_records = useMemo(
    () =>
      dataSource
        .filter((item) => item.check_out && item.check_out !== "")
        .slice() // 复制一份再排序，避免改动原数组
        .sort(
          (a, b) => (dayjs(a.check_in).isAfter(dayjs(b.check_in)) ? -1 : 1) //desc倒序
        ) ?? [],
    [dataSource]
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
    shangDisabled: ShangBanButtonDisabled,
    xiaDisabled: XiaBanButtonDisabled,
    alertDescription: AlertDescription,
    alertType: AlertType,
  } = useMemo(() => {
    // 默认
    if (!PiLiangNames || PiLiangNames.length === 0) {
      return {
        shangDisabled: true,
        xiaDisabled: true,
        alertDescription: "请选择考勤人员",
        alertType: "warning" as const,
      };
    }
    if (!PiliangTime) {
      return {
        shangDisabled: true,
        xiaDisabled: true,
        alertDescription: "请选择考勤时间",
        alertType: "warning" as const,
      };
    }

    // 找出选择人员中，哪些在 last_records 中（即当前还未签退）
    const missingKeys = PiLiangNames.filter(
      (name) => !last_records.some((r) => r.worker_id === name.key)
    ); // missingKeys = 已下班的人（在 last_records 中没有记录）

    // 情况一：没有 missingKeys => 所有人当前都未签退（都在 last_records），可以下班（需检查下班时间早于上班）
    if (missingKeys.length === 0) {
      const descs: React.ReactNode[] = [];
      for (const name of PiLiangNames) {
        const rec = last_records.find((r) => r.worker_id === name.key);
        if (rec && dayjs(rec.check_in).isAfter(PiliangTime)) {
          descs.push(
            <div key={name.key}>
              {name.label} 下班时间 {PiliangTime.format("YYYY-MM-DD HH:mm:ss")}{" "}
              早于上班时间 {dayjs(rec.check_in).format("YYYY-MM-DD HH:mm:ss")}
            </div>
          );
        }
      }
      if (descs.length > 0) {
        return {
          shangDisabled: true,
          xiaDisabled: true,
          alertDescription: descs,
          alertType: "error" as const,
        };
      }
      return {
        shangDisabled: true,
        xiaDisabled: false,
        alertDescription: "可以下班",
        alertType: "success" as const,
      };
    }

    // 情况二：所有人都已下班（missingKeys.length === PiLiangNames.length），可以上班（需检查上班时间晚于上一次下班时间）
    if (missingKeys.length === PiLiangNames.length) {
      const descs: React.ReactNode[] = [];
      for (const name of PiLiangNames) {
        const rec = full_records.find((r) => r.worker_id === name.key);
        if (
          rec &&
          dayjs(rec.check_out).isAfter(PiliangTime) &&
          dayjs(rec.check_in).isBefore(PiliangTime)
        ) {
          descs.push(
            <div key={name.key}>
              {/* {name.label} 上班时间 {PiliangTime.format("YYYY-MM-DD HH:mm:ss")}{" "}
              早于上一个记录的下班时间{" "} */}
              {/* {dayjs(rec.check_out).format("YYYY-MM-DD HH:mm:ss")} */}
              {name.label} 上班时间 {PiliangTime.format("YYYY-MM-DD HH:mm:ss")}{" "}
              介于 上一个记录的上下班时间之间{" "}
              {dayjs(rec.check_in).format("YYYY-MM-DD HH:mm:ss")}
              {"--"}
              {dayjs(rec.check_out).format("YYYY-MM-DD HH:mm:ss")}
            </div>
          );
        }
        if (rec && dayjs(rec.check_in).isAfter(PiliangTime)) {
          descs.push(
            <div key={name.key}>
              {name.label} 上班时间 {PiliangTime.format("YYYY-MM-DD HH:mm:ss")}{" "}
              早于上一个记录的上班时间{" "}
              {dayjs(rec.check_in).format("YYYY-MM-DD HH:mm:ss")}
            </div>
          );
        }
      }
      if (descs.length > 0) {
        return {
          shangDisabled: true,
          xiaDisabled: true,
          alertDescription: descs,
          alertType: "error" as const,
        };
      }
      // 需要选择工作类型才能上班
      if (!work_type) {
        return {
          shangDisabled: true,
          xiaDisabled: true,
          alertDescription: "请选择工作",
          alertType: "warning" as const,
        };
      }
      return {
        shangDisabled: false,
        xiaDisabled: true,
        alertDescription: "可以上班",
        alertType: "success" as const,
      };
    }

    // 情况三：部分人已下班，部分人未下班 -> 错误，提示如何操作
    const missingNames = missingKeys.map((r) => r.label).join(", ");
    const noMissNames = PiLiangNames.filter(
      (item) => !missingKeys.some((m) => m.key === item.key)
    )
      .map((i) => i.label)
      .join(", ");
    return {
      shangDisabled: true,
      xiaDisabled: true,
      alertDescription: (
        <>
          <p>如果你需要下班，请去除下列已下班人员：{missingNames}</p>
          <br />
          <p>如果你需要上班，请去除下列已上班人员：{noMissNames}</p>
        </>
      ),
      alertType: "error" as const,
    };
  }, [PiLiangNames, PiliangTime, last_records, full_records, work_type]);

  // ======================== 批量上下班 ========================

  const handleQiandao_PILIANG = (mode: "上班" | "下班") => {
    const now = PiliangTime?.millisecond(0).toISOString().replace("T", " ");
    // 不设置millisecond为0的话会有一个随机值，这是dayjs的行为；这会导致出现看起来一个时间但是出现早于上班时间的错误，不过只有在同一个时间才会这样，正常使用中不会触发bug
    if (mode === "上班") {
      const records = PiLiangNames.map((name) => {
        return {
          worker_id: name.key,
          check_in: now,
          check_out: "",
          // @ts-expect-error,111
          work: work_type.value,
        };
      });
      CreateBatchRecord({
        values: records,
      });
    } else if (mode === "下班") {
      const ids = PiLiangNames.map((name) => {
        const record = last_records?.find(
          (item) => item.worker_id === name.key
        );
        return record?.id;
      });
      // .filter((id) => id!== undefined);
      UpdateBatchRecord({
        // @ts-expect-error,111
        ids: ids,
        values: {
          check_out: now,
        },
      });
    }
  };
  // ======================== UI ========================

  return (
    <List>
      <div className={`min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8`}>
        <Card className="max-w-6xl mx-auto">
          <div className="mb-6">
            <AntdTitle level={3} className="mb-2! text-center">
              签到录入系统
            </AntdTitle>
            <>
              <p className="mt-2">
                未下班人员：
                {UnCheckOutNames?.map((item) => (
                  <Tag color="orange" key={item}>
                    {item}
                  </Tag>
                ))}
              </p>
              <Alert
                className={datesWithoutToday.length ? "" : "hidden!"}
                message={
                  "以下日期存在未下班人员：" + datesWithoutToday.join(", ")
                }
                type="error"
                showIcon
              />
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 mt-2">
                <Space direction="vertical" className="w-full">
                  <Alert
                    message={
                      All_checkOut ? "今日有未下班人员" : "今日所有人员都已下班"
                    }
                    type={All_checkOut ? "warning" : "success"}
                    showIcon
                  />
                  <Select
                    placeholder="请选择考勤人员"
                    {...WorkersSelectProps}
                    // style={{ width: 200 }}
                    className="w-full"
                    value={PiLiangNames}
                    mode="multiple"
                    allowClear
                    labelInValue
                    optionRender={(option) => (
                      <Space>
                        {/* 添加待上班和待下班Tag */}
                        {UnCheckOutNames?.includes(option.data.label) ? (
                          <Tag color="red">待下班</Tag>
                        ) : (
                          <Tag color="green">待上班</Tag>
                        )}
                        {option.data.label}
                      </Space>
                    )}
                    onChange={(value: any) => {
                      // 这里写any，不然会有一堆类型错误
                      setPiLiangNames(value);
                    }}
                  />
                </Space>
                <Space>
                  <Space direction="vertical">
                    <Tooltip
                      title={XiaBanButtonDisabled ? "" : "下班时不可选择工作"}
                    >
                      <Select
                        placeholder="请选择考勤类型"
                        {...workTypeSelectProps}
                        style={{ width: 170 }}
                        allowClear
                        labelInValue
                        disabled={!XiaBanButtonDisabled}
                        value={work_type}
                        onChange={set_work_type}
                      />
                    </Tooltip>

                    {/* <Tooltip
                title={UnCheckOutNames?.length ? "请先签退此日所有人员" : ""}
              > */}
                    <DatePicker
                      showTime
                      allowClear={false}
                      style={{ width: 170 }}
                      // disabled={!!UnCheckOutNames?.length}
                      value={PiliangTime}
                      onChange={(date, dateString) => {
                        setPiliangTime(date);
                      }}
                    />
                    {/* </Tooltip> */}
                  </Space>
                  <Space direction="vertical">
                    <Popconfirm
                      title="确认要上班打卡吗？"
                      description="确保信息准确"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => {
                        handleQiandao_PILIANG("上班");
                        // setPiLiangNames([]);
                        // setPiliangTime(dayjs());
                        // set_work_type("");
                      }}
                    >
                      <AntdButton
                        type="primary"
                        icon={<CheckOutlined />}
                        disabled={ShangBanButtonDisabled}
                      >
                        上班打卡
                      </AntdButton>
                    </Popconfirm>
                    <Popconfirm
                      title="确认要下班打卡吗？"
                      description="确保信息准确"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => {
                        handleQiandao_PILIANG("下班");
                        // setPiLiangNames([]);
                        // setPiliangTime(dayjs());
                        // set_work_type("");
                      }}
                    >
                      <AntdButton
                        danger
                        icon={<LogoutOutlined />}
                        disabled={XiaBanButtonDisabled}
                      >
                        下班打卡
                      </AntdButton>
                    </Popconfirm>
                  </Space>
                </Space>
              </div>

              <Alert
                message="校验情况"
                description={AlertDescription}
                type={AlertType}
                showIcon
              />
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
