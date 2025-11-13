import dayjs from "dayjs";
import Decimal from "decimal.js";
import { getPb } from "@/utils/pocketbase";
const exportExcel = async (
  export_range: dayjs.Dayjs[],
  SalaryDict: Record<string, number>,
  __BACKEND_API_URL__: string,
) => {
  const XLSX = await import("xlsx");
  // const { default: pb } = await import("@/utils/pocketbase");
    const pb = getPb(__BACKEND_API_URL__);
  const 集合 = {
    考勤记录: __AttendanceRecord_TableName,
    工人: __Workers_TableName,
    工作类型: __WorkTypes_TableName,
    月工时: __WorkHours_Month_ViewName,
    日工时: __WorkHours_Day_ViewName,
  };
  const start = export_range[0].toISOString().replace("T", " ");
  const end = export_range[1].endOf("month").toISOString().replace("T", " ");
  const start_day = export_range[0].format("YYYY-MM-DD");
  const end_day = export_range[1].endOf("month").format("YYYY-MM-DD");
  const start_month = export_range[0].format("YYYY-MM");
  const end_month = export_range[1].format("YYYY-MM");
  const attendanceRecords = await pb.collection(集合.考勤记录).getFullList({
    filter:
      "check_in !=null && check_out !=null && check_in >= '" +
      start +
      "' && check_in <= '" +
      end +
      "'",
  });
  const workers = await pb.collection(集合.工人).getFullList();
  const workTypes = await pb.collection(集合.工作类型).getFullList();
  const workerDetails = workers.reduce(
    (acc: Record<string, string>, worker:any) => {
      acc[worker.id] = worker.name;
      return acc;
    },
    {}
  );
  const workTypeDetails = workTypes.reduce(
    (acc: Record<string, string>, workType:any) => {
      acc[workType.id] = workType.name;
      return acc;
    },
    {}
  );
  const workHoursMonth = await pb.collection(集合.月工时).getFullList({
    filter:
      "work_month >= '" +
      start_month +
      "' && work_month <= '" +
      end_month +
      "'",
  });
  const workHoursDay = await pb.collection(集合.日工时).getFullList({
    filter:
      "work_date >= '" + start_day + "' && work_date <= '" + end_day + "'",
    // work_date在数据库中的类型不像日期，但确实能这么过滤
  });
  const attendanceSheetData = attendanceRecords.map((record:any) => {
    const dbID = record.id;
    const duration = Decimal.div(
      dayjs(record.check_out).diff(dayjs(record.check_in)),
      1000 * 60 * 60
    ).toString();
    const worker_name = workerDetails[record.worker_id];
    const work_name = workTypeDetails[record.work];
    // const check_in = dayjs(record.check_in);
    // const key=`${worker_name}_${work_name}_${dayjs(record.check_in).format("YYYY-MM-DD")}_${dbID}`
    const salaryKey =
      `${worker_name}_${work_name}` in SalaryDict
        ? `${worker_name}_${work_name}`
        : worker_name in SalaryDict
        ? worker_name
        : work_name in SalaryDict
        ? work_name
        : "基础";
    const matchValue = salaryKey + ":" + SalaryDict[salaryKey];
    return {
      序号: dbID,
      工人: worker_name,
      // 签到时间: record.check_in,
      // 签退时间: record.check_out,
      签到时间: dayjs(record.check_in).format("YYYY/MM/DD HH:mm"),
      签退时间: dayjs(record.check_out).format("YYYY/MM/DD HH:mm"),
      工作类型: work_name,
      总工时: duration,
      薪资: Decimal.mul(duration, SalaryDict[salaryKey]).toString(),
      依据: matchValue,
      // 创建时间: record.created,
      // 更新时间: record.updated
    };
  });

  const workHoursDaySheetData = workHoursDay.map((record:any) => {
    const worker_name = workerDetails[record.worker_id];
    const date = record.work_date;
    // 通过attendanceSheetData，筛选worker和date相同的记录，计算每天的薪资
    const attendance_records = attendanceSheetData.filter(
      (record) =>
        record.工人 === worker_name &&
        dayjs(record.签到时间).format("YYYY-MM-DD") === date
    );
    // const total_work_hours = attendance_records.reduce(
    //   (acc, record) => acc + parseFloat(record.总工时),
    //   0
    // );
    const xinzi = attendance_records.reduce(
      (acc, record) => Decimal.add(acc, record.薪资),
      new Decimal(0)
    );
    return {
      序号: record.id,
      工人: worker_name,
      日期: date,
      总工时: record.total_work_hours,
      薪资: xinzi.toString(),
    };
  });

  const workHoursMonthSheetData = workHoursMonth.map((record) => {
    const worker_name = workerDetails[record.worker_id];
    const month = record.work_month;
    // 通过workHoursDaySheetData，筛选worker和month相同的记录，计算每月的薪资
    const work_hours_day_records = workHoursDaySheetData.filter(
      (record:any) =>
        record.工人 === worker_name &&
        dayjs(record.日期).format("YYYY-MM") === month
    );
    // const total_work_hours = work_hours_day_records.reduce(
    //   (acc, record) => acc + parseFloat(record.总工时),
    //   0
    // );
    const xinzi = work_hours_day_records.reduce(
      (acc:any, record:any) => Decimal.add(acc, record.薪资),
      new Decimal(0)
    );
    return {
      序号: record.id,
      工人: worker_name,
      月份: month,
      总工时: record.total_work_hours,
      薪资: xinzi.toString(),
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  // 添加每个工作表
  const workHoursMonthSheet = XLSX.utils.json_to_sheet(workHoursMonthSheetData);
  XLSX.utils.book_append_sheet(wb, workHoursMonthSheet, "工时(月)");

  const workHoursDaySheet = XLSX.utils.json_to_sheet(workHoursDaySheetData);
  XLSX.utils.book_append_sheet(wb, workHoursDaySheet, "工时(日)");

  const attendanceSheet = XLSX.utils.json_to_sheet(attendanceSheetData);
  XLSX.utils.book_append_sheet(wb, attendanceSheet, "考勤记录");
  // 导出Excel
  XLSX.writeFile(wb, "工时记录.xlsx");
};

export default exportExcel;
