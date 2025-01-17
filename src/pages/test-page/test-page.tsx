const pocketbase_url = "http://localhost:8090";
import axios from "axios";
import { useEffect, useState } from "react";
import { useInterval } from '@mantine/hooks';
import { Chart } from '@antv/g2';
import { SwitchDataRange } from "@/components/SwitchDataRange";
export function TestPage() {
  const [health, setHealth] = useState<"good" | "bad" | "unknown">("unknown");



  return (
    <div>
      {/* Test Page */}
      <h1 className="text-4xl font-bold text-blue-500">
        TailwindCSS 安装检测，此处文字应该是蓝色
      </h1>
      {/* 显示健康状态 */}
      <div className="mt-4">
        <p>
          PocketBase 健康状态：
          {health === "good" && <span className="text-green-500">健康</span>}
          {health === "bad" && <span className="text-red-500">不健康</span>}
          {health === "unknown" && <span className="text-gray-500">未知</span>}
        </p>
        <div id="container"/>
        <SwitchDataRange />
      </div>
    </div>
  );
}
