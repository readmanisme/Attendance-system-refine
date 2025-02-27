import { I18nProvider } from "@refinedev/core";

import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import Backend from "i18next-http-backend";
// import Backend from "i18next-xhr-backend";
// import detector from "i18next-browser-languagedetector";
// 这个检测不是很好用
i18n
  .use(Backend)
  //   .use(detector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "zh"],
    // lng: 'zh',
    lng: localStorage.getItem("i18nextLng") || "zh", // 读取 localStorage

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    ns: ["common"],
    defaultNS: "common",
    fallbackLng: ["en", "zh"],
  });

// !!! https://github.com/refinedev/refine/blob/main/examples/i18n-react/src/i18n.ts

export default i18n;
