/**
 * 配置 store 单测:默认月份范围、setter、v1→v2 迁移、partialize。
 *
 * stores/index.ts 在模块顶层读取 window.location.search 并初始化 zustand persist,
 * 所以必须在 import 之前铺好 window。Node 环境下 zustand 默认的 localStorage 不可用,
 * import 后用 persist.setOptions 注入内存 storage(它会同时更新内部闭包引用)。
 */
import { describe, expect, test, vi } from "vitest";
import dayjs from "dayjs";

vi.stubGlobal("window", { location: { search: "" } });

const mod = await import("@/stores");

/** 内存版 PersistStorage(值为 StorageValue 对象,不是字符串) */
const memory: Record<string, any> = {};
mod.useConfigStore.persist.setOptions({
  storage: {
    getItem: (name: string) => memory[name] ?? null,
    setItem: (name: string, value: any) => {
      memory[name] = value;
    },
    removeItem: (name: string) => {
      delete memory[name];
    },
  },
});

describe("useConfigStore 默认值", () => {
  test("考勤月范围默认 本月～下月", () => {
    const [from, to] = mod.useConfigStore.getState().recordMonthRange;
    expect(from).toBe(dayjs().startOf("month").format("YYYY-MM"));
    expect(to).toBe(dayjs().add(1, "month").format("YYYY-MM"));
  });

  test("统计页范围默认不限,与考勤页隔离", () => {
    expect(mod.useConfigStore.getState().tongjiMonthRange).toEqual([null, null]);
  });

  test("后端地址默认 29401(未带 ?pb-port 时)", () => {
    expect(mod.useConfigStore.getState().__BACKEND_API_URL__).toBe("http://localhost:29401");
  });

  test("setter 能更新两个月份范围且互不影响", () => {
    mod.useConfigStore.getState().setRecordMonthRange(["2026-01", "2026-02"]);
    expect(mod.useConfigStore.getState().recordMonthRange).toEqual(["2026-01", "2026-02"]);

    mod.useConfigStore.getState().setTongjiMonthRange(["2026-03", null]);
    expect(mod.useConfigStore.getState().tongjiMonthRange).toEqual(["2026-03", null]);

    expect(mod.useConfigStore.getState().recordMonthRange).toEqual(["2026-01", "2026-02"]);
  });
});

describe("persist 迁移", () => {
  const migrate = () => mod.useConfigStore.persist.getOptions().migrate!;

  test("v1 → v2: recordDateRange 改名为 recordMonthRange", () => {
    const old = { recordDateRange: ["2025-11", "2025-12"], tongjiMonthRange: [null, null] };
    const next = migrate()(old, 1) as any;
    expect(next.recordMonthRange).toEqual(["2025-11", "2025-12"]);
    expect(next.recordDateRange).toBeUndefined();
  });

  test("v1 → v2: 新字段已存在时不覆盖用户在新版里的选择", () => {
    const old = {
      recordMonthRange: ["2026-05", "2026-06"],
      recordDateRange: ["2025-01", "2025-02"],
    };
    const next = migrate()(old, 1) as any;
    expect(next.recordMonthRange).toEqual(["2026-05", "2026-06"]);
    expect(next.recordDateRange).toBeUndefined();
  });

  test("v0(更早版本)直接重置为空状态", () => {
    expect(migrate()({ recordDateRange: ["2024-01", "2024-02"] }, 0)).toEqual({});
  });

  test("已是最新版本时原样返回", () => {
    const current = { recordMonthRange: ["2026-07", "2026-08"], tongjiMonthRange: [null, null] };
    expect(migrate()(current, 2)).toBe(current);
  });
});

describe("persist 落盘与 partialize", () => {
  test("set 之后写入 some-store,版本号与字段齐全", () => {
    mod.useConfigStore.getState().setTongjiMonthRange(["2026-04", "2026-05"]);
    const saved = memory["some-store"];
    expect(saved).toBeTruthy();
    expect(saved.version).toBe(2);
    expect(saved.state.recordMonthRange).toEqual(["2026-01", "2026-02"]);
    expect(saved.state.tongjiMonthRange).toEqual(["2026-04", "2026-05"]);
  });

  test("DEV 下后端地址参与持久化(生产由 partialize 剔除)", () => {
    expect(memory["some-store"].state.__BACKEND_API_URL__).toBe("http://localhost:29401");
  });

  test("生产环境 partialize 剔除后端地址及其 setter", () => {
    const partialize = mod.useConfigStore.persist.getOptions().partialize as any;
    vi.stubEnv("PROD", "true");
    try {
      const persisted = partialize(mod.useConfigStore.getState());
      expect(persisted).not.toHaveProperty("__BACKEND_API_URL__");
      expect(persisted).not.toHaveProperty("set__BACKEND_API_URL__");
      expect(persisted).toHaveProperty("recordMonthRange");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("生产环境锁定后端地址,忽略运行时修改", () => {
    vi.stubEnv("PROD", "true");
    try {
      mod.useConfigStore.getState().set__BACKEND_API_URL__("http://localhost:9999");
      expect(mod.useConfigStore.getState().__BACKEND_API_URL__).toBe("http://localhost:29401");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("useUiStore", () => {
  test("帮助抽屉默认关闭,setter 可开关", () => {
    expect(mod.useUiStore.getState().helpOpen).toBe(false);
    mod.useUiStore.getState().setHelpOpen(true);
    expect(mod.useUiStore.getState().helpOpen).toBe(true);
    mod.useUiStore.getState().setHelpOpen(false);
    expect(mod.useUiStore.getState().helpOpen).toBe(false);
  });
});
