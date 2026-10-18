/**
 * 签到页"批量录入面板"的全部状态/校验/提交逻辑。
 * checkDate(所选日期)的状态留在页面组件里,因为当天记录表(useEditableTable)也要用它。
 */
import { useCallback, useMemo, useState } from "react";
import { useCreateMany, useUpdate } from "@refinedev/core";
import type { Dayjs } from "dayjs";
import { formatHoursExact, hoursToMinutes } from "@/utils/workTime";
import { MAX_DAILY_MINUTES, resolveBatchState } from "./batchState";

export type WorkerOption = { key: string; label: string; value: string };
export type WorkTypeValue = { value: string; label: string } | undefined;

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

  // 状态机在 batchState.ts,这里只负责把状态翻译成提示文案
  const { state, luruDisabled, alertDescription, alertType, dataTestid } = useMemo(() => {
    const next = resolveBatchState({
      workers: batchWorkers,
      workType,
      minutes,
      recordsByKey,
    });
    const workLabel = workType?.label ?? "";

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
          alertDescription: next.overLimit.map((m) => (
            <div key={m.workerId}>
              {m.label}，当天已有{workLabel}记录（{formatHoursExact(m.existingMinutes)}小时），再录
              {formatHoursExact(minutes)}小时将达到{formatHoursExact(m.totalMinutes)}
              小时，超过单日 24 小时上限
            </div>
          )),
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
  }, [batchWorkers, recordsByKey, workType, minutes]);

  // ======================== 批量提交 ========================

  /**
   * 批量提交:已存在同人同天同工种记录 → 在原记录上叠加工时;否则批量新增。
   * 等全部请求结束后才清空选择:任一失败则保留输入,让用户只重试不重选。
   */
  const submitBatch = useCallback(async () => {
    // 按钮已禁用时不该提交;这里用状态机兜底,防止绕过 UI 直接调用
    // (注意:不要用 `!` 非空断言,react-compiler 会把读取提升到渲染期)
    if (state.disabled || !workType || isSubmitting) return;

    const workDate = checkDate.format("YYYY-MM-DD");
    const workId = workType.value;
    const creates: any[] = [];
    const updates: Promise<unknown>[] = [];
    for (const name of batchWorkers) {
      const existing = recordsByKey.get(`${name.key}|${workId}`);
      if (existing) {
        updates.push(
          updateRecordAsync({
            resource: __AttendanceRecord_TableName,
            id: existing.id,
            values: { work_minutes: (existing.work_minutes ?? 0) + minutes },
          }),
        );
      } else {
        creates.push({
          worker_id: name.key,
          work_date: workDate,
          work_minutes: minutes,
          work: workId,
        });
      }
    }
    if (creates.length) {
      updates.push(createBatchRecordAsync({ values: creates }));
    }
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(updates);
      const allSuccess = results.every((r) => r.status === "fulfilled");
      if (allSuccess) {
        setBatchWorkers([]);
        setWorkType(undefined);
      }
      // 失败时保留人员/工作/工时,refine 会弹出错误通知,用户可直接再次录入
    } finally {
      setIsSubmitting(false);
    }
  }, [
    state.disabled,
    checkDate,
    workType,
    batchWorkers,
    minutes,
    recordsByKey,
    updateRecordAsync,
    createBatchRecordAsync,
    isSubmitting,
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
