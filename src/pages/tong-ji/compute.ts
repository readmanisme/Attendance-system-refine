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
  /** 每日趋势:无人记录的日期如实 null(留白不连线) */
  daily: { day: string; minutes: number | null; persons: number | null }[];
  /** 月度序列:断档月按 0 补齐 */
  monthly: MonthPoint[];
  /** 个人出勤 Top(按人天) */
  topWorkers: { id: string; name: string; days: number; hours: number; topWork: string }[];
  /** 出勤天数分布(20 天一档) */
  attendDist: { bucket: string; workers: number }[];
  /** 记录时长分布(1 小时一档,记录口径) */
  recordDist: { bucket: string; count: number }[];
  /** 班制占比(按人天):≥9h 全日,3-7.5h 半日,其余其他 */
  shiftPie: { name: string; value: number }[];
  /** 工种工时占比(记录口径) */
  workTypePie: { name: string; hours: number }[];
  /** 工种工时按月堆叠 */
  workTypeMonthly: { month: string; workMinutes: Record<string, number> }[];
  /** 工种汇总表 */
  workTypeTable: { name: string; recordCount: number; hours: number; salary: string }[];
  /** 未单独定价(兜底到"基础"价)的工种及其体量 */
  unPriced: { names: string[]; records: number; minutes: number };
  /** 工人支出合计 Top(钱花在谁身上) */
  salaryTop: { name: string; salary: number; days: number; hours: number }[];
  /** 每月首次出勤人数与累计出勤人数(按筛选范围口径) */
  growth: { month: string; newWorkers: number; totalWorkers: number }[];
  /** 星期几出勤分布(范围整体):人天 + 总工时 */
  weekday: { key: string; personDays: number; hours: number }[];
  /** 出勤 Top15 每人的单日工时五数概括(箱线图:[min,Q1,中位,Q3,max]) */
  boxData: { name: string; box: [number, number, number, number, number]; count: number }[];
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
  halfDays: number;
  otherDays: number;
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

/**
 * 一次遍历构建概览需要的全部聚合。
 * @param records 考勤记录(已按月范围筛选)
 * @param salaryRecords 薪资设置原始列表(expand worker_name/work_type)
 */
export const buildOverview = (records: any[] | undefined, salaryRecords?: any[]): Overview => {
  const list = records ?? [];

  // id → 名称映射(expand 里的名称优先,同一 id 恒定同名)
  const workerMap = new Map<string, string>();
  const workTypeMap = new Map<string, string>();
  for (const r of list) {
    const workerId = r?.worker_id as string | undefined;
    const workId = r?.work as string | undefined;
    if (workerId) workerMap.set(workerId, r?.expand?.worker_id?.name ?? UNKNOWN_NAME);
    if (workId) workTypeMap.set(workId, r?.expand?.work?.name ?? UNKNOWN_NAME);
  }

  // 支出引擎:与"工时&薪资"页同一份实现
  const salaryDict = buildSalaryDict(salaryRecords);
  const { recordMap } = computeSalaryStats(list, { workerMap, workTypeMap, salaryDict });

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
  /** 未定价兜底(键解析到"基础"且工种本身不是基础)的工种名 → {单数/分钟} */
  const unPriced = new Map<string, { records: number; minutes: number }>();

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

    shiftTotals.set(`${workerId}|${day}`, (shiftTotals.get(`${workerId}|${day}`) ?? 0) + minutes);

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

    // 未定价检测:薪资键兜底到"基础"且该工种不是"基础"(同 gong-shi 页"未设置工资"的判定)
    const isUnPriced =
      resolveSalaryKey(workerName, workName, salaryDict) === BASE_WORK_TYPE_NAME &&
      workName !== BASE_WORK_TYPE_NAME;
    if (isUnPriced) {
      if (!unPriced.has(workName)) unPriced.set(workName, { records: 0, minutes: 0 });
      const u = unPriced.get(workName)!;
      u.records++;
      u.minutes += minutes;
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

  // ---- 月度序列(断档月补 0) ----
  const monthList = allDays.length
    ? fillMonths(allDays[0].slice(0, 7), allDays[allDays.length - 1].slice(0, 7))
    : [];
  const monthly: MonthPoint[] = monthList.map((month) => {
    // 该月内的人天/出勤人数/工作日
    const daysInMonth = allDays.filter((d) => d.startsWith(month));
    const workers = new Set<string>();
    let personDays = 0;
    for (const day of daysInMonth) {
      const set = dayWorkerSet.get(day);
      if (!set) continue;
      personDays += set.size;
      set.forEach((id) => workers.add(id));
    }
    // 班制:按"人天当日合计工时"分类
    let fullDays = 0;
    let halfDays = 0;
    let otherDays = 0;
    for (const [key, minutes] of shiftTotals) {
      const [, day] = key.split("|");
      if (!day.startsWith(month)) continue;
      const hours = minutes / 60;
      if (hours >= 9) fullDays++;
      else if (hours >= 3 && hours <= 7.5) halfDays++;
      else otherDays++;
    }
    return {
      month,
      personDays,
      workers: workers.size,
      minutes: daysInMonth.reduce((s, d) => s + (dayMinutes.get(d) ?? 0), 0),
      salary: (monthSalary.get(month) ?? new Decimal(0)).toDecimalPlaces(2).toNumber(),
      workDays: daysInMonth.filter((d) => (dayMinutes.get(d) ?? 0) > 0).length,
      fullDays,
      halfDays,
      otherDays,
    };
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

  const attendDistMap = new Map<number, number>();
  for (const [, days] of workerDays) {
    const b = Math.min(Math.floor(days.size / 20) * 20, 200);
    attendDistMap.set(b, (attendDistMap.get(b) ?? 0) + 1);
  }
  const attendDist = [...attendDistMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, workers]) => ({ bucket: b >= 200 ? "200+" : `${b}-${b + 19}`, workers }));

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
  let fullDays = 0;
  let halfDays = 0;
  let otherDays = 0;
  for (const [, minutes] of shiftTotals) {
    const hours = minutes / 60;
    if (hours >= 9) fullDays++;
    else if (hours >= 3 && hours <= 7.5) halfDays++;
    else otherDays++;
  }
  const shiftPie = [
    { name: `全日(≥9h)`, value: fullDays },
    { name: `半日(3~7.5h)`, value: halfDays },
    { name: "其他", value: otherDays },
  ].filter((x) => x.value > 0);

  // 人天:
  let personDays = 0;
  for (const [, set] of dayWorkerSet) personDays += set.size;

  // ---- 工人支出 Top(钱花在谁身上) ----
  const salaryTop = [...workerSalary.entries()]
    .map(([id, s]) => ({
      name: workerMap.get(id) ?? UNKNOWN_NAME,
      salary: s.toDecimalPlaces(2).toNumber(),
      days: workerDays.get(id)?.size ?? 0,
      hours: minutesToHours(workerMinutes.get(id) ?? 0),
    }))
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 10);

  // ---- 队伍增长:每月新增(首次出勤)与累计出勤人数 ----
  const firstMonthCount = new Map<string, number>();
  for (const fm of workerFirstMonth.values())
    firstMonthCount.set(fm, (firstMonthCount.get(fm) ?? 0) + 1);
  let runningWorkers = 0;
  const growth = monthList.map((month) => {
    const newWorkers = firstMonthCount.get(month) ?? 0;
    runningWorkers += newWorkers;
    return { month, newWorkers, totalWorkers: runningWorkers };
  });

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
    const [id] = key.split("|");
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

  const unPricedList = [...unPriced.entries()];
  const unPricedRecords = unPricedList.reduce((s, [, v]) => s + v.records, 0);
  const unPricedMinutes = unPricedList.reduce((s, [, v]) => s + v.minutes, 0);

  return {
    fromMonth: allDays[0]?.slice(0, 7) ?? "",
    toMonth: allDays[allDays.length - 1]?.slice(0, 7) ?? "",
    totalMinutes,
    totalSalary,
    personDays,
    workerCount: workerDays.size,
    recordCount: validCount,
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
    },
    salaryTop,
    growth,
    weekday,
    boxData,
  };
};

/** 星期几展示序(周一=0 … 周日=6),与 weekday 聚合轴一致 */
export const WEEKDAY_KEYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 有序数组的分位数(线性插值,q=0 即最小值,q=1 即最大值) */
const quantileOf = (sorted: number[], q: number): number => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const v = lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  return Math.round(v * 100) / 100;
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

// ======================== 关系分析 ========================

export interface Relation {
  /** 热力图矩阵(出勤 Top20) */
  matrixNames: string[];
  coMatrix: number[][];
  /** 搭档网络:节点=出勤 ≥ GRAPH_MIN_NODE_DAYS 天的人,边=共现天数(候选,展示时按阈值过滤) */
  graph: {
    nodes: { name: string; days: number; size: number }[];
    links: { source: string; target: string; value: number }[];
  };
  /** 稳定性散点:y = 共现天数 / 两人出勤天的较小值(候选,展示时按阈值过滤) */
  stable: { a: string; b: string; coDays: number; ratio: number }[];
  /** 每人的搭档对(全量,按共现降序)→ 个人分析 Tab */
  partnerPairs: Map<string, { id: string; name: string; co: number }[]>;
}

/** 关系图节点最低出勤天数(与卡片口径提示一致) */
export const GRAPH_MIN_NODE_DAYS = 5;
/** 进入边/散点候选的最低共现天数(更高的用户阈值在 options 层过滤,min 不得低于此) */
export const MIN_PAIR_CO = 2;

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
  const matrixNames = topIds.map((id) => workerMap.get(id) ?? UNKNOWN_NAME);
  const coMatrix = topIds.map((a) => topIds.map((b) => (a === b ? 0 : coOf(a, b))));

  // 网络:节点=出勤 ≥ GRAPH_MIN_NODE_DAYS 天(与卡片口径一致);边候选=共现 ≥ MIN_PAIR_CO
  const graphNodes = [...workerDays.entries()]
    .filter(([, days]) => days.size >= GRAPH_MIN_NODE_DAYS)
    .map(([id, days]) => ({
      name: workerMap.get(id) ?? UNKNOWN_NAME,
      days: days.size,
      size: Math.min(6 + days.size / 8, 40),
    }));
  const graphLinks = [...pairCount.entries()]
    .filter(([, co]) => co >= MIN_PAIR_CO)
    .map(([key, co]) => {
      const [a, b] = key.split("|");
      return {
        source: workerMap.get(a) ?? UNKNOWN_NAME,
        target: workerMap.get(b) ?? UNKNOWN_NAME,
        value: co,
      };
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

  return { matrixNames, coMatrix, graph: { nodes: graphNodes, links: graphLinks }, stable, partnerPairs };
};

// ======================== 结构与个人视角 ========================

export interface SankeyData {
  /** 节点:TopN 工人(左列) + 全部工种(右列) */
  nodes: { name: string; hours: number; isWorker: boolean }[];
  /** 人 → 工种 的工时流向 */
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

  const nodes: SankeyData["nodes"] = topIds.map((id) => ({
    name: workerMap.get(id) ?? UNKNOWN_NAME,
    hours: minutesToHours(workerMinutes.get(id) ?? 0),
    isWorker: true,
  }));
  const links: SankeyData["links"] = [];
  const usedWorks = new Set<string>();
  for (const id of topIds) {
    const wm = workerWorkMinutes.get(id);
    if (!wm) continue;
    for (const [workName, minutes] of [...wm.entries()].sort((a, b) => b[1] - a[1])) {
      if (minutes <= 0) continue;
      usedWorks.add(workName);
      links.push({
        source: workerMap.get(id) ?? UNKNOWN_NAME,
        target: workName,
        hours: minutesToHours(minutes),
      });
    }
  }
  for (const workName of usedWorks)
    nodes.push({ name: workName, hours: minutesToHours(workMinutesAll.get(workName) ?? 0), isWorker: false });

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
}

export interface Profiles {
  /** 全部工人画像,按出勤天降序(Select 数据源与雷达 TopN 用) */
  list: WorkerProfile[];
  /** id → 画像 */
  byId: Map<string, WorkerProfile>;
  /** id → 月度序列(月份补齐):出勤天/工时/收入 */
  monthSeries: Map<string, { month: string; days: number; hours: number; salary: number }[]>;
  /** id → 工种构成(工时降序) */
  workTypeMinutes: Map<string, { name: string; hours: number }[]>;
}

/**
 * 个人画像层:一次遍历算出选人所需的一切(出勤/工时/收入/工种构成/月度序列)。
 * 支出与概览共用 computeSalaryStats,口径一致。
 */
export const buildProfiles = (records: any[] | undefined, salaryRecords?: any[]): Profiles => {
  const list = records ?? [];

  // 名称映射(与 buildOverview 同逻辑)
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

  const aggs = new Map<
    string,
    {
      days: Set<string>;
      minutes: number;
      salary: Decimal;
      work: Map<string, number>;
      monthDay: Map<string, { days: number; minutes: number }>;
      monthSalary: Map<string, Decimal>;
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
        monthDay: new Map(),
        monthSalary: new Map(),
      });
    const agg = aggs.get(workerId)!;
    agg.days.add(day);
    agg.minutes += minutes;
    agg.salary = agg.salary.plus(salary);
    const workName = workTypeMap.get(workId) ?? UNKNOWN_NAME;
    agg.work.set(workName, (agg.work.get(workName) ?? 0) + minutes);
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
      const firstDay = [...agg.days].sort()[0] ?? "";
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
        workSorted,
        monthDay: agg.monthDay,
        monthSalary: agg.monthSalary,
      };
    })
    .sort((a, b) => b.days - a.days);

  const listProfiles: WorkerProfile[] = ordered.map(({ id, name, days, hours, salary, avgDayHours, topWork, workCount, firstDay }) => ({
    id,
    name,
    days,
    hours,
    salary,
    avgDayHours,
    topWork,
    workCount,
    firstDay,
  }));

  const byId = new Map(listProfiles.map((p) => [p.id, p]));

  // 月度序列(该人首次出现月至末次出现月之间断档月补 0)
  const monthSeries = new Map<string, { month: string; days: number; hours: number; salary: number }[]>();
  const workTypeMinutes = new Map<string, { name: string; hours: number }[]>();
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
    workTypeMinutes.set(item.id, item.workSorted.map(([name, m]) => ({ name, hours: minutesToHours(m) })));
  }

  return { list: listProfiles, byId, monthSeries, workTypeMinutes };
};
