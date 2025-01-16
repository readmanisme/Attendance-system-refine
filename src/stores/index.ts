import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing

const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}));

interface SomeState {
    colorMode: string;
  recordDateRange: [Date, Date];
  setRecordDateRange: (start: Date, end: Date) => void;
  setColorMode: (mode: string) => void;
}

export const useSomeStore = create<SomeState>()(
  devtools((set) => ({
    colorMode: "light",
    recordDateRange: ["2022-01-01", "2022-12-31"],
    setRecordDateRange: (start: Date, end: Date) =>
      set({ recordDateRange: [start, end] }),
    setColorMode: (mode: string) => set({ colorMode: mode }),
  }))
);
