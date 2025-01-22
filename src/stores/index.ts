import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import dayjs from "dayjs";

interface SomeState {
    colorMode: "light" | "dark";
  recordDateRange: [string|null, string|null];
  DatePickerMode:"single" | "range";
  setDatePickerMode: (mode: "single" | "range") => void;
  setRecordDateRange: (start: string, end: string) => void;
  setColorMode: (mode: "light" | "dark") => void;
  GongShiData: string[];
  setGongShiData: (data: string[]) => void;
}

export const useSomeStore = create<SomeState>()(
  devtools(
    persist(
      (set) => ({
        colorMode: "light",
        recordDateRange: [dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD')],
        DatePickerMode: "single",
        setDatePickerMode: (mode: "single" | "range") => set({ DatePickerMode: mode }),
        setRecordDateRange: (start: string | null, end: string | null) =>
          set({ recordDateRange: [start ?? dayjs().startOf('month').format('YYYY-MM-DD'), end ?? dayjs().endOf('month').format('YYYY-MM-DD')] }),
        setColorMode: (mode: "light" | "dark") => set({ colorMode: mode }),
        // GongShiData:dayjs().startOf('month').format('YYYY-MM'),
              GongShiData: import.meta.env.PROD 
               ? [dayjs().startOf('month').format('YYYY-MM'), dayjs().endOf('month').format('YYYY-MM')] // 生产环境下的初始值
              : [dayjs("2024-05-05").startOf('month').format('YYYY-MM'), dayjs("2024-05-05").endOf('month').format('YYYY-MM')], // 开发环境下的初始值
        setGongShiData: (data: string[]) => set({ GongShiData: data }),
      }),
      {
        name: "some-store", // 存储名称，用于标识存储
      }
    )
  )
);
