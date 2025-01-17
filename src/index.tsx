import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@ant-design/v5-patch-for-react-19";
import App from "./App";
import "./style/index.css";
import "@mantine/core/styles.css";

import { ErrorBoundary } from "react-error-boundary";
import { Alert, Spin } from "antd";
import { FrownOutlined } from "@ant-design/icons";
import { CustomErrorBoundary } from "@/components/ErrorBoundary";
import { useInterval } from "@mantine/hooks";
import axios from "axios";
import { f } from "react-router/dist/development/fog-of-war-DLtn2OLr";

const _error = console.error;

const itemsWarning = "`children` is deprecated. Please use `items` instead";

console.error = function (msg, ...args) {
  if (!`${msg}`.includes(itemsWarning)) {
    _error.apply(console, [msg, ...args]);
  }
};

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
const pocketbase_url = "http://localhost:8090";

function pb_health_check() {
  return axios.get(pocketbase_url + "/api/health");
  // {
  //   "code": 200,
  //   "message": "API is healthy.",
  //   "data": {
  //     "canBackup": false
  //   }
  // }
}

const RootComponent = () => {
  const [spinIsOpen, setSpinIsOpen] = React.useState(false);
  // 通过这种方式，我们得以使用useState，不然报错

  const health_interval_fast = useInterval(
    () => {
      pb_health_check()
        .then((res) => {
          setSpinIsOpen(res.data.code == 200 ? false : true);
          // console.log(res);
        })
        .catch(() => {
          setSpinIsOpen(true);
        });
    },
    5000
    // {autoInvoke:true}
  );
  useEffect(() => {
    health_interval_fast.start();
    return health_interval_fast.stop;
  }, []);
  // TODO 有没有方法首先执行一次0.5s间隔的检查，然后停止ta，然后执行5s间隔的检查?

  return (
    <React.StrictMode>
      <CustomErrorBoundary>
        <App />
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
      </CustomErrorBoundary>
    </React.StrictMode>
  );
};

root.render(<RootComponent />);
