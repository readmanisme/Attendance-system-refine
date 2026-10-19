import { Tooltip } from "antd";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface HelpTipProps {
  /** 悬浮显示的说明内容 */
  title: ReactNode;
  size?: number;
  testId?: string;
}

/**
 * 问号提示：替代页面里常驻的说明型 Alert。
 * 说明文字只在需要时出现，不再长期占据首屏。
 */
export function HelpTip({ title, size = 14, testId }: HelpTipProps) {
  return (
    <Tooltip title={title}>
      <span
        data-testid={testId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "var(--text-tertiary)",
          cursor: "help",
          flex: "none",
        }}
      >
        <IconInfoCircle size={size} stroke={1.8} />
      </span>
    </Tooltip>
  );
}
