import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import dayjs from "dayjs";
const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}));

interface SomeState {
    colorMode: "light" | "dark";
  recordDateRange: [Date, Date];
  DatePickerMode:"single" | "range";
  setDatePickerMode: (mode: "single" | "range") => void;
  setRecordDateRange: (start: string, end: string) => void;
  setColorMode: (mode: string) => void;
}

export const useSomeStore = create<SomeState>()(
  devtools((set) => ({
    colorMode: "light",
    // recordDateRange: ["2022-01-01", "2022-12-31"],
    recordDateRange: [dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD')],
    DatePickerMode: "single",
    setDatePickerMode: (mode: "single" | "range") => set({ DatePickerMode: mode }),
    setRecordDateRange: (start: Date, end: Date) =>
      set({ recordDateRange: [start, end] }),
    setColorMode: (mode: string) => set({ colorMode: mode }),
  }))
);
