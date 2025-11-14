import { RefineThemes } from "@refinedev/antd";
import { ConfigProvider } from "antd";
import { type PropsWithChildren } from "react";
import locale from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.locale("zh-cn");
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
// dayjs.tz.setDefault("Africa/Abidjan")
// 这个12个月时间都和UTC保持一致，london不一定

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider
      locale={locale}
      // you can change the theme colors here. example: ...RefineThemes.Magenta,
      theme={{
        ...RefineThemes.Blue,
      }}
    >
      {children}
    </ConfigProvider>
  );
};
