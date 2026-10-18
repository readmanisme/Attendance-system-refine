/**
 * 其余纯逻辑工具的单测:表格 testid 注入、or 筛选构造、月份范围换算、PocketBase 实例缓存。
 * 这些函数体量小但被多个页面复用,出错会同时影响多处筛选/定位。
 */
import { describe, expect, test, vi } from "vitest";
import dayjs from "dayjs";

// get_data_picker_filter 顶层 import 了 stores,而 stores 顶层读 window.location;
// vi.hoisted 保证在静态 import 执行前铺好全局。
vi.hoisted(() => {
  (globalThis as any).window = { location: { search: "" } };
});

import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import { getWorkDateRange } from "@/utils/get_data_picker_filter";
import { getPb } from "@/utils/pocketbase";

describe("cellTestId", () => {
  test("把行号与记录传给工厂函数,产出 data-testid", () => {
    const onCell = cellTestId((i, r) => `row-${r.kind}-${i}`);
    expect(onCell({ kind: "name" }, 3)).toEqual({ "data-testid": "row-name-3" });
  });

  test("antd 偶尔不传 rowIndex 时按 0 处理", () => {
    const onCell = cellTestId((i) => `row-${i}`);
    expect(onCell({}, undefined)).toEqual({ "data-testid": "row-0" });
  });
});

describe("buildEqOrFilter", () => {
  test("多值生成一个 or 条件组", () => {
    expect(buildEqOrFilter("worker_id", ["w1", "w2"])).toEqual([
      {
        operator: "or",
        value: [
          { field: "worker_id", operator: "eq", value: "w1" },
          { field: "worker_id", operator: "eq", value: "w2" },
        ],
      },
    ]);
  });

  test("空数组返回空筛选(便于直接传给 setFilters)", () => {
    expect(buildEqOrFilter("worker_id", [])).toEqual([]);
  });

  test("单个值也走 or 包装,行为一致", () => {
    expect(buildEqOrFilter("id", [7])).toEqual([
      { operator: "or", value: [{ field: "id", operator: "eq", value: 7 }] },
    ]);
  });
});

describe("getWorkDateRange", () => {
  test("月范围换算成该月首日与末日", () => {
    expect(getWorkDateRange(["2026-02", "2026-03"])).toEqual({
      gte: "2026-02-01",
      lte: "2026-03-31",
    });
  });

  test("2 月按实际天数收尾(闰年 29 天)", () => {
    expect(getWorkDateRange(["2028-02", "2028-02"])).toEqual({
      gte: "2028-02-01",
      lte: "2028-02-29",
    });
  });

  test("缺省时退化为当前月", () => {
    expect(getWorkDateRange(undefined)).toEqual({
      gte: dayjs().startOf("month").format("YYYY-MM-DD"),
      lte: dayjs().endOf("month").format("YYYY-MM-DD"),
    });
  });
});

describe("getPb", () => {
  test("同一地址复用实例,不同地址各自缓存", () => {
    const a = getPb("http://localhost:29401");
    const b = getPb("http://localhost:29401");
    const c = getPb("http://localhost:29410");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.baseURL).toContain("29401");
  });
});
