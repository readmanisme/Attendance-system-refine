/**
 * 薪资设置"新建"时的组合校验(纯函数)。
 * SalaryType 表没有唯一索引,重复只能靠这里拦,因此单独抽出来用测试守住。
 */

export interface SalaryDraft {
  /** 工人记录 id(未选为 null/undefined) */
  workerId?: string | null;
  /** 工种记录 id(未选为 null/undefined) */
  workTypeId?: string | null;
}

export type SalaryDraftCheck =
  | { kind: "empty" }
  | { kind: "duplicate"; workerName: string; workTypeName: string }
  | { kind: "ok" };

/** PocketBase 关系字段为空时可能返回 ""、null 或 undefined,统一归一为空串 */
const norm = (value: unknown): string => (value == null ? "" : String(value));

/**
 * 判定"工人 + 工种"这一组合是否已存在。
 * 只有两者都相同才算重复:仅工人、仅工种、工人+工种 是三个独立的键。
 */
export const checkSalaryDraft = (
  draft: SalaryDraft,
  records: readonly any[] | undefined,
): SalaryDraftCheck => {
  const workerId = norm(draft.workerId);
  const workTypeId = norm(draft.workTypeId);

  if (!workerId && !workTypeId) return { kind: "empty" };

  const hit = (records ?? []).find(
    (record) => norm(record?.worker_name) === workerId && norm(record?.work_type) === workTypeId,
  );

  if (!hit) return { kind: "ok" };

  return {
    kind: "duplicate",
    workerName: hit?.expand?.worker_name?.name || "无工人",
    workTypeName: hit?.expand?.work_type?.name || "无工种",
  };
};
