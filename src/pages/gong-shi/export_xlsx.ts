import dayjs from "dayjs";
import Decimal from "decimal.js";
import { getPb } from "@/utils/pocketbase";

const exportExcel = async (
  export_range: dayjs.Dayjs[],
  exportPerson: string,
  SalaryDict: Record<string, number>,
  __BACKEND_API_URL__: string
) => {
  const XLSX = await import("xlsx");
  const pb = getPb(__BACKEND_API_URL__);

  // ✅ 常量定义优化
  const 集合 = {
    考勤记录: __AttendanceRecord_TableName,
    工人: __Workers_TableName,
    工作类型: __WorkTypes_TableName,
    月工时: __WorkHours_Month_ViewName,
    日工时: __WorkHours_Day_ViewName,
  };

  // ✅ 日期计算复用
  const start = export_range[0].toISOString().replace("T", " ");
  const end = export_range[1].endOf("month").toISOString().replace("T", " ");
  const start_day = export_range[0].format("YYYY-MM-DD");
  const end_day = export_range[1].endOf("month").format("YYYY-MM-DD");
  const start_month = export_range[0].format("YYYY-MM");
  const end_month = export_range[1].format("YYYY-MM");

  // ✅ 并行加载所有数据
  const [attendanceRecords, workers, workTypes, workHoursMonth, workHoursDay] = await Promise.all([
    pb.collection(集合.考勤记录).getFullList({
      filter:
        `check_in != null && check_out != null && check_in >= '${start}' && check_in <= '${end}'` +
        (exportPerson ? ` && worker_id == '${exportPerson}'` : ""),
    }),
    pb.collection(集合.工人).getFullList({
      filter: exportPerson ? `id == '${exportPerson}'` : "",
    }),
    pb.collection(集合.工作类型).getFullList(),
    pb.collection(集合.月工时).getFullList({
      filter:
        `work_month >= '${start_month}' && work_month <= '${end_month}'` +
        (exportPerson ? ` && worker_id == '${exportPerson}'` : ""),
    }),
    pb.collection(集合.日工时).getFullList({
      filter:
        `work_date >= '${start_day}' && work_date <= '${end_day}'` +
        (exportPerson ? ` && worker_id == '${exportPerson}'` : ""),
    }),
  ]);

  // ✅ 转换为快速查找结构
  const workerMap: Map<string, string> = new Map(workers.map((w: any) => [w.id, w.name]));
  const workTypeMap: Map<string, string> = new Map(workTypes.map((t: any) => [t.id, t.name]));

  // ✅ 构建考勤记录
  const attendanceSheetData = attendanceRecords.map((record: any) => {
    const worker_name = workerMap.get(record.worker_id)!;
    const work_name = workTypeMap.get(record.work)!;
    const duration = new Decimal(dayjs(record.check_out).diff(dayjs(record.check_in)) / 3600000); // ms→hour

    const salaryKey =
      `${worker_name}_${work_name}` in SalaryDict
        ? `${worker_name}_${work_name}`
        : worker_name in SalaryDict
        ? worker_name
        : work_name in SalaryDict
        ? work_name
        : "基础";

    const salary = new Decimal(SalaryDict[salaryKey] || 0);
    const totalSalary = duration.mul(salary);

    return {
      序号: record.id,
      工人: worker_name,
      签到时间: dayjs(record.check_in).format("YYYY/MM/DD HH:mm"),
      签退时间: dayjs(record.check_out).format("YYYY/MM/DD HH:mm"),
      工作类型: work_name,
      总工时: duration.toNumber(),
      薪资: totalSalary.toNumber(),
      依据: `${salaryKey}:${salary}`,
      日期: dayjs(record.check_in).format("YYYY-MM-DD"), // ✅ 新增字段用于后续索引
    };
  });

  // ✅ 用 Map 聚合日薪资
  const daySalaryMap = new Map<
    string,
    { 工人: string; 日期: string; 总工时: number; 薪资: Decimal }
  >();
  for (const rec of attendanceSheetData) {
    const key = `${rec.工人}_${rec.日期}`;
    const existing = daySalaryMap.get(key);
    if (existing) {
      existing.总工时 += rec.总工时;
      existing.薪资 = existing.薪资.add(rec.薪资);
    } else {
      daySalaryMap.set(key, {
        工人: rec.工人,
        日期: rec.日期,
        总工时: rec.总工时,
        薪资: new Decimal(rec.薪资),
      });
    }
  }

  // ✅ 生成 workHoursDaySheetData
  const workHoursDaySheetData = workHoursDay.map((record: any) => {
    const worker_name = workerMap.get(record.worker_id);
    const key = `${worker_name}_${record.work_date}`;
    const agg = daySalaryMap.get(key);
    return {
      序号: record.id,
      工人: worker_name,
      日期: record.work_date,
      总工时: record.total_work_hours ?? agg?.总工时 ?? 0,
      薪资: agg?.薪资?.toNumber() ?? 0,
    };
  });

  // ✅ 聚合月薪资
  const monthSalaryMap = new Map<
    string,
    { 工人: string; 月份: string; 总工时: number; 薪资: Decimal }
  >();
  for (const rec of workHoursDaySheetData) {
    const month = dayjs(rec.日期).format("YYYY-MM");
    const key = `${rec.工人}_${month}`;
    const existing = monthSalaryMap.get(key);
    if (existing) {
      existing.总工时 += rec.总工时;
      existing.薪资 = existing.薪资.add(rec.薪资);
    } else {
      monthSalaryMap.set(key, {
        工人: rec.工人!,
        月份: month,
        总工时: rec.总工时,
        薪资: new Decimal(rec.薪资),
      });
    }
  }

  const workHoursMonthSheetData = workHoursMonth.map((record: any) => {
    const worker_name = workerMap.get(record.worker_id);
    const key = `${worker_name}_${record.work_month}`;
    const agg = monthSalaryMap.get(key);
    return {
      序号: record.id,
      工人: worker_name,
      月份: record.work_month,
      总工时: record.total_work_hours ?? agg?.总工时 ?? 0,
      薪资: agg?.薪资?.toNumber() ?? 0,
    };
  });

  // ✅ 创建Excel（XLSX调用不变）
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursMonthSheetData), "工时(月)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursDaySheetData), "工时(日)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceSheetData), "考勤记录");
  XLSX.writeFile(wb, "工时记录.xlsx");
};

export default exportExcel;
