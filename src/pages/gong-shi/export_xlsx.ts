/**
 * "工时记录.xlsx" 导出。
 * 工时/薪资聚合直接复用 utils/salary 的计算引擎,保证与页面显示一致。
 */
import type { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { formatHoursExact } from "@/utils/workTime";
import { getPb } from "@/utils/pocketbase";
import { computeSalaryStats } from "@/utils/salary";
import { UNKNOWN_NAME } from "@/constants";

const exportExcel = async (
  export_range: Dayjs[],
  exportPerson: string,
  salaryDict: Record<string, number>,
  __BACKEND_API_URL__: string,
) => {
  const XLSX = await import("xlsx");
  const pb = getPb(__BACKEND_API_URL__);

  // 日期边界(work_date 是 "YYYY-MM-DD" 文本)
  const start_day = export_range[0].format("YYYY-MM-DD");
  const end_day = export_range[1].endOf("month").format("YYYY-MM-DD");

  // 并行加载所有数据(月/日工时由考勤记录在引擎中聚合,不读视图)
  const [attendanceRecords, workers, workTypes] = await Promise.all([
    pb.collection(__AttendanceRecord_TableName).getFullList({
      // 注意:PocketBase 过滤语法是单个 "=",不能写 "=="
      filter:
        `work_minutes != null && work_date >= '${start_day}' && work_date <= '${end_day}'` +
        (exportPerson ? ` && worker_id = '${exportPerson}'` : ""),
    }),
    pb.collection(__Workers_TableName).getFullList({
      filter: exportPerson ? `id = '${exportPerson}'` : "",
    }),
    pb.collection(__WorkTypes_TableName).getFullList(),
  ]);

  const workerMap = new Map<string, string>(workers.map((w: any) => [w.id, w.name]));
  const workTypeMap = new Map<string, string>(workTypes.map((t: any) => [t.id, t.name]));

  // 与页面同一套计算引擎
  const stats = computeSalaryStats(attendanceRecords as any[], {
    workerMap,
    workTypeMap,
    salaryDict,
  });

  // 明细 sheet:一条考勤记录一行
  const attendanceSheetData = (attendanceRecords as any[]).map((record) => {
    const worker_name = workerMap.get(record.worker_id) || UNKNOWN_NAME;
    const work_name = workTypeMap.get(record.work) || UNKNOWN_NAME;
    const info = stats.recordMap.get(String(record.id));
    return {
      序号: record.id,
      工人: worker_name,
      工作类型: work_name,
      总工时: formatHoursExact(record.work_minutes),
      薪资: (info?.salary ?? new Decimal(0)).toNumber(),
      依据: info?.basis ?? "",
      日期: record.work_date,
    };
  });

  // 工时(日) sheet:同一工人同一天合计
  const dayRows: Array<{ 工人: string; 日期: string; 分钟: number; 薪资: Decimal }> = [];
  for (const [workerId, byDate] of stats.dayMinutesMap) {
    const name = workerMap.get(workerId) || UNKNOWN_NAME;
    for (const [date, minutes] of byDate) {
      dayRows.push({
        工人: name,
        日期: date,
        分钟: minutes,
        薪资: stats.daySalaryMap.get(name)?.get(date) ?? new Decimal(0),
      });
    }
  }
  dayRows.sort((a, b) =>
    a.工人 === b.工人 ? (a.日期 < b.日期 ? -1 : 1) : a.工人 < b.工人 ? -1 : 1,
  );
  const workHoursDaySheetData = dayRows.map((g, i) => ({
    序号: i + 1,
    工人: g.工人,
    日期: g.日期,
    总工时: formatHoursExact(g.分钟),
    薪资: g.薪资.toNumber(),
  }));

  // 工时(月) sheet:在日合计上聚合月份
  const monthGroups = new Map<
    string,
    { 工人: string; 月份: string; 分钟: number; 薪资: Decimal }
  >();
  for (const g of dayRows) {
    const month = g.日期.slice(0, 7);
    const key = `${g.工人}_${month}`;
    const existing = monthGroups.get(key);
    if (existing) {
      existing.分钟 += g.分钟;
      existing.薪资 = existing.薪资.add(g.薪资);
    } else {
      monthGroups.set(key, {
        工人: g.工人,
        月份: month,
        分钟: g.分钟,
        薪资: g.薪资,
      });
    }
  }
  const sortedMonths = [...monthGroups.values()].sort((a, b) =>
    a.工人 === b.工人 ? (a.月份 < b.月份 ? -1 : 1) : a.工人 < b.工人 ? -1 : 1,
  );
  const workHoursMonthSheetData = sortedMonths.map((g, i) => ({
    序号: i + 1,
    工人: g.工人,
    月份: g.月份,
    总工时: formatHoursExact(g.分钟),
    薪资: g.薪资.toNumber(),
  }));

  // 创建Excel
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursMonthSheetData), "工时(月)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursDaySheetData), "工时(日)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceSheetData), "考勤记录");
  XLSX.writeFile(wb, "工时记录.xlsx");
};

export default exportExcel;
