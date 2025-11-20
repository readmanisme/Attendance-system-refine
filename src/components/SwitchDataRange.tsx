import { useSomeStore } from "@/stores";
import { DatePicker, Button } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
export const SwitchDataRange = ({ onApplyFn = () => {} }) => {
  const { recordDateRange, setRecordDateRange } = useSomeStore();
  const { RangePicker } = DatePicker;
  const [temp, setTemp] = useState<string[]>(recordDateRange);
  return (
    <div className="flex flex-row justify-end items-center gap-2">
      <RangePicker
        allowClear={false}
        className="w-56"
        defaultValue={[dayjs(recordDateRange[0]), dayjs(recordDateRange[1])]}
        onChange={(date, dateString) => {
          // setRecordDateRange(dateString);
          setTemp(dateString);
        }}
        picker="month"
      />
      {/* <span>(不含后一月)</span> */}
      <Button
        type="primary"
        onClick={() => {
          // setRecordDateRange("1999-01-01", "2099-12-31"); //因为工时页面也要用，如果这么大的范围大约要爆炸
          setRecordDateRange(temp);
          onApplyFn();
        }}
      >
        应用
      </Button>
    </div>
  );
};
