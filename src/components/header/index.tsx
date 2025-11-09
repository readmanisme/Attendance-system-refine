import { Badge } from "@mantine/core";
import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import { Layout as AntdLayout, Space, theme } from "antd";
import React from "react";

const { useToken } = theme;

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();

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
      </Space>
    </AntdLayout.Header>
  );
};
