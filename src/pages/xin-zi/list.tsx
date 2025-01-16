import { BaseRecord, useList } from "@refinedev/core";
import { Input, Space, Table, DatePicker } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { Decimal } from "decimal.js";
import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { useSomeStore } from "@/stores";
const { RangePicker } = DatePicker;
export default function XinZiList() {
  //   const { data: Attendance_records } = useList({
  //     resource: "attendance_record_test",
  //     filters: [
  //       {
  //         field: "check_out",
  //         operator: "ne",
  //         value: "",
  //       },
  //     ],
  //     pagination: {
  //       mode: "off",
  //     },
  //     meta:{
  //         expand: ['worker_id']
  //     }
  //   });
  const { tableProps } = useTable({
    syncWithLocation: true,
    resource: "attendance_record_test",
    filters: {
      permanent: [
        {
          field: "check_out",
          operator: "ne",
          value: "",
        },
      ],
    },
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_id"],
    },
  });
  const [Hourly_rate, setHourly_rate] = useState(10);
  //   对于每一条考勤记录，计算出其工时
  const calculate_work_hours = (record) => {
    const check_in = dayjs(record.check_in);
    const check_out = dayjs(record.check_out);
    // const duration = check_out.diff(check_in, "minute");
    const duration = check_out.diff(check_in);
    // const work_hours = (duration / 60) * Hourly_rate;
    const work_hours = duration;
    return work_hours;
  };

  //   let attendance_records_with_work_hours = Attendance_records?.data?.map(
  let attendance_records_with_work_hours = tableProps.dataSource?.map(
    (record) => {
      return {
        ...record,
        // work_hours: calculate_work_hours(record),
        work_ms: calculate_work_hours(record),
      };
    }
  );
  attendance_records_with_work_hours = attendance_records_with_work_hours?.map(
    (record) => {
      // const work_hours = new Decimal(record.work_ms /1000/60/60).toNumber();
      const work_hours = new Decimal(record.work_ms / 1000 / 60 / 60);
      return {
        ...record,
        work_hours: work_hours,
        salary: work_hours.times(Hourly_rate).toNumber(),
      };
    }
  );
  tableProps.dataSource = attendance_records_with_work_hours;

  const [DataRange, setDataRange] = useState([]);
  const { recordDateRange, setRecordDateRange } = useSomeStore();
  const getDefaultValue = () => {
    // return [dayjs().subtract(1, "month"),dayjs()];
    if (recordDateRange.length > 0) {
      return [dayjs(recordDateRange[0]),dayjs(recordDateRange[1])]
    } else {
      return [];
    }
  };

  // console.log("recordDateRange",recordDateRange);
  return (
    <List>
      {/* xin-zi-show */}
      <div className="flex flex-row justify-center items-center">
        时薪：
        <Input
          value={Hourly_rate}
          onChange={(e) => setHourly_rate(e.target.value)}
          disabled={true}
        />
        元/小时
      </div>
      <RangePicker
        className="w-full"
        defaultValue={getDefaultValue()}
        // 这里必须使用函数，而不是箭头函数，否则会出现TypeError: date4.isValid is not a function
        onChange={(dates, dateStrings) => {
          setDataRange(dateStrings);
          setRecordDateRange(...dateStrings);
        }}
      />
      <pre>{JSON.stringify(DataRange, null, 2)}</pre>
      <Table {...tableProps} rowKey="id" className="mt-4">
        <Table.Column title={"ID"} dataIndex="id" />
        <Table.Column
          title={"员工"}
          dataIndex={["expand", "worker_id", "name"]}
        />
        <Table.Column
          title={"总工时"}
          dataIndex="work_hours"
          render={(value, record, index) => {
            // return(<>{record.expand.worker_id.name}</>)
            return <>{value.toNumber()}</>;
          }}
        />
        <Table.Column title={"工资"} dataIndex="salary" />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              {/* <EditButton hideText size="small" recordItemId={record.id} /> */}
              <ShowButton size="small" recordItemId={record.id}>
                查看详情
              </ShowButton>
              {/* <DeleteButton hideText size="small" recordItemId={record.id} /> */}
            </Space>
          )}
        />
      </Table>
      {/* <pre>{JSON.stringify(tableProps.dataSource, null, 2)}</pre> */}
    </List>
  );
}
