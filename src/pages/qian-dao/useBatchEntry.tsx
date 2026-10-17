/**
 * 签到页"批量录入面板"的全部状态/校验/提交逻辑。
 * checkDate(所选日期)的状态留在页面组件里,因为当天记录表(useEditableTable)也要用它。
 */
import { useCallback, useMemo, useState } from "react";
import { useCreateMany, useUpdate } from "@refinedev/core";
import type { Dayjs } from "dayjs";
import { formatHoursExact, hoursToMinutes } from "@/utils/workTime";

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
    (delta: number) => setMinutes((m) => Math.min(24 * 60, Math.max(0, m + delta))),
    [],
  );
  const setHoursValue = useCallback((hours: number) => setMinutes(hoursToMinutes(hours)), []);

  const recordsByKey = useRecordsByKey(existingRecords);

  // 录入前的校验提示(无人员 / 无工作 / 同键合并 / 可以录入)
  const { luruDisabled, alertDescription, alertType, dataTestid } = useMemo(() => {
    if (!batchWorkers || batchWorkers.length === 0) {
      return {
        luruDisabled: true,
        alertDescription: "请选择考勤人员",
        alertType: "warning" as const,
        dataTestid: "no-worker-alert",
      };
    }
    if (!workType) {
      return {
        luruDisabled: true,
        alertDescription: "请选择工作",
        alertType: "warning" as const,
        dataTestid: "no-work-alert",
      };
    }
    if (minutes <= 0) {
      return {
        luruDisabled: true,
        alertDescription: "请录入大于0的工时",
        alertType: "warning" as const,
        dataTestid: "no-minutes-alert",
      };
    }
    // 同人同天同工种 → 会在库里自动合并(工时叠加)
    const mergeDescs: React.ReactNode[] = [];
    for (const name of batchWorkers) {
      const existing = recordsByKey.get(`${name.key}|${workType?.value}`);
      if (existing) {
        mergeDescs.push(
          <div key={`${name.key}-${existing.id}`}>
            {name.label}，当天已有{workType?.label}记录（
            {formatHoursExact(existing.work_minutes)}小时），录入后自动合并为
            {formatHoursExact((existing.work_minutes ?? 0) + minutes)}小时
          </div>,
        );
      }
    }
    if (mergeDescs.length > 0) {
      return {
        luruDisabled: false,
        alertDescription: mergeDescs,
        alertType: "info" as const,
        dataTestid: "merge-alert",
      };
    }
    return {
      luruDisabled: false,
      alertDescription: "可以录入",
      alertType: "success" as const,
      dataTestid: "can-input-alert",
    };
  }, [batchWorkers, recordsByKey, workType, minutes]);

  // ======================== 批量提交 ========================

  /**
   * 批量提交:已存在同人同天同工种记录 → 在原记录上叠加工时;否则批量新增。
   * 等全部请求结束后才清空选择:任一失败则保留输入,让用户只重试不重选。
   */
  const submitBatch = useCallback(async () => {
    if (!workType || minutes <= 0 || isSubmitting) {
      return; // 按钮已禁用,这里只是防御。（注意:不要用 `!` 非空断言,react-compiler 会把读取提升到渲染期）
    }
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
    /** 校验提示内容(types: warning/info/success) */
    alertDescription,
    alertType,
    dataTestid,
    submitBatch,
  };
}
