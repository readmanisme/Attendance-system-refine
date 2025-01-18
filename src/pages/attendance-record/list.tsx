import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { useList, type BaseRecord } from "@refinedev/core";
import {
  Space,
  Table,
  Switch,
  Typography,
  Button,
  TableProps,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useSomeStore } from "@/stores";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
export const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();
  const { recordDateRange, setRecordDateRange } = useSomeStore();
  const { RangePicker } = DatePicker;
  
  console.log("datePickerFilter", datePickerFilter);
  const { tableProps, filters, setFilters } = useTable({
    resource: "attendance_record_test",
    syncWithLocation: true,
    sorters: {
      permanent: [
        {
          field: "created",
          order: "desc",
        },
      ],
    },
    filters: {
      // 这里operator是null的实际是不等于null，nnull实际上是等于null
      permanent:datePickerFilter,
      defaultBehavior: "replace",
    },
  });
  interface DataType {
    id: string;
    worker_id: string;
    check_in: string;
    check_out: string;
  }
  type OnChange = NonNullable<TableProps<DataType>["onChange"]>;
  type Filters = Parameters<OnChange>[1];

  type GetSingle<T> = T extends (infer U)[] ? U : never;
  type Sorts = GetSingle<Parameters<OnChange>[2]>;
  const [unclockoutfilter, setUnclockoutfilter] = useState(false);
  const [filteredInfo, setFilteredInfo] = useState<Filters>({});
  const [sortedInfo, setSortedInfo] = useState<Sorts>({});
  const clearFilters = () => {
    setFilteredInfo({});
  };

  const clearAll = () => {
    setFilteredInfo({});
    setSortedInfo({});
  };
  const {
    data: names,
  } = useList({
    resource: "workers_test",
    pagination: {
      mode: "off",
      // 此处只能是off,client无法获取全部内容
    },
  });
  // 从names中取出id和name，构建字典
  const nameDict = {};
  if (names) {
    names.data.map((item) => {
      if (item.id && item.name) {
        nameDict[item.id] = item.name;
      }
    });
  }
  // console.log("names", names);
  const handleUnclockoutfilterChange = (checked: boolean) => {
    setUnclockoutfilter(checked);
  };
  useEffect(() => {
    if (unclockoutfilter) {
      console.log("执行了过滤");
      setFilters([
        {
          field: "check_out",
          operator: "eq",
          value: "",
        },
      ]);
    } else {
      setFilters([], "replace");
    }
  }, [unclockoutfilter]);
  const getDefaultValue = () => {
    // return [dayjs().subtract(1, "month"),dayjs()];
    if (recordDateRange.length > 0) {
      return [dayjs(recordDateRange[0]), dayjs(recordDateRange[1])];
    } else {
      return [];
    }
  };
  return (
    <List>
      {/* <pre>{JSON.stringify(use_get_date_picker_filter(), null, 2)}</pre> */}
      <div className="flex flex-row justify-center items-center ">
        <Typography.Title level={5}>过滤未下班记录</Typography.Title>
        <Switch
          checked={unclockoutfilter}
          onChange={handleUnclockoutfilterChange}
        />
        <Button
          onClick={() => {
            setFilters([
              {
                field: "check_out",
                operator: "eq",
                value: "",
              },
            ]);
          }}
        >
          过滤
        </Button>
        <Button
          onClick={() => {
            setFilters([]);
          }}
        >
          取消过滤
        </Button>
        <Button
          onClick={() => {
            clearFilters();
          }}
        >
          取消表自带过滤
        </Button>
      </div>
      <Space></Space>
      <SwitchDataRange />
      {/* <Table {...tableProps} rowKey="id" onChange={handleTableChange}> */}
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title={"ID"} />
        {/* <Table.Column dataIndex="worker_id" title={"人员ID"} /> */}
        <Table.Column
          dataIndex="worker_id"
          title={"人员姓名"}
          render={(_, record: BaseRecord) => {
            return <div>{nameDict[record.worker_id]}</div>;
          }}
        />
        <Table.Column
          dataIndex="check_in"
          title={"上班时间"}
          // DateField只显示到日期
          // slice(0,-5)去掉.000Z
          render={(_, record: BaseRecord) => {
            // return <>{record.check_in.slice(0, -5)}</>;
            return (
              <>
                {record.check_in
                  ? dayjs(record.check_in).format("YYYY-MM-DD HH:mm:ss")
                  : "--"}
              </>
            );
          }}
        />
        <Table.Column
          dataIndex="check_out"
          title={"下班时间"}
          filters={[
            { text: "非空", value: "非空" },
            { text: "空值", value: "空值" },
          ]}
          filteredValue={filteredInfo.check_out || null}
          filterMultiple={false}
          // TODO 这里表自带的筛选有问题
          render={(_, record: BaseRecord) => {
            return (
              <>
                {record.check_out
                  ? dayjs(record.check_out).format("YYYY-MM-DD HH:mm:ss")
                  : "--"}
              </>
            );
          }}
        />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
