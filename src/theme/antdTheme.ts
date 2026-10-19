/**
 * antd 主题配置：把 tokens 翻译成 antd 的 ThemeConfig。
 * 只保留 light 主题；不做暗色。
 */
import type { ThemeConfig } from "antd";
import { brand, font, layout, neutral, radius, semantic, shadow } from "./tokens";

export const antdTheme: ThemeConfig = {
  token: {
    // 品牌与语义
    colorPrimary: brand.primary,
    colorSuccess: semantic.success,
    colorWarning: semantic.warning,
    colorError: semantic.error,
    colorInfo: semantic.info,
    colorLink: brand.primary,
    colorLinkHover: brand.primaryHover,

    // 中性色
    colorBgLayout: neutral.bgLayout,
    colorBgContainer: neutral.bgContainer,
    colorBorder: neutral.border,
    colorBorderSecondary: neutral.borderSubtle,
    colorText: neutral.text,
    colorTextSecondary: neutral.textSecondary,
    colorTextTertiary: neutral.textTertiary,

    // 形状
    borderRadius: radius.base,
    borderRadiusLG: radius.lg,
    borderRadiusSM: radius.sm,
    borderRadiusXS: 4,

    // 字体
    fontFamily: font.family,
    fontSize: font.size.base,
    fontSizeSM: font.size.sm,
    fontSizeLG: font.size.lg,
    fontSizeHeading4: font.size.xl,
    fontSizeHeading5: font.size.lg,

    // 控件与阴影
    controlHeight: 34,
    controlHeightSM: 28,
    controlHeightLG: 40,
    boxShadowTertiary: shadow.card,
    boxShadowSecondary: shadow.raised,

    // 动效收敛一点，减少“弹跳感”
    motionDurationMid: "0.16s",
    motionDurationSlow: "0.24s",
  },
  components: {
    Layout: {
      headerHeight: layout.headerHeight,
      headerPadding: "0 20px",
      headerBg: neutral.bgContainer,
      bodyBg: neutral.bgLayout,
      siderBg: neutral.bgContainer,
      triggerBg: neutral.bgContainer,
      triggerColor: neutral.textSecondary,
    },
    Menu: {
      itemHeight: 38,
      itemMarginInline: 8,
      itemMarginBlock: 2,
      itemBorderRadius: radius.base,
      itemSelectedBg: brand.primarySoft,
      itemSelectedColor: brand.primary,
      itemHoverBg: neutral.bgHover,
      itemColor: neutral.textSecondary,
      iconSize: 17,
      collapsedIconSize: 18,
      subMenuItemBg: "transparent",
      activeBarWidth: 0,
    },
    Card: {
      headerHeight: 46,
      headerFontSize: font.size.base,
      headerBg: "transparent",
      bodyPadding: 20,
    },
    Table: {
      headerBg: neutral.bgSubtle,
      headerColor: neutral.textSecondary,
      headerSplitColor: "transparent",
      rowHoverBg: neutral.bgSubtle,
      borderColor: neutral.borderSubtle,
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      footerBg: neutral.bgSubtle,
    },
    // 分页器整体放大一档:默认页码 32px,小号 24px,表格底部分页尤其显小
    Pagination: {
      itemSize: 36,
      itemSizeSM: 30,
    },
    Button: {
      fontWeight: font.weight.medium,
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
    },
    Tag: {
      borderRadiusSM: radius.sm,
      defaultBg: neutral.bgSubtle,
      defaultColor: neutral.textSecondary,
    },
    Alert: {
      defaultPadding: "8px 12px",
      withDescriptionPadding: "12px 16px",
    },
    Segmented: {
      trackBg: neutral.bgHover,
      itemSelectedBg: neutral.bgContainer,
      itemSelectedColor: neutral.text,
      trackPadding: 2,
    },
    Statistic: {
      contentFontSize: 22,
      titleFontSize: font.size.sm,
    },
    Tabs: {
      horizontalItemPadding: "10px 0",
      titleFontSize: font.size.base,
      horizontalItemGutter: 28,
    },
    Form: {
      itemMarginBottom: 18,
      verticalLabelPadding: "0 0 6px",
      labelColor: neutral.textSecondary,
    },
    InputNumber: {
      controlWidth: 110,
    },
    Drawer: {
      footerPaddingBlock: 12,
      footerPaddingInline: 20,
    },
  },
};
