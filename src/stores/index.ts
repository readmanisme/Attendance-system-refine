import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import dayjs from "dayjs";

interface SomeState {
  recordDateRange: string[];
  setRecordDateRange: (data: string[]) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  __BACKEND_API_URL__: string;
  set__BACKEND_API_URL__: (url: string) => void;
}
const NEW_MAJOR_VERSION = 1;
export const useSomeStore = create<SomeState>()(
  devtools(
    persist(
      (set) => ({
        recordDateRange: [
          dayjs().day(0).format("YYYY-MM-DD"),
          dayjs().day(0).add(1, "month").format("YYYY-MM-DD"),
        ],
        setRecordDateRange: (data: string[]) =>
          set({
            recordDateRange: data,
          }),
        helpOpen: false,
        setHelpOpen: (open: boolean) => set({ helpOpen: open }),
        __BACKEND_API_URL__: "http://localhost:29401",
        set__BACKEND_API_URL__: (url: string) =>
          set({
            __BACKEND_API_URL__: url,
          }),
      }),
      {
        name: "some-store", // 存储名称，用于标识存储
        version: NEW_MAJOR_VERSION, // 存储版本，用于更新时判断是否需要更新存储
        // 迁移逻辑：如果版本低于 NEW_MAJOR_VERSION，则清除旧状态
        migrate: (persistedState, version) => {
          // 🚨 只要 version < NEW_MAJOR_VERSION (即 version 是 0 或 1), 就会进入这里
          if (version < NEW_MAJOR_VERSION) {
            console.warn(`检测到旧版 Store (v${version})，由于结构不兼容，已执行状态重置。`);

            // 返回一个空对象 {}，Zustand 会用你的 Store 定义的默认状态（如 userProfile: null）进行初始化。
            return {};

            // 或者返回 null/undefined 也可以达到同样的目的：强制使用默认状态
            // return null;
          }

          // 如果版本匹配或更高（通常不应该发生），则返回现有状态
          return persistedState;
        },
      }
    )
  )
);
