/**
 * 薪资/工时计算引擎。
 * "工时&薪资"页面显示与 Excel 导出共用同一份实现,保证两边的口径永远一致。
 */
import Decimal from "decimal.js";
import { minutesToHoursDecimal } from "@/utils/workTime";
import { BASE_WORK_TYPE_NAME, UNKNOWN_NAME } from "@/constants";

/** 按 "人_工种 → 人 → 工种 → 基础" 的顺序解析该记录的薪资键 */
export const resolveSalaryKey = (
  workerName: string,
  workName: string,
  salaryDict: Record<string, number>,
): string => {
  if (`${workerName}_${workName}` in salaryDict) return `${workerName}_${workName}`;
  if (workerName in salaryDict) return workerName;
  if (workName in salaryDict) return workName;
  return BASE_WORK_TYPE_NAME;
};

/**
 * 从薪资设置的原始列表构造薪资字典;
 * 键为 "工人_工种" / "工人" / "工种",没有"基础"时补 0。
 */
export const buildSalaryDict = (salaryRecords?: any[]): Record<string, number> => {
  const dict: Record<string, number> = {};
  (salaryRecords ?? []).forEach((item) => {
    const workerName = item?.expand?.worker_name?.name;
    const workType = item?.expand?.work_type?.name;
    const num = Number(item?.SalaryNum) || 0;
    if (workerName && workType) dict[`${workerName}_${workType}`] = num;
    else if (workerName) dict[workerName] = num;
    else if (workType) dict[workType] = num;
  });
  if (!(BASE_WORK_TYPE_NAME in dict)) {
    dict[BASE_WORK_TYPE_NAME] = 0;
  }
  return dict;
};

export interface SalaryStats {
  /** 记录 id → 该记录的工资与匹配依据("键:时薪") */
  recordMap: Map<string, { salary: Decimal; basis: string }>;
  /** 工人名 → 日期("YYYY-MM-DD") → 工资合计 */
  daySalaryMap: Map<string, Map<string, Decimal>>;
  /** 工人名 → 月份("YYYY-MM") → 工资合计 */
  monthSalaryMap: Map<string, Map<string, Decimal>>;
  /** 工人 id → 日期 → 分钟合计(整数) */
  dayMinutesMap: Map<string, Map<string, number>>;
  /** 工人 id → 月份("YYYY-MM") → 分钟合计(整数) */
  monthMinutesMap: Map<string, Map<string, number>>;
}

/**
 * 对一批考勤记录做一次遍历,算出页面显示/导出所需的全部聚合数据。
 * @param records 考勤记录列表(work_date 为 "YYYY-MM-DD" 文本,work_minutes 为整数分钟)
 * @param maps    workerMap/workTypeMap: id → 名称; salaryDict: buildSalaryDict 的产物
 */
export const computeSalaryStats = (
  records: any[] | undefined,
  {
    workerMap,
    workTypeMap,
    salaryDict,
  }: {
    workerMap: Map<string, string>;
    workTypeMap: Map<string, string>;
    salaryDict: Record<string, number>;
  },
): SalaryStats => {
  const recordMap = new Map<string, { salary: Decimal; basis: string }>();
  const daySalaryMap = new Map<string, Map<string, Decimal>>();
  const monthSalaryMap = new Map<string, Map<string, Decimal>>();
  const dayMinutesMap = new Map<string, Map<string, number>>();
  const monthMinutesMap = new Map<string, Map<string, number>>();

  for (const rec of records ?? []) {
    const dbID = rec.id as string;
    const workerName = workerMap.get(rec.worker_id) || UNKNOWN_NAME;
    const workName = workTypeMap.get(rec.work) || UNKNOWN_NAME;
    const day = rec.work_date as string;
    const month = day?.slice(0, 7);

    const salaryKey = resolveSalaryKey(workerName, workName, salaryDict);
    const salaryNum = new Decimal(salaryDict[salaryKey] ?? 0);
    // 单条记录工资 = 工时(小时,Decimal 精确) × 时薪
    const recordSalary = minutesToHoursDecimal(rec.work_minutes).mul(salaryNum);

    recordMap.set(dbID, { salary: recordSalary, basis: `${salaryKey}:${salaryNum.toString()}` });

    // 按天/按月累加工资(键为工人名,与薪资记录按名字设置保持一致)
    if (!daySalaryMap.has(workerName)) daySalaryMap.set(workerName, new Map());
    const workerDay = daySalaryMap.get(workerName)!;
    workerDay.set(day, (workerDay.get(day) || new Decimal(0)).add(recordSalary));

    if (!monthSalaryMap.has(workerName)) monthSalaryMap.set(workerName, new Map());
    const workerMonth = monthSalaryMap.get(workerName)!;
    workerMonth.set(month, (workerMonth.get(month) || new Decimal(0)).add(recordSalary));

    // 按天/按月累加工时(整数分钟,键为工人 id)
    const minutes = Number(rec.work_minutes) || 0;
    const workerId = rec.worker_id as string;
    if (!dayMinutesMap.has(workerId)) dayMinutesMap.set(workerId, new Map());
    const workerDayMinutes = dayMinutesMap.get(workerId)!;
    workerDayMinutes.set(day, (workerDayMinutes.get(day) ?? 0) + minutes);

    if (!monthMinutesMap.has(workerId)) monthMinutesMap.set(workerId, new Map());
    const workerMonthMinutes = monthMinutesMap.get(workerId)!;
    workerMonthMinutes.set(month, (workerMonthMinutes.get(month) ?? 0) + minutes);
  }

  return { recordMap, daySalaryMap, monthSalaryMap, dayMinutesMap, monthMinutesMap };
};

/** 按 worker_id 把考勤记录分组(供展开表按人取明细) */
export const groupByWorkerId = (records?: any[]): Map<string, any[]> => {
  const map = new Map<string, any[]>();
  (records ?? []).forEach((item) => {
    const k = item.worker_id;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  return map;
};
