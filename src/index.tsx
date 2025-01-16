import React from "react";
import { createRoot } from "react-dom/client";
import '@ant-design/v5-patch-for-react-19';
import App from "./App";
import "./style/index.css";
import '@mantine/core/styles.css';

import { ErrorBoundary } from 'react-error-boundary';
import { Button, Result } from 'antd';
import { FrownOutlined } from '@ant-design/icons';
import { CustomErrorBoundary } from "@/components/ErrorBoundary";

const _error = console.error;

const itemsWarning = "`children` is deprecated. Please use `items` instead";

console.error = function (msg, ...args) {
  if (!`${msg}`.includes(itemsWarning)) {
    _error.apply(console, [msg, ...args]);
  }
};

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <CustomErrorBoundary>
    <App />
    </CustomErrorBoundary>
  </React.StrictMode>
);
