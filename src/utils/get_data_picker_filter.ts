import { useSomeStore } from "@/stores";
import dayjs from "dayjs";
import { useMemo } from "react";

export const useGetDatePickerFilter = () => {
  const { recordDateRange } = useSomeStore();
  // 这个只有考勤记录哪里能用，因为不同的记录要用的筛选器时间级别不一样
  return useMemo(() => {
    let [start, end] = recordDateRange;
    start = dayjs(recordDateRange[0])
      .startOf("month")
      .toISOString()
      .replace("T", " ");
    end = dayjs(recordDateRange[1])
      .endOf("month")
      .toISOString()
      .replace("T", " ");
    return [
      {
        field: "check_in",
        operator: "gte",
        value: start,
      },
      {
        field: "check_in",
        // 这里合适着了，不用改成check_out
        operator: "lte",
        value: end,
      },
      {
        field: "worker_id",
        // 这里合适着了，不用改成check_out
        operator: "ne",
        value: "",
      },
    ];
  }, [recordDateRange]); // 只有在 recordDateRange 变化时才重新计算
};
