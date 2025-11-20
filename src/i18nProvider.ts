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
import { initReactI18next } from "react-i18next";
const bundledResources = {
  en: { common: en },
  zh: { common: zh }, // 加common的作用是命名空间，默认命令空间是translation；没有命名空间会显示找不到翻译
};
i18n.use(initReactI18next).init({
  supportedLngs: ["en", "zh"],
  lng: "zh",
  fallbackLng: "zh", // 解决i18next::languageUtils: rejecting language code not found in supportedLngs: dev，设置load为currentOnly不能解决问题，https://stackoverflow.com/questions/67138106/i18nextlanguageutils-rejecting-language-code-not-found-in-supportedlngs-en
  resources: bundledResources,
  // debug: true,
  ns: ["common"],
});

// !!! https://github.com/refinedev/refine/blob/main/examples/i18n-react/src/i18n.ts

export default i18n;
