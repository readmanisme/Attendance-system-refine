import { Button } from "antd";

interface ChartNavProps {
  items: { id: string; label: string }[];
}

/**
 * 图表页的页内导航。
 * 不用 href="#id"：项目用 HashRouter，改 hash 会破坏路由；这里走 scrollIntoView。
 */
export function ChartNav({ items }: ChartNavProps) {
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 4, lineHeight: "24px" }}>
        跳到
      </span>
      {items.map((it) => (
        <Button
          key={it.id}
          size="small"
          type="text"
          onClick={() => jump(it.id)}
          style={{
            height: 24,
            paddingInline: 10,
            fontSize: 12,
            borderRadius: 999,
            background: "var(--bg-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}
