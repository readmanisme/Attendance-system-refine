import React from "react";
import { List } from "@refinedev/antd";
import { Button, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
// import "@iframe-resizer/child";
// import IframeResizer from '@iframe-resizer/parent'

export default function PocketBasePage() {
  // 这里显示pocketbase的后台，即http://127.0.0.1:8090
  const [iframeUrl, setIframeUrl] = React.useState(__BACKEND_Admin_URL__);
  const [helpOpen, setHelpOpen] = React.useState(false);
  return (
    <List

    >
      <iframe src={iframeUrl} className="w-full h-screen"></iframe>

      {/* iframe会导致head的style一直重复加载，不妥 */}
      {/* 已解决，使用动态绑定src。https://blog.csdn.net/nininna/article/details/132301699 */}
      {/* <object
        data={iframeUrl}
        width="800"
        height="800"
        type="text/html"
      ></object> */}
      {/* object存在同样的问题 */}
      {/* <IframeResizer
        src="http://127.0.0.1:8090/_/"
        style={{ width: "100%", height: "100vh" }}
        waitForLoad
      /> */}
    </List>
  );
}
