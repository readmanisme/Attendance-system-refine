import type { ReactNode } from "react";
import { layout } from "@/theme/tokens";

interface PageShellProps {
  children: ReactNode;
  /** 内容最大宽度，默认 1440；统计页等宽内容可放大到 1600 */
  maxWidth?: number;
}

/**
 * 页面内容容器：只负责限宽与居中，内边距由 ThemedLayout 的 Content 统一提供（24px）。
 * 在 App.tsx 里包住 <Outlet />，所有路由页面自动生效，页面内不要再写 p-4 / max-w-*。
 */
export function PageShell({ children, maxWidth = layout.contentMaxWidth }: PageShellProps) {
  return (
    <div className="page-shell" style={{ maxWidth }}>
      {children}
    </div>
  );
}
