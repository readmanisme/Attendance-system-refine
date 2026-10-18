/**
 * 签到页"批量录入面板"的全部状态/校验/提交逻辑。
 * checkDate(所选日期)的状态留在页面组件里,因为当天记录表(useEditableTable)也要用它。
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useCreateMany, useUpdate } from "@refinedev/core";
import type { Dayjs } from "dayjs";
import { formatHoursExact, hoursToMinutes } from "@/utils/workTime";
import { MAX_DAILY_MINUTES, resolveBatchState } from "./batchState";

export type WorkerOption = { key: string; label: string; value: string };
export type WorkTypeValue = { value: string; label: string } | undefined;

/**
 * 一次提交的计划。目标值在生成计划时就定死(不是"当前值 + 工时"),
 * 失败后重试只补发失败项,因此同一笔工时不会被累加两次。
 */
interface PendingSubmit {
  /** 日期|工种|工时|人员集合 的指纹:输入变了就作废重算 */
  signature: string;
  updates: { id: string; workMinutes: number }[];
  creates: any[];
}

/** 提交意图的指纹:输入任何一项变了,都算一次新的录入 */
const buildSignature = (
  workDate: string,
  workId: string,
  minutes: number,
  workers: readonly WorkerOption[],
): string => `${workDate}|${workId}|${minutes}|${workers.map((w) => w.key).sort().join(",")}`;

/** 页内选中日期的记录:worker_id|work → 记录,用于判断"同人同天同工种"会在库里自动合并 */
const useRecordsByKey = (dataSource?: readonly any[]) =>
  useMemo(() => {
    const map = new Map<string, any>();
    for (const record of dataSource ?? []) {
      if (record.worker_id && record.work) {
        map.set(`${record.worker_id}|${record.work}`, record);
      }
    }
    return map;
  }, [dataSource]);

interface UseBatchEntryProps {
  /** 所选签到日期(状态在页面:当天记录表也要用它筛选) */
  checkDate: Dayjs;
  setCheckDate: (date: Dayjs) => void;
  /** 当天(所选日期)的考勤记录,用于判断"同键合并" */
  existingRecords?: readonly any[];
}

export function useBatchEntry({ checkDate, setCheckDate, existingRecords }: UseBatchEntryProps) {
  // 录入的工时(整数分钟)
  const [minutes, setMinutes] = useState<number>(0);
  const [workType, setWorkType] = useState<WorkTypeValue>(undefined);
  const [batchWorkers, setBatchWorkers] = useState<WorkerOption[]>([]);

  const { mutateAsync: createBatchRecordAsync } = useCreateMany({
    resource: __AttendanceRecord_TableName,
  });
  const { mutateAsync: updateRecordAsync } = useUpdate();

  /** 是否正在提交:提交期间按钮 loading/禁用,防止重复提交 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 同步提交锁:isSubmitting 是异步状态,连点两下会同时读到 false */
  const submittingRef = useRef(false);
  /** 上一次提交的计划:失败后重试只补发失败的部分,已成功的不会重复累加 */
  const [pending, setPending] = useState<PendingSubmit | null>(null);

  // ======================== 计算衍生数据 ========================

  const adjustMinutes = useCallback(
    (delta: number) => setMinutes((m) => Math.min(MAX_DAILY_MINUTES, Math.max(0, m + delta))),
    [],
  );
  const setHoursValue = useCallback(
    (hours: number) => setMinutes(Math.min(MAX_DAILY_MINUTES, Math.max(0, hoursToMinutes(hours)))),
    [],
  );

  const recordsByKey = useRecordsByKey(existingRecords);

  /** 当前输入的指纹:与未完成的计划一致时,说明这次点击是"补发"而不是新录入 */
  const signature = buildSignature(
    checkDate.format("YYYY-MM-DD"),
    workType?.value ?? "",
    minutes,
    batchWorkers,
  );
  const pendingRetry =
    pending && pending.signature === signature && pending.updates.length + pending.creates.length > 0
      ? pending
      : null;

  // 状态机在 batchState.ts,这里只负责把状态翻译成提示文案
  const { state, luruDisabled, alertDescription, alertType, dataTestid } = useMemo(() => {
    const next = resolveBatchState({
      workers: batchWorkers,
      workType,
      minutes,
      recordsByKey,
    });
    const workLabel = workType?.label ?? "";

    // 有未完成的补发计划时,不能显示"再合并一次"的预览(那会让人误以为工时要翻倍):
    // 实际点击只会补发失败项,已成功的记录不再变动。
    if (pendingRetry && !next.disabled) {
      const count = pendingRetry.updates.length + pendingRetry.creates.length;
      return {
        state: next,
        luruDisabled: false,
        alertType: "warning" as const,
        dataTestid: "retry-pending-alert",
        alertDescription: `上次提交有 ${count} 项未成功（已成功的不会重复计入）。直接再点「录入」只补发失败的部分。`,
      };
    }

    switch (next.kind) {
      case "no-worker":
        return { state: next, luruDisabled: true, alertDescription: "请选择考勤人员", alertType: "warning" as const, dataTestid: next.testid };
      case "no-work":
        return { state: next, luruDisabled: true, alertDescription: "请选择工作", alertType: "warning" as const, dataTestid: next.testid };
      case "no-minutes":
        return { state: next, luruDisabled: true, alertDescription: "请录入大于0的工时", alertType: "warning" as const, dataTestid: next.testid };
      case "over-limit":
        return {
          state: next,
          luruDisabled: true,
          alertType: "error" as const,
          dataTestid: next.testid,
          alertDescription: next.overLimit.map((m) => {
            // 同工种已有 → 说明这次是"合并后超限";否则是"当天其它工种已占满"
            const sameWorkText =
              m.existingMinutes > 0
                ? `当天已有${workLabel}记录（${formatHoursExact(m.existingMinutes)}小时）`
                : "";
            const otherWorkText =
              m.otherWorkMinutes > 0
                ? `当天其它工种已录入${formatHoursExact(m.otherWorkMinutes)}小时`
                : "";
            const existingText = [sameWorkText, otherWorkText].filter(Boolean).join("，");
            // 只有存在其它工种时才强调"当天合计",否则保持原来的合并口径文案
            const totalText =
              m.otherWorkMinutes > 0
                ? `再录${formatHoursExact(minutes)}小时当天合计将达到${formatHoursExact(m.dayTotalMinutes)}小时`
                : `再录${formatHoursExact(minutes)}小时将达到${formatHoursExact(m.totalMinutes)}小时`;
            return (
              <div key={m.workerId}>
                {m.label}
                {existingText ? `，${existingText}` : ""}，{totalText}，超过单日 24 小时上限
              </div>
            );
          }),
        };
      case "merge":
        return {
          state: next,
          luruDisabled: false,
          alertType: "info" as const,
          dataTestid: next.testid,
          alertDescription: next.merges.map((m) => (
            <div key={m.workerId}>
              {m.label}，当天已有{workLabel}记录（{formatHoursExact(m.existingMinutes)}小时），录入后自动合并为
              {formatHoursExact(m.totalMinutes)}小时
            </div>
          )),
        };
      default:
        return { state: next, luruDisabled: false, alertDescription: "可以录入", alertType: "success" as const, dataTestid: next.testid };
    }
  }, [batchWorkers, recordsByKey, workType, minutes, pendingRetry]);

  // ======================== 批量提交 ========================

  /**
   * 批量提交:已存在同人同天同工种记录 → 在原记录上叠加工时;否则批量新增。
   * 幂等约定:
   *  1. 更新用"计划生成时算好的目标值",重试不会基于最新值再叠一次;
   *  2. 失败后只补发失败项(批量新增走 PB /api/batch,整批一个事务,可整体重试);
   *  3. 输入(日期/工种/工时/人员)一变,旧计划作废,按新输入重算。
   * 全部成功才清空选择;有失败则保留输入,用户直接再点一次就是"补发"。
   */
  const submitBatch = useCallback(async () => {
    // 按钮已禁用时不该提交;这里用状态机兜底,防止绕过 UI 直接调用
    // (注意:不要用 `!` 非空断言,react-compiler 会把读取提升到渲染期)
    if (state.disabled || !workType || submittingRef.current) return;

    const workDate = checkDate.format("YYYY-MM-DD");
    const workId = workType.value;

    const previous = pending;
    const plan: PendingSubmit =
      previous?.signature === signature
        ? previous
        : {
            signature,
            updates: batchWorkers.flatMap((worker) => {
              const existing = recordsByKey.get(`${worker.key}|${workId}`);
              if (!existing) return [];
              return [{ id: String(existing.id), workMinutes: (existing.work_minutes ?? 0) + minutes }];
            }),
            creates: batchWorkers
              .filter((worker) => !recordsByKey.has(`${worker.key}|${workId}`))
              .map((worker) => ({
                worker_id: worker.key,
                work_date: workDate,
                work_minutes: minutes,
                work: workId,
              })),
          };

    const updateTasks = plan.updates.map((item) => ({
      run: () =>
        updateRecordAsync({
          resource: __AttendanceRecord_TableName,
          id: item.id,
          values: { work_minutes: item.workMinutes },
        }),
      onFail: (failed: PendingSubmit) => failed.updates.push(item),
    }));
    const createTask = plan.creates.length
      ? {
          run: () => createBatchRecordAsync({ values: plan.creates }),
          onFail: (failed: PendingSubmit) => failed.creates.push(...plan.creates),
        }
      : null;
    const tasks = createTask ? [...updateTasks, createTask] : updateTasks;
    if (tasks.length === 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(tasks.map((t) => t.run()));
      const failed: PendingSubmit = { signature, updates: [], creates: [] };
      results.forEach((result, i) => {
        if (result.status === "rejected") tasks[i].onFail(failed);
      });
      if (failed.updates.length === 0 && failed.creates.length === 0) {
        setPending(null);
        setBatchWorkers([]);
        setWorkType(undefined);
      } else {
        // 只留失败项:再点一次只会补发这些,已成功的不会再加一遍
        setPending(failed);
      }
      // 失败时 refine 会弹出错误通知,人员/工作/工时都保留,用户可直接重试
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    state.disabled,
    checkDate,
    workType,
    batchWorkers,
    minutes,
    recordsByKey,
    pending,
    signature,
    updateRecordAsync,
    createBatchRecordAsync,
  ]);

  return {
    /** 所选签到日期(状态在页面) */
    checkDate,
    setCheckDate,
    /** 录入工时(整数分钟) */
    minutes,
    adjustMinutes,
    setHoursValue,
    /** 所选工作 */
    workType,
    setWorkType,
    /** 批量选择的工人 */
    batchWorkers,
    setBatchWorkers,
    /** 提交按钮是否禁用 */
    luruDisabled,
    /** 是否正在提交 */
    isSubmitting,
    /** 校验提示内容(types: warning/info/success/error) */
    alertDescription,
    alertType,
    dataTestid,
    submitBatch,
  };
}
