import type { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { formatHoursExact, minutesToHoursDecimal } from "@/utils/workTime";
import { getPb } from "@/utils/pocketbase";

const exportExcel = async (
  export_range: Dayjs[],
  exportPerson: string,
  SalaryDict: Record<string, number>,
  __BACKEND_API_URL__: string,
) => {
  const XLSX = await import("xlsx");
  const pb = getPb(__BACKEND_API_URL__);

  // ✅ 常量定义优化
  const 集合 = {
    考勤记录: __AttendanceRecord_TableName,
    工人: __Workers_TableName,
    工作类型: __WorkTypes_TableName,
  };

  // ✅ 日期计算复用(work_date 是 "YYYY-MM-DD" 文本)
  const start_day = export_range[0].format("YYYY-MM-DD");
  const end_day = export_range[1].endOf("month").format("YYYY-MM-DD");

  // ✅ 并行加载所有数据(月/日工时不再读视图,由考勤记录在前端聚合)
  const [attendanceRecords, workers, workTypes] = await Promise.all([
    pb.collection(集合.考勤记录).getFullList({
      filter:
        `work_minutes != null && work_date >= '${start_day}' && work_date <= '${end_day}'` +
        (exportPerson ? ` && worker_id == '${exportPerson}'` : ""),
    }),
    pb.collection(集合.工人).getFullList({
      filter: exportPerson ? `id == '${exportPerson}'` : "",
    }),
    pb.collection(集合.工作类型).getFullList(),
  ]);

  // ✅ 转换为快速查找结构
  const workerMap: Map<string, string> = new Map(workers.map((w: any) => [w.id, w.name]));
  const workTypeMap: Map<string, string> = new Map(workTypes.map((t: any) => [t.id, t.name]));

  // ✅ 构建考勤记录
  const attendanceSheetData = attendanceRecords.map((record: any) => {
    const worker_name = workerMap.get(record.worker_id)!;
    const work_name = workTypeMap.get(record.work)!;
    const duration = minutesToHoursDecimal(record.work_minutes);

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
      工作类型: work_name,
      总工时: formatHoursExact(record.work_minutes),
      薪资: totalSalary.toNumber(),
      依据: `${salaryKey}:${salary}`,
      日期: record.work_date, // ✅ "YYYY-MM-DD"文本，用于后续索引
    };
  });

  // ✅ 按(工人,日期)聚合分钟与薪资,不再读日视图(薪资累加口径保持原样)
  const minutesById = new Map<string, number>(
    attendanceRecords.map((r: any) => [r.id, Number(r.work_minutes) || 0]),
  );
  const dayGroups = new Map<string, { 工人: string; 日期: string; 分钟: number; 薪资: Decimal }>();
  for (const rec of attendanceSheetData) {
    const key = `${rec.工人}_${rec.日期}`;
    const minutes = minutesById.get(rec.序号) ?? 0;
    const existing = dayGroups.get(key);
    if (existing) {
      existing.分钟 += minutes;
      existing.薪资 = existing.薪资.add(rec.薪资);
    } else {
      dayGroups.set(key, {
        工人: rec.工人,
        日期: rec.日期,
        分钟: minutes,
        薪资: new Decimal(rec.薪资),
      });
    }
  }

  // ✅ 生成 workHoursDaySheetData(行由考勤记录派生,总工时前端格式化)
  const sortedDays = [...dayGroups.values()].sort((a, b) =>
    a.工人 === b.工人 ? (a.日期 < b.日期 ? -1 : 1) : a.工人 < b.工人 ? -1 : 1,
  );
  const workHoursDaySheetData = sortedDays.map((g, i) => ({
    序号: i + 1,
    工人: g.工人,
    日期: g.日期,
    总工时: formatHoursExact(g.分钟),
    薪资: g.薪资.toNumber(),
  }));

  // ✅ 聚合月薪资(分钟精确求和,薪资累加口径保持原样;work_date 是 "YYYY-MM-DD" 文本,直接截取月份)
  const monthGroups = new Map<string, { 工人: string; 月份: string; 分钟: number; 薪资: Decimal }>();
  for (const g of sortedDays) {
    const month = g.日期.slice(0, 7);
    const key = `${g.工人}_${month}`;
    const existing = monthGroups.get(key);
    if (existing) {
      existing.分钟 += g.分钟;
      existing.薪资 = existing.薪资.add(g.薪资.toNumber());
    } else {
      monthGroups.set(key, {
        工人: g.工人,
        月份: month,
        分钟: g.分钟,
        薪资: new Decimal(g.薪资.toNumber()),
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

  // ✅ 创建Excel（XLSX调用不变）
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursMonthSheetData), "工时(月)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workHoursDaySheetData), "工时(日)");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceSheetData), "考勤记录");
  XLSX.writeFile(wb, "工时记录.xlsx");
};

export default exportExcel;
