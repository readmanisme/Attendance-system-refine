import { describe, expect, test } from "vitest";
import {
  MAX_DAILY_MINUTES,
  resolveBatchState,
  type ResolveBatchStateArgs,
} from "@/pages/qian-dao/batchState";

const workType = { value: "work-1", label: "司机" };
const workerA = { key: "w-a", label: "张三", value: "w-a" };
const workerB = { key: "w-b", label: "李四", value: "w-b" };

/** 构造调用参数,records 用 [workerId, minutes] 数组简化 */
const args = (
  overrides: Partial<ResolveBatchStateArgs> & { records?: Array<[string, number | null]> } = {},
): ResolveBatchStateArgs => {
  const { records = [], ...rest } = overrides;
  const map = new Map(records.map(([id, m]) => [`${id}|work-1`, { id: `rec-${id}`, work_minutes: m }]));
  return {
    workers: [workerA],
    workType,
    minutes: 480,
    recordsByKey: map,
    ...rest,
  };
};

describe("resolveBatchState 优先级", () => {
  test("未选人员优先于未选工作与工时", () => {
    const s = resolveBatchState(args({ workers: [], workType: undefined, minutes: 0 }));
    expect(s.kind).toBe("no-worker");
    expect(s.disabled).toBe(true);
    expect(s.testid).toBe("no-worker-alert");
  });

  test("已选人员但未选工作", () => {
    const s = resolveBatchState(args({ workType: undefined, minutes: 0 }));
    expect(s.kind).toBe("no-work");
    expect(s.testid).toBe("no-work-alert");
  });

  test("工时恰好为 0 时不可录入", () => {
    const s = resolveBatchState(args({ minutes: 0 }));
    expect(s.kind).toBe("no-minutes");
    expect(s.disabled).toBe(true);
  });

  test("负工时不因取绝对值而被放过", () => {
    const s = resolveBatchState(args({ minutes: -60 }));
    expect(s.kind).toBe("no-minutes");
    expect(s.disabled).toBe(true);
  });

  test("NaN 工时按未填处理", () => {
    const s = resolveBatchState(args({ minutes: Number.NaN }));
    expect(s.kind).toBe("no-minutes");
  });
});

describe("resolveBatchState 合并判定", () => {
  test("当天没有同键记录 → 可录入,不产生合并明细", () => {
    const s = resolveBatchState(args({ workers: [workerA, workerB], records: [] }));
    expect(s.kind).toBe("ok");
    expect(s.disabled).toBe(false);
    expect(s.testid).toBe("can-input-alert");
    expect(s.merges).toEqual([]);
  });

  test("当天已有同键记录 → 给出合并后的总工时", () => {
    const s = resolveBatchState(args({ minutes: 480, records: [["w-a", 300]] }));
    expect(s.kind).toBe("merge");
    expect(s.disabled).toBe(false);
    expect(s.merges).toEqual([
      { workerId: "w-a", label: "张三", existingMinutes: 300, totalMinutes: 780 },
    ]);
  });

  test("多人混合时只列出真正有记录的人", () => {
    const s = resolveBatchState(args({ workers: [workerA, workerB], minutes: 120, records: [["w-a", 300]] }));
    expect(s.kind).toBe("merge");
    expect(s.merges).toHaveLength(1);
    expect(s.merges[0].workerId).toBe("w-a");
  });

  test("已有记录工时为 null 时按 0 叠加", () => {
    const s = resolveBatchState(args({ minutes: 120, records: [["w-a", null]] }));
    expect(s.merges[0].existingMinutes).toBe(0);
    expect(s.merges[0].totalMinutes).toBe(120);
  });

  test("已有记录工时为字符串数字时也能正确相加", () => {
    const map = new Map([["w-a|work-1", { id: "r", work_minutes: "300" as unknown as number }]]);
    const s = resolveBatchState(args({ minutes: 60, recordsByKey: map }));
    expect(s.merges[0].totalMinutes).toBe(360);
  });

  test("不同工种的记录不参与合并", () => {
    const map = new Map([["w-a|work-2", { id: "r", work_minutes: 300 }]]);
    const s = resolveBatchState(args({ minutes: 60, recordsByKey: map }));
    expect(s.kind).toBe("ok");
  });
});

describe("resolveBatchState 单日上限", () => {
  test("合并后恰好 24 小时仍可录入(边界不含等于)", () => {
    const s = resolveBatchState(args({ minutes: 480, records: [["w-a", 960]] }));
    expect(s.kind).toBe("merge");
    expect(s.merges[0].totalMinutes).toBe(MAX_DAILY_MINUTES);
    expect(s.disabled).toBe(false);
  });

  test("合并后超过 24 小时 → 禁用并报出超限的人", () => {
    const s = resolveBatchState(args({ minutes: 480, records: [["w-a", 1020]] }));
    expect(s.kind).toBe("over-limit");
    expect(s.disabled).toBe(true);
    expect(s.testid).toBe("over-limit-alert");
    expect(s.overLimit).toEqual([
      {
        workerId: "w-a",
        label: "张三",
        existingMinutes: 1020,
        totalMinutes: 1500,
        otherWorkMinutes: 0,
        dayTotalMinutes: 1500,
      },
    ]);
  });

  test("部分人超限时整批禁用,超限明细只含超限者", () => {
    const s = resolveBatchState(
      args({ workers: [workerA, workerB], minutes: 480, records: [["w-a", 1200], ["w-b", 300]] }),
    );
    expect(s.kind).toBe("over-limit");
    expect(s.disabled).toBe(true);
    expect(s.overLimit.map((m) => m.workerId)).toEqual(["w-a"]);
    expect(s.merges).toHaveLength(2);
  });
});

describe("resolveBatchState 单日上限按人天算(含其它工种)", () => {
  /** 同一个人当天另一个工种的记录(键为 w-a|work-2) */
  const otherWorkRecord = (workerId: string, minutes: number) =>
    new Map([[`${workerId}|work-2`, { id: "other", work_minutes: minutes }]]);

  test("同工种没记录,但当天其它工种已满 20h → 再录 8h 超限", () => {
    const s = resolveBatchState(
      args({ minutes: 480, recordsByKey: otherWorkRecord("w-a", 1200) }),
    );
    expect(s.kind).toBe("over-limit");
    expect(s.disabled).toBe(true);
    // 没有同工种记录 → 不产生合并明细
    expect(s.merges).toEqual([]);
    expect(s.overLimit[0]).toMatchObject({
      workerId: "w-a",
      existingMinutes: 0,
      totalMinutes: 480,
      otherWorkMinutes: 1200,
      dayTotalMinutes: 1680,
    });
  });

  test("同工种 + 其它工种合计判定,合并明细只算同工种", () => {
    const map = new Map([
      ["w-a|work-1", { id: "r1", work_minutes: 300 }],
      ["w-a|work-2", { id: "r2", work_minutes: 600 }],
    ]);
    const s = resolveBatchState(args({ minutes: 480, recordsByKey: map }));
    // 同工种 300+480=780(合并明细),人天 300+600+480=1380(未超限)
    expect(s.kind).toBe("merge");
    expect(s.merges[0]).toMatchObject({ existingMinutes: 300, totalMinutes: 780 });
    expect(s.overLimit).toEqual([]);

    // 再抬 120 分钟:人天 1500 > 1440 → 超限,且合并明细仍是同工种口径
    const s2 = resolveBatchState(args({ minutes: 600, recordsByKey: map }));
    expect(s2.kind).toBe("over-limit");
    expect(s2.merges[0]).toMatchObject({ existingMinutes: 300, totalMinutes: 900 });
    expect(s2.overLimit[0]).toMatchObject({ otherWorkMinutes: 600, dayTotalMinutes: 1500 });
  });

  test("人天恰好 24 小时仍可录入", () => {
    const map = new Map([
      ["w-a|work-1", { id: "r1", work_minutes: 960 }],
      ["w-a|work-2", { id: "r2", work_minutes: 0 }],
    ]);
    const s = resolveBatchState(args({ minutes: 480, recordsByKey: map }));
    expect(s.kind).toBe("merge");
    expect(s.disabled).toBe(false);
  });

  test("其它人的记录不计入本人人天", () => {
    const map = new Map([["w-b|work-2", { id: "r2", work_minutes: 1440 }]]);
    const s = resolveBatchState(args({ minutes: 480, recordsByKey: map }));
    expect(s.kind).toBe("ok");
    expect(s.disabled).toBe(false);
  });

  test("键里没有分隔符的脏数据不会串到别人头上", () => {
    const map = new Map([["bad-key", { id: "bad", work_minutes: 1440 }]]);
    const s = resolveBatchState(args({ minutes: 480, recordsByKey: map }));
    expect(s.kind).toBe("ok");
    expect(s.overLimit).toEqual([]);
  });
});
