import { useConfigStore } from "@/stores";
import { DatePicker, Button } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
export const SwitchDataRange = ({ onApplyFn = () => {} }) => {
  const { recordMonthRange, setRecordMonthRange } = useConfigStore();
  const { RangePicker } = DatePicker;
  const [temp, setTemp] = useState<string[]>(recordMonthRange);
  return (
    <div className="flex flex-row justify-end items-center gap-2">
      <RangePicker
        allowClear={false}
        className="w-56"
        defaultValue={[dayjs(recordMonthRange[0]), dayjs(recordMonthRange[1])]}
        onChange={(date, dateString) => {
          setTemp(dateString);
        }}
        picker="month"
      />
      <Button
        type="primary"
        onClick={() => {
          setRecordMonthRange(temp);
          onApplyFn();
        }}
      >
        应用
      </Button>
    </div>
  );
};
