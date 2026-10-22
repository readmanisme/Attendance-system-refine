/**
 * 性能审计的测量工具与「现状逻辑复刻」。
 *
 * 说明:
 * - 复刻函数只用于把 buildOverview 里某一段独立出来计时(现状 vs 优化版),
 *   逻辑逐行对齐 src/pages/tong-ji/compute.ts,不改变口径。
 * - 所有计时都做 warmup + 多次取中位数,并在每轮前 gc(--expose-gc),
 *   避免 JIT 预热与 GC 抖动污染结论。
 */
import { performance } from "node:perf_hooks";
import Decimal from "decimal.js";

export const now = (): number => performance.now();

// ======================== 计时 ========================

export interface Timing {
  /** 中位数(ms) */
  median: number;
  min: number;
  max: number;
  mean: number;
  repeat: number;
}

export const measure = (fn: () => void, repeat = 7, warmup = 2): Timing => {
  for (let i = 0; i < warmup; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < repeat; i++) {
    (globalThis as any).gc?.();
    const t0 = now();
    fn();
    samples.push(now() - t0);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((s, v) => s + v, 0);
  return {
    median: samples[Math.floor(samples.length / 2)],
    min: samples[0],
    max: samples[samples.length - 1],
    mean: sum / samples.length,
    repeat,
  };
};

export const measureAsync = async (
  fn: () => Promise<void>,
  repeat = 5,
  warmup = 1,
): Promise<Timing> => {
  for (let i = 0; i < warmup; i++) await fn();
  const samples: number[] = [];
  for (let i = 0; i < repeat; i++) {
    const t0 = now();
    await fn();
    samples.push(now() - t0);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((s, v) => s + v, 0);
  return {
    median: samples[Math.floor(samples.length / 2)],
    min: samples[0],
    max: samples[samples.length - 1],
    mean: sum / samples.length,
    repeat,
  };
};

/** 只保留两位小数,便于报告展示 */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const fmtMs = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n.toFixed(n >= 10 ? 1 : 2)}ms`;

export const fmtBytes = (n: number): string => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};

// ======================== 遍历计数 ========================

/**
 * 用 Proxy 包住记录数组,统计「整个数组被完整遍历」的次数。
 * 只拦截迭代入口(Symbol.iterator / forEach / map / filter / reduce / flatMap),
 * 不拦截索引访问,避免给被测函数带来明显额外开销。
 */
export const countTraversal = <T>(list: T[]): { proxy: T[]; count: () => number } => {
  let n = 0;
  const ITERATORS = new Set<PropertyKey>([
    Symbol.iterator,
    "forEach",
    "map",
    "filter",
    "reduce",
    "reduceRight",
    "flatMap",
    "some",
    "every",
    "find",
    "findIndex",
  ]);
  const proxy = new Proxy(list, {
    get(target, prop, receiver) {
      if (ITERATORS.has(prop)) n++;
      return Reflect.get(target, prop, receiver);
    },
  });
  return { proxy, count: () => n };
};

// ======================== 后端数据获取 ========================

export const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:29401";

export const TABLES = {
  attendance: "attendance_record_test",
  workers: "workers_test",
  workTypes: "workType_test",
  salary: "SalaryType_test",
} as const;

export interface FetchResult {
  items: any[];
  total: number;
  /** 墙钟耗时(ms) */
  ms: number;
  /** 响应体字节数合计 */
  bytes: number;
  /** 实际发出的 HTTP 请求数(含翻页) */
  httpRequests: number;
}

/**
 * 复刻 PocketBase SDK 的 getFullList:串行翻页(perPage 默认 500),
 * 同时记录耗时、响应体字节数与 HTTP 请求数。
 */
export const fetchList = async (
  collection: string,
  opts: { filter?: string; sort?: string; expand?: string; perPage?: number; pageSize?: number } = {},
): Promise<FetchResult> => {
  const { filter, sort, expand, perPage = 500, pageSize } = opts;
  const t0 = now();
  let page = 1;
  let total = 0;
  let bytes = 0;
  let httpRequests = 0;
  const items: any[] = [];

  for (;;) {
    const url = new URL(`/api/collections/${collection}/records`, PB_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(pageSize ?? perPage));
    if (filter) url.searchParams.set("filter", filter);
    if (sort) url.searchParams.set("sort", sort);
    if (expand) url.searchParams.set("expand", expand);

    const res = await fetch(url);
    httpRequests++;
    const text = await res.text();
    bytes += Buffer.byteLength(text, "utf8");
    if (!res.ok) throw new Error(`${collection} ${res.status}: ${text.slice(0, 200)}`);
    const json = JSON.parse(text) as { items: any[]; totalItems: number };
    total = json.totalItems;
    items.push(...json.items);
    if (items.length >= total || json.items.length === 0) break;
    page++;
  }

  return { items, total, ms: now() - t0, bytes, httpRequests };
};

// ======================== 数据放大 ========================

const shiftDate = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * 按「真实分布平移复制」放大数据:第 k 份整体后移 spanDays*k 天。
 * 保持人数/工种/工时分布不变,只让记录数与天数同比例增长,
 * 这样关系图的 O(天 × 人数²) 也按真实比例放大。
 */
export const scaleRecords = (base: any[], factor: number): any[] => {
  if (factor <= 1) return base;
  const days = base.map((r) => r.work_date).sort();
  const span = days.length
    ? Math.round(
        (Date.parse(`${days[days.length - 1]}T00:00:00Z`) -
          Date.parse(`${days[0]}T00:00:00Z`)) /
          86400000,
      ) + 1
    : 1;

  const out: any[] = [];
  for (let k = 0; k < factor; k++) {
    const offset = k * span;
    for (const r of base) {
      out.push({
        ...r,
        id: `${r.id}_s${k}`,
        work_date: shiftDate(r.work_date, offset),
      });
    }
  }
  return out;
};

// ======================== 现状逻辑复刻 ========================

/** 从记录重建 B1 需要的中间量(不计入对比计时) */
export const buildMonthlyInputs = (list: any[]) => {
  const dayWorkerSet = new Map<string, Set<string>>();
  const dayMinutes = new Map<string, number>();
  const shiftTotals = new Map<string, number>();

  for (const r of list) {
    const workerId = r?.worker_id as string;
    const day = r?.work_date as string | undefined;
    const minutes = Number(r?.work_minutes) || 0;
    if (!day || !workerId) continue;
    if (!dayWorkerSet.has(day)) dayWorkerSet.set(day, new Set());
    dayWorkerSet.get(day)!.add(workerId);
    dayMinutes.set(day, (dayMinutes.get(day) ?? 0) + minutes);
    const key = `${workerId}|${day}`;
    shiftTotals.set(key, (shiftTotals.get(key) ?? 0) + minutes);
  }

  const allDays = [...dayMinutes.keys()].sort();
  const monthList: string[] = [];
  if (allDays.length) {
    const from = allDays[0].slice(0, 7);
    const to = allDays[allDays.length - 1].slice(0, 7);
    const [y0, m0] = from.split("-").map(Number);
    const [y1, m1] = to.split("-").map(Number);
    for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      monthList.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return { dayWorkerSet, dayMinutes, shiftTotals, allDays, monthList };
};

const classify = (minutes: number): "full" | "nearFull" | "half" | "short" => {
  const h = minutes / 60;
  if (h >= 9) return "full";
  if (h >= 8) return "nearFull";
  if (h >= 3) return "half";
  return "short";
};

const daysInMonth = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export interface MonthlyRow {
  month: string;
  personDays: number;
  workers: number;
  minutes: number;
  fullDays: number;
  nearFullDays: number;
  halfDays: number;
  shortDays: number;
  workDays: number;
  attendanceRate: number;
}

/** 逐字段比较两份月度结果(不依赖键顺序),用于断言优化版口径不变 */
export const monthlyEqual = (a: MonthlyRow[], b: MonthlyRow[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i];
    const keys = Object.keys(row) as Array<keyof MonthlyRow>;
    if (keys.length !== Object.keys(other).length) return false;
    return keys.every((k) => row[k] === other[k]);
  });
};

/** 现状实现(逐行对齐 compute.ts:414-456):
 * 每个月都 allDays.filter + 全量遍历 shiftTotals + 两次相同的 reduce。
 */
export const monthlyCurrent = (input: ReturnType<typeof buildMonthlyInputs>): MonthlyRow[] => {
  const { dayWorkerSet, dayMinutes, shiftTotals, allDays, monthList } = input;
  return monthList.map((month) => {
    const days = allDays.filter((d) => d.startsWith(month));
    const workers = new Set<string>();
    let personDays = 0;
    for (const day of days) {
      const set = dayWorkerSet.get(day);
      if (!set) continue;
      personDays += set.size;
      set.forEach((id) => workers.add(id));
    }
    const shifts = { full: 0, nearFull: 0, half: 0, short: 0 };
    for (const [key, minutes] of shiftTotals) {
      const day = key.slice(key.indexOf("|") + 1);
      if (!day.startsWith(month)) continue;
      shifts[classify(minutes)]++;
    }
    return {
      month,
      personDays,
      workers: workers.size,
      // 同一表达式算两遍(compute.ts:437 与 :445)
      minutes: days.reduce((s, d) => s + (dayMinutes.get(d) ?? 0), 0),
      workDays: days.filter((d) => (dayMinutes.get(d) ?? 0) > 0).length,
      fullDays: shifts.full,
      nearFullDays: shifts.nearFull,
      halfDays: shifts.half,
      shortDays: shifts.short,
      attendanceRate: workers.size
        ? Number((personDays / (workers.size * daysInMonth(month))).toFixed(3))
        : 0,
    };
  });
};

/** 优化实现:两次遍历按月份分桶,月度只做查表 */
export const monthlyOptimized = (input: ReturnType<typeof buildMonthlyInputs>): MonthlyRow[] => {
  const { dayWorkerSet, dayMinutes, shiftTotals, monthList } = input;

  const bucket = new Map<
    string,
    {
      days: string[];
      workers: Set<string>;
      personDays: number;
      minutes: number;
      workDays: number;
      shifts: { full: number; nearFull: number; half: number; short: number };
    }
  >();
  const get = (month: string) => {
    let b = bucket.get(month);
    if (!b) {
      b = {
        days: [],
        workers: new Set(),
        personDays: 0,
        minutes: 0,
        workDays: 0,
        shifts: { full: 0, nearFull: 0, half: 0, short: 0 },
      };
      bucket.set(month, b);
    }
    return b;
  };

  for (const [day, set] of dayWorkerSet) {
    const b = get(day.slice(0, 7));
    b.days.push(day);
    b.personDays += set.size;
    set.forEach((id) => b.workers.add(id));
    const minutes = dayMinutes.get(day) ?? 0;
    b.minutes += minutes;
    if (minutes > 0) b.workDays++;
  }
  for (const [key, minutes] of shiftTotals) {
    const b = get(key.slice(key.indexOf("|") + 1, key.indexOf("|") + 8));
    b.shifts[classify(minutes)]++;
  }

  return monthList.map((month) => {
    const b = bucket.get(month);
    if (!b) {
      return {
        month,
        personDays: 0,
        workers: 0,
        minutes: 0,
        fullDays: 0,
        nearFullDays: 0,
        halfDays: 0,
        shortDays: 0,
        workDays: 0,
        attendanceRate: 0,
      };
    }
    return {
      month,
      personDays: b.personDays,
      workers: b.workers.size,
      minutes: b.minutes,
      workDays: b.workDays,
      fullDays: b.shifts.full,
      nearFullDays: b.shifts.nearFull,
      halfDays: b.shifts.half,
      shortDays: b.shifts.short,
      attendanceRate: b.workers.size
        ? Number((b.personDays / (b.workers.size * daysInMonth(month))).toFixed(3))
        : 0,
    };
  });
};

// ======================== B7:薪资引擎的精简版 ========================

/** 现状:一次遍历产出 5 张 Map(与 salary.ts:59-113 同构) */
export const salaryStatsFull = (
  list: any[],
  workerMap: Map<string, string>,
  workTypeMap: Map<string, string>,
  salaryDict: Record<string, number>,
) => {
  const recordMap = new Map<string, Decimal>();
  const daySalaryMap = new Map<string, Map<string, Decimal>>();
  const monthSalaryMap = new Map<string, Map<string, Decimal>>();
  const dayMinutesMap = new Map<string, Map<string, number>>();
  const monthMinutesMap = new Map<string, Map<string, number>>();

  for (const rec of list) {
    const workerName = workerMap.get(rec.worker_id) ?? "未知";
    const workName = workTypeMap.get(rec.work) ?? "未知";
    const day = rec.work_date as string;
    const month = day?.slice(0, 7);
    const key =
      `${workerName}_${workName}` in salaryDict
        ? `${workerName}_${workName}`
        : workerName in salaryDict
          ? workerName
          : workName in salaryDict
            ? workName
            : "基础";
    const salaryNum = new Decimal(salaryDict[key] ?? 0);
    const recordSalary = new Decimal(rec.work_minutes ?? 0).dividedBy(60).mul(salaryNum);
    recordMap.set(String(rec.id), recordSalary);

    if (!daySalaryMap.has(workerName)) daySalaryMap.set(workerName, new Map());
    const wd = daySalaryMap.get(workerName)!;
    wd.set(day, (wd.get(day) || new Decimal(0)).add(recordSalary));
    if (!monthSalaryMap.has(workerName)) monthSalaryMap.set(workerName, new Map());
    const wm = monthSalaryMap.get(workerName)!;
    wm.set(month, (wm.get(month) || new Decimal(0)).add(recordSalary));

    const minutes = Number(rec.work_minutes) || 0;
    const workerId = rec.worker_id as string;
    if (!dayMinutesMap.has(workerId)) dayMinutesMap.set(workerId, new Map());
    const dm = dayMinutesMap.get(workerId)!;
    dm.set(day, (dm.get(day) ?? 0) + minutes);
    if (!monthMinutesMap.has(workerId)) monthMinutesMap.set(workerId, new Map());
    const mm = monthMinutesMap.get(workerId)!;
    mm.set(month, (mm.get(month) ?? 0) + minutes);
  }
  return { recordMap, daySalaryMap, monthSalaryMap, dayMinutesMap, monthMinutesMap };
};

/** 精简版:只算每条记录的薪资(主表合计只需要这个) */
export const salaryStatsRecordsOnly = (
  list: any[],
  workerMap: Map<string, string>,
  workTypeMap: Map<string, string>,
  salaryDict: Record<string, number>,
) => {
  const recordMap = new Map<string, Decimal>();
  for (const rec of list) {
    const workerName = workerMap.get(rec.worker_id) ?? "未知";
    const workName = workTypeMap.get(rec.work) ?? "未知";
    const key =
      `${workerName}_${workName}` in salaryDict
        ? `${workerName}_${workName}`
        : workerName in salaryDict
          ? workerName
          : workName in salaryDict
            ? workName
            : "基础";
    recordMap.set(
      String(rec.id),
      new Decimal(rec.work_minutes ?? 0).dividedBy(60).mul(new Decimal(salaryDict[key] ?? 0)),
    );
  }
  return { recordMap };
};

// ======================== B9:重复检测 ========================

/** 现状:names.filter((n,i) => names.indexOf(n) !== i) */
export const findDuplicatesIndexOf = (names: string[]): string[] => {
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  return [...new Set(dup)];
};

/** 优化:一次遍历用 Set */
export const findDuplicatesSet = (names: string[]): string[] => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const n of names) {
    if (seen.has(n)) dup.add(n);
    else seen.add(n);
  }
  return [...dup];
};
