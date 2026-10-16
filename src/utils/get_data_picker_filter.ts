import { useConfigStore } from "@/stores";
import dayjs from "dayjs";
import { useMemo } from "react";

/**
 * 把存档的月范围(["YYYY-MM","YYYY-MM"])换算为 work_date 的起止边界;
 * 考勤记录页与工时&薪资页共用,保证两边筛选口径一致。
 */
export const getWorkDateRange = (recordMonthRange?: string[]) => ({
  gte: dayjs(recordMonthRange?.[0]).startOf("month").format("YYYY-MM-DD"),
  lte: dayjs(recordMonthRange?.[1]).endOf("month").format("YYYY-MM-DD"),
});

/**
 * 考勤记录页的永久筛选:work_date 落在月范围内。
 * 这个只有考勤记录页能用，因为不同的记录要用的筛选器时间级别不一样。
 */
export const useGetDatePickerFilter = () => {
  const recordMonthRange = useConfigStore((s) => s.recordMonthRange);
  return useMemo(() => {
    const { gte, lte } = getWorkDateRange(recordMonthRange);
    return [
      {
        field: "work_date",
        operator: "gte",
        value: gte,
      },
      {
        field: "work_date",
        operator: "lte",
        value: lte,
      },
      {
        field: "worker_id",
        operator: "ne",
        value: "",
      },
    ];
  }, [recordMonthRange]); // 只有在 recordMonthRange 变化时才重新计算
};
