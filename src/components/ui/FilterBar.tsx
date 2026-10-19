import { Flex } from "antd";
import type { ReactNode } from "react";

interface FilterBarProps {
  /** 左侧：筛选控件（人员选择、搜索等） */
  left?: ReactNode;
  /** 右侧：范围选择、批量操作、主操作 */
  right?: ReactNode;
  /** 额外的行内内容，追加在左侧之后 */
  children?: ReactNode;
}

/**
 * 统一的页面筛选条：左筛选 / 右操作。
 * 所有列表页的筛选控件都放在这里，避免同类操作出现在四个不同位置。
 */
export function FilterBar({ left, right, children }: FilterBarProps) {
  return (
    <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        {left}
        {children}
      </div>
      {right ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>{right}</div>
      ) : null}
    </Flex>
  );
}
