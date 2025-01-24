import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@ant-design/v5-patch-for-react-19";
import App from "./App";
import "./style/index.css";
import "@mantine/core/styles.css";

import { Alert, Spin } from "antd";
import { CustomErrorBoundary } from "@/components/ErrorBoundary";
import axios from "axios";
import { BackupDatabase } from "./components/BackupDatabase";

const _error = console.error;

const itemsWarning = "`children` is deprecated. Please use `items` instead";
// 此处用于禁用Antd的一个不重要警告，为了使用refine
console.error = function (msg, ...args) {
  if (!`${msg}`.includes(itemsWarning)) {
    _error.apply(console, [msg, ...args]);
  }
};

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
function pb_health_check() {
  return axios.get(__BACKEND_API_URL__ + "/api/health");
}

const RootComponent = () => {
  const [spinIsOpen, setSpinIsOpen] = React.useState(false);
  // 通过这种方式，我们得以使用useState，不然报错
  const [initializing, setInitializing] = React.useState(true);
  useEffect(() => {
    let didCancel = false;

    const checkHealth = () => {
      pb_health_check()
        .then((res) => {
          if (!didCancel) {
            setSpinIsOpen(res.data.code !== 200);
            setInitializing(false);
          }
        })
        .catch(() => {
          if (!didCancel) {
            setSpinIsOpen(true);
            setInitializing(false);
          }
        });
    };
    checkHealth();
    // 首先执行一次 0.5s 的健康检查
    // const fastInterval = setInterval(checkHealth, 500);
    // setTimeout(() => {
      // clearInterval(fastInterval);

      // 然后执行 5s 的健康检查
      const slowInterval = setInterval(checkHealth, 5000);

    return () => {
      didCancel = true;
      clearInterval(slowInterval);
    };
  }, []);

  return (
    <React.StrictMode>
      <CustomErrorBoundary>
        <App />
        <BackupDatabase />
        {spinIsOpen && (
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
          ></Spin>
        )}
        {initializing && (
          <Spin
            size="large"
            fullscreen
            tip={
              <Alert
                className="mt-4"
                message="正在初始化"
                description="请稍候"
                type="info"
                showIcon
              />
            }
          ></Spin>
        )}
      </CustomErrorBoundary>
    </React.StrictMode>
  );
};

root.render(<RootComponent />);
