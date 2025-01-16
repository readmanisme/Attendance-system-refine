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
import { useCallback, useState, useContext, useEffect } from "react";
import { match } from "pinyin-pro";
import dayjs from "dayjs";
import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Card,
  Combobox,
  Container,
  Flex,
  Group,
  Highlight,
  Input,
  InputBase,
  Menu,
  Radio,
  Select,
  Text,
  Title,
  useCombobox,
  SegmentedControl,
  NativeScrollArea,
} from "@mantine/core";
import {
  useCreate,
  useList,
  useNotification,
  useResource,
  useUpdate,
} from "@refinedev/core";
import {
  CheckOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import RealTimeClock from "@/components/RealTimeClock";
import { useThemeMode } from "antd-style";
import { ColorModeContext } from "../../contexts/color-mode";
import { List, useSelect } from "@refinedev/antd";
import { title } from "process";
import { W } from "react-router/dist/development/fog-of-war-DLtn2OLr";

const { Title: AntdTitle } = Typography;
export default function QianDaoPage() {
  const [highoightWord, setHighoightWord] = useState([]);
  const [selectValue, setSelectValue] = useState<string>();
  const [selectID, setSelectID] = useState<string>();
  const { mode, setMode } = useContext(ColorModeContext);
  const colorMode = mode;
  // 来自mantine的useLocalStorage不妥，会导致颜色混乱,而且也不实时
  // readLocalStorageValue不具有响应性
  //来自react use 的useLocalStorage更是一点用处都没有
  // const [colorMode, setcolorMode] = useState("light")
  const {
    data: raw_workers,
    isLoading,
    isError,
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
  const unClockOutWorkers = raw_unClockOutWorkers?.data.map((item) => {
    return {
      // name需要根据worker_id到workers中获取真实姓名
      name: workers?.find((worker) => worker.id === item.worker_id)?.name,
      time: item.check_in.slice(0, -5),
      id: item.id,
    };
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
            field: "check_out",
            operator: "lte",
            // value: dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss.SSS") + "Z",
            // value: dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss.SSSZ"),
            value: dayjs().endOf("day").toISOString().replace("T", " "),
          },
        ],
      },
    ],
    meta:{
      expand:["work"]
    }
  });

  // 未下班工人示例数据，具有姓名和上班时间
  // const unClockOutWorkers = [
  //   { name: "张三", time: "2022-01-01 08:00:00", id: 1 },
  //   { name: "王五", time: "2022-01-01 18:00:00", id: 2 },
  //   { name: "李四", time: "2022-01-02 08:00:00", id: 3 },
  //   { name: "赵六", time: "2022-01-02 18:00:00", id: 4 },
  //   { name: "陈七", time: "2022-01-04 18:00:00", id: 5 },
  //   { name: "杨八", time: "2022-01-05 18:00:00", id: 6 },
  // ];

  function SelectSearch(
    input: string,
    option: { label: string; value: string } | undefined
  ) {
    setHighoightWord([input]);
    return option?.label.toLowerCase().indexOf(input.toLowerCase()) !== -1;
  }
  const SelectSearchPingying = useCallback(
    (input: string, option: { label: string; value: string } | undefined) => {
      const code = input[0].charCodeAt(0);
      // 检查是不是拼音
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        const matchResult = match(option?.label, input);
        if (matchResult) {
          const first: number = matchResult[0];
          const hanzi: string = option?.label.slice(first, first + 1);
          // 只在highoightWord发生变化时更新
          setHighoightWord((prev) => {
            if (!prev.includes(hanzi)) {
              return [...prev, hanzi];
            }
            return prev;
          });
          return true;
        } else {
          return false;
        }
      } else {
        return SelectSearch(input, option);
      }
    },
    [] // 这里我们确保只有SelectSearchPingying函数需要依赖的state或props会触发更新
  );

  const { resource } = useResource();
  const {
    data: last_record,
    isLoading: ListisLoading,
    isError: ListisError,
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
  const { open: notify, close: closeNotify } = useNotification();
  // useEffect(() => {
  //   if (!last_record?.data?.length || last_record?.data[0].check_in){}
  // }, [last_record?.data])
  const handleQiandao = (mode: "上班" | "下班") => {
    // 使用dayjs获取当前时间，并格式化为“2025-01-01 12:00:00.000Z"
    // const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS") + "Z";
    const now = dayjs().toISOString().replace("T", " ");
    // dayjs.tz.setDefault("Africa/Abidjan")
    // let now = dayjs();
    // console.log("点击了签到");
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
            work:work_type_id
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
      title:"工作",
      dataIndex:"workType",
      key:"workType",
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
      render: (text) => text?dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
  ];

  // const employees=unClockOutWorkers?.map((worker)=>{
  //   return {
  //     name:worker.name,
  //     checkInTime:worker.time,
  //     // status:last_record?.data?.length? 'checked-in' : 'pending',
  //     // checkOutTime:last_record?.data?.length? last_record?.data[0].check_out.slice(0,-5) : ''
  //           status:'pending',
  //     checkOutTime:''
  //   }
  // })
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
      workType:worker.expand.work.type
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
    optionLabel: "type",
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
            <Tag color="green">已签到</Tag>，签到时间：{dayjs(checkInTime).format("YYYY-MM-DD HH:mm:ss")}
          </>
        );
      } else if (status === "checked-out") {
        statusMessage = (
          <>
            <Tag color="red">已签退</Tag>，签退时间：{dayjs(checkOutTime).format("YYYY-MM-DD HH:mm:ss")}
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
              <Space>
                <AntdSelect
                  placeholder="请选择考勤人员"
                  showSearch
                  allowClear
                  labelInValue
                  optionFilterProp="label"
                  style={{ width: 180 }}
                  filterOption={(input, option) =>
                    SelectSearchPingying(input, option)
                  }
                  options={workers?.map((worker) => ({
                    label: worker.name,
                    value: worker.id,
                  }))}
                  // onChange={(value) => {
                  onChange={(value: { value: string; label: string }) => {
                    setHighoightWord([]);
                    setSelectValue(value?.label);
                    setSelectID(value?.value);
                  }}
                  onBlur={() => {
                    setHighoightWord([]);
                  }}
                  optionRender={(option) => {
                    return (
                      <Highlight highlight={highoightWord}>
                        {option.label}
                      </Highlight>
                    );
                  }}
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
                    )||!work_type_id
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
            pagination={false}
            rowClassName={(record) =>
              record.status === "checked-in" ? "bg-blue-50" : ""
            }
          />
        </Card>
      </div>
    </List>
  );
}
