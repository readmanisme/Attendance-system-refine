/**
 * 薪资引擎单测:resolveSalaryKey 的优先级链、buildSalaryDict 的三种键形态、
 * computeSalaryStats 的逐记录/按天/按月聚合、groupByWorkerId 分组。
 * 这些规则同时决定"工时&薪资"页面、Excel 导出与统计页支出,是最核心的业务口径。
 */
import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import {
  buildSalaryDict,
  computeSalaryStats,
  groupByWorkerId,
  resolveSalaryKey,
} from "@/utils/salary";

/** 构造薪资设置记录(expand 形态与 refine useList 一致) */
const salaryRec = (opts: {
  worker?: string | null;
  work?: string | null;
  num?: number | string | null;
}) => ({
  SalaryNum: opts.num,
  expand: {
    worker_name: opts.worker ? { name: opts.worker } : null,
    work_type: opts.work ? { name: opts.work } : null,
  },
});

describe("resolveSalaryKey", () => {
  const dict = {
    甲_搬运: 30,
    甲: 28,
    乙: 25,
    挖土: 18,
    基础: 10,
  };

  test("四级优先级: 人_工种 → 人 → 工种 → 基础", () => {
    expect(resolveSalaryKey("甲", "搬运", dict)).toBe("甲_搬运");
    expect(resolveSalaryKey("甲", "挖土", dict)).toBe("甲"); // 无"甲_挖土",退到人
    expect(resolveSalaryKey("乙", "搬运", dict)).toBe("乙"); // 无"乙_搬运",退到人
    expect(resolveSalaryKey("丙", "挖土", dict)).toBe("挖土"); // 无人价,退到工种
    expect(resolveSalaryKey("丙", "砌墙", dict)).toBe("基础"); // 全未命中
  });

  test("空字典也兜底到基础,不抛错", () => {
    expect(resolveSalaryKey("甲", "搬运", {})).toBe("基础");
  });

  test("空名字不会意外命中其他键", () => {
    const d = { 基础: 10, "": 99 };
    // 空 worker + 空 work → 先查 "_"(不存在) → 查 ""(存在) → 返回 ""
    expect(resolveSalaryKey("", "", d)).toBe("");
    // 空 worker + 有工种 → 查 "_搬运" 无 → 查 ""(存在) → 返回 "",不会跳到工种价
    expect(resolveSalaryKey("", "搬运", d)).toBe("");
    // 没有空字符串键时,空 worker 会继续退到工种
    expect(resolveSalaryKey("", "搬运", { 基础: 10, 搬运: 18 })).toBe("搬运");
  });
});

describe("buildSalaryDict", () => {
  test("三种键形态: 人_工种 / 人 / 工种", () => {
    const dict = buildSalaryDict([
      salaryRec({ worker: "甲", work: "搬运", num: 30 }),
      salaryRec({ worker: "乙", num: 25 }),
      salaryRec({ work: "挖土", num: 18 }),
      salaryRec({ work: "基础", num: 10 }),
    ]);
    expect(dict).toEqual({ 甲_搬运: 30, 乙: 25, 挖土: 18, 基础: 10 });
  });

  test("没有基础时补 0", () => {
    expect(buildSalaryDict([salaryRec({ worker: "甲", num: 20 })])).toEqual({
      甲: 20,
      基础: 0,
    });
    expect(buildSalaryDict([])).toEqual({ 基础: 0 });
    expect(buildSalaryDict(undefined)).toEqual({ 基础: 0 });
  });

  test("SalaryNum 非法或缺失按 0 处理", () => {
    const dict = buildSalaryDict([
      salaryRec({ worker: "甲", num: undefined }),
      salaryRec({ worker: "乙", num: "abc" }),
      salaryRec({ worker: "丙", num: null }),
    ]);
    expect(dict).toMatchObject({ 甲: 0, 乙: 0, 丙: 0 });
  });

  test("expand 缺失的记录被跳过,不产生空键", () => {
    const dict = buildSalaryDict([{ SalaryNum: 20 }, { SalaryNum: 20, expand: {} }]);
    expect(dict).toEqual({ 基础: 0 });
  });

  test("同一键后出现的记录覆盖前面的", () => {
    const dict = buildSalaryDict([
      salaryRec({ worker: "甲", work: "搬运", num: 20 }),
      salaryRec({ worker: "甲", work: "搬运", num: 35 }),
    ]);
    expect(dict["甲_搬运"]).toBe(35);
  });
});

describe("computeSalaryStats", () => {
  const workerMap = new Map([
    ["w1", "甲"],
    ["w2", "乙"],
  ]);
  const workTypeMap = new Map([
    ["t1", "搬运"],
    ["t2", "挖土"],
  ]);
  const salaryDict = { 甲_搬运: 20, 基础: 10 };

  const records = [
    { id: "r1", worker_id: "w1", work: "t1", work_date: "2026-08-01", work_minutes: 600 },
    { id: "r2", worker_id: "w1", work: "t1", work_date: "2026-08-01", work_minutes: 300 },
    { id: "r3", worker_id: "w1", work: "t2", work_date: "2026-08-02", work_minutes: 200 },
    { id: "r4", worker_id: "w2", work: "t1", work_date: "2026-09-10", work_minutes: 90 },
  ];

  const stats = computeSalaryStats(records, { workerMap, workTypeMap, salaryDict });

  test("逐记录: 工时×时薪,并记录匹配依据", () => {
    expect(stats.recordMap.get("r1")!.salary.toString()).toBe("200"); // 10h×20
    expect(stats.recordMap.get("r1")!.basis).toBe("甲_搬运:20");
    expect(stats.recordMap.get("r2")!.salary.toString()).toBe("100"); // 5h×20
    // 甲_挖土 未单独定价 → 兜底基础 10 → 200/60*10
    expect(stats.recordMap.get("r3")!.salary.toDecimalPlaces(4).toString()).toBe("33.3333");
    expect(stats.recordMap.get("r3")!.basis).toBe("基础:10");
    expect(stats.recordMap.get("r4")!.salary.toString()).toBe("15"); // 1.5h×10
  });

  test("按天/按月工资按工人名聚合(同日多条相加)", () => {
    expect(stats.daySalaryMap.get("甲")!.get("2026-08-01")!.toString()).toBe("300");
    expect(stats.daySalaryMap.get("甲")!.get("2026-08-02")!.toDecimalPlaces(4).toString()).toBe(
      "33.3333",
    );
    expect(stats.monthSalaryMap.get("甲")!.get("2026-08")!.toDecimalPlaces(4).toString()).toBe(
      "333.3333",
    );
    expect(stats.monthSalaryMap.get("乙")!.get("2026-09")!.toString()).toBe("15");
  });

  test("按天/按月工时按工人 id 聚合", () => {
    expect(stats.dayMinutesMap.get("w1")!.get("2026-08-01")).toBe(900);
    expect(stats.monthMinutesMap.get("w1")!.get("2026-08")).toBe(1100);
    expect(stats.monthMinutesMap.get("w2")!.get("2026-09")).toBe(90);
  });

  test("空输入返回空 Map,不抛错", () => {
    const empty = computeSalaryStats(undefined, { workerMap, workTypeMap, salaryDict });
    expect(empty.recordMap.size).toBe(0);
    expect(empty.daySalaryMap.size).toBe(0);
    expect(empty.monthSalaryMap.size).toBe(0);
    expect(empty.dayMinutesMap.size).toBe(0);
    expect(empty.monthMinutesMap.size).toBe(0);
  });

  test("id 查不到名称时用未知占位,仍参与聚合", () => {
    const s = computeSalaryStats(
      [{ id: "x1", worker_id: "wX", work: "tX", work_date: "2026-08-01", work_minutes: 60 }],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(s.recordMap.get("x1")!.basis).toBe("基础:10");
    expect(s.daySalaryMap.has("未知")).toBe(true);
    expect(s.dayMinutesMap.has("wX")).toBe(true);
  });

  test("work_minutes 缺失按 0 处理,不产生 NaN", () => {
    const s = computeSalaryStats(
      [{ id: "y1", worker_id: "w1", work: "t1", work_date: "2026-08-01" }],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(s.recordMap.get("y1")!.salary.toString()).toBe("0");
    expect(s.dayMinutesMap.get("w1")!.get("2026-08-01")).toBe(0);
  });

  test("金额是 Decimal,避免浮点误差累积", () => {
    const s = computeSalaryStats(
      [
        { id: "z1", worker_id: "w1", work: "t1", work_date: "2026-08-01", work_minutes: 20 },
        { id: "z2", worker_id: "w1", work: "t1", work_date: "2026-08-01", work_minutes: 20 },
      ],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(s.daySalaryMap.get("甲")!.get("2026-08-01")).toBeInstanceOf(Decimal);
    // 0.3333…×20 两次相加,Decimal 下与直接算 40 分钟等价
    expect(s.daySalaryMap.get("甲")!.get("2026-08-01")!.toDecimalPlaces(4).toString()).toBe(
      "13.3333",
    );
  });
});

describe("groupByWorkerId", () => {
  test("按 worker_id 分组,保持原顺序", () => {
    const map = groupByWorkerId([
      { id: "a", worker_id: "w1" },
      { id: "b", worker_id: "w2" },
      { id: "c", worker_id: "w1" },
    ]);
    expect(map.get("w1")!.map((r) => r.id)).toEqual(["a", "c"]);
    expect(map.get("w2")!.map((r) => r.id)).toEqual(["b"]);
  });

  test("空输入返回空 Map", () => {
    expect(groupByWorkerId(undefined).size).toBe(0);
    expect(groupByWorkerId([]).size).toBe(0);
  });
});
