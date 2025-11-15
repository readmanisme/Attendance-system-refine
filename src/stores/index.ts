// useSomeStore.ts (修订版)
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; 
import dayjs, { Dayjs } from "dayjs";

interface SomeState {
  recordDateRange: string[];
  setRecordDateRange: (data: string[]) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  __BACKEND_API_URL__: string;
  set__BACKEND_API_URL__: (url: string) => void;
  CheckDate: string; //dayjs会自动变成字符串
  setCheckDate: (date: Dayjs) => void;
  KaoQingPresons:any,
  setKaoQingPresons: (data: any) => void;
}

const NEW_MAJOR_VERSION = 1;
// 您的 API URL，在所有环境下都保持这个值作为默认和生产锁定值
const FIXED_API_URL = "http://localhost:29401";

export const useSomeStore = create<SomeState>()(
  devtools(
    persist(
      (set) => ({
        // --- 状态初始化 ---
        recordDateRange: [
          // dayjs().startOf("month").format("YYYY-MM-DD"),
          // dayjs().add(1, "month").endOf("month").format("YYYY-MM-DD"),
          dayjs().startOf("month").format("YYYY-MM"),
          dayjs().add(1, "month").format("YYYY-MM"),
          // 要包含后一个月
        ],
        CheckDate: dayjs().format("YYYY-MM-DD"),
        setCheckDate: (date: Dayjs) => set({ CheckDate: date.format("YYYY-MM-DD") }),
        KaoQingPresons: [],
        setKaoQingPresons: (data: any) => set({ KaoQingPresons: data }),

        helpOpen: false,
        
        // __BACKEND_API_URL__ 始终初始化为您指定的 URL
        __BACKEND_API_URL__: FIXED_API_URL,

        // --- Action 定义 ---
        setRecordDateRange: (data: string[]) => set({ recordDateRange: data }),
        
        setHelpOpen: (open: boolean) => set({ helpOpen: open }),

        // 核心：锁定生产环境下的 URL 更改
        set__BACKEND_API_URL__: (url: string) => {
          if (import.meta.env.PROD) {
            // 如果是生产模式，拒绝更改，并确保它始终是固定值
            console.warn("API URL is locked in production mode. Change ignored.");
            set({ __BACKEND_API_URL__: FIXED_API_URL });
            return;
          }
          // 开发模式下，允许更改用于测试
          set({ __BACKEND_API_URL__: url });
        },
      }),
      {
        
        name: "some-store",
        version: NEW_MAJOR_VERSION,

        // 核心：排除 __BACKEND_API_URL__ 的持久化
        partialize: (state) => {
          // 使用解构赋值，将 __BACKEND_API_URL__ 从要持久化的状态对象中排除
          const { __BACKEND_API_URL__, set__BACKEND_API_URL__, ...persistedState } = state;
          
          return persistedState;
        },
        
        // 迁移逻辑不变
        migrate: (persistedState, version) => {
          if (version < NEW_MAJOR_VERSION) {
            console.warn(`检测到旧版 Store (v${version})，已执行状态重置。`);
            return {};
          }
          return persistedState;
        },
      }
    )
  )
);