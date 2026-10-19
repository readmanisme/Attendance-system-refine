import { Skeleton } from "antd";

/**
 * 页面级骨架屏：替代整页居中 Spin，切页时保留布局结构，减少跳动。
 * 尺寸按常见列表页（标题 + 筛选条 + 表格）估算。
 */
export function SkeletonPage() {
  return (
    <div style={{ paddingTop: 4 }}>
      <Skeleton active title={{ width: 160 }} paragraph={{ rows: 1, width: ["40%"] }} />
      <div style={{ marginTop: 20 }}>
        <Skeleton.Button active style={{ width: 260, height: 34 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton active title={false} paragraph={{ rows: 8 }} />
      </div>
    </div>
  );
}
