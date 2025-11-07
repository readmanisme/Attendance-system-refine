import { useSomeStore } from "@/stores";
import dayjs from "dayjs";
import { useMemo } from "react";

export const useGetDatePickerFilter = () => {
  const { DatePickerMode, recordDateRange } = useSomeStore();
  // https://chatgpt.com/c/678b49bb-ac80-800a-a327-0e082121190b
  // useMemo很关键！
  return useMemo(() => {
    let [start, end] = recordDateRange;
    start = start
      ? dayjs(start).startOf("day").toISOString().replace("T", " ")
      : null;
    end = end ? dayjs(end).endOf("day").toISOString().replace("T", " ") : null;
    if (!start && !end) {
      return [];
    }
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
    ];
  }, [recordDateRange]); // 只有在 recordDateRange 变化时才重新计算
};
