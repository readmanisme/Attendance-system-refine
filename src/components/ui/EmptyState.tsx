import { Empty } from "antd";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** 主操作，例如「去添加人员」 */
  action?: ReactNode;
  /** 紧凑模式：嵌在卡片/表格里时用，减少上下留白 */
  compact?: boolean;
}

/** 统一空态：标题 + 说明 + 可选主操作，避免各页用 Alert / 纯文字各写一套 */
export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div style={{ padding: compact ? "20px 0" : "48px 0" }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>{title}</span>
            {description ? (
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{description}</span>
            ) : null}
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
}
