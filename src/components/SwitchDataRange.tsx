import { useConfigStore } from "@/stores";
import { App, DatePicker, Button } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
export const SwitchDataRange = ({ onApplyFn = () => {} }) => {
  const { recordMonthRange, setRecordMonthRange } = useConfigStore();
  const { message } = App.useApp();
  const { RangePicker } = DatePicker;
  const [temp, setTemp] = useState<string[]>(recordMonthRange);

  // 受控:跟随"待应用"的值,这样选中新范围后不会弹回旧值;store 是最终应用值
  const value = useMemo(
    () =>
      [dayjs(temp?.[0] ?? recordMonthRange[0]), dayjs(temp?.[1] ?? recordMonthRange[1])] as [
        dayjs.Dayjs,
        dayjs.Dayjs,
      ],
    [temp, recordMonthRange],
  );
  const hasChange = temp[0] !== recordMonthRange[0] || temp[1] !== recordMonthRange[1];

  return (
    <div className="flex flex-row justify-end items-center gap-2">
      <RangePicker
        allowClear={false}
        className="w-56"
        value={value}
        onChange={(date, dateString) => {
          // 清空(取消)时保持原范围不被覆盖
          if (date) {
            setTemp(dateString);
          }
        }}
        picker="month"
      />
      <Button
        type="primary"
        // 已应用的范围原样点击无意义,禁用避免"点了没反应"的困惑
        disabled={!hasChange}
        onClick={() => {
          setRecordMonthRange(temp);
          onApplyFn();
          message.success(`已应用：${temp[0]} 至 ${temp[1]}`);
        }}
      >
        应用
      </Button>
    </div>
  );
};
