/**
 * "工时记录.xlsx" 三个 sheet 的数据构造(纯函数)。
 * 从 export_xlsx.ts 抽出来,便于在 node 环境单测聚合口径与排序,不必真的下载文件。
 * 工时/薪资聚合复用 utils/salary 的引擎,保证与页面显示一致。
 */
import type { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { formatHoursExact } from "@/utils/workTime";
import { computeSalaryStats } from "@/utils/salary";
import { UNKNOWN_NAME } from "@/constants";

export interface ExportRange {
  startDay: string;
  endDay: string;
}

/**
 * 导出区间:起始取所选日,结束取所选月的月末。
 * 即"选到月中也会导出整月",这是页面按月筛选的既有口径,用测试固化。
 */
export const resolveExportRange = (from: Dayjs, to: Dayjs): ExportRange => ({
  startDay: from.format("YYYY-MM-DD"),
  endDay: to.endOf("month").format("YYYY-MM-DD"),
});

export interface DetailRow {
  序号: string;
  工人: string;
  工作类型: string;
  总工时: string;
  薪资: number;
  依据: string;
  日期: string;
}

export interface DayRow {
  序号: number;
  工人: string;
  日期: string;
  总工时: string;
  薪资: number;
}

export interface MonthRow {
  序号: number;
  工人: string;
  月份: string;
  总工时: string;
  薪资: number;
}

export interface ExportSheets {
  month: MonthRow[];
  day: DayRow[];
  detail: DetailRow[];
}

/** 字典序比较,相等返回 0(原实现相等时返回 1,不是合法的比较器) */
const cmp = (a: string, b: string) => (a === b ? 0 : a < b ? -1 : 1);

export const buildExportSheets = (
  records: readonly any[] | undefined,
  {
    workerMap,
    workTypeMap,
    salaryDict,
  }: {
    workerMap: Map<string, string>;
    workTypeMap: Map<string, string>;
    salaryDict: Record<string, number>;
  },
): ExportSheets => {
  const list = records ?? [];
  const stats = computeSalaryStats(list as any[], { workerMap, workTypeMap, salaryDict });

  // 明细:一条考勤记录一行
  const detail: DetailRow[] = list.map((record) => {
    const info = stats.recordMap.get(String(record.id));
    return {
      序号: record.id,
      工人: workerMap.get(record.worker_id) || UNKNOWN_NAME,
      工作类型: workTypeMap.get(record.work) || UNKNOWN_NAME,
      总工时: formatHoursExact(record.work_minutes),
      薪资: (info?.salary ?? new Decimal(0)).toNumber(),
      依据: info?.basis ?? "",
      日期: record.work_date,
    };
  });

  // 日:同一工人同一天合计。工时按 worker_id 聚合,薪资按工人名取
  // (workers 表 name 有唯一索引,因此两者一一对应)
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
  dayRows.sort((a, b) => cmp(a.工人, b.工人) || cmp(a.日期, b.日期));
  const day: DayRow[] = dayRows.map((g, i) => ({
    序号: i + 1,
    工人: g.工人,
    日期: g.日期,
    总工时: formatHoursExact(g.分钟),
    薪资: g.薪资.toNumber(),
  }));

  // 月:在日合计上聚合
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
      monthGroups.set(key, { 工人: g.工人, 月份: month, 分钟: g.分钟, 薪资: g.薪资 });
    }
  }
  const month: MonthRow[] = [...monthGroups.values()]
    .sort((a, b) => cmp(a.工人, b.工人) || cmp(a.月份, b.月份))
    .map((g, i) => ({
      序号: i + 1,
      工人: g.工人,
      月份: g.月份,
      总工时: formatHoursExact(g.分钟),
      薪资: g.薪资.toNumber(),
    }));

  return { month, day, detail };
};
