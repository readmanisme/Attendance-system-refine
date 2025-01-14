import { Select as AntdSelect } from "antd";
import { useCallback, useState } from "react";
import { match } from "pinyin-pro";
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
import { useList } from "@refinedev/core";

export default function QianDaoPage() {
  const [highoightWord, setHighoightWord] = useState([]);
  const [selectValue, setSelectValue] = useState<string>();
  const {
    data: raw_workers,
    isLoading,
    isError,
  } = useList({ resource: "workers_test" });
  //   const workers = raw_workers?.data.map((item) => item.name);
  const workers = raw_workers?.data;
  // 定义变量，用于确定当前选择是上班还是下班
  const [workOrOff, setWorkOrOff] = useState("上班");
  // 未下班工人示例数据，具有姓名和上班时间
  const unClockOutWorkers = [
    { name: "张三", time: "2022-01-01 08:00:00", id: 1 },
    { name: "王五", time: "2022-01-01 18:00:00", id: 2 },
    { name: "李四", time: "2022-01-02 08:00:00", id: 3 },
    { name: "赵六", time: "2022-01-02 18:00:00", id: 4 },
    { name: "陈七", time: "2022-01-04 18:00:00", id: 5 },
    { name: "杨八", time: "2022-01-05 18:00:00", id: 6 },
  ];

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

  return (
    <div className="flex flex-row justify-center items-center">
      <div>
        <Text align="center" size="lg" className="mt-8 mb-4">
          当前未下班工人
        </Text>

        {unClockOutWorkers.length === 0 ? (
          <Text align="center">暂无未下班工人</Text>
        ) : (
          unClockOutWorkers.map((worker) => (
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
          value: worker.id.toString(),
        }))}
        // onChange={(value) => {
        onChange={(value: { value: string; label: string }) => {
          setHighoightWord([]);
          setSelectValue(value?.label);
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
      </div>
    </div>
  );
}
