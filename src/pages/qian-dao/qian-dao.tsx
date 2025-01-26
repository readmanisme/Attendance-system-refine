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
} from "antd";
const { Title, Paragraph, Text, Link } = Typography;

import { useState, useContext, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card, SegmentedControl } from "@mantine/core";
import {
  LogicalFilter,
  useCreate,
  useList,
  useNotification,
  useUpdate,
} from "@refinedev/core";
import {
  CheckOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import RealTimeClock from "@/components/RealTimeClock";
import { ColorModeContext } from "../../contexts/color-mode";
import { List, useSelect } from "@refinedev/antd";
import { ColumnsType } from "antd/es/table";
import PySearchSelect from "@/components/PySearchSelect";
import { set } from "lodash";

const { Title: AntdTitle } = Typography;
export default function QianDaoPage() {
  const [selectValue, setSelectValue] = useState<string>();
  const [selectID, setSelectID] = useState<string>();
  const { mode } = useContext(ColorModeContext);
  const colorMode = mode;
  // 来自mantine的useLocalStorage不妥，会导致颜色混乱,而且也不实时
  // readLocalStorageValue不具有响应性
  //来自react use 的useLocalStorage更是一点用处都没有
  // const [colorMode, setcolorMode] = useState("light")

  const { data: raw_workers, isLoading: loading_workers } = useList({
    resource: __Workers_TableName,
    pagination: { mode: "off" },
  });
  //   const workers = raw_workers?.data.map((item) => item.name);
  const workers = raw_workers?.data;
  // 定义变量，用于确定当前选择是上班还是下班
  const [workOrOff, setWorkOrOff] = useState("上班");
  const { data: raw_unClockOutWorkers } = useList({
    resource: __AttendanceRecord_TableName,
    filters: [
      {
        field: "check_out",
        operator: "eq",
        value: "",
      },
    ],
  });

  const { data: raw_todayRecord, isLoading: loading_todayRecord } = useList({
    resource: __AttendanceRecord_TableName,
    pagination: {
      mode: "off",
    },
    filters: [
      {
        operator: "and",
        value: [
          // 筛选出今天的记录
          // 筛选方法来自https://pocketbase.io/docs/collections/#datefield
          {
            field: "check_in",
            operator: "gte",
            value: dayjs().startOf("day").toISOString().replace("T", " "),
            // value:dayjs().startOf("day").format("YYYY-MM-DD HH:mm:ss.SSS") + "Z",
            // value:dayjs().startOf("day").format("YYYY-MM-DD HH:mm:ss.SSSZ"),
            // pocketbase不识别'2025-01-16 23:59:59.999+08:00'这种格式的
            // 并且不能用T
          },
          {
            field: "check_in",
            operator: "lte",
            // value: dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss.SSS") + "Z",
            // value: dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss.SSSZ"),
            value: dayjs().endOf("day").toISOString().replace("T", " "),
          },
        ],
      },
    ],
    meta: {
      expand: ["work"],
    },
  });

  const { data: last_record } = useList({
    // 此处的uselist等价于pb的getFirstListItem
    resource: __AttendanceRecord_TableName,
    queryOptions: {
      enabled: !!selectID,
    },
    pagination: {
      current: 1,
      pageSize: 1,
    },
    filters: [
      {
        operator: "and",
        value: [
          {
            field: "check_out",
            operator: "eq",
            value: "",
          },
          {
            field: "worker_id",
            operator: "eq",
            value: selectID,
          },
        ],
      },
    ],
  });
  const { mutate: CreateRecord } = useCreate({
    resource: __AttendanceRecord_TableName,
  });
  const { mutate: UpdateRecord } = useUpdate({
    resource: __AttendanceRecord_TableName,
  });
  const { open: notify } = useNotification();
  // useEffect(() => {
  //   if (!last_record?.data?.length || last_record?.data[0].check_in){}
  // }, [last_record?.data])
  const handleQiandao = (mode: "上班" | "下班") => {
    const now = dayjs().toISOString().replace("T", " ");
    if (!last_record?.data?.length || !last_record?.data[0].check_in) {
      // 有可能存在既没有上班有没有下班的意外数据
      if (mode === "下班") {
        notify?.({
          type: "error",
          description: "不应该是下班签到",
          message: "选择了下班，但是缺乏记录，请先上班签到",
        });
        return;
      }
      if (!last_record?.data?.length) {
        CreateRecord({
          values: {
            worker_id: selectID,
            // check_in: now.format("YYYY-MM-DD HH:mm:ss.SSS"),
            check_in: now,
            check_out: "",
            work: work_type_id,
          },
        });
      } else {
        UpdateRecord({
          id: last_record?.data[0].id,
          values: {
            check_in: now,
          },
        });
      }
    } else {
      if (mode === "上班") {
        notify?.({
          type: "error",
          description: "不应该是上班签到",
          message: "选择了上班，但是已经签到，请先下班签退",
        });
        return;
      }
      UpdateRecord({
        id: last_record?.data[0].id,
        values: {
          check_out: now,
        },
      });
    }
  };
  const columns: ColumnsType = [
    {
      title: "员工姓名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "签到时间",
      dataIndex: "checkInTime",
      key: "checkInTime",
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          {dayjs(text).format("YYYY-MM-DD HH:mm:ss")}
        </Space>
      ),
    },
    {
      title: "工作",
      dataIndex: "workType",
      key: "workType",
    },
    {
      title: "状态",
      key: "status",
      dataIndex: "status",
      render: (status: string) => {
        const statusMap = {
          pending: { text: "待签退", color: "warning" },
          "checked-in": { text: "已签到", color: "success" },
          "checked-out": { text: "已签退", color: "default" },
        };
        const current = statusMap[status as keyof typeof statusMap];
        return <Badge status={current.color as any} text={current.text} />;
      },
    },
    {
      title: "签退时间",
      dataIndex: "checkOutTime",
      key: "checkOutTime",
      render: (text) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
  ];
  let employees = raw_todayRecord?.data?.map((worker) => {
    return {
      name: workers?.find((workerItem) => workerItem.id === worker.worker_id)
        ?.name,
      checkInTime: worker.check_in,
      // status:last_record?.data?.length? 'checked-in' : 'pending',
      // checkOutTime:last_record?.data?.length? last_record?.data[0].check_out.slice(0,-5) : ''
      status: worker.check_out ? "checked-out" : "pending",
      checkOutTime: worker.check_out,
      key: worker.id,
      worker_id: worker.worker_id,
      workType: worker?.expand?.work?.name,
    };
  });
  const UnCheckOutNames = employees
    ?.filter((item) => item.status === "pending")
    ?.map((item) => item.name);
  const A_div_color = colorMode === "dark" ? "dark:bg-gray-800" : "bg-gray-50";
  // 排序employees，status是pending的放在上面，check_out时间晚的放在上面
  employees = employees?.sort((a, b) => {
    // 首先按 status 排序，pending 的排在最前面
    if (a.status === "pending" && b.status !== "pending") {
      return -1;
    } else if (b.status === "pending" && a.status !== "pending") {
      return 1;
    } else {
      // 如果 status 相同，按 check_out 时间排序，check_out 时间晚的排前面
      const timeA = dayjs(a.checkOutTime);
      const timeB = dayjs(b.checkOutTime);

      if (timeA.isAfter(timeB)) {
        return -1;
      } else if (timeA.isBefore(timeB)) {
        return 1;
      } else {
        return 0;
      }
    }
  });
  const { selectProps: workTypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
  });

  function get_alert_description() {
    if (!selectID) {
      return "选择人员后显示签到记录";
    }
    // 查找签到记录
    // const record = employees?.find(
    //   (employee) => employee.worker_id === selectID
    // );

    // 查找该员工的所有签到记录
    const records = employees
      ?.filter((employee) => employee.worker_id === selectID)
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return 0; // 如果两个记录的状态相同，则保持原有顺序
      });

    // if (!record) {
    if (!records || records.length === 0) {
      // return `${selectValue}未签到，请先签到`;
      return (
        <>
          {selectValue} <Tag color="orange">未签到</Tag>，请先签到
        </>
      );
    }
    //   const { name, checkInTime, checkOutTime, status } = record;
    //   if (status === "pending") {
    //     // TODO 应该将pending更换为cheched-in
    //     // return `${name}已签到，签到时间：${checkInTime}`;
    //     return <>{name} <Tag color="green">已签到</Tag>，签到时间：{checkInTime}</>;
    //   } else if (status === "checked-out") {
    //     // return `${name}已签退，签退时间：${checkOutTime}`;
    //     return <>{name} <Tag color="red">已签退</Tag>，签退时间：{checkOutTime}</>;
    //   } else {
    //     return `${name}未签到，请先签到`;
    // }

    return records.map((record, index) => {
      const { name, checkInTime, checkOutTime, status } = record;
      let statusMessage;
      if (status === "pending") {
        statusMessage = (
          <>
            <Tag color="green">已签到</Tag>，签到时间：
            {dayjs(checkInTime).format("YYYY-MM-DD HH:mm:ss")}
          </>
        );
      } else if (status === "checked-out") {
        statusMessage = (
          <>
            <Tag color="red">已签退</Tag>，签退时间：
            {dayjs(checkOutTime).format("YYYY-MM-DD HH:mm:ss")}
          </>
        );
      } else {
        statusMessage = (
          <>
            <Tag color="orange">未签到</Tag>，请先签到
          </>
        );
      }
      return (
        <div key={index}>
          {name} {statusMessage}
        </div>
      );
    });
  }
  const [work_type_value, set_work_type_value] = useState<string>();
  const [work_type_id, set_work_type_id] = useState<string>();
  const [QiandaoMode, setQiandaoMode] = useState<string>("批量");
  const { selectProps: WorkersSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
  });
  const [PiliangTime, setPiliangTime] = useState<Dayjs>();
  const [PiLiangNames, setPiLiangNames] = useState<
    { key: string; value: string; label: string }[]
  >([]);
  const get_last_records_workers_filter = () => {
    if (PiLiangNames.length === 0) {
      return undefined;
    }
    return {
      operator: "or",
      value: PiLiangNames.map((item) => ({
        field: "worker_id",
        operator: "eq",
        value: item.value,
      })),
    };
  };
  const { data: last_records } = useList({
    resource: __AttendanceRecord_TableName,
    queryOptions: {
      enabled: PiLiangNames.length > 0,
    },
    pagination: {
      mode: "off",
    },
    filters: [
      {
        operator: "and",
        value: [
          {
            field: "check_out",
            operator: "eq",
            value: "",
          },
          get_last_records_workers_filter() as LogicalFilter,
        ],
      },
    ],
  });
  const [ShangBanButtonDisabled, setShangBanButtonDisabled] = useState(true);
  const [XiaBanButtonDisabled, setXiaBanButtonDisabled] = useState(true);
  const [AlertDescription, setAlertDescription] =
    useState<React.ReactNode>("此处显示是否可以进行上下班操作的信息");
  const [AlertType, setAlertType] = useState<
    "success" | "info" | "warning" | "error"
  >("info");
  const set_buttons_disabled = useCallback(() => {
    if (PiLiangNames.length === 0) {
      setShangBanButtonDisabled(true);
      setXiaBanButtonDisabled(true);
      setAlertDescription("请选择考勤人员");
      setAlertType("warning");
      return;
    }
    if (PiliangTime === undefined || PiliangTime === null) {
      setShangBanButtonDisabled(true);
      setXiaBanButtonDisabled(true);
      setAlertDescription("请选择考勤时间");
      setAlertType("warning");
      return;
    }
    // 找出所有不在 last_records 中的 key
    const missingKeys = PiLiangNames.filter(
      (name) =>
        !last_records?.data.some((record) => record.worker_id === name.key)
    );
    if (missingKeys.length === 0) {
      // 所有人都没下班，那就可以下班
      setXiaBanButtonDisabled(false);
      setAlertDescription("可以下班");
      setAlertType("success");
      return;
    } else if (missingKeys.length === PiLiangNames.length) {
      // 所有人都下班了，那就可以上班
      setAlertDescription("选择工作");
      setAlertType("warning");
      if (work_type_id) {
        setShangBanButtonDisabled(false);
        setAlertDescription("可以上班");
        setAlertType("success");
      }
      return;
    } else {
      // 部分人miss，也就是说部分人已经下班，而其余人没有下班
      setShangBanButtonDisabled(true);
      setXiaBanButtonDisabled(true);
      const missingNames = missingKeys.map((item) => item.label).join(", ");
      const NoMissNames = PiLiangNames.filter(
        (item) => !missingKeys.some((miss) => miss.key === item.key)
      )
        .map((item) => item.label)
        .join(", ");
      setAlertDescription(
        <>
          <p>如果你需要下班，请去除下列已下班人员：{missingNames}</p>
          <br />
          <p>如果你需要上班，请去除下列已上班人员：{NoMissNames}</p>
        </>
      );
      setAlertType("error");
    }
    // const can_check_in = last_records?.data.every(
    //   (record) => record.check_out !== ""
    // );
    // const has_checked_out = last_records?.data.some(
    //   // 检查是否存在未签退
    //   (record) => record.check_out === ""
    // );
    // if (has_checked_in && has_checked_out) {
    //   setShangBanButtonDisabled(false);
    //   setXiaBanButtonDisabled(false);
    //   return;
    // }
    // if (has_checked_in) {
    //   setShangBanButtonDisabled(true);
    //   setXiaBanButtonDisabled(false);
    //   return;
    // }
    // if (has_checked_out) {
    //   setShangBanButtonDisabled(false);
    //   setXiaBanButtonDisabled(true);
    //   return;
    // }
  }, [PiLiangNames, PiliangTime, last_records, work_type_id]);
  useEffect(() => {
    set_buttons_disabled();
  }, [last_records?.data, set_buttons_disabled]);
  const handleQiandao_PILIANG = (mode: "上班" | "下班") => {
    const now = PiliangTime?.toISOString().replace("T", " ");
    if (mode === "上班") {
      PiLiangNames.forEach((name) => {
        CreateRecord({
          values: {
            worker_id: name.key,
            check_in: now,
            check_out: "",
            work: work_type_id,
          },
        });
      });
    } else if (mode === "下班") {
      PiLiangNames.forEach((name) => {
        const record = last_records?.data.find(
          (item) => item.worker_id === name.key
        );
        UpdateRecord({
          id: record?.id,
          values: {
            check_out: now,
          },
        });
      });
    }
  };

  const get_qiandao_component = () => {
    if (QiandaoMode === "单人") {
      return (
        <>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 mt-6">
            <RealTimeClock />
            {/* <div className="blue"> */}
            <Space>
              <PySearchSelect
                onChangeFn={(value: { value: string; label: string }) => {
                  setSelectValue(value?.label);
                  setSelectID(value?.value);
                }}
                options={null}
                // options={workers?.map((worker) => ({
                //   label: worker.name,
                //   value: worker.id,
                // }))||[]}
              />
              <Select
                placeholder="请选择考勤类型"
                {...workTypeSelectProps}
                style={{ width: 150 }}
                allowClear
                labelInValue
                // labelInValue很关键！！！
                onChange={(value: { value: string; label: string }) => {
                  set_work_type_value(value?.label);
                  set_work_type_id(value?.value);
                }}
              />
              <AntdButton
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleQiandao("上班")}
                // disabled={!selectValue}
                disabled={
                  !work_type_id || !selectID || !!last_record?.data?.length
                }
              >
                上班打卡
              </AntdButton>
              {/* TODO 可以添加一些tooltip，例如需要选择工作然后才能打卡 */}
              <AntdButton
                danger
                icon={<LogoutOutlined />}
                onClick={() => handleQiandao("下班")}
                // disabled={!selectValue}
                disabled={
                  !selectID ||
                  !last_record?.data?.length ||
                  !last_record?.data[0].check_in
                }
              >
                下班打卡
              </AntdButton>
            </Space>
            {/* </div> */}
          </div>
          <Alert
            message="所选择人员的签到记录"
            description={get_alert_description()}
            type="info"
            showIcon
          />
        </>
      );
    } else if (QiandaoMode === "批量") {
      return (
        <>
          <p className="mt-2">未下班人员：{UnCheckOutNames?.join(", ")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 mt-2">
            <Select
              placeholder="请选择考勤人员"
              {...WorkersSelectProps}
              // style={{ width: 200 }}
              className="w-full"
              value={PiLiangNames}
              mode="multiple"
              allowClear
              labelInValue
              optionRender={(option)=>(
                <Space>
                  {/* 添加待上班和待下班Tag */}
                  {UnCheckOutNames?.includes(option.data.label) ? <Tag color="red">待下班</Tag> : <Tag color="green">待上班</Tag>}
                  {option.data.label}
                </Space>
      )}
              onChange={(value: any) => {
                // 这里写any，不然会有一堆类型错误
                setPiLiangNames(value);
              }}
            />
            <Space>
              <Space direction="vertical">
                <Select
                  placeholder="请选择考勤类型"
                  {...workTypeSelectProps}
                  style={{ width: 150 }}
                  allowClear
                  labelInValue
                  value={work_type_value ? { value: work_type_value, label: work_type_value } : undefined}
                  onChange={(value: { value: string; label: string }) => {
                    set_work_type_value(value?.label);
                    set_work_type_id(value?.value);
                  }}
                />
                <DatePicker
                  showTime
                  style={{ width: 150 }}
                  value={PiliangTime}
                  onChange={(date, dateString) => {
                    setPiliangTime(date);
                  }}
                />
              </Space>
              <Space direction="vertical">
                <AntdButton
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {handleQiandao_PILIANG("上班");
                    setPiLiangNames([]);
                    setPiliangTime(undefined);
                    set_work_type_value("");
                    set_work_type_id("");
                    set_buttons_disabled();
                  }}
                  disabled={ShangBanButtonDisabled}
                >
                  上班打卡
                </AntdButton>
                {/* TODO 可以添加一些tooltip，例如需要选择工作然后才能打卡 */}
                <AntdButton
                  danger
                  icon={<LogoutOutlined />}
                  onClick={() => {handleQiandao_PILIANG("下班");
                    setPiLiangNames([]);
                    setPiliangTime(undefined);
                    set_work_type_value("");
                    set_work_type_id("");
                    set_buttons_disabled();
                  }}
                  disabled={XiaBanButtonDisabled}
                >
                  下班打卡
                </AntdButton>
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
      );
    }
  };
  return (
    <List>
      {/* <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8"> */}
      <div className={`min-h-screen ${A_div_color} p-4 sm:p-6 lg:p-8`}>
        <Card className="max-w-6xl mx-auto">
          <div className="mb-6">
            <AntdTitle level={3} className="!mb-2 text-center">
              员工签到系统
            </AntdTitle>
            {/* 显示批量time */}
            <SegmentedControl
              className="mb-2 -z-0"
              fullWidth
              color="blue"
              value={QiandaoMode}
              onChange={(value) => {
                if (value === "单人") {
                  setQiandaoMode(value);
                  setSelectValue("");
                  setSelectID("");
                  set_work_type_value("");
                  set_work_type_id("");
                } else if (value === "批量") {
                  setQiandaoMode(value);
                  setPiLiangNames([]);
                  setPiliangTime(undefined);
                  set_work_type_value("");
                  set_work_type_id("");
                  set_buttons_disabled();
                }
              }}
              data={["单人", "批量"]}
            />
            {/* <p>当前颜色模式:{colorMode}</p> */}
            {get_qiandao_component()}
          </div>

          <Table
            // className="mt-4"
            columns={columns}
            dataSource={employees}
            // pagination={false}
            rowClassName={(record) =>
              record.status === "pending" ? "bg-blue-50" : ""
            }
          />
        </Card>
      </div>
    </List>
  );
}
