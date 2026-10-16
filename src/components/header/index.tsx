import { QuestionCircleOutlined } from "@ant-design/icons";
import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { Layout as AntdLayout, Button, Radio, Space, Tag, theme, Tooltip } from "antd";
import React, { useMemo, useCallback } from "react";
import { useInvalidate } from "@refinedev/core";
import { useUiStore, useConfigStore } from "@/stores";
import GradientButton from "../GradientButton";
const { useToken } = theme;
import { getPbAdmin } from "@/utils/pocketbase_admin";
import { useQuery } from "@tanstack/react-query";

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
  const { token } = useToken();
  const invalidate = useInvalidate();

  const { setHelpOpen } = useUiStore();
  const { __BACKEND_API_URL__, set__BACKEND_API_URL__ } = useConfigStore();

  const { data: settings } = useFetchSettings(__BACKEND_API_URL__);
  const batch = settings?.batch;
  // Batch 是否配置错误:未取到设置 / 未开启 / maxRequests 是 999 都视为有问题
  const isBatchMisconfigured = batch ? !(batch.enabled && batch.maxRequests === 999) : true;
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
    [token.colorBgElevated, sticky],
  );

  // --- ✅ 环境端口列表缓存 ---
  const ports = useMemo(() => (import.meta.env.DEV ? [29401, 29402, 29403] : []), []);
  const radioOptions = useMemo(
    () => ports.map((port) => ({ label: port.toString(), value: port })),
    [ports],
  );

  // --- ✅ 刷新逻辑优化：修正条件判断错误 ---
  const handleRefresh = useCallback(() => {
    invalidate({
      // dataProviderName: "default",
      invalidates: ["all"],
    });
  }, [invalidate]);

  // --- ✅ API切换逻辑 memo 化 ---
  const handlePortChange = useCallback(
    (e: any) => {
      const newPort = e.target.value;
      set__BACKEND_API_URL__(`http://localhost:${newPort}`);
      window.location.reload();
    },
    [set__BACKEND_API_URL__],
  );

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        {!isBatchMisconfigured && (
          <Tag color="red" data-testid="batch-error-tag">
            Batch设置有问题
          </Tag>
        )}
        <GradientButton data-testid="refresh-button" title="刷新数据" onClick={handleRefresh} />
        {ports.length > 0 && (
          <Radio.Group
            options={radioOptions}
            value={parseInt(__BACKEND_API_URL__.split(":")[2], 10)}
            onChange={handlePortChange}
          />
        )}

        <Tag data-testid="version-badge" color="red" style={{ width: 120 }}>
          {__VERSION__}
        </Tag>

        <Tooltip title="显示当前页面的帮助">
          <Button
            type="primary"
            shape="circle"
            data-testid="help-button"
            icon={<QuestionCircleOutlined />}
            onClick={() => setHelpOpen(true)}
          />
        </Tooltip>
      </Space>
    </AntdLayout.Header>
  );
};
