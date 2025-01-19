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
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button type="primary" onClick={() => setHelpOpen(true)}>
            查看帮助
          </Button>
          <Drawer
            title="帮助"
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
          >
            <Paragraph>
              1、这里是后台，负责所有数据的储存。仅在完全理解的情况下进行操作。
            </Paragraph>
            <Paragraph>
              2、账号：shed2705@outlook.com 密码：bPWU8GCMuqwKF9z
            </Paragraph>
            <Paragraph>3、如果觉得此处界面较小，可以点击左下角箭头收起导航栏，或者可以点击<a target="_blank" href={__BACKEND_Admin_URL__}>此处</a>在新标签中打开。密码账号不变</Paragraph>
          </Drawer>
        </>
      )}
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
