import { QuestionCircleOutlined } from "@ant-design/icons";
import { Badge } from "@mantine/core";
import type { RefineThemedLayoutHeaderProps as RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import {
  Layout as AntdLayout,
  Button,
  Radio,
  Space,
  theme,
  Tooltip,
} from "antd";
import React, { useMemo } from "react";
import { useInvalidate } from "@refinedev/core";
import { useResourceParams } from "@refinedev/core";
const { useToken } = theme;
import { useSomeStore } from "@/stores";

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const { helpOpen, setHelpOpen } = useSomeStore();
  const { __BACKEND_API_URL__, set__BACKEND_API_URL__ } = useSomeStore();
  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
  };
  const { resource } = useResourceParams();
  const invalidate = useInvalidate();
  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }
  let ports = useMemo(() => [29401, 29402, 29403], []);
  if (!import.meta.env.DEV) ports = [];
  const RadioOptions = useMemo(
    () => ports.map((port, index) => ({ label: port, value: port })),
    [ports]
  );
  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Button
          onClick={() => {
            let name = resource?.name;
            if ((name = "qiandao")) name = __AttendanceRecord_TableName;
            invalidate({
              resource: name,
              invalidates: ["resourceAll"],
            });
          }}
        >
          刷新数据
        </Button>
        <Radio.Group
          options={RadioOptions}
          value={parseInt(__BACKEND_API_URL__.split(":")[2])}
          onChange={(e) => {
            set__BACKEND_API_URL__(`http://localhost:${e.target.value}`);
            window.location.reload(); //需要刷新起效
          }}
        />
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
