/**
 * 设计 token：全站唯一的视觉常量来源。
 * 只服务 light 主题（本项目不做暗色模式）。
 * 改这里 = 改全站，不要在组件里写字面色值。
 */

/** 品牌色（克制的单色蓝，用于主操作、选中态、链接） */
export const brand = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primaryActive: "#1e40af",
  /** 选中项浅底 */
  primarySoft: "#eff6ff",
  primaryBorder: "#bfdbfe",
} as const;

/** 语义色：只表达状态，不参与品牌表达 */
export const semantic = {
  success: "#16a34a",
  successSoft: "#f0fdf4",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  error: "#dc2626",
  errorSoft: "#fef2f2",
  info: "#2563eb",
  infoSoft: "#eff6ff",
} as const;

/** 中性色阶：从页面底色到正文、辅助文字 */
export const neutral = {
  /** 页面底色 */
  bgLayout: "#f6f7f9",
  /** 卡片 / 侧栏 / 顶栏 */
  bgContainer: "#ffffff",
  /** 表头、hover 等浅底 */
  bgSubtle: "#f8fafc",
  bgHover: "#f1f5f9",
  border: "#e5e8ee",
  borderSubtle: "#eef1f5",
  text: "#0f172a",
  textSecondary: "#475569",
  textTertiary: "#94a3b8",
  textInverse: "#ffffff",
} as const;

/** 圆角 */
export const radius = {
  sm: 6,
  base: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/** 阴影：三级足够，不要更多 */
export const shadow = {
  /** 卡片默认，几乎不可见，只用来托起边界 */
  card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
  /** 悬浮 / 下拉 / Popover */
  raised: "0 4px 16px rgba(15, 23, 42, 0.08)",
  /** 弹窗 */
  overlay: "0 12px 32px rgba(15, 23, 42, 0.12)",
} as const;

/** 间距：一律 4 的倍数 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** 字体 */
export const font = {
  family:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  size: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  /** 行高 */
  lineHeight: {
    tight: 1.35,
    base: 1.6,
  },
} as const;

/** 布局尺寸 */
export const layout = {
  /** 内容区最大宽度（超过则居中，避免超宽屏拉散） */
  contentMaxWidth: 1440,
  headerHeight: 60,
  siderWidth: 208,
  siderCollapsedWidth: 72,
  /** 页面左右内边距（ThemedLayout 的 Content 已给 24，这里用于自定义容器） */
  pagePaddingX: 24,
  pagePaddingY: 20,
} as const;
