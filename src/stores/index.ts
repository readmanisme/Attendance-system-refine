import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import dayjs from "dayjs";

interface SomeState {
  recordDateRange: string[];
  setRecordDateRange: (data: string[]) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  CommonGrouping: any[][];
  setCommonGrouping: (data: any[][], index: number) => void;
  setCommonGroupingAll: (data: any[][]) => void;
}

export const useSomeStore = create<SomeState>()(
  devtools(
    persist(
      (set) => ({
        recordDateRange: [
          dayjs().format("YYYY-MM-DD"),
          dayjs().add(1, "month").format("YYYY-MM-DD"),
        ],
        setRecordDateRange: (data: string[]) =>
          set({
            recordDateRange: data,
          }),
        helpOpen: false,
        setHelpOpen: (open: boolean) => set({ helpOpen: open }),
        CommonGrouping: [[], [], [], [], []],
        setCommonGrouping: (data: any[], index: number) =>
          set((state) => {
            state.CommonGrouping[index] = data;
            return state;
          }),
        setCommonGroupingAll: (data: any[][]) =>
          set({
            CommonGrouping: data,
          }),
      }),
      {
        name: "some-store", // 存储名称，用于标识存储
      }
    )
  )
);
