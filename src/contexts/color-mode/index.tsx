import { useMantineColorScheme } from "@mantine/core";
import { RefineThemes } from "@refinedev/antd";
import { ConfigProvider, theme } from "antd";
import {
  type PropsWithChildren,
  createContext,
  use,
  useEffect,
  useState,
} from "react";
import locale from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useSomeStore } from "@/stores";

dayjs.locale('zh-cn');
dayjs.extend(utc)
dayjs.extend(timezone)
// dayjs.tz.setDefault("Africa/Abidjan")
// 这个12个月时间都和UTC保持一致，london不一定
type ColorModeContextType = {
  mode: string;
  setMode: (mode: string) => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType
);

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const colorModeFromLocalStorage = localStorage.getItem("colorMode");
  const isSystemPreferenceDark = window?.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const systemPreference = isSystemPreferenceDark ? "dark" : "light";
  const [mode, setMode] = useState(
    colorModeFromLocalStorage || systemPreference
  );
  const {setColorMode:scm2}=useSomeStore();
  useEffect(() => {
    window.localStorage.setItem("colorMode", mode);
  }, [mode]);
  const { setColorScheme, clearColorScheme } = useMantineColorScheme()
  const setColorMode = () => {
    if (mode === "light") {
      setMode("dark");
      setColorScheme("dark");
      scm2("dark");
    } else {
      setMode("light");
      setColorScheme("light");
      scm2("light");
    }
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ColorModeContext.Provider
      value={{
        setMode: setColorMode,
        mode,
      }}
    >
      <ConfigProvider
      locale={locale}
        // you can change the theme colors here. example: ...RefineThemes.Magenta,
        theme={{
          ...RefineThemes.Blue,
          algorithm: mode === "light" ? defaultAlgorithm : darkAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
