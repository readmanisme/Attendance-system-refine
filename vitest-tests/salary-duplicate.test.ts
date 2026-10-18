import { describe, expect, test } from "vitest";
import { checkSalaryDraft } from "@/pages/xin-zi/duplicateCheck";

const withNames = (workerId: string, workTypeId: string, workerName: string, workTypeName: string) => ({
  worker_name: workerId,
  work_type: workTypeId,
  expand: { worker_name: { name: workerName }, work_type: { name: workTypeName } },
});

describe("checkSalaryDraft 空组合", () => {
  test("工人与工种都没选 → empty", () => {
    expect(checkSalaryDraft({ workerId: null, workTypeId: null }, [])).toEqual({ kind: "empty" });
  });

  test("两者都是空串也按 empty 处理", () => {
    expect(checkSalaryDraft({ workerId: "", workTypeId: "" }, [])).toEqual({ kind: "empty" });
  });
});

describe("checkSalaryDraft 重复判定", () => {
  test("工人+工种都已存在 → 报重复并带出名称", () => {
    const records = [withNames("w1", "k1", "张三", "司机")];
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: "k1" }, records)).toEqual({
      kind: "duplicate",
      workerName: "张三",
      workTypeName: "司机",
    });
  });

  test("同一工人换工种不算重复", () => {
    const records = [withNames("w1", "k1", "张三", "司机")];
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: "k2" }, records)).toEqual({ kind: "ok" });
  });

  test("同一工种换工人不算重复", () => {
    const records = [withNames("w1", "k1", "张三", "司机")];
    expect(checkSalaryDraft({ workerId: "w2", workTypeId: "k1" }, records)).toEqual({ kind: "ok" });
  });

  test("只设工人价时不与「工人+工种」的记录冲突", () => {
    const records = [withNames("w1", "k1", "张三", "司机")];
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: null }, records)).toEqual({ kind: "ok" });
  });

  test("只设工种价时不与「工人+工种」的记录冲突", () => {
    const records = [withNames("w1", "k1", "张三", "司机")];
    expect(checkSalaryDraft({ workerId: null, workTypeId: "k1" }, records)).toEqual({ kind: "ok" });
  });

  test("仅工人价的重复能被识别", () => {
    const records = [{ worker_name: "w1", work_type: "" }];
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: null }, records)).toEqual({
      kind: "duplicate",
      workerName: "无工人",
      workTypeName: "无工种",
    });
  });

  test("仅工种价的重复能被识别", () => {
    const records = [{ worker_name: "", work_type: "k1" }];
    expect(checkSalaryDraft({ workerId: undefined, workTypeId: "k1" }, records)).toEqual({
      kind: "duplicate",
      workerName: "无工人",
      workTypeName: "无工种",
    });
  });
});

describe("checkSalaryDraft 空值归一", () => {
  test("记录里的空关系字段与未选状态互通(不因 null/空串差异漏判)", () => {
    const records = [{ worker_name: "", work_type: "" }];
    expect(checkSalaryDraft({ workerId: null, workTypeId: undefined }, records).kind).toBe("empty");
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: null }, records).kind).toBe("ok");
  });

  test("expand 缺失时用占位名而不是抛错", () => {
    const records = [{ worker_name: "w1", work_type: "k1" }];
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: "k1" }, records)).toEqual({
      kind: "duplicate",
      workerName: "无工人",
      workTypeName: "无工种",
    });
  });

  test("列表还没加载完(undefined)时不误判为重复", () => {
    expect(checkSalaryDraft({ workerId: "w1", workTypeId: "k1" }, undefined)).toEqual({ kind: "ok" });
  });
});
