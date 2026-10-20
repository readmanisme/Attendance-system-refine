import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { layout } from "@/theme/tokens";

interface PageShellProps {
  children: ReactNode;
  /** 内容最大宽度；不传则按路由自动选择（列少的列表页用窄容器） */
  maxWidth?: number;
}

/**
 * 列少、内容短的列表页：表格铺满 1440 时，剩余宽度会全堆进某一列（如"姓名"），
 * 单元格里出现大片空白。收窄容器后，空白落到表格外侧，读起来更像一张紧凑的卡片。
 */
// const NARROW_PATHS = ["/workers", "/workType", "/xinzi"];
const NARROW_PATHS:string[] = [];

/**
 * 页面内容容器：只负责限宽与居中，内边距由 ThemedLayout 的 Content 统一提供（24px）。
 * 在 App.tsx 里包住 <Outlet />，所有路由页面自动生效，页面内不要再写 p-4 / max-w-*。
 */
export function PageShell({ children, maxWidth }: PageShellProps) {
  const { pathname } = useLocation();
  const width =
    maxWidth ??
    (NARROW_PATHS.includes(pathname) ? layout.narrowContentMaxWidth : layout.contentMaxWidth);

  return (
    <div className="page-shell" style={{ maxWidth: width }}>
      {children}
    </div>
  );
}
