// src/stores/index.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import dayjs from "dayjs";

// ======================== UI 开关状态 ========================

interface UiState {
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  devtools((set) => ({
    helpOpen: false,
    setHelpOpen: (open: boolean) => set({ helpOpen: open }),
  })),
);

// ======================== 后端地址 / 考勤月范围配置 ========================

// electron 预注入端口可用时用它；网页 URL 带 ?pb-port=xxx 时用该参数（playwright 测试用）；否则用默认端口
const PORT =
  // @ts-expect-error,111
  window?.process1?.env?.PORTTTT ??
  new URLSearchParams(window.location.search).get("pb-port") ??
  29401;
const FIXED_API_URL = `http://localhost:${PORT}`;

interface ConfigState {
  /** 考勤月范围,存 "YYYY-MM" 字符串;查询边界由 getWorkDateRange 换算 */
  recordMonthRange: string[];
  setRecordMonthRange: (range: string[]) => void;
  /** 统计图表页的月份范围(null = 不限),只影响本页,与 recordMonthRange 隔离 */
  tongjiMonthRange: [string | null, string | null];
  setTongjiMonthRange: (range: [string | null, string | null]) => void;
  __BACKEND_API_URL__: string;
  set__BACKEND_API_URL__: (url: string) => void;
}

/** 当前持久化版本:升级时在 migrate 里按版本号逐级迁移 */
const NEW_MAJOR_VERSION = 2;

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set) => ({
        // 默认区间:本月(含)到下个月(含后一月)
        recordMonthRange: [
          dayjs().startOf("month").format("YYYY-MM"),
          dayjs().add(1, "month").format("YYYY-MM"),
        ],
        setRecordMonthRange: (range: string[]) => set({ recordMonthRange: range }),

        // 统计图表页的月份范围,默认不限(全部历史);persist 自动持久化,无需版本迁移
        tongjiMonthRange: [null, null],
        setTongjiMonthRange: (range: [string | null, string | null]) =>
          set({ tongjiMonthRange: range }),

        // 后端地址始终以 FIXED_API_URL 初始化
        __BACKEND_API_URL__: FIXED_API_URL,

        // 核心:锁定生产环境下的 URL 更改
        set__BACKEND_API_URL__: (url: string) => {
          if (import.meta.env.PROD) {
            console.warn("API URL is locked in production mode. Change ignored.");
            set({ __BACKEND_API_URL__: FIXED_API_URL });
            return;
          }
          // 开发模式下,允许更改用于测试多端口
          set({ __BACKEND_API_URL__: url });
        },
      }),
      {
        name: "some-store",
        version: NEW_MAJOR_VERSION,

        // 生产环境不持久化后端地址,始终使用 FIXED_API_URL
        partialize: (state) => {
          if (import.meta.env.PROD) {
            // 解构剔除 __BACKEND_API_URL__ 及其 setter
            const {
              __BACKEND_API_URL__: _api,
              set__BACKEND_API_URL__: _setApi,
              ...persistedState
            } = state;
            return persistedState;
          }
          return state;
        },

        migrate: (persistedState, version) => {
          if (version < 1) {
            console.warn(`检测到旧版 Store (v${version})，已执行状态重置。`);
            return {};
          }
          // v1 -> v2:月份区间字段由 recordDateRange 改名为 recordMonthRange,迁移时沿用用户原有选择
          const oldState = (persistedState ?? {}) as Record<string, unknown>;
          if (version < 2) {
            // 仅在新字段缺失时才用旧字段回填,避免覆盖用户在新版里已经改过的范围
            if (!oldState.recordMonthRange && oldState.recordDateRange) {
              oldState.recordMonthRange = oldState.recordDateRange;
            }
            delete oldState.recordDateRange;
          }
          return persistedState as ConfigState;
        },
      },
    ),
  ),
);
