/**
 * 批量录入面板的校验状态机(纯函数,不依赖 React)。
 * useBatchEntry 只负责把这里算出的状态渲染成提示,便于单测覆盖全部优先级分支。
 */

/** 单日工时硬上限:24 小时。与 WorkMinutesInput / adjustMinutes 的口径保持一致 */
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
  /** 已有记录的工时(分钟) */
  existingMinutes: number;
  /** 合并后的工时(分钟) */
  totalMinutes: number;
}

export interface BatchState {
  kind: BatchStateKind;
  /** 录入按钮是否禁用 */
  disabled: boolean;
  /** 对应提示的 data-testid */
  testid: string;
  /** 会合并的明细(仅 merge / over-limit 有意义) */
  merges: MergeInfo[];
  /** 合并后超上限的明细(仅 over-limit 有意义) */
  overLimit: MergeInfo[];
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

/**
 * 计算批量录入的当前状态。优先级:
 * 未选人员 → 未选工作 → 工时<=0 → 合并后超上限 → 会合并 → 可录入。
 */
export const resolveBatchState = ({
  workers,
  workType,
  minutes,
  recordsByKey,
}: ResolveBatchStateArgs): BatchState => {
  const base = { merges: [] as MergeInfo[], overLimit: [] as MergeInfo[] };

  if (!workers || workers.length === 0) {
    return { ...base, kind: "no-worker", disabled: true, testid: "no-worker-alert" };
  }
  if (!workType) {
    return { ...base, kind: "no-work", disabled: true, testid: "no-work-alert" };
  }
  if (!(minutes > 0)) {
    return { ...base, kind: "no-minutes", disabled: true, testid: "no-minutes-alert" };
  }

  // 同人同天同工种 → 库里唯一索引会要求在原记录上叠加
  const merges: MergeInfo[] = [];
  for (const worker of workers) {
    const existing = recordsByKey.get(`${worker.key}|${workType.value}`);
    if (!existing) continue;
    const existingMinutes = toMinutes(existing.work_minutes);
    merges.push({
      workerId: worker.key,
      label: worker.label,
      existingMinutes,
      totalMinutes: existingMinutes + minutes,
    });
  }

  const overLimit = merges.filter((m) => m.totalMinutes > MAX_DAILY_MINUTES);
  if (overLimit.length > 0) {
    return { ...base, merges, overLimit, kind: "over-limit", disabled: true, testid: "over-limit-alert" };
  }
  if (merges.length > 0) {
    return { ...base, merges, kind: "merge", disabled: false, testid: "merge-alert" };
  }
  return { ...base, kind: "ok", disabled: false, testid: "can-input-alert" };
};
