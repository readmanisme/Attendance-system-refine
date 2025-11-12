import { QuestionCircleOutlined } from "@ant-design/icons";
import { Badge } from "@mantine/core";
import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import { Layout as AntdLayout, Button, Space, theme, Tooltip } from "antd";
import React from "react";

const { useToken } = theme;
import { useSomeStore } from "@/stores";

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const { helpOpen, setHelpOpen } = useSomeStore();

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Badge color="blue" variant="light" style={{ width: 120 }}>
          {__VERSION__}
        </Badge>
        <Tooltip title="显示当前页面的帮助">
        <Button
          type="primary"
          shape="circle"
          icon={<QuestionCircleOutlined />}
          onClick={() => setHelpOpen(true)}
        />
        </Tooltip>
      </Space>
    </AntdLayout.Header>
  );
};
