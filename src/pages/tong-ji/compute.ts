/**
 * 统计图表页的聚合层(纯函数,不依赖 React、不请求数据)。
 *
 * 记录模型(迁移后):一条记录 = 一人 × 一天 × 一工种,work_date 为 "YYYY-MM-DD" 文本,
 * work_minutes 为整数分钟;同键重复录入会在原记录上叠加(库有唯一索引)。
 *
 * 口径(与 报告.md 保持一致):
 * - 人天:一人一天去重(跨工种算一天)。人数/天数类统计(趋势/Top/月度)固定用它。
 * - 记录:人×天×工种。时长分布/工种结构用记录口径,图上注明。
 * - 断档月:按 0 如实显示,不插值;每日趋势无记录的日期如实留空(null,不连线)。
 * - 支出:工时×时薪,时薪来自薪资设置(resolveSalaryKey 同"工时&薪资"页完全同口径);
 *   未在薪资设置里单独定价的记录会兜底到"基础"价,单独统计出来供页面提示。
 * - 班制:全日 ≥9h / 近全日 8~9h / 半日 3~8h / 短时 <3h。四档首尾相接、无空档
 *   (旧实现 7.5~9h 落在"其他",8h 这类常见班次会被误判,已修正)。
 */
import Decimal from "decimal.js";
import { BASE_WORK_TYPE_NAME, UNKNOWN_NAME } from "@/constants";
import { minutesToHoursDecimal } from "@/utils/workTime";
import { buildSalaryDict, computeSalaryStats, resolveSalaryKey } from "@/utils/salary";

/** 工时分钟 → 小时数值(两位小数,仅作图表展示用) */
export const minutesToHours = (minutes: number): number =>
  Number(minutesToHoursDecimal(minutes).toDecimalPlaces(2).toString());

/** 按月范围筛选记录(含首尾月,[null, null] = 不筛选) */
export const filterRecordsByMonth = (
  records: any[] | undefined,
  monthRange: [string | null, string | null],
): any[] => {
  const [from, to] = monthRange;
  if (!from && !to) return records ?? [];
  return (records ?? []).filter((r) => {
    const day = r?.work_date as string | undefined;
    if (!day) return false;
    if (from && day < `${from}-01`) return false;
    if (to && day > dayjsEndOfMonth(to)) return false;
    return true;
  });
};

/** "YYYY-MM" → 该月最后一天("YYYY-MM-DD") */
const dayjsEndOfMonth = (month: string): string => {
  const [y, m] = month.split("-").map(Number);
  // 不引 dayjs,纯计算即可:下月 0 号 = 本月最后一天
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
};

/** 该月天数(28~31) */
const daysInMonth = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** 两个 "YYYY-MM-DD" 相差的天数(a - b) */
const diffDays = (a: string, b: string): number =>
  Math.round(
    (new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86400000,
  );

// ======================== 班制分类 ========================

/** 班制档位:全日 ≥9h,近全日 8~9h,半日 3~8h,短时 <3h */
export type ShiftKind = "full" | "nearFull" | "half" | "short";

/** 班制展示名(顺序即图表顺序) */
export const SHIFT_LABELS: Record<ShiftKind, string> = {
  full: "全日(≥9h)",
  nearFull: "近全日(8~9h)",
  half: "半日(3~8h)",
  short: "短时(<3h)",
};

/** 班制顺序 */
export const SHIFT_ORDER: ShiftKind[] = ["full", "nearFull", "half", "short"];

/**
 * 按"当日合计工时"分档。
 * 四档首尾相接:≥9 / 8~9 / 3~8 / <3,不存在空档。
 */
export const classifyShift = (minutes: number): ShiftKind => {
  const hours = minutes / 60;
  if (hours >= 9) return "full";
  if (hours >= 8) return "nearFull";
  if (hours >= 3) return "half";
  return "short";
};

/** 生成班制占比数组(按 SHIFT_ORDER 排序,过滤 0 值) */
const shiftPieOf = (counts: Record<ShiftKind, number>): { name: string; value: number }[] =>
  SHIFT_ORDER.map((k) => ({ name: SHIFT_LABELS[k], value: counts[k] })).filter((x) => x.value > 0);

/** 空班制计数 */
const emptyShiftCounts = (): Record<ShiftKind, number> => ({
  full: 0,
  nearFull: 0,
  half: 0,
  short: 0,
});

// ======================== 共享上下文 ========================

/** 名称映射 + 薪资字典 + 单条记录支出(一次构建,供概览/画像复用) */
export interface StatsContext {
  workerMap: Map<string, string>;
  workTypeMap: Map<string, string>;
  salaryDict: Record<string, number>;
  recordMap: Map<string, { salary: Decimal; basis: string }>;
}

/**
 * 构建共享上下文:名称映射(expand 优先)、薪资字典、单条记录支出。
 * 概览与个人画像都吃这一份,避免重复跑 computeSalaryStats。
 */
export const buildContext = (records: any[] | undefined, salaryRecords?: any[]): StatsContext => {
  const list = records ?? [];
  const workerMap = new Map<string, string>();
  const workTypeMap = new Map<string, string>();
  for (const r of list) {
    const workerId = r?.worker_id as string | undefined;
    const workId = r?.work as string | undefined;
    if (workerId) workerMap.set(workerId, r?.expand?.worker_id?.name ?? UNKNOWN_NAME);
    if (workId) workTypeMap.set(workId, r?.expand?.work?.name ?? UNKNOWN_NAME);
  }
  const salaryDict = buildSalaryDict(salaryRecords);
  const { recordMap } = computeSalaryStats(list, { workerMap, workTypeMap, salaryDict });
  return { workerMap, workTypeMap, salaryDict, recordMap };
};

// ======================== 概览统计 ========================

export interface Overview {
  /** 覆盖范围(筛选后的边界,用于展示) */
  fromMonth: string;
  toMonth: string;
  totalMinutes: number;
  totalSalary: Decimal;
  /** 人天:一人一天去重 */
  personDays: number;
  /** 范围内出过勤的人数 */
  workerCount: number;
  /** 记录条数(人×天×工种) */
  recordCount: number;
  /** 整体人均强度(按范围折算) */
  perCapita: {
    /** 人均月工时(h) = 总工时 / 出勤人数 / 有出勤的月数 */
    avgHoursPerWorker: number;
    /** 整体出勤率 = 人天 / (出勤人数 × 范围天数) */
    attendanceRate: number;
    /** 范围跨度天数(含首尾) */
    spanDays: number;
  };
  /** 每日趋势:无人记录的日期如实 null(留白不连线) */
  daily: { day: string; minutes: number | null; persons: number | null }[];
  /** 月度序列:断档月按 0 补齐 */
  monthly: MonthPoint[];
  /** 个人出勤 Top(按人天) */
  topWorkers: { id: string; name: string; days: number; hours: number; topWork: string }[];
  /** 出勤天数分布(按跨度自适应 5/10/20 天一档) */
  attendDist: { bucket: string; workers: number }[];
  /** 记录时长分布(1 小时一档,记录口径) */
  recordDist: { bucket: string; count: number }[];
  /** 班制占比(按人天) */
  shiftPie: { name: string; value: number }[];
  /** 工种工时占比(记录口径) */
  workTypePie: { name: string; hours: number }[];
  /** 工种工时按月堆叠 */
  workTypeMonthly: { month: string; workMinutes: Record<string, number> }[];
  /** 工种汇总表 */
  workTypeTable: { name: string; recordCount: number; hours: number; salary: string }[];
  /** 未单独定价(兜底到"基础"价)的工种及其体量 */
  unPriced: {
    names: string[];
    records: number;
    minutes: number;
    /** 按兜底价折合的金额 */
    salary: string;
    /** 占总支出比例(0~1) */
    share: number;
    /** 按工种拆开的明细(体检表逐条列出用) */
    items: { name: string; records: number; minutes: number; salary: string }[];
  };
  /** 工人支出合计 Top(钱花在谁身上) */
  salaryTop: { id: string; name: string; salary: number; days: number; hours: number }[];
  /** 每月新增/活跃/回归/沉默人数 */
  growth: {
    month: string;
    newWorkers: number;
    activeWorkers: number;
    returningWorkers: number;
    silentWorkers: number;
    totalWorkers: number;
  }[];
  /** 当前沉默人数(距范围最后一天 ≥30/60/90 天未出勤) */
  silent: { d30: number; d60: number; d90: number; total: number; names: string[] };
  /** 星期几出勤分布(范围整体):人天 + 总工时 */
  weekday: { key: string; personDays: number; hours: number }[];
  /** 出勤 Top15 每人的单日工时五数概括(箱线图:[min,Q1,中位,Q3,max]) */
  boxData: { name: string; box: [number, number, number, number, number]; count: number }[];
  /** 单人单日合计 >12h 的明细(体检逐条列出;多人合计不算异常) */
  personDayOver: { workerId: string; name: string; day: string; hours: number }[];
  /** 出现"有人单日 >12h"的日期(趋势图 markPoint;hours=当天最长的那个人) */
  anomalyDays: { day: string; hours: number }[];
  /** 人 × 月 出勤热力(出勤 Top20,值=人天) */
  workerMonthHeat: {
    ids: string[];
    names: string[];
    months: string[];
    data: [number, number, number][];
  };
  /** 工种 × 星期 工时热力(工时 Top10,值=工时) */
  workWeekday: {
    works: string[];
    weekdays: string[];
    data: [number, number, number][];
  };
}

export interface MonthPoint {
  month: string;
  personDays: number;
  workers: number;
  minutes: number;
  salary: number;
  /** 有记录的天数 */
  workDays: number;
  fullDays: number;
  nearFullDays: number;
  halfDays: number;
  shortDays: number;
  /** 人均月工时(h) = 总工时 / 当月出勤人数 */
  avgHoursPerWorker: number;
  /** 出勤率 = 人天 / (出勤人数 × 当月日历天数) */
  attendanceRate: number;
  /** 单日 >10h 的人天与占比(超时) */
  over10Days: number;
  over10Rate: number;
  /** 环比(相对上月;上月为 0 或首月时 null) */
  personDaysMom: number | null;
  hoursMom: number | null;
  salaryMom: number | null;
}

/** 月份 "YYYY-MM" 序列补齐:介于首尾月之间的断档月也要出现(值 0) */
const fillMonths = (fromMonth: string, toMonth: string): string[] => {
  const months: string[] = [];
  const [y0, m0] = fromMonth.split("-").map(Number);
  const [y1, m1] = toMonth.split("-").map(Number);
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m++) {
    if (m > 12) {
      m = 1;
      y++;
    }
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
};

/** 环比(小数);上月为 0 时返回 null(无法算增长率) */
const momOf = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Number((((cur - prev) / prev) * 100).toFixed(1));

/**
 * 一次遍历构建概览需要的全部聚合。
 * @param records 考勤记录(已按月范围筛选)
 * @param salaryRecords 薪资设置原始列表(expand worker_name/work_type)
 * @param ctx 可选的共享上下文(不传则内部构建)
 */
export const buildOverview = (
  records: any[] | undefined,
  salaryRecords?: any[],
  ctx?: StatsContext,
): Overview => {
  const list = records ?? [];
  const { workerMap, workTypeMap, recordMap } = ctx ?? buildContext(list, salaryRecords);
  const salaryDict = ctx?.salaryDict ?? buildSalaryDict(salaryRecords);

  const dayWorkerSet = new Map<string, Set<string>>();
  const dayMinutes = new Map<string, number>();
  const workerDays = new Map<string, Set<string>>();
  const workerMinutes = new Map<string, number>();
  /** 工人支出合计(与 recordMap 同口径累加) */
  const workerSalary = new Map<string, Decimal>();
  /** 工人首次出勤月("YYYY-MM"),统计每月新增/累计人数 */
  const workerFirstMonth = new Map<string, string>();
  const workerWorkMinutes = new Map<string, Map<string, number>>();
  /** "workerId|day" → 当日该人所有工种合计分钟(班制分类用) */
  const shiftTotals = new Map<string, number>();
  /** 工种 → {记录数/总分钟/总支出} */
  const workStats = new Map<string, { recordCount: number; minutes: number; salary: Decimal }>();
  /** 月 → 工种 → 分钟 */
  const workMonth = new Map<string, Map<string, number>>();
  /** 月 → 支出合计 */
  const monthSalary = new Map<string, Decimal>();
  /** 未定价兜底(键解析到"基础"且工种本身不是基础)的工种名 → {单数/分钟/金额} */
  const unPriced = new Map<string, { records: number; minutes: number; salary: Decimal }>();
  /** 工种 → 星期(0=周一…6=周日) → 分钟(工种×星期热力) */
  const workWeekdayMinutes = new Map<string, number[]>();

  let totalMinutes = 0;
  let totalSalary = new Decimal(0);
  let validCount = 0;

  for (const r of list) {
    const workerId = r?.worker_id as string;
    const workId = r?.work as string;
    const day = r?.work_date as string | undefined;
    const minutes = Number(r?.work_minutes) || 0;
    if (!day || !workerId || !workId) continue;

    const workerName = workerMap.get(workerId)!;
    const workName = workTypeMap.get(workId)!;
    const month = day.slice(0, 7);
    const dbID = String(r.id);
    const salary = recordMap.get(dbID)?.salary ?? new Decimal(0);

    totalMinutes += minutes;
    totalSalary = totalSalary.plus(salary);
    validCount++;

    if (!dayWorkerSet.has(day)) dayWorkerSet.set(day, new Set());
    dayWorkerSet.get(day)!.add(workerId);
    dayMinutes.set(day, (dayMinutes.get(day) ?? 0) + minutes);

    if (!workerDays.has(workerId)) workerDays.set(workerId, new Set());
    workerDays.get(workerId)!.add(day);
    workerMinutes.set(workerId, (workerMinutes.get(workerId) ?? 0) + minutes);
    if (!workerSalary.has(workerId)) workerSalary.set(workerId, new Decimal(0));
    workerSalary.set(workerId, workerSalary.get(workerId)!.plus(salary));
    // 首次出勤月取最小月(记录顺序不定,直接比较)
    const prevFirst = workerFirstMonth.get(workerId);
    if (!prevFirst || month < prevFirst) workerFirstMonth.set(workerId, month);
    if (!workerWorkMinutes.has(workerId)) workerWorkMinutes.set(workerId, new Map());
    const wm = workerWorkMinutes.get(workerId)!;
    wm.set(workName, (wm.get(workName) ?? 0) + minutes);

    const shiftKey = `${workerId}|${day}`;
    shiftTotals.set(shiftKey, (shiftTotals.get(shiftKey) ?? 0) + minutes);

    if (!workStats.has(workName))
      workStats.set(workName, { recordCount: 0, minutes: 0, salary: new Decimal(0) });
    const ws = workStats.get(workName)!;
    ws.recordCount++;
    ws.minutes += minutes;
    ws.salary = ws.salary.plus(salary);

    if (!workMonth.has(month)) workMonth.set(month, new Map());
    const wmm = workMonth.get(month)!;
    wmm.set(workName, (wmm.get(workName) ?? 0) + minutes);

    monthSalary.set(month, (monthSalary.get(month) ?? new Decimal(0)).plus(salary));

    // 工种 × 星期(周一=0 … 周日=6)
    const wd = new Date(`${day}T00:00:00`).getDay();
    const wdIdx = wd === 0 ? 6 : wd - 1;
    if (!workWeekdayMinutes.has(workName))
      workWeekdayMinutes.set(
        workName,
        Array.from({ length: 7 }, () => 0),
      );
    workWeekdayMinutes.get(workName)![wdIdx] += minutes;

    // 未定价检测:薪资键兜底到"基础"且该工种不是"基础"(同 gong-shi 页"未设置工资"的判定)
    const isUnPriced =
      resolveSalaryKey(workerName, workName, salaryDict) === BASE_WORK_TYPE_NAME &&
      workName !== BASE_WORK_TYPE_NAME;
    if (isUnPriced) {
      if (!unPriced.has(workName))
        unPriced.set(workName, { records: 0, minutes: 0, salary: new Decimal(0) });
      const u = unPriced.get(workName)!;
      u.records++;
      u.minutes += minutes;
      u.salary = u.salary.plus(salary);
    }
  }

  // ---- 每日序列(中间无记录日补 null 留白) ----
  const allDays = [...dayMinutes.keys()].sort();
  const daily = allDays.length
    ? fillDays(allDays[0], allDays[allDays.length - 1]).map((day) => ({
        day,
        minutes: dayMinutes.get(day) ?? null,
        persons: dayWorkerSet.get(day)?.size ?? null,
      }))
    : [];

  // ---- 每人按月人天数 / 末次出勤日(热力、流失、骤降检测共用) ----
  const workerMonthDays = new Map<string, Map<string, number>>();
  const workerLastDay = new Map<string, string>();
  for (const [id, days] of workerDays) {
    const byMonth = new Map<string, number>();
    let last = "";
    for (const d of days) {
      const m = d.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
      if (d > last) last = d;
    }
    workerMonthDays.set(id, byMonth);
    workerLastDay.set(id, last);
  }

  // ---- 超时人天(单日 >10h)按月 ----
  const monthOver10 = new Map<string, number>();
  for (const [key, minutes] of shiftTotals) {
    if (minutes <= 600) continue;
    const month = key.slice(key.indexOf("|") + 1, key.indexOf("|") + 8);
    monthOver10.set(month, (monthOver10.get(month) ?? 0) + 1);
  }

  // ---- 月度序列(断档月补 0) ----
  const monthList = allDays.length
    ? fillMonths(allDays[0].slice(0, 7), allDays[allDays.length - 1].slice(0, 7))
    : [];
  const monthly: MonthPoint[] = monthList.map((month) => {
    // 该月内的人天/出勤人数/工作日
    const days = allDays.filter((d) => d.startsWith(month));
    const workers = new Set<string>();
    let personDays = 0;
    for (const day of days) {
      const set = dayWorkerSet.get(day);
      if (!set) continue;
      personDays += set.size;
      set.forEach((id) => workers.add(id));
    }
    // 班制:按"人天当日合计工时"分类
    const shifts = emptyShiftCounts();
    for (const [key, minutes] of shiftTotals) {
      const day = key.slice(key.indexOf("|") + 1);
      if (!day.startsWith(month)) continue;
      shifts[classifyShift(minutes)]++;
    }
    const over10Days = monthOver10.get(month) ?? 0;
    return {
      month,
      personDays,
      workers: workers.size,
      minutes: days.reduce((s, d) => s + (dayMinutes.get(d) ?? 0), 0),
      salary: (monthSalary.get(month) ?? new Decimal(0)).toDecimalPlaces(2).toNumber(),
      workDays: days.filter((d) => (dayMinutes.get(d) ?? 0) > 0).length,
      fullDays: shifts.full,
      nearFullDays: shifts.nearFull,
      halfDays: shifts.half,
      shortDays: shifts.short,
      avgHoursPerWorker: workers.size
        ? minutesToHours(days.reduce((s, d) => s + (dayMinutes.get(d) ?? 0), 0) / workers.size)
        : 0,
      attendanceRate: workers.size
        ? Number((personDays / (workers.size * daysInMonth(month))).toFixed(3))
        : 0,
      over10Days,
      over10Rate: personDays ? Number((over10Days / personDays).toFixed(3)) : 0,
      personDaysMom: null,
      hoursMom: null,
      salaryMom: null,
    };
  });
  // 环比:依赖上一条,建完再补
  monthly.forEach((m, i) => {
    const prev = monthly[i - 1];
    if (!prev) return;
    m.personDaysMom = momOf(m.personDays, prev.personDays);
    m.hoursMom = momOf(m.minutes, prev.minutes);
    m.salaryMom = momOf(m.salary, prev.salary);
  });

  // ---- 个人 Top 与出勤分布 ----
  const topWorkers = [...workerDays.entries()]
    .map(([id, days]) => {
      const wm = workerWorkMinutes.get(id);
      const topWork = wm ? [...wm.entries()].sort((a, b) => b[1] - a[1])[0][0] : UNKNOWN_NAME;
      return {
        id,
        name: workerMap.get(id) ?? UNKNOWN_NAME,
        days: days.size,
        hours: minutesToHours(workerMinutes.get(id) ?? 0),
        topWork,
      };
    })
    .sort((a, b) => b.days - a.days);
  const top15 = topWorkers.slice(0, 15);

  // 出勤天数分布:跨度小时用 5 天档,中等 10 天档,长期 20 天档,避免只有一两根柱子
  const maxDays = topWorkers[0]?.days ?? 0;
  const bucketSize = maxDays <= 30 ? 5 : maxDays <= 90 ? 10 : 20;
  const attendDistMap = new Map<number, number>();
  for (const [, days] of workerDays) {
    const b = Math.min(Math.floor(days.size / bucketSize) * bucketSize, 200);
    attendDistMap.set(b, (attendDistMap.get(b) ?? 0) + 1);
  }
  const attendDist = [...attendDistMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, workers]) => ({
      bucket: b >= 200 ? "200+" : `${b}-${b + bucketSize - 1}`,
      workers,
    }));

  // ---- 记录时长分布(1 小时一档) ----
  const recordDistMap = new Map<number, number>();
  for (const r of list) {
    const h = (Number(r?.work_minutes) || 0) / 60;
    const b = Math.min(Math.floor(h), 14);
    recordDistMap.set(b, (recordDistMap.get(b) ?? 0) + 1);
  }
  const recordDist = [...recordDistMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, count]) => ({
      bucket: b >= 14 ? "14+" : `${b}~${b + 1}`,
      count,
    }));

  // ---- 工种结构 ----
  const workTypeTable = [...workStats.entries()].map(([name, s]) => ({
    name,
    recordCount: s.recordCount,
    hours: minutesToHours(s.minutes),
    salary: s.salary.toDecimalPlaces(2).toString(),
  }));
  const workTypePie = [...workStats.entries()]
    .map(([name, s]) => ({ name, hours: minutesToHours(s.minutes) }))
    .sort((a, b) => b.hours - a.hours);
  const workTypeMonthly = monthList.map((month) => ({
    month,
    workMinutes: Object.fromEntries(workMonth.get(month) ?? []) as Record<string, number>,
  }));

  // ---- 班制占比(按人天) ----
  const shiftCounts = emptyShiftCounts();
  for (const [, minutes] of shiftTotals) shiftCounts[classifyShift(minutes)]++;
  const shiftPie = shiftPieOf(shiftCounts);

  // 人天:
  let personDays = 0;
  for (const [, set] of dayWorkerSet) personDays += set.size;

  // ---- 工人支出 Top(钱花在谁身上) ----
  const salaryTop = [...workerSalary.entries()]
    .map(([id, s]) => ({
      id,
      name: workerMap.get(id) ?? UNKNOWN_NAME,
      salary: s.toDecimalPlaces(2).toNumber(),
      days: workerDays.get(id)?.size ?? 0,
      hours: minutesToHours(workerMinutes.get(id) ?? 0),
    }))
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 10);

  // ---- 队伍:每月新增(首次出勤)/ 活跃 / 回归 / 沉默 ----
  const firstMonthCount = new Map<string, number>();
  for (const fm of workerFirstMonth.values())
    firstMonthCount.set(fm, (firstMonthCount.get(fm) ?? 0) + 1);
  let runningWorkers = 0;
  const growth = monthly.map((m) => {
    const newWorkers = firstMonthCount.get(m.month) ?? 0;
    runningWorkers += newWorkers;
    return {
      month: m.month,
      newWorkers,
      activeWorkers: m.workers,
      returningWorkers: Math.max(0, m.workers - newWorkers),
      silentWorkers: Math.max(0, runningWorkers - m.workers),
      totalWorkers: runningWorkers,
    };
  });

  // ---- 当前沉默人数(以范围最后一天为基准) ----
  const lastDay = allDays[allDays.length - 1] ?? "";
  const silentNames: string[] = [];
  let d30 = 0;
  let d60 = 0;
  let d90 = 0;
  if (lastDay) {
    for (const [id, last] of workerLastDay) {
      const gap = diffDays(lastDay, last);
      if (gap >= 90) d90++;
      if (gap >= 60) d60++;
      if (gap >= 30) {
        d30++;
        silentNames.push(workerMap.get(id) ?? UNKNOWN_NAME);
      }
    }
  }
  const silent = {
    d30,
    d60,
    d90,
    total: workerDays.size,
    names: silentNames.sort(),
  };

  // ---- 星期几出勤分布(范围整体;周一=0 … 周日=6) ----
  const weekdayAgg = Array.from({ length: 7 }, () => ({ personDays: 0, minutes: 0 }));
  for (const [day, set] of dayWorkerSet) {
    const wd = new Date(`${day}T00:00:00`).getDay(); // 0=周日
    const idx = wd === 0 ? 6 : wd - 1;
    weekdayAgg[idx].personDays += set.size;
    weekdayAgg[idx].minutes += dayMinutes.get(day) ?? 0;
  }
  const weekday = weekdayAgg.map((w, i) => ({
    key: WEEKDAY_KEYS[i],
    personDays: w.personDays,
    hours: minutesToHours(w.minutes),
  }));

  // ---- 出勤 Top15 的单日工时箱线(样本=该人当日各工种合计) ----
  const top15Ids = new Set(top15.map((w) => w.id));
  const boxSamples = new Map<string, number[]>();
  for (const [key, minutes] of shiftTotals) {
    const sep = key.indexOf("|");
    const id = key.slice(0, sep);
    if (!top15Ids.has(id)) continue;
    if (!boxSamples.has(id)) boxSamples.set(id, []);
    boxSamples.get(id)!.push(Math.round((minutes / 60) * 100) / 100);
  }
  const boxData = top15
    .filter((w) => (boxSamples.get(w.id)?.length ?? 0) > 0)
    .map((w) => {
      const sorted = boxSamples.get(w.id)!.sort((a, b) => a - b);
      const q = (p: number) => quantileOf(sorted, p);
      return {
        name: w.name,
        count: sorted.length,
        box: [q(0), q(0.25), q(0.5), q(0.75), q(1)] as [number, number, number, number, number],
      };
    });

  // ---- 异常:单人单日合计 >12h(多人合计不算,一个人一天干不了那么久) ----
  const personDayOver: Overview["personDayOver"] = [];
  for (const [key, minutes] of shiftTotals) {
    if (minutes <= 720) continue;
    const sep = key.indexOf("|");
    const workerId = key.slice(0, sep);
    personDayOver.push({
      workerId,
      name: workerMap.get(workerId) ?? UNKNOWN_NAME,
      day: key.slice(sep + 1),
      hours: minutesToHours(minutes),
    });
  }
  // 同一天多人异常时,按小时降序,取最长的那个人作为该日代表点
  personDayOver.sort((a, b) => (a.day === b.day ? b.hours - a.hours : a.day.localeCompare(b.day)));
  const anomalyDays = [...new Map(personDayOver.map((p) => [p.day, p])).values()].map((p) => ({
    day: p.day,
    hours: p.hours,
  }));

  // ---- 人 × 月 出勤热力(Top20);坐标顺序 [月, 人, 人天] 与 x=月 / y=人 对齐 ----
  const heatWorkers = topWorkers.slice(0, 20);
  const workerMonthHeat = {
    ids: heatWorkers.map((w) => w.id),
    names: heatWorkers.map((w) => w.name),
    months: monthList,
    data: heatWorkers.flatMap((w, i) =>
      monthList
        .map((m, j) => [j, i, workerMonthDays.get(w.id)?.get(m) ?? 0] as [number, number, number])
        .filter(([, , v]) => v > 0),
    ),
  };

  // ---- 工种 × 星期 工时热力(Top10);坐标顺序 [星期, 工种, 工时] ----
  const topWorks = [...workStats.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .slice(0, 10)
    .map(([name]) => name);
  const workWeekday = {
    works: topWorks,
    weekdays: WEEKDAY_KEYS,
    data: topWorks.flatMap((name, i) => {
      const arr = workWeekdayMinutes.get(name) ?? [];
      return arr
        .map((minutes, j) => [j, i, minutesToHours(minutes)] as [number, number, number])
        .filter(([, , v]) => v > 0);
    }),
  };

  const unPricedList = [...unPriced.entries()];
  const unPricedRecords = unPricedList.reduce((s, [, v]) => s + v.records, 0);
  const unPricedMinutes = unPricedList.reduce((s, [, v]) => s + v.minutes, 0);
  const unPricedSalary = unPricedList.reduce((s, [, v]) => s.plus(v.salary), new Decimal(0));
  const unPricedShare = totalSalary.isZero()
    ? 0
    : Number(unPricedSalary.dividedBy(totalSalary).toDecimalPlaces(3).toString());

  // 整体人均强度:按"有出勤的月数"折算,避免把断档月也算进分母
  const activeMonths = monthly.filter((m) => m.personDays > 0).length;
  const spanDays = allDays.length ? diffDays(allDays[allDays.length - 1], allDays[0]) + 1 : 0;
  const perCapita = {
    avgHoursPerWorker:
      workerDays.size && activeMonths
        ? minutesToHours(totalMinutes / workerDays.size / activeMonths)
        : 0,
    attendanceRate:
      workerDays.size && spanDays
        ? Number((personDays / (workerDays.size * spanDays)).toFixed(3))
        : 0,
    spanDays,
  };

  return {
    fromMonth: allDays[0]?.slice(0, 7) ?? "",
    toMonth: allDays[allDays.length - 1]?.slice(0, 7) ?? "",
    totalMinutes,
    totalSalary,
    personDays,
    workerCount: workerDays.size,
    recordCount: validCount,
    perCapita,
    daily,
    monthly,
    topWorkers: top15,
    attendDist,
    recordDist,
    shiftPie,
    workTypePie,
    workTypeMonthly,
    workTypeTable,
    unPriced: {
      names: unPricedList.map(([n]) => n),
      records: unPricedRecords,
      minutes: unPricedMinutes,
      salary: unPricedSalary.toDecimalPlaces(2).toString(),
      share: unPricedShare,
      items: [...unPricedList]
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .map(([name, v]) => ({
          name,
          records: v.records,
          minutes: v.minutes,
          salary: v.salary.toDecimalPlaces(2).toString(),
        })),
    },
    salaryTop,
    growth,
    silent,
    weekday,
    boxData,
    personDayOver,
    anomalyDays,
    workerMonthHeat,
    workWeekday,
  };
};

/** 星期几展示序(周一=0 … 周日=6),与 weekday 聚合轴一致 */
export const WEEKDAY_KEYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 有序数组的分位数(线性插值,q=0 即最小值,q=1 即最大值) */
const quantileOf = (sorted: number[], q: number): number => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const v = lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  return Math.round(v * 100) / 100;
};

/** 有序数组的百分位排名:严格低于 v 的占比(0~100 整数),即"超过了多少人" */
export const percentileRank = (sorted: number[], v: number): number => {
  if (!sorted.length) return 0;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / sorted.length) * 100);
};

/** 日期序列补齐(逐天,含首尾) */
const fillDays = (fromDay: string, toDay: string): string[] => {
  const days: string[] = [];
  let cur = fromDay;
  const end = toDay;
  while (cur <= end) {
    days.push(cur);
    const [y, m, d] = cur.split("-").map(Number);
    cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  return days;
};

// ======================== 数据体检 ========================

export type HealthLevel = "warn" | "info";

export interface HealthIssue {
  key: string;
  level: HealthLevel;
  /** 问题标题(短) */
  title: string;
  /** 命中数量(天数/条数/工种数,由 title 语义决定) */
  count: number;
  /** 口径与建议动作 */
  hint: string;
  /** 全部命中项的明细(逐条列出,便于直接核对/修改) */
  details: string[];
}

/** 本地日期 "YYYY-MM-DD"(不能用 toISOString:东八区凌晨会算成前一天) */
export const localToday = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

/**
 * 数据体检:找出"看着像录错/漏录"的记录。
 * 只做提示,不修改数据;所有判定都基于筛选后的记录,与图表同口径。
 * 每条问题都带全量明细(不是样例),页面直接列出来供逐条核对。
 * @param today 可注入"今天",便于单测;默认取本地日期
 */
export const buildHealth = (
  records: any[] | undefined,
  overview: Overview,
  today = localToday(),
): HealthIssue[] => {
  const list = records ?? [];
  const issues: HealthIssue[] = [];
  const push = (issue: HealthIssue) => {
    if (issue.count > 0) issues.push(issue);
  };

  // 名称映射 + 按天聚合(多条规则复用)
  const workerNameOf = new Map<string, string>();
  const workNameOf = new Map<string, string>();
  const dayRecords = new Map<string, number>();
  const dayNames = new Map<string, Set<string>>();
  for (const r of list) {
    const day = r?.work_date as string | undefined;
    const workerId = r?.worker_id as string | undefined;
    const workId = r?.work as string | undefined;
    const workerName = r?.expand?.worker_id?.name as string | undefined;
    if (workerId) workerNameOf.set(workerId, workerName ?? UNKNOWN_NAME);
    if (workId) workNameOf.set(workId, r?.expand?.work?.name ?? UNKNOWN_NAME);
    if (!day) continue;
    dayRecords.set(day, (dayRecords.get(day) ?? 0) + 1);
    if (!dayNames.has(day)) dayNames.set(day, new Set());
    if (workerName) dayNames.get(day)!.add(workerName);
  }

  // 1) 未来日期
  const futureDays = [...dayRecords.keys()].filter((d) => d > today).sort();
  push({
    key: "future",
    level: "warn",
    title: "未来日期",
    count: futureDays.length,
    hint: "日期晚于今天,通常是录入时选错月份;到「考勤记录」按日期筛选后改掉即可。",
    details: futureDays.map((d) => `${d} · ${dayRecords.get(d)} 条记录`),
  });

  // 2) 单人单日合计 >12h(多人合计不算异常)
  push({
    key: "over12",
    level: "warn",
    title: "单人单日总工时 >12h",
    count: overview.personDayOver.length,
    hint: "同一个人同一天(跨工种)合计超过 12 小时,可能是重复录入或工时填错;多人合计不算异常。",
    details: overview.personDayOver.map((p) => `${p.name} · ${p.day} · ${p.hours}h`),
  });

  // 3) 单日总工时 <1h(有记录但不足 1 小时)
  const tinyDays = overview.daily.filter(
    (d) => d.minutes != null && d.minutes > 0 && d.minutes < 60,
  );
  push({
    key: "under1",
    level: "info",
    title: "单日总工时 <1h",
    count: tinyDays.length,
    hint: "不足 1 小时的出勤日,确认是短时帮工还是分钟数填错。",
    details: tinyDays.map(
      (d) =>
        `${d.day} · 合计 ${minutesToHours(d.minutes as number)}h · ${
          [...(dayNames.get(d.day) ?? [])].join("、") || "—"
        }`,
    ),
  });

  // 4) 同人同日同工种多条(库有唯一索引,正常应为 0)
  const dupMap = new Map<string, { workerId: string; day: string; workId: string; n: number }>();
  for (const r of list) {
    const workerId = r?.worker_id as string | undefined;
    const workId = r?.work as string | undefined;
    const day = r?.work_date as string | undefined;
    if (!workerId || !workId || !day) continue;
    const k = `${workerId}|${day}|${workId}`;
    const cur = dupMap.get(k);
    if (cur) cur.n++;
    else dupMap.set(k, { workerId, day, workId, n: 1 });
  }
  const dups = [...dupMap.values()].filter((d) => d.n > 1);
  push({
    key: "duplicate",
    level: "warn",
    title: "同人同日同工种重复记录",
    count: dups.length,
    hint: "同一人同一天同一工种出现多条,建议合并为一条(正常有唯一索引,出现即异常)。",
    details: dups
      .sort((a, b) =>
        a.day === b.day ? a.workerId.localeCompare(b.workerId) : a.day.localeCompare(b.day),
      )
      .map(
        (d) =>
          `${workerNameOf.get(d.workerId) ?? UNKNOWN_NAME} · ${d.day} · ${
            workNameOf.get(d.workId) ?? UNKNOWN_NAME
          } · ${d.n} 条`,
      ),
  });

  // 5) 未定价工种(兜底按"基础"价)
  const unpriced = overview.unPriced;
  push({
    key: "unpriced",
    level: "info",
    title: "未单独定价的工种",
    count: unpriced.items.length,
    hint: `共 ${unpriced.records} 条记录按"基础"时薪兜底,折合 ${unpriced.salary} 元(占总支出 ${(
      unpriced.share * 100
    ).toFixed(1)}%)。到「薪资设置」给这些工种补价,概览与个人收入会自动修正。`,
    details: unpriced.items.map(
      (i) => `${i.name} · ${i.records} 条 · ${minutesToHours(i.minutes)}h · 折合 ${i.salary} 元`,
    ),
  });

  // warn 优先,同级别按命中数量降序
  return issues.sort((a, b) =>
    a.level === b.level ? b.count - a.count : a.level === "warn" ? -1 : 1,
  );
};

// ======================== 关系分析 ========================

export interface Relation {
  /** 热力矩阵(出勤 Top20)的显示名(重名会带 #2 后缀) */
  matrixNames: string[];
  /** 热力矩阵行对应的工人 id(点击联动用) */
  matrixIds: string[];
  coMatrix: number[][];
  /** 搭档网络:节点=出勤 ≥ GRAPH_MIN_NODE_DAYS 天的人,边=共现天数(候选,展示时按阈值过滤) */
  graph: {
    nodes: { id: string; name: string; days: number; size: number }[];
    links: { source: string; target: string; value: number }[];
  };
  /** 稳定性散点:y = 共现天数 / 两人出勤天的较小值(候选,展示时按阈值过滤) */
  stable: { a: string; b: string; coDays: number; ratio: number }[];
  /** 每人的搭档对(全量,按共现降序)→ 个人分析 Tab */
  partnerPairs: Map<string, { id: string; name: string; co: number }[]>;
  /** id → 显示名(重名带 #2 后缀),供图表 label 使用 */
  nameOf: Map<string, string>;
}

/** 关系图节点最低出勤天数(与卡片口径提示一致) */
export const GRAPH_MIN_NODE_DAYS = 5;
/** 进入边/散点候选的最低共现天数(更高的用户阈值在 options 层过滤,min 不得低于此) */
export const MIN_PAIR_CO = 2;

/** 给重名的人加 #2/#3 后缀,保证图表 label 唯一(节点 id 仍用 workerId) */
const uniqueNames = (ids: string[], nameOf: Map<string, string>): Map<string, string> => {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const id of ids) {
    const base = nameOf.get(id) ?? UNKNOWN_NAME;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    out.set(id, n === 1 ? base : `${base}#${n}`);
  }
  return out;
};

/** 共现口径:两人当天各有 ≥1 条记录即共现一天(人天去重,与报告一致) */
export const buildRelation = (records: any[] | undefined): Relation => {
  const list = records ?? [];

  const workerMap = new Map<string, string>();
  const dayWorkerSet = new Map<string, Set<string>>();
  const workerDays = new Map<string, Set<string>>();

  for (const r of list) {
    const workerId = r?.worker_id as string | undefined;
    const day = r?.work_date as string | undefined;
    if (!workerId || !day) continue;
    workerMap.set(workerId, r?.expand?.worker_id?.name ?? UNKNOWN_NAME);
    if (!dayWorkerSet.has(day)) dayWorkerSet.set(day, new Set());
    dayWorkerSet.get(day)!.add(workerId);
    if (!workerDays.has(workerId)) workerDays.set(workerId, new Set());
    workerDays.get(workerId)!.add(day);
  }

  // 共现对计数
  const pairCount = new Map<string, number>();
  for (const set of dayWorkerSet.values()) {
    const ids = [...set].sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }
  const coOf = (a: string, b: string): number => {
    const [x, y] = [a, b].sort();
    return pairCount.get(`${x}|${y}`) ?? 0;
  };

  // 热力图:出勤 Top20
  const topIds = [...workerDays.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 20)
    .map(([id]) => id);
  const nameOf = uniqueNames(topIds, workerMap);
  const matrixNames = topIds.map((id) => nameOf.get(id)!);
  const coMatrix = topIds.map((a) => topIds.map((b) => (a === b ? 0 : coOf(a, b))));

  // 网络:节点=出勤 ≥ GRAPH_MIN_NODE_DAYS 天(与卡片口径一致);边候选=共现 ≥ MIN_PAIR_CO
  const graphNodes = [...workerDays.entries()]
    .filter(([, days]) => days.size >= GRAPH_MIN_NODE_DAYS)
    .map(([id, days]) => ({
      id,
      name: workerMap.get(id) ?? UNKNOWN_NAME,
      days: days.size,
      size: Math.min(6 + days.size / 8, 40),
    }));
  const graphLinks = [...pairCount.entries()]
    .filter(([, co]) => co >= MIN_PAIR_CO)
    .map(([key, co]) => {
      const [a, b] = key.split("|");
      return { source: a, target: b, value: co };
    });

  // 稳定性散点候选:共现 ≥ MIN_PAIR_CO 的搭档对
  const stable = [...pairCount.entries()]
    .filter(([, co]) => co >= MIN_PAIR_CO)
    .map(([key, co]) => {
      const [a, b] = key.split("|");
      const daysA = workerDays.get(a)?.size ?? 0;
      const daysB = workerDays.get(b)?.size ?? 0;
      const minDays = Math.min(daysA, daysB) || 1;
      return {
        a: workerMap.get(a) ?? UNKNOWN_NAME,
        b: workerMap.get(b) ?? UNKNOWN_NAME,
        coDays: co,
        ratio: Number((co / minDays).toFixed(2)),
      };
    });

  // 每人的搭档对(全量含共现 1 天,按共现降序)→ 个人分析
  const partnerPairs = new Map<string, { id: string; name: string; co: number }[]>();
  for (const [key, co] of pairCount) {
    const [a, b] = key.split("|");
    if (!partnerPairs.has(a)) partnerPairs.set(a, []);
    if (!partnerPairs.has(b)) partnerPairs.set(b, []);
    partnerPairs.get(a)!.push({ id: b, name: workerMap.get(b) ?? UNKNOWN_NAME, co });
    partnerPairs.get(b)!.push({ id: a, name: workerMap.get(a) ?? UNKNOWN_NAME, co });
  }
  for (const arr of partnerPairs.values()) arr.sort((x, y) => y.co - x.co);

  return {
    matrixNames,
    matrixIds: topIds,
    coMatrix,
    graph: { nodes: graphNodes, links: graphLinks },
    stable,
    partnerPairs,
    nameOf,
  };
};

// ======================== 结构与个人视角 ========================

export interface SankeyData {
  /** 节点:TopN 工人(左列) + 全部工种(右列);name 存 id,label 用 display */
  nodes: { id: string; name: string; hours: number; isWorker: boolean }[];
  /** 人 → 工种 的工时流向(source/target 都是 id) */
  links: { source: string; target: string; hours: number }[];
  /** 参与的人取总工时 TopN */
  topN: number;
}

/** 人→工种 工时流向(桑基图);人取总工时 TopN(默认 20),工种取这些人触达过的全部 */
export const buildSankey = (records: any[] | undefined, topN = 20): SankeyData => {
  const list = records ?? [];

  const workerMap = new Map<string, string>();
  const workTypeMap = new Map<string, string>();
  for (const r of list) {
    const workerId = r?.worker_id as string | undefined;
    const workId = r?.work as string | undefined;
    if (workerId) workerMap.set(workerId, r?.expand?.worker_id?.name ?? UNKNOWN_NAME);
    if (workId) workTypeMap.set(workId, r?.expand?.work?.name ?? UNKNOWN_NAME);
  }

  const workerMinutes = new Map<string, number>();
  const workerWorkMinutes = new Map<string, Map<string, number>>();
  const workMinutesAll = new Map<string, number>();
  for (const r of list) {
    const workerId = r?.worker_id as string;
    const workId = r?.work as string;
    const minutes = Number(r?.work_minutes) || 0;
    if (!workerId || !workId) continue;
    workerMinutes.set(workerId, (workerMinutes.get(workerId) ?? 0) + minutes);
    const workName = workTypeMap.get(workId) ?? UNKNOWN_NAME;
    workMinutesAll.set(workName, (workMinutesAll.get(workName) ?? 0) + minutes);
    if (!workerWorkMinutes.has(workerId)) workerWorkMinutes.set(workerId, new Map());
    const wm = workerWorkMinutes.get(workerId)!;
    wm.set(workName, (wm.get(workName) ?? 0) + minutes);
  }

  const topIds = [...workerMinutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);

  // 节点 id 用 workerId / workId,避免重名合并;display 存展示名
  const workIdByName = new Map<string, string>();
  for (const [id, name] of workTypeMap) if (!workIdByName.has(name)) workIdByName.set(name, id);
  const nodes: SankeyData["nodes"] = topIds.map((id) => ({
    id,
    name: workerMap.get(id) ?? UNKNOWN_NAME,
    hours: minutesToHours(workerMinutes.get(id) ?? 0),
    isWorker: true,
  }));
  const links: SankeyData["links"] = [];
  const usedWorks = new Map<string, string>();
  for (const id of topIds) {
    const wm = workerWorkMinutes.get(id);
    if (!wm) continue;
    for (const [workName, minutes] of [...wm.entries()].sort((a, b) => b[1] - a[1])) {
      if (minutes <= 0) continue;
      const workId = workIdByName.get(workName) ?? workName;
      usedWorks.set(workId, workName);
      links.push({ source: id, target: workId, hours: minutesToHours(minutes) });
    }
  }
  for (const [id, name] of usedWorks)
    nodes.push({
      id,
      name,
      hours: minutesToHours(workMinutesAll.get(name) ?? 0),
      isWorker: false,
    });

  return { nodes, links, topN };
};

export interface WorkerProfile {
  id: string;
  name: string;
  /** 出勤天数(人天) */
  days: number;
  /** 总工时(h) */
  hours: number;
  /** 估算总支出(字符串,同页面其它金额口径) */
  salary: string;
  /** 平均单日工时(h) */
  avgDayHours: number;
  /** 主工种(工时最多) */
  topWork: string;
  /** 涉及工种数(工种广度) */
  workCount: number;
  /** 首次出勤日("YYYY-MM-DD") */
  firstDay: string;
  /** 末次出勤日("YYYY-MM-DD") */
  lastDay: string;
  /** 出勤率 = 出勤天 / 首末出勤跨度天数(0~1) */
  attendanceRate: number;
  /** 各项指标在全员中的百分位(0~100) */
  percentile: {
    days: number;
    hours: number;
    salary: number;
    avgDayHours: number;
    workCount: number;
  };
}

/** 个人逐日出勤点(只含真正出勤的日子,不补空白天) */
export interface PersonalDay {
  day: string;
  /** 当日各工种合计工时(h) */
  hours: number;
}

/** 个人星期几节奏(固定周一~周日 7 项) */
export interface PersonalWeekday {
  key: string;
  /** 该星期几的出勤天数 */
  days: number;
  /** 该星期几的合计工时(h) */
  hours: number;
}

/** 个人单日工时分布(1 小时一档,样本=人天) */
export interface PersonalBucket {
  bucket: string;
  days: number;
}

/** 团队基线画像:个人对比雷达的参照(各维取全员中位数,抗极端值) */
export interface TeamAverage {
  days: number;
  hours: number;
  salary: number;
  avgDayHours: number;
  workCount: number;
}

/** 雷达归一化上限:各维取全员 P95(至少 1),把不同量纲压到 0~100 */
export type MetricScale = TeamAverage;

export interface Profiles {
  /** 全部工人画像,按出勤天降序(Select 数据源与雷达 TopN 用) */
  list: WorkerProfile[];
  /** id → 画像 */
  byId: Map<string, WorkerProfile>;
  /** id → 月度序列(月份补齐):出勤天/工时/收入 */
  monthSeries: Map<string, { month: string; days: number; hours: number; salary: number }[]>;
  /** id → 工种构成(工时降序) */
  workTypeMinutes: Map<string, { name: string; hours: number }[]>;
  /** id → 工种收入构成(估算,按金额降序) */
  workTypeSalary: Map<string, { name: string; salary: number }[]>;
  /** id → 逐日出勤(日期升序,当日工时合计;用于个人日历热力) */
  dailySeries: Map<string, PersonalDay[]>;
  /** id → 星期几节奏(固定 7 项;用于看个人是否有固定周节奏) */
  weekday: Map<string, PersonalWeekday[]>;
  /** id → 单日工时分布(1h 一档;用于看个人单干多长) */
  dayHoursDist: Map<string, PersonalBucket[]>;
  /** id → 班制占比(四档,按人天) */
  shiftPie: Map<string, { name: string; value: number }[]>;
  /** 团队人均(算术平均,兼容旧口径) */
  teamAvg: TeamAverage;
  /** 团队中位数(雷达基线,抗极端值) */
  teamMedian: TeamAverage;
  /** 雷达各维归一化上限(全员 P95) */
  scaleMax: MetricScale;
}

/**
 * 个人画像层:一次遍历算出选人所需的一切(出勤/工时/收入/工种构成/月度序列)。
 * 支出与概览共用 computeSalaryStats,口径一致。
 */
export const buildProfiles = (
  records: any[] | undefined,
  salaryRecords?: any[],
  ctx?: StatsContext,
): Profiles => {
  const list = records ?? [];
  const { workerMap, workTypeMap, recordMap } = ctx ?? buildContext(list, salaryRecords);

  const aggs = new Map<
    string,
    {
      days: Set<string>;
      minutes: number;
      salary: Decimal;
      work: Map<string, number>;
      workSalary: Map<string, Decimal>;
      monthDay: Map<string, { days: number; minutes: number }>;
      monthSalary: Map<string, Decimal>;
      /** 日 → 当日各工种合计分钟(单日工时分布/班制/日历用) */
      dayMinutes: Map<string, number>;
    }
  >();

  for (const r of list) {
    const workerId = r?.worker_id as string;
    const workId = r?.work as string;
    const day = r?.work_date as string | undefined;
    const minutes = Number(r?.work_minutes) || 0;
    if (!workerId || !workId || !day) continue;
    const month = day.slice(0, 7);
    const salary = recordMap.get(String(r.id))?.salary ?? new Decimal(0);

    if (!aggs.has(workerId))
      aggs.set(workerId, {
        days: new Set(),
        minutes: 0,
        salary: new Decimal(0),
        work: new Map(),
        workSalary: new Map(),
        monthDay: new Map(),
        monthSalary: new Map(),
        dayMinutes: new Map(),
      });
    const agg = aggs.get(workerId)!;
    agg.days.add(day);
    agg.minutes += minutes;
    agg.salary = agg.salary.plus(salary);
    agg.dayMinutes.set(day, (agg.dayMinutes.get(day) ?? 0) + minutes);
    const workName = workTypeMap.get(workId) ?? UNKNOWN_NAME;
    agg.work.set(workName, (agg.work.get(workName) ?? 0) + minutes);
    agg.workSalary.set(workName, (agg.workSalary.get(workName) ?? new Decimal(0)).plus(salary));
    if (!agg.monthDay.has(month)) agg.monthDay.set(month, { days: 0, minutes: 0 });
    const md = agg.monthDay.get(month)!;
    md.days++;
    md.minutes += minutes;
    agg.monthSalary.set(month, (agg.monthSalary.get(month) ?? new Decimal(0)).plus(salary));
  }

  const zeroSalary = new Decimal(0);

  const ordered = [...aggs.entries()]
    .map(([id, agg]) => {
      const workSorted = [...agg.work.entries()].sort((a, b) => b[1] - a[1]);
      const dayList = [...agg.days].sort();
      const firstDay = dayList[0] ?? "";
      const lastDay = dayList[dayList.length - 1] ?? "";
      const spanDays = firstDay ? diffDays(lastDay, firstDay) + 1 : 0;
      return {
        id,
        name: workerMap.get(id) ?? UNKNOWN_NAME,
        days: agg.days.size,
        hours: minutesToHours(agg.minutes),
        salary: agg.salary.toDecimalPlaces(2).toString(),
        avgDayHours: minutesToHours(Math.round(agg.minutes / Math.max(1, agg.days.size))),
        topWork: workSorted[0]?.[0] ?? UNKNOWN_NAME,
        workCount: agg.work.size,
        firstDay,
        lastDay,
        attendanceRate: spanDays ? Number((agg.days.size / spanDays).toFixed(3)) : 0,
        workSorted,
        workSalarySorted: [...agg.workSalary.entries()]
          .map(([name, s]) => ({ name, salary: s.toDecimalPlaces(2).toNumber() }))
          .sort((a, b) => b.salary - a.salary),
        monthDay: agg.monthDay,
        monthSalary: agg.monthSalary,
        dayMinutes: agg.dayMinutes,
      };
    })
    .sort((a, b) => b.days - a.days);

  // 各维排序值 → 百分位与 P95 上限
  const sortedOf = (pick: (w: (typeof ordered)[number]) => number) =>
    ordered.map(pick).sort((a, b) => a - b);
  const sortedDays = sortedOf((w) => w.days);
  const sortedHours = sortedOf((w) => w.hours);
  const sortedSalary = sortedOf((w) => Number(w.salary));
  const sortedAvg = sortedOf((w) => w.avgDayHours);
  const sortedWorks = sortedOf((w) => w.workCount);
  const p95 = (arr: number[]) => Math.max(1, quantileOf(arr, 0.95));
  const scaleMax: MetricScale = {
    days: p95(sortedDays),
    hours: p95(sortedHours),
    salary: p95(sortedSalary),
    avgDayHours: p95(sortedAvg),
    workCount: p95(sortedWorks),
  };
  const medianOf = (arr: number[]) => quantileOf(arr, 0.5);

  const listProfiles: WorkerProfile[] = ordered.map(
    ({
      id,
      name,
      days,
      hours,
      salary,
      avgDayHours,
      topWork,
      workCount,
      firstDay,
      lastDay,
      attendanceRate,
    }) => ({
      id,
      name,
      days,
      hours,
      salary,
      avgDayHours,
      topWork,
      workCount,
      firstDay,
      lastDay,
      attendanceRate,
      percentile: {
        days: percentileRank(sortedDays, days),
        hours: percentileRank(sortedHours, hours),
        salary: percentileRank(sortedSalary, Number(salary)),
        avgDayHours: percentileRank(sortedAvg, avgDayHours),
        workCount: percentileRank(sortedWorks, workCount),
      },
    }),
  );

  const byId = new Map(listProfiles.map((p) => [p.id, p]));

  // 月度序列(该人首次出现月至末次出现月之间断档月补 0)
  const monthSeries = new Map<
    string,
    { month: string; days: number; hours: number; salary: number }[]
  >();
  const workTypeMinutes = new Map<string, { name: string; hours: number }[]>();
  const workTypeSalary = new Map<string, { name: string; salary: number }[]>();
  const dailySeries = new Map<string, PersonalDay[]>();
  const weekday = new Map<string, PersonalWeekday[]>();
  const dayHoursDist = new Map<string, PersonalBucket[]>();
  const shiftPie = new Map<string, { name: string; value: number }[]>();
  for (const item of ordered) {
    const months = [...item.monthDay.keys()].sort();
    if (months.length) {
      monthSeries.set(
        item.id,
        fillMonths(months[0], months[months.length - 1]).map((month) => {
          const md = item.monthDay.get(month);
          const ms = item.monthSalary.get(month) ?? zeroSalary;
          return {
            month,
            days: md?.days ?? 0,
            hours: minutesToHours(md?.minutes ?? 0),
            salary: ms.toDecimalPlaces(2).toNumber(),
          };
        }),
      );
    } else {
      monthSeries.set(item.id, []);
    }
    workTypeMinutes.set(
      item.id,
      item.workSorted.map(([name, m]) => ({ name, hours: minutesToHours(m) })),
    );
    workTypeSalary.set(item.id, item.workSalarySorted);

    // 逐日出勤(日期升序;样本=该人当日的各工种合计工时)
    const dayList = [...item.dayMinutes.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    dailySeries.set(
      item.id,
      dayList.map(([day, m]) => ({ day, hours: minutesToHours(m) })),
    );

    // 星期几节奏:出勤天数 + 合计工时(周一=0 … 周日=6,与概览口径一致)
    const wk = Array.from({ length: 7 }, () => ({ days: 0, minutes: 0 }));
    // 单日工时分布(1h 一档)与班制占比,都按"人天"口径
    const distMap = new Map<number, number>();
    const shifts = emptyShiftCounts();
    for (const [day, m] of dayList) {
      const wd = new Date(`${day}T00:00:00`).getDay();
      wk[wd === 0 ? 6 : wd - 1].days++;
      wk[wd === 0 ? 6 : wd - 1].minutes += m;

      const hours = m / 60;
      const b = Math.min(Math.floor(hours), 14);
      distMap.set(b, (distMap.get(b) ?? 0) + 1);

      shifts[classifyShift(m)]++;
    }
    weekday.set(
      item.id,
      wk.map((w, i) => ({ key: WEEKDAY_KEYS[i], days: w.days, hours: minutesToHours(w.minutes) })),
    );
    dayHoursDist.set(
      item.id,
      [...distMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([b, days]) => ({ bucket: b >= 14 ? "14+" : `${b}~${b + 1}`, days })),
    );
    shiftPie.set(item.id, shiftPieOf(shifts));
  }

  // 团队人均(算术平均,兼容旧口径)与中位数(雷达基线)
  const avg2 = (v: number) => Math.round(v * 100) / 100;
  const n = ordered.length || 1;
  const sum = (pick: (w: (typeof ordered)[number]) => number) =>
    ordered.reduce((s, w) => s + pick(w), 0);
  const teamAvg: TeamAverage = {
    days: avg2(sum((w) => w.days) / n),
    hours: avg2(sum((w) => w.hours) / n),
    salary: avg2(sum((w) => Number(w.salary)) / n),
    avgDayHours: avg2(sum((w) => w.avgDayHours) / n),
    workCount: avg2(sum((w) => w.workCount) / n),
  };
  const teamMedian: TeamAverage = {
    days: medianOf(sortedDays),
    hours: medianOf(sortedHours),
    salary: medianOf(sortedSalary),
    avgDayHours: medianOf(sortedAvg),
    workCount: medianOf(sortedWorks),
  };

  return {
    list: listProfiles,
    byId,
    monthSeries,
    workTypeMinutes,
    workTypeSalary,
    dailySeries,
    weekday,
    dayHoursDist,
    shiftPie,
    teamAvg,
    teamMedian,
    scaleMax,
  };
};
