import React from "react";
import { createRoot } from "react-dom/client";
import '@ant-design/v5-patch-for-react-19';
import App from "./App";
import "./style/index.css";
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
