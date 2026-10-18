/**
 * 签到页"所选日期"的简单统计(纯函数,不依赖 React、不请求数据)。
 *
 * 口径与记录表一致:一条记录 = 一人 × 一天 × 一工种。
 * - 人数:按 worker_id 去重(同一天跨工种只算一个人);
 * - 人均工时 = 总工时 / 人数(四舍五入到分钟);
 * - 工种分布按工时降序,workers 为该工种当天的人数。
 */
import { UNKNOWN_NAME } from "@/constants";

export interface DayStats {
  /** 出勤人数(按 worker_id 去重) */
  workerCount: number;
  /** 记录条数(人×工种) */
  recordCount: number;
  /** 总工时(分钟) */
  totalMinutes: number;
  /** 人均工时(分钟,四舍五入) */
  avgMinutes: number;
  /** 工种分布(工时降序) */
  works: { name: string; minutes: number; workers: number }[];
}

export const EMPTY_DAY_STATS: DayStats = {
  workerCount: 0,
  recordCount: 0,
  totalMinutes: 0,
  avgMinutes: 0,
  works: [],
};

/** 一天(已按 work_date 筛选)的记录 → 简单统计 */
export const computeDayStats = (records?: readonly any[] | null): DayStats => {
  const list = records ?? [];
  if (!list.length) return EMPTY_DAY_STATS;

  const workers = new Set<string>();
  const works = new Map<string, { minutes: number; workers: Set<string> }>();
  let totalMinutes = 0;

  for (const record of list) {
    const minutes = Number(record?.work_minutes) || 0;
    totalMinutes += minutes;

    const workerId = record?.worker_id == null ? "" : String(record.worker_id);
    if (workerId) workers.add(workerId);

    const name: string = record?.expand?.work?.name ?? UNKNOWN_NAME;
    const item = works.get(name) ?? { minutes: 0, workers: new Set<string>() };
    item.minutes += minutes;
    if (workerId) item.workers.add(workerId);
    works.set(name, item);
  }

  return {
    workerCount: workers.size,
    recordCount: list.length,
    totalMinutes,
    avgMinutes: workers.size ? Math.round(totalMinutes / workers.size) : 0,
    works: [...works.entries()]
      .map(([name, item]) => ({ name, minutes: item.minutes, workers: item.workers.size }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name)),
  };
};
