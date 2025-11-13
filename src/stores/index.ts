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
        __BACKEND_API_URL__: "http://localhost:29401",
        set__BACKEND_API_URL__: (url: string) =>
          set({
            __BACKEND_API_URL__: url,
          }),
      }),
      {
        name: "some-store", // 存储名称，用于标识存储
      }
    )
  )
);
