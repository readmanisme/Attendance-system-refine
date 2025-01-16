const pocketbase_url = "http://localhost:8090";
import axios from "axios";
import { useEffect, useState } from "react";
import { useInterval } from '@mantine/hooks';

export function TestPage() {
  const [health, setHealth] = useState<"good" | "bad" | "unknown">("unknown");
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
  // const health_interval = useInterval(() => {
  //   pb_health_check()
  //    .then((res) => {
  //       setHealth(res.data.code==200? "good" : "bad");
  //       // console.log(res);
  //     })
  //    .catch(() => {
  //       setHealth("unknown");
  //     });
  // }, 5000,{autoInvoke:true});
  // useEffect(() => {
  //   health_interval.start();
  //   return health_interval.stop;
  // }, []);
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
      </div>
    </div>
  );
}
