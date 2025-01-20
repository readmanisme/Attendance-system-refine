import { QuestionCircleOutlined } from "@ant-design/icons";
import { useResource } from "@refinedev/core";
import { FloatButton, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import { useState } from "react";

export const GlobalHelp = () => {
  const { resource } = useResource();
  // 值得注意，由于使用到了useResource这个用到react routerdom的hook，所以需要在路由组件包裹下使用，否则无效
  const helps = {
    主页: "显示首页",
    人员签到: (
      <>
        <Paragraph>
          1、选择员工，选择考勤类型，点击上班或下班按钮，即可进行签到或签退。
        </Paragraph>
        <Paragraph>
          2、为防止数据异常，通过代码设计，未签到者不可签退，未签退者不可签到。
        </Paragraph>
        <Paragraph>3、此页面显示当天签到记录</Paragraph>
      </>
    ),
    考勤记录: "考勤记录",
    人员管理: (<>
            <Paragraph>
          1、人员名字中不可含有下划线"_" ！，否则会影响到薪资计算。
        </Paragraph>
    </>),
    工作管理: (
      <>
        {" "}
        <Paragraph>
          1、此处的“基础”工作类型为系统内置，不可删除或修改，只能查看。用于作为基础薪资的计算。
        </Paragraph>
      </>
    ),
    薪资设置: (
      <>
        {" "}
        <Paragraph>
          1、此处可设置不同人员或不同工作的时薪。
        </Paragraph>
        <Paragraph>2、薪资计算顺序为：首先匹配（人员，工作，时薪），然后匹配（人员，时薪），最后匹配（工作，时薪），如果都没有匹配到，则使用基础。</Paragraph>
        <Paragraph>
          3、“基础”工作为系统内置，不可删除，其用于计算未设置具体时薪的情况下的薪资。
        </Paragraph>
      </>
    ),
    "工时&薪资显示": (
      <>
        <Paragraph>
          1、导出所有考勤记录到Excel需要一定的时间，请耐心等待
        </Paragraph>
        <Paragraph>
          2、如果误点击二次确认中的导出按钮，可刷新页面组织导出
        </Paragraph>
      </>
    ),
    后台管理: (
      <>
        <Paragraph>
          1、这里是后台，负责所有数据的储存。仅在完全理解的情况下进行操作。
        </Paragraph>
        <Paragraph>
          2、账号：{__Backend_UserName__} 密码：{__Backend_Password__}
        </Paragraph>
        <Paragraph>
          3、如果觉得此处界面较小，可以点击左下角箭头收起导航栏，或者可以点击
          <a target="_blank" href={__BACKEND_Admin_URL__}>
            此处
          </a>
          在新标签中打开。密码账号不变
        </Paragraph>
      </>
    ),
    undefined: "当前页面未设置label",
  };
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <FloatButton
        icon={<QuestionCircleOutlined />}
        type="primary"
        style={{ insetInlineEnd: 24 }}
        onClick={() => setHelpOpen(true)}
        tooltip="显示当前页面的帮助"
      />
      <FloatButton.BackTop
      style={{ insetInlineEnd: 84 }}
      />
      <Drawer title="帮助" open={helpOpen} onClose={() => setHelpOpen(false)}>
        {helps[String(resource?.meta?.label)]}
      </Drawer>
    </>
  );
};
