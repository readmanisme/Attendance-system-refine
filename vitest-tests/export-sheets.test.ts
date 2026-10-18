import { describe, expect, test } from "vitest";
import dayjs from "dayjs";
import { buildExportSheets, resolveExportRange } from "@/pages/gong-shi/exportSheets";

const workerMap = new Map([
  ["w1", "张三"],
  ["w2", "李四"],
]);
const workTypeMap = new Map([["k1", "司机"]]);
const salaryDict: Record<string, number> = { 张三_司机: 20, 基础: 10 };

const rec = (
  id: string,
  workerId: string,
  workId: string,
  date: string,
  minutes: number,
) => ({ id, worker_id: workerId, work: workId, work_date: date, work_minutes: minutes });

describe("resolveExportRange", () => {
  test("起始取所选日,结束扩到该月月末", () => {
    expect(resolveExportRange(dayjs("2026-01-01"), dayjs("2026-01-15"))).toEqual({
      startDay: "2026-01-01",
      endDay: "2026-01-31",
    });
  });

  test("跨月时结束取后一个月的月末", () => {
    expect(resolveExportRange(dayjs("2026-01-10"), dayjs("2026-03-02"))).toEqual({
      startDay: "2026-01-10",
      endDay: "2026-03-31",
    });
  });

  test("闰年 2 月按 29 天收尾", () => {
    expect(resolveExportRange(dayjs("2028-02-05"), dayjs("2028-02-05")).endDay).toBe("2028-02-29");
  });
});

describe("buildExportSheets 明细", () => {
  test("一条记录一行,薪资 = 工时 × 时薪,并带匹配依据", () => {
    const { detail } = buildExportSheets([rec("r1", "w1", "k1", "2026-01-01", 600)], {
      workerMap,
      workTypeMap,
      salaryDict,
    });
    expect(detail).toEqual([
      {
        序号: "r1",
        工人: "张三",
        工作类型: "司机",
        总工时: "10",
        薪资: 200,
        依据: "张三_司机:20",
        日期: "2026-01-01",
      },
    ]);
  });

  test("查不到工人/工种时用未知占位,并回退到基础价", () => {
    const { detail } = buildExportSheets([rec("r1", "wx", "kx", "2026-01-01", 240)], {
      workerMap,
      workTypeMap,
      salaryDict,
    });
    expect(detail[0]).toMatchObject({ 工人: "未知", 工作类型: "未知", 依据: "基础:10" });
    expect(detail[0].薪资).toBe(40);
  });

  test("非整小时按两位小数显示并附精确时分", () => {
    const { detail } = buildExportSheets([rec("r1", "w1", "k1", "2026-01-01", 20)], {
      workerMap,
      workTypeMap,
      salaryDict,
    });
    expect(detail[0].总工时).toBe("0.33 (0h 20m)");
  });
});

describe("buildExportSheets 日聚合", () => {
  test("同一工人同一天多条记录合并工时与薪资", () => {
    const { day } = buildExportSheets(
      [rec("r1", "w1", "k1", "2026-01-01", 300), rec("r2", "w1", "k1", "2026-01-01", 300)],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(day).toEqual([{ 序号: 1, 工人: "张三", 日期: "2026-01-01", 总工时: "10", 薪资: 200 }]);
  });

  test("按工人名再按日期排序,序号从 1 递增", () => {
    const { day } = buildExportSheets(
      [
        rec("r1", "w2", "k1", "2026-02-01", 240),
        rec("r2", "w1", "k1", "2026-01-02", 300),
        rec("r3", "w1", "k1", "2026-01-01", 600),
      ],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(day.map((r) => [r.序号, r.工人, r.日期])).toEqual([
      [1, "张三", "2026-01-01"],
      [2, "张三", "2026-01-02"],
      [3, "李四", "2026-02-01"],
    ]);
  });
});

describe("buildExportSheets 月聚合", () => {
  test("跨月按工人+月份分组,工时与薪资累加", () => {
    const { month } = buildExportSheets(
      [
        rec("r1", "w1", "k1", "2026-01-01", 600),
        rec("r2", "w1", "k1", "2026-01-02", 300),
        rec("r3", "w1", "k1", "2026-02-01", 240),
        rec("r4", "w2", "k1", "2026-02-03", 480),
      ],
      { workerMap, workTypeMap, salaryDict },
    );
    expect(month).toEqual([
      { 序号: 1, 工人: "张三", 月份: "2026-01", 总工时: "15", 薪资: 300 },
      { 序号: 2, 工人: "张三", 月份: "2026-02", 总工时: "4", 薪资: 80 },
      { 序号: 3, 工人: "李四", 月份: "2026-02", 总工时: "8", 薪资: 80 },
    ]);
  });

  test("月合计等于对应日合计之和", () => {
    const input = [
      rec("r1", "w1", "k1", "2026-01-01", 480),
      rec("r2", "w1", "k1", "2026-01-31", 90),
    ];
    const { day, month } = buildExportSheets(input, { workerMap, workTypeMap, salaryDict });
    const daySum = day.reduce((acc, r) => acc + r.薪资, 0);
    expect(month[0].薪资).toBe(daySum);
  });
});

describe("buildExportSheets 空输入", () => {
  test("undefined 与空数组都返回三个空 sheet,不抛错", () => {
    const deps = { workerMap, workTypeMap, salaryDict };
    expect(buildExportSheets(undefined, deps)).toEqual({ month: [], day: [], detail: [] });
    expect(buildExportSheets([], deps)).toEqual({ month: [], day: [], detail: [] });
  });
});
