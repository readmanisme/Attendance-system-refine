/**
 * 取"所选日期"的全部记录并算出简单统计。
 * 单独查一次(而不是复用表格的 dataSource),因为表格会被"按人员筛选"收窄,
 * 而这里要的是当天整体情况;create/update 后 refine 会按资源失效缓存,数字自动刷新。
 */
import { useList } from "@refinedev/core";
import type { Dayjs } from "dayjs";
import { computeDayStats } from "./dayStats";

export const useDayStats = (checkDate: Dayjs) => {
  const { result, query } = useList({
    resource: __AttendanceRecord_TableName,
    pagination: { mode: "off" },
    filters: [{ field: "work_date", operator: "eq", value: checkDate.format("YYYY-MM-DD") }],
    meta: { expand: ["work"] },
  });

  return {
    stats: computeDayStats(result?.data),
    isLoading: query.isLoading,
  };
};
