import { useSomeStore } from "@/stores";
import dayjs from "dayjs";
import { useMemo } from "react";

export const useGetDatePickerFilter = () => {
  const { recordDateRange } = useSomeStore();
  // 这个只有考勤记录哪里能用，因为不同的记录要用的筛选器时间级别不一样
  return useMemo(() => {
    const start = dayjs(recordDateRange[0]).startOf("month").format("YYYY-MM-DD");
    const end = dayjs(recordDateRange[1]).endOf("month").format("YYYY-MM-DD");
    return [
      {
        field: "work_date",
        operator: "gte",
        value: start,
      },
      {
        field: "work_date",
        operator: "lte",
        value: end,
      },
      {
        field: "worker_id",
        operator: "ne",
        value: "",
      },
    ];
  }, [recordDateRange]); // 只有在 recordDateRange 变化时才重新计算
};
