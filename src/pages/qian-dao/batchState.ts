/**
 * 批量录入面板的校验状态机(纯函数,不依赖 React)。
 * useBatchEntry 只负责把这里算出的状态渲染成提示,便于单测覆盖全部优先级分支。
 */

/** 单日工时硬上限:24 小时。按"人天"合计(含当天所有工种),与 WorkMinutesInput 的钳制口径一致 */
export const MAX_DAILY_MINUTES = 24 * 60;

export type BatchStateKind =
  | "no-worker" // 未选人员
  | "no-work" // 未选工作
  | "no-minutes" // 工时 <= 0
  | "over-limit" // 合并后超过单日上限
  | "merge" // 会与已有记录合并
  | "ok"; // 可以直接录入

/** 一条"会合并"的明细 */
export interface MergeInfo {
  workerId: string;
  label: string;
  /** 同工种已有记录的工时(分钟) */
  existingMinutes: number;
  /** 同工种合并后的工时(分钟) */
  totalMinutes: number;
}

/**
 * 人天维度超限明细:除同工种合并外,还要算上当天其它工种的工时。
 * 只按"人×工种"判上限会漏掉"换工种各录一份"的情况(人天可达 48h)。
 */
export interface DayLimitInfo extends MergeInfo {
  /** 当天其它工种的工时合计(分钟) */
  otherWorkMinutes: number;
  /** 当天合计工时(含本次录入,分钟) */
  dayTotalMinutes: number;
}

export interface BatchState {
  kind: BatchStateKind;
  /** 录入按钮是否禁用 */
  disabled: boolean;
  /** 对应提示的 data-testid */
  testid: string;
  /** 会合并的明细(仅 merge / over-limit 有意义) */
  merges: MergeInfo[];
  /** 人天合计超上限的明细(仅 over-limit 有意义) */
  overLimit: DayLimitInfo[];
}

export interface WorkerLike {
  key: string;
  label: string;
}

export interface WorkTypeLike {
  value: string;
  label: string;
}

export interface ResolveBatchStateArgs {
  workers: readonly WorkerLike[];
  workType: WorkTypeLike | undefined;
  minutes: number;
  /** `${worker_id}|${work_id}` → 当天已有记录 */
  recordsByKey: ReadonlyMap<string, { id?: string; work_minutes?: number | null }>;
}

/** 把任意来源的工时值收敛为非负整数分钟 */
const toMinutes = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** 拆 `${workerId}|${workId}`(工种 id 不含 "|",用 lastIndexOf 避免误切) */
const splitKey = (key: string): [string, string] => {
  const sep = key.lastIndexOf("|");
  return sep < 0 ? [key, ""] : [key.slice(0, sep), key.slice(sep + 1)];
};

/** 某人当天已有工时:同工种单独统计,其它工种合并统计(人天上限口径) */
const sumDayMinutes = (
  workerId: string,
  workId: string,
  recordsByKey: ResolveBatchStateArgs["recordsByKey"],
): { sameWork: number; otherWork: number } => {
  let sameWork = 0;
  let otherWork = 0;
  for (const [key, record] of recordsByKey) {
    const [w, k] = splitKey(key);
    if (w !== workerId) continue;
    const m = toMinutes(record?.work_minutes);
    if (k === workId) sameWork += m;
    else otherWork += m;
  }
  return { sameWork, otherWork };
};

/**
 * 计算批量录入的当前状态。优先级:
 * 未选人员 → 未选工作 → 工时<=0 → 当天合计超上限 → 会合并 → 可录入。
 */
export const resolveBatchState = ({
  workers,
  workType,
  minutes,
  recordsByKey,
}: ResolveBatchStateArgs): BatchState => {
  const base = { merges: [] as MergeInfo[], overLimit: [] as DayLimitInfo[] };

  if (!workers || workers.length === 0) {
    return { ...base, kind: "no-worker", disabled: true, testid: "no-worker-alert" };
  }
  if (!workType) {
    return { ...base, kind: "no-work", disabled: true, testid: "no-work-alert" };
  }
  if (!(minutes > 0)) {
    return { ...base, kind: "no-minutes", disabled: true, testid: "no-minutes-alert" };
  }

  const merges: MergeInfo[] = [];
  const overLimit: DayLimitInfo[] = [];
  for (const worker of workers) {
    const { sameWork, otherWork } = sumDayMinutes(worker.key, workType.value, recordsByKey);
    // 同人同天同工种 → 库里唯一索引会要求在原记录上叠加
    if (recordsByKey.has(`${worker.key}|${workType.value}`)) {
      merges.push({
        workerId: worker.key,
        label: worker.label,
        existingMinutes: sameWork,
        totalMinutes: sameWork + minutes,
      });
    }
    // 单日上限按"人天"算:同工种 + 当天其它工种 + 本次录入
    const dayTotalMinutes = sameWork + otherWork + minutes;
    if (dayTotalMinutes > MAX_DAILY_MINUTES) {
      overLimit.push({
        workerId: worker.key,
        label: worker.label,
        existingMinutes: sameWork,
        totalMinutes: sameWork + minutes,
        otherWorkMinutes: otherWork,
        dayTotalMinutes,
      });
    }
  }

  if (overLimit.length > 0) {
    return { ...base, merges, overLimit, kind: "over-limit", disabled: true, testid: "over-limit-alert" };
  }
  if (merges.length > 0) {
    return { ...base, merges, kind: "merge", disabled: false, testid: "merge-alert" };
  }
  return { ...base, kind: "ok", disabled: false, testid: "can-input-alert" };
};
