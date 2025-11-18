import { QuestionCircleOutlined } from "@ant-design/icons";
import { Badge } from "@mantine/core";
import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { Alert, Layout as AntdLayout, Button, Radio, Space, Tag, theme, Tooltip } from "antd";
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useInvalidate, useResourceParams } from "@refinedev/core";
import { useSomeStore } from "@/stores";
import GradientButton from "../GradientButton";
const { useToken } = theme;
import { getPbAdmin } from "@/utils/pocketbase_admin";

const useFetchSettings = (backendApiUrl: string) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const pb = await getPbAdmin(backendApiUrl);
        const settingsData = await pb.settings.getAll();
        setSettings(settingsData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [backendApiUrl]);
  return { settings, loading, error };
};

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({ sticky = true }) => {
  const { token } = useToken();
  const invalidate = useInvalidate();
  const { resource } = useResourceParams();

  const { helpOpen, setHelpOpen, __BACKEND_API_URL__, set__BACKEND_API_URL__ } = useSomeStore();

  const { settings, loading, error } = useFetchSettings(__BACKEND_API_URL__);
  const batch = settings?.batch;
  const BatchError = batch?.enabled === true && batch?.maxRequests === 999;
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
    [set__BACKEND_API_URL__]
  );

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        {!BatchError && <Tag color="red" data-testid="batch-error-tag">Batch设置有问题</Tag>}
        <GradientButton title="刷新数据" onClick={handleRefresh} />
        {ports.length > 0 && (
          <Radio.Group
            options={radioOptions}
            value={parseInt(__BACKEND_API_URL__.split(":")[2], 10)}
            onChange={handlePortChange}
          />
        )}

        <Badge color="red" variant="light" style={{ width: 120 }}>
          {__VERSION__}
        </Badge>

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
