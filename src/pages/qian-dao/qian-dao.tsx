import { Select as AntdSelect,Space,Typography,Button as AntdButton, Table, Badge } from "antd";
import { useCallback, useState } from "react";
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
import { useCreate, useList, useNotification, useResource, useUpdate } from "@refinedev/core";
import { CheckOutlined, ClockCircleOutlined, LogoutOutlined } from "@ant-design/icons";
import { r } from "react-router/dist/development/fog-of-war-DLtn2OLr";
const { Title:AntdTitle } = Typography
export default function QianDaoPage() {
  const [highoightWord, setHighoightWord] = useState([]);
  const [selectValue, setSelectValue] = useState<string>();
  const [selectID, setSelectID] = useState<string>();
  const {
    data: raw_workers,
    isLoading,
    isError,
  } = useList({ resource: "workers_test", pagination: { mode: "off" } });
  //   const workers = raw_workers?.data.map((item) => item.name);
  const workers = raw_workers?.data;
  // 定义变量，用于确定当前选择是上班还是下班
  const [workOrOff, setWorkOrOff] = useState("上班");
  const {data:raw_unClockOutWorkers}=useList({
    resource: "attendance_record_test",
    filters:[
      {
        field: "check_out",
        operator: "eq",
        value: "",
      }
    ]
  });
  const unClockOutWorkers=raw_unClockOutWorkers?.data.map((item)=>{
    return {
      // name需要根据worker_id到workers中获取真实姓名
      name:workers?.find((worker)=>worker.id===item.worker_id)?.name,
      time:item.check_in.slice(0,-5),
      id:item.id
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

  const handleQiandao = (mode:"上班"|"下班") => {
    // 使用dayjs获取当前时间，并格式化为“2025-01-01 12:00:00.000Z"
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS")+"Z";
    // dayjs.tz.setDefault("Africa/Abidjan")
    // let now = dayjs();
    // console.log("点击了签到");
    if (!last_record?.data?.length) {
      if (mode === "下班"){
        notify?.({
          type:"error",
          description:"不应该是下班签到",
          message:"选择了下班，但是缺乏记录，请先上班签到"
        })
        return;
      }
      CreateRecord({
        values: {
          worker_id: selectID,
          // check_in: now.format("YYYY-MM-DD HH:mm:ss.SSS"),
          check_in: now,
          check_out: "",
        },
      });
    } else {
      if (mode === "上班") {
        notify?.({
          type:"error",
          description:"不应该是上班签到",
          message:"选择了上班，但是已经签到，请先下班签退"
        })
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
      title: '员工姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '签到时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        const statusMap = {
          'pending': { text: '待签退', color: 'warning' },
          'checked-in': { text: '已签到', color: 'success' },
          'checked-out': { text: '已签退', color: 'default' }
        }
        const current = statusMap[status as keyof typeof statusMap]
        return <Badge status={current.color as any} text={current.text} />
      }
    },
    {
      title: '签退时间',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      render: (text) => text || '-'
    }
  ]

  const employees=unClockOutWorkers?.map((worker)=>{
    return {
      name:worker.name,
      checkInTime:worker.time,
      // status:last_record?.data?.length? 'checked-in' : 'pending',
      // checkOutTime:last_record?.data?.length? last_record?.data[0].check_out.slice(0,-5) : ''
            status:'pending',
      checkOutTime:''
    }
  })

  return (
    <>
    <div className="flex flex-row justify-center items-center">
      <div>
        <Text align="center" size="lg" className="mt-8 mb-4">
          当前未下班工人
        </Text>

        {unClockOutWorkers?.length === 0 ? (
          <Text align="center">暂无未下班工人</Text>
        ) : (
          unClockOutWorkers?.map((worker) => (
            <Card
              key={worker.id}
              className="mb-1"
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Text>{worker.name}</Text>
              <Text color="gray">上班时间 ：{worker.time}</Text>
            </Card>
          ))
        )}
      </div>
      <div className="flex flex-col items-center justify-center">
        <AntdSelect
          placeholder="请选择考勤人员"
          showSearch
          allowClear
          labelInValue
          optionFilterProp="label"
          style={{ width: 180 }}
          filterOption={(input, option) => SelectSearchPingying(input, option)}
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
              <Highlight highlight={highoightWord}>{option.label}</Highlight>
            );
          }}
        />
        <SegmentedControl
          value={workOrOff}
          onChange={setWorkOrOff}
          color="blue"
          data={[
            { label: "上班", value: "上班" },
            { label: "下班", value: "下班" },
          ]}
        />
        <Button
          onClick={handleQiandao}
          variant="outline"
          color="blue"
          className="mt-4"
          disabled={!selectValue}
        >
          签到
        </Button>
        <div>{dayjs().format("YYYY-MM-DD HH:mm:ss.SSS")}</div>
        <pre>{JSON.stringify(last_record?.data, null, 2)}</pre>
      </div>
    </div>



    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <Card className="max-w-6xl mx-auto">
        <div className="mb-6">
          <AntdTitle level={3} className="!mb-6 text-center">
            员工签到系统
          </AntdTitle>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <AntdSelect
              placeholder="请选择待签到人员"
              style={{ width: '100%', maxWidth: 300 }}
              onChange={(value: { value: string; label: string }) => {
                setHighoightWord([]);
                setSelectValue(value?.label);
                setSelectID(value?.value);
              }}
              options={workers?.map((worker) => ({
                label: worker.name,
                value: worker.id,
              }))}
            />
            <Space>
              <AntdButton 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={() => handleQiandao("上班")}
              >
                上班打卡
              </AntdButton>
              <AntdButton 
                danger
                icon={<LogoutOutlined />}
                onClick={() => handleQiandao("下班")}
              >
                下班打卡
              </AntdButton>
            </Space>
          </div>
        </div>

        <Table 
          columns={columns} 
          dataSource={employees}
          pagination={false}
          rowClassName={(record) => 
            record.status === 'checked-in' ? 'bg-blue-50' : ''
          }
        />
      </Card>
    </div>
    </>
  );
}
