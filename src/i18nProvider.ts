// import { I18nProvider } from "@refinedev/core";
// import en from "../public/locales/en/common.json";
// import zh from "../public/locales/zh/common.json";
// 不能从public目录下引入文件，否则会发生如下错误
// Assets in public directory cannot be imported from JavaScript.
// If you intend to import that asset, put the file in the src directory, and use /src/locales/en/common.json instead of /public/locales/en/common.json.
// If you intend to use the URL of that asset, use /locales/en/common.json?url.
// import en from "../src/locales/en/common.json";
// import zh from "../src/locales/zh/common.json";
import en from "../src/locales/en/common";
import zh from "../src/locales/zh/common";
// js会有无法找到声明文件的问题，所以用ts，但是后缀名不能带ts不然也报错
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
// import ChainedBackend from "i18next-chained-backend";
// import HttpBackend from "i18next-http-backend";
// import resourcesToBackend from "i18next-resources-to-backend";// import Backend from "i18next-xhr-backend";
// import detector from "i18next-browser-languagedetector";
// 这个检测不是很好用
const bundledResources = {
  en: en,
  zh: zh,
};
i18n
  // .use(ChainedBackend)
  //   .use(detector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "zh"],
    // lng: 'zh',
    lng: localStorage.getItem("i18nextLng") || "zh", // 读取 localStorage
    resources: bundledResources,
    // backend: {
    //   backends: [
    //     HttpBackend,
    //     // resourcesToBackend((lng:string, ns:string) => import(`./locales/${lng}/${ns}.json`)) // 这个是动态加载，但是不太好用
    //     resourcesToBackend(bundledResources)
    //   ],
    //   backendOptions: [{
    //     loadPath: '/locales/{{lng}}/{{ns}}.json'
    //   }]
    // },
    // ns: ["common"],
    // defaultNS: "common",
    // fallbackLng: ["en", "zh"],
  });

// !!! https://github.com/refinedev/refine/blob/main/examples/i18n-react/src/i18n.ts

export default i18n;
