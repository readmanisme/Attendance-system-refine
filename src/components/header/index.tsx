import { QuestionCircleOutlined } from "@ant-design/icons";
import { Badge } from "@mantine/core";
import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { Layout as AntdLayout, Button, Radio, Space, theme, Tooltip } from "antd";
import React, { useMemo, useCallback } from "react";
import { useInvalidate, useResourceParams } from "@refinedev/core";
import { useSomeStore } from "@/stores";

const { useToken } = theme;

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({ sticky = true }) => {
  const { token } = useToken();
  const invalidate = useInvalidate();
  const { resource } = useResourceParams();

  const { helpOpen, setHelpOpen, __BACKEND_API_URL__, set__BACKEND_API_URL__ } = useSomeStore();

  // --- ✅ 样式 useMemo 化，避免每次渲染都重新创建对象 ---
  const headerStyles = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: token.colorBgElevated,
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: "0 24px",
      height: "64px",
      ...(sticky && {
        position: "sticky",
        top: 0,
        zIndex: 1,
      }),
    }),
    [token.colorBgElevated, sticky]
  );

  // --- ✅ 环境端口列表缓存 ---
  const ports = useMemo(() => (import.meta.env.DEV ? [29401, 29402, 29403] : []), []);
  const radioOptions = useMemo(
    () => ports.map((port) => ({ label: port.toString(), value: port })),
    [ports]
  );

  // --- ✅ 刷新逻辑优化：修正条件判断错误 ---
  const handleRefresh = useCallback(() => {
    let name = resource?.name;
    // 修正: 原代码中 `if ((name = "qiandao"))` 是赋值，不是比较
    if (name === "qiandao") {
      name = "__AttendanceRecord_TableName";
    }
    if (name) {
      invalidate({
        resource: name,
        invalidates: ["resourceAll"],
      });
    }
  }, [invalidate, resource]);

  // --- ✅ API切换逻辑 memo 化 ---
  const handlePortChange = useCallback(
    (e: any) => {
      const newPort = e.target.value;
      set__BACKEND_API_URL__(`http://localhost:${newPort}`);
      window.location.reload();
    },
    [set__BACKEND_API_URL__]
  );

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Button onClick={handleRefresh}>刷新数据</Button>

        {ports.length > 0 && (
          <Radio.Group
            options={radioOptions}
            value={parseInt(__BACKEND_API_URL__.split(":")[2], 10)}
            onChange={handlePortChange}
          />
        )}

        <Badge color="blue" variant="light" style={{ width: 120 }}>
          {__VERSION__}
        </Badge>

        <Tooltip title="显示当前页面的帮助">
          <Button
            type="primary"
            shape="circle"
            icon={<QuestionCircleOutlined />}
            onClick={() => setHelpOpen(true)}
          />
        </Tooltip>
      </Space>
    </AntdLayout.Header>
  );
};
