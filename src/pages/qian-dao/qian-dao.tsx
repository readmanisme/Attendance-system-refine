import {
  Select as AntdSelect,
  Space,
  Typography,
  Button as AntdButton,
  Table,
  Badge,
  Alert,
  Tag,
} from "antd";

import {
  useState,
  useContext,
  useRef,
} from "react";
import { match } from "pinyin-pro";
import dayjs from "dayjs";
import {
  Card,
  Highlight,
} from "@mantine/core";
import {
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

  const {
    data: raw_workers,
  } = useList({ resource: "workers_test", pagination: { mode: "off" } });
  //   const workers = raw_workers?.data.map((item) => item.name);
  const workers = raw_workers?.data;
  // 定义变量，用于确定当前选择是上班还是下班
  const [workOrOff, setWorkOrOff] = useState("上班");
  const { data: raw_unClockOutWorkers } = useList({
    resource: "attendance_record_test",
    filters: [
      {
        field: "check_out",
        operator: "eq",
        value: "",
      },
    ],
  });

  const { data: raw_todayRecord } = useList({
    resource: "attendance_record_test",
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






  const {
    data: last_record,
  } = useList({
    // 此处的uselist等价于pb的getFirstListItem
    resource: "attendance_record_test",
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
    resource: "attendance_record_test",
  });
  const { mutate: UpdateRecord } = useUpdate({
    resource: "attendance_record_test",
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
  const columns: ColumnsType<Employee> = [
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
      workType: worker.expand.work.name,
    };
  });
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
    resource: "workType_test",
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
  // console.log("work_type",work_type_value,work_type_id)
  return (
    <List>
      {/* <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8"> */}
      <div className={`min-h-screen ${A_div_color} p-4 sm:p-6 lg:p-8`}>
        <Card className="max-w-6xl mx-auto">
          <div className="mb-6">
            <AntdTitle level={3} className="!mb-6 text-center">
              员工签到系统
            </AntdTitle>
            {/* <p>当前颜色模式:{colorMode}</p> */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
              <RealTimeClock />
              {/* <div className="blue"> */}
              <Space>
                <PySearchSelect
                onChangeFn={(value: { value: string; label: string }) => {
                  setSelectValue(value?.label);
                  setSelectID(value?.value);
                }}
                options={workers?.map((worker) => ({
                  label: worker.name,
                  value: worker.id,
                }))}
                />
                <AntdSelect
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
                    !(
                      !last_record?.data?.length ||
                      !last_record?.data[0].check_in
                    ) || !work_type_id
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
                    !last_record?.data?.length || !last_record?.data[0].check_in
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
