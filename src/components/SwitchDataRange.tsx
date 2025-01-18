import { useSomeStore } from "@/stores";
import { Segmented, DatePicker, Button } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {  useEffect, useState } from "react";
export const SwitchDataRange = () => {
  const {
    DatePickerMode,
    setDatePickerMode,
    recordDateRange,
    setRecordDateRange,
  } = useSomeStore();
  const { RangePicker } = DatePicker;
  function setPickMonth(data: Dayjs) {
    setRecordDateRange(
      data.startOf("month").format("YYYY-MM-DD"),
      data.endOf("month").format("YYYY-MM-DD")
    );
  }
  const getDefaultValue = (type: "range" | "single") => {
    if (type === "range") {
      if (recordDateRange.length > 0) {
        return [dayjs(recordDateRange[0]), dayjs(recordDateRange[1])];
      } else {
        return [];
      }
    } else if (type === "single") {
      if (recordDateRange.length > 0) {
        return dayjs(recordDateRange[0]);
        // 2022-01-21会识别为2022-01，所以无需额外处理
      } else {
        // return dayjs().startOf("month");
        return null;
      }
    }
  };
  const [key, setkey] = useState(0);
  useEffect(() => {
    setkey(key + 1);
  }, [recordDateRange]);
  function get_date_picker() {
    if (DatePickerMode === "range") {
      return (
        // <div>
        <RangePicker
          allowClear={false}
          key={key}
          className="w-56"
          defaultValue={getDefaultValue("range")}
          onChange={(date, dateString) => {
            setRecordDateRange(...date);
          }}
        />
        // </div>
      );
    } else if (DatePickerMode === "single") {
      return (
        // <div>
        <DatePicker
          allowClear={false}
          key={key}
          className="w-56"
          defaultValue={getDefaultValue("single")}
          onChange={(date, dateString) => {
            setPickMonth(date);
          }}
          picker="month"
        />
        // </div>
      );
    }
  }
  return (
    <div className="flex flex-row justify-end items-center m-4 gap-2">
      <Segmented<string>
        className="bg-indigo-300"
        options={["单月", "区间"]}
        onChange={(value) => {
          if (value === "单月") {
            setDatePickerMode("single");
          } else if (value === "区间") {
            setDatePickerMode("range");
          }
        }}
      />
      {get_date_picker()}
      <Button
        type="primary"
        onClick={() => {
          setRecordDateRange("1999-01-01", "2099-12-31");
        }}
      >
        清空
      </Button>
    </div>
  );
};


