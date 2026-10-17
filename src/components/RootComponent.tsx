import React, { useEffect, useState, useCallback, useRef } from "react";

import { Alert, Button, Spin } from "antd";

import { CustomErrorBoundary } from "@/components/ErrorBoundary";

import App from "@/App";
import { useConfigStore } from "@/stores";

/** 连续失败多少次才判定后端不可用(避免瞬时网络抖动打断用户操作) */
const FAILURE_THRESHOLD = 3;

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
  const { __BACKEND_API_URL__ } = useConfigStore();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const failureCountRef = useRef(0);

  const checkHealth = useCallback(async () => {
    const result = await pbHealthCheck(__BACKEND_API_URL__);
    if (result.code === 200) {
      failureCountRef.current = 0;
      setStatus("ok");
    } else {
      failureCountRef.current += 1;
      // 单次失败(哪怕连续已失败过)恢复正常后立即回到 ok,只有持续失败才报错
      if (failureCountRef.current >= FAILURE_THRESHOLD) {
        setStatus("error");
      }
    }
  }, [__BACKEND_API_URL__]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const runCheck = async () => {
      await checkHealth();
      if (!cancelled) {
        // 每 5 秒检测一次
        interval = setInterval(checkHealth, 5000);
      }
    };

    runCheck();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [checkHealth]);

  if (status === "loading") {
    return (
      <Spin
        size="large"
        fullscreen
        tip={
          <Alert
            data-testid="Initializing-alert"
            className="mt-4"
            message="正在初始化"
            description="请稍候"
            type="info"
            showIcon
          />
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
                data-testid="Error-alert"
                className="mt-4"
                message="发生了一些错误"
                description={
                  "后端连续多次无法连接，请检查网络连接或后端服务状态。后端恢复后会自动解除。"
                }
                type="error"
                showIcon
                action={
                  <Button
                    color="danger" variant="solid"
                    onClick={() => {
                      failureCountRef.current = 0;
                      checkHealth();
                    }}
                  >
                    立即重试
                  </Button>
                }
              />
            }
          />
        )}
      </CustomErrorBoundary>
    </React.StrictMode>
  );
};
