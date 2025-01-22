import { useSomeStore } from "@/stores";
import { Segmented, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
export const SwitchDataRangeGongShi = () => {
  const [DatePickerMode, setDatePickerMode] = useState("single");
  const { GongShiData, setGongShiData } = useSomeStore();
  // const [GongShiData, setGongShiData]=useState([dayjs("2024-05-05").startOf('month').format('YYYY-MM'), dayjs("2024-05-05").endOf('month').format('YYYY-MM')])
  const { RangePicker } = DatePicker;
  function setPickMonth(data: Dayjs) {
    setGongShiData([
      data.startOf("month").format("YYYY-MM"),
      data.endOf("month").format("YYYY-MM"),
    ]);
  }
  const getDefaultValue = (type: "range" | "single") => {
    if (type === "range") {
      if (GongShiData.length > 0) {
        return [dayjs(GongShiData[0]), dayjs(GongShiData[1])];
      } else {
        return [];
      }
    } else if (type === "single") {
      if (GongShiData.length > 0) {
        return dayjs(GongShiData[0]);
        // 2022-01-21会识别为2022-01，所以无需额外处理
      } else {
        // return dayjs().startOf("month");
        return undefined;
      }
    }
  };
  const [key, setkey] = useState(0);
  useEffect(() => {
    setkey(key + 1);
  }, [GongShiData]);
  function get_date_picker() {
    if (DatePickerMode === "range") {
      return (
        // <div>
        <RangePicker
          allowClear={false}
          key={key}
          className="w-56"
          defaultValue={getDefaultValue("range") as [Dayjs, Dayjs]}
          onChange={(date, dateString) => {
            setGongShiData(dateString);
          }}
          picker="month"
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
            setPickMonth(date as Dayjs);
          }}
          picker="month"
        />
        // </div>
      );
    }
  }
  return (
    <div className="flex flex-row justify-end items-center mb-2  gap-2">
      <Segmented<string>
        // className="bg-sky-600"
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
      {/* <Button
        type="primary"
        onClick={() => {
          setRecordDateRange("1999-01-01", "2099-12-31");
        }}
      >
        清空
      </Button> */}
    </div>
  );
};
