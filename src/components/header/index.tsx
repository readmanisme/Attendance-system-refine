import { QuestionCircleOutlined } from "@ant-design/icons";
import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { Button, Dropdown, Layout as AntdLayout, Space, Tag, Tooltip, Typography, theme } from "antd";
import React, { useState } from "react";
import { IconDotsVertical, IconRefresh } from "@tabler/icons-react";
import { useUiStore, useConfigStore } from "@/stores";
import { getPbAdmin } from "@/utils/pocketbase_admin";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/** 后端设置的批量接口配置(refine 的 QueryClientProvider 提供缓存,60s 内不重复请求) */
const useFetchSettings = (backendApiUrl: string) =>
  useQuery({
    queryKey: ["pb-settings", backendApiUrl],
    queryFn: async () => {
      const pb = await getPbAdmin(backendApiUrl);
      return pb.settings.getAll();
    },
    staleTime: 60_000,
  });

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({ sticky = true }) => {
  const { token } = theme.useToken();

  const { setHelpOpen } = useUiStore();
  const { __BACKEND_API_URL__, set__BACKEND_API_URL__ } = useConfigStore();

  const { data: settings } = useFetchSettings(__BACKEND_API_URL__);
  const batch = settings?.batch;
  // Batch 是否配置错误:未开启 / maxRequests 不是 999 都视为有问题
  // 设置还没取到时保持 false,避免刚进页面就误报
  const isBatchMisconfigured = batch ? !(batch.enabled === true && batch.maxRequests === 999) : false;

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgContainer,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    padding: "0 20px",
    height: 60,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    ...(sticky && {
      position: "sticky",
      top: 0,
      zIndex: 10,
    }),
  };

  // 开发环境端口切换：收进「更多」菜单，生产环境不渲染
  const ports = import.meta.env.DEV ? [29401, 29402, 29403] : [];
  const currentPort = parseInt(__BACKEND_API_URL__.split(":")[2], 10);

  // 刷新逻辑：按钮在刷新期间显示 loading，让用户知道"点击生效了"
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 尽量打造可感知的 loading：至少转 400ms 再结束
      await Promise.all([
        queryClient.invalidateQueries(),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AntdLayout.Header style={headerStyles}>
      {/* 右侧：状态 + 全局操作 */}
      <Space size={6} style={{ flex: "none" }}>
        {isBatchMisconfigured && (
          <Tooltip title="批量接口未开启或 maxRequests 不为 999，批量录入可能变慢">
            <Tag color="error" data-testid="batch-error-tag" style={{ marginInlineEnd: 0 }}>
              Batch 配置异常
            </Tag>
          </Tooltip>
        )}

        <Typography.Text
          data-testid="version-badge"
          type="secondary"
          style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", paddingInline: 4 }}
        >
          {__VERSION__}
        </Typography.Text>

        <Button
          data-testid="refresh-button"
          icon={<IconRefresh size={16} />}
          loading={isRefreshing}
          onClick={handleRefresh}
        >
          刷新
        </Button>

        <Tooltip title="显示当前页面的帮助">
          <Button
            type="text"
            data-testid="help-button"
            icon={<QuestionCircleOutlined />}
            onClick={() => setHelpOpen(true)}
          />
        </Tooltip>

        {ports.length > 0 && (
          <Dropdown
            trigger={["click"]}
            menu={{
              selectable: true,
              selectedKeys: [String(currentPort)],
              items: ports.map((port) => ({ key: String(port), label: `localhost:${port}` })),
              onClick: ({ key }) => {
                set__BACKEND_API_URL__(`http://localhost:${key}`);
                window.location.reload();
              },
            }}
          >
            <Button type="text" icon={<IconDotsVertical size={18} />} title="开发设置" />
          </Dropdown>
        )}
      </Space>
    </AntdLayout.Header>
  );
};
