/**
 * "工时记录.xlsx" 导出。
 * 工时/薪资聚合直接复用 utils/salary 的计算引擎,保证与页面显示一致;
 * 三个 sheet 的数据构造在 exportSheets.ts(纯函数,可单测)。
 */
import type { Dayjs } from "dayjs";
import { getPb } from "@/utils/pocketbase";
import { buildExportSheets, resolveExportRange } from "./exportSheets";

const exportExcel = async (
  export_range: Dayjs[],
  exportPerson: string,
  salaryDict: Record<string, number>,
  __BACKEND_API_URL__: string,
) => {
  const XLSX = await import("xlsx");
  const pb = getPb(__BACKEND_API_URL__);

  const { startDay, endDay } = resolveExportRange(export_range[0], export_range[1]);

  // 并行加载所有数据(月/日工时由考勤记录在引擎中聚合,不读视图)
  const [attendanceRecords, workers, workTypes] = await Promise.all([
    pb.collection(__AttendanceRecord_TableName).getFullList({
      // 注意:PocketBase 过滤语法是单个 "=",不能写 "=="
      filter:
        `work_minutes != null && work_date >= '${startDay}' && work_date <= '${endDay}'` +
        (exportPerson ? ` && worker_id = '${exportPerson}'` : ""),
    }),
    pb.collection(__Workers_TableName).getFullList({
      filter: exportPerson ? `id = '${exportPerson}'` : "",
    }),
    pb.collection(__WorkTypes_TableName).getFullList(),
  ]);

  const workerMap = new Map<string, string>(workers.map((w: any) => [w.id, w.name]));
  const workTypeMap = new Map<string, string>(workTypes.map((t: any) => [t.id, t.name]));

  const { month, day, detail } = buildExportSheets(attendanceRecords as any[], {
    workerMap,
    workTypeMap,
    salaryDict,
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(month), "工时(月)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(day), "工时(日)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "考勤记录");
  XLSX.writeFile(wb, "工时记录.xlsx");
};

export default exportExcel;
