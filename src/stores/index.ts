import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import dayjs from "dayjs";

interface SomeState {
  recordDateRange: string[];
  setRecordDateRange: (data: string[]) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
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
      }),
      {
        name: "some-store", // 存储名称，用于标识存储
      }
    )
  )
);
