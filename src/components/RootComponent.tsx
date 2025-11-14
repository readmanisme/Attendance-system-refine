

import React, { useEffect, useState, useCallback } from "react";

import { Alert, Spin } from "antd";

import { CustomErrorBoundary } from "@/components/ErrorBoundary";

import App from "@/App";
import { useSomeStore } from "@/stores";

async function pbHealthCheck(apiUrl: string) {
  try {
    const res = await fetch(`${apiUrl}/api/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Network error");
    return res.json();
  } catch {
    return { code: -1 }; // 统一返回结构，避免捕获层级过深
  }
}
export const RootComponent: React.FC = () => {
  const { __BACKEND_API_URL__ } = useSomeStore();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const checkHealth = useCallback(async () => {
    const result = await pbHealthCheck(__BACKEND_API_URL__);
    setStatus(result.code === 200 ? "ok" : "error");
  }, [__BACKEND_API_URL__]);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      await checkHealth();
      if (!cancelled) {
        // 每 5 秒检测一次
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
      }
    };

    runCheck();

    return () => {
      cancelled = true;
    };
  }, [checkHealth]);

  if (status === "loading") {
    return (
      <Spin
        size="large"
        fullscreen
        tip={
          <Alert className="mt-4" message="正在初始化" description="请稍候" type="info" showIcon />
        }
      />
    );
  }

  return (
    <React.StrictMode>
      <CustomErrorBoundary>
        <App />
        {status === "error" && (
          <Spin
            size="large"
            fullscreen
            tip={
              <Alert
                className="mt-4"
                message="发生了一些错误"
                description="后端无法连接，请检查网络连接或后端服务状态"
                type="error"
                showIcon
              />
            }
          />
        )}
      </CustomErrorBoundary>
    </React.StrictMode>
  );
};