import { Show } from "@refinedev/antd";
import { Line } from "@ant-design/plots";
import { useSomeStore } from "@/stores";
import { DatePicker } from "antd";
import dayjs from "dayjs";

export default function XinZiShow() {



  const DemoLine = () => {
    const data = [
      { year: "1991", value: 3 },
      { year: "1992", value: 4 },
      { year: "1993", value: 3.5 },
      { year: "1994", value: 5 },
      { year: "1995", value: 4.9 },
      { year: "1996", value: 6 },
      { year: "1997", value: 7 },
      { year: "1998", value: 9 },
      { year: "1999", value: 13 },
    ];
    const config = {
      data,
      xField: "year",
      yField: "value",
      point: {
        shapeField: "square",
        sizeField: 4,
      },
      interaction: {
        tooltip: {
          marker: false,
        },
      },
      style: {
        lineWidth: 2,
      },
    };
    return <Line {...config} />;
  };
  const { recordDateRange, setRecordDateRange } = useSomeStore();
  const {RangePicker}=DatePicker;
  const getDefaultValue = () => {
    // return [dayjs().subtract(1, "month"),dayjs()];
    if (recordDateRange.length > 0) {
      return [dayjs(recordDateRange[0]),dayjs(recordDateRange[1])]
    } else {
      return [];
    }
  };


  return (
    <Show>
      <div>11111111111111111</div>
      <RangePicker
        className="w-full"
        defaultValue={getDefaultValue()}
        onChange={(dates, dateStrings) => {
          setRecordDateRange(...dateStrings);
        }}
      />
      <DemoLine />
    </Show>
  );
}
