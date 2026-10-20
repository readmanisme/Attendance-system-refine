import { useResourceParams } from "@refinedev/core";
import { FloatButton, Drawer, Typography } from "antd";
import type { ReactNode } from "react";
import { useUiStore } from "@/stores";

const { Title } = Typography;

/**
 * 帮助内容：每页一组「小节标题 + 有序列表」。
 * 之前是一整片无结构的段落（编号还从 0 开始、第 4/5 条重复），
 * 抽屉一打开满屏文字，找不到重点。
 */
const HelpList = ({ items }: { items: ReactNode[] }) => (
  <ol
    style={{
      margin: 0,
      paddingLeft: 20,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontSize: 13,
      lineHeight: 1.7,
      color: "var(--text-secondary)",
    }}
  >
    {items.map((item, i) => (
      <li key={i} style={{ paddingLeft: 2 }}>
        {item}
      </li>
    ))}
  </ol>
);

const Section = ({ title, items }: { title: string; items: ReactNode[] }) => (
  <section style={{ marginBottom: 22 }}>
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text)",
        marginBottom: 8,
        paddingLeft: 8,
        borderLeft: "3px solid var(--brand)",
        lineHeight: 1.4,
      }}
    >
      {title}
    </div>
    <HelpList items={items} />
  </section>
);

const PageTitle = ({ children }: { children: ReactNode }) => (
  <Title level={3} style={{ marginTop: 0, marginBottom: 20, fontSize: 18 }}>
    {children}
  </Title>
);

export const GlobalHelp = () => {
  const { resource } = useResourceParams();
  const { helpOpen, setHelpOpen } = useUiStore();

  // 注意：使用 useResourceParams 依赖 router，必须放在路由组件内部
  const helps: Record<string, ReactNode> = {
    人员签到: (
      <>
        <PageTitle>工时录入页面</PageTitle>
        <Section
          title="录入一笔工时"
          items={[
            "选日期（默认今天，也可用「今天 / 昨天」快捷键）→ 选工种 → 选工时 → 选人员 → 点「录入」。",
            "工时可以精确到分钟：点快捷按钮、直接输小时数，或用 +30 / -30 / +10 / -10 微调；右侧标签显示换算结果（如 8h、7h 30m）。",
            "人员支持拼音和汉字搜索，可多选；选完在「本次录入」一行确认人数、工时、工种与日期。",
            "同一人同一天同一工种不会产生第二条记录，会自动叠加为总工时；单日合计超过 24 小时会被拦截。",
          ]}
        />
        <Section
          title="查看与修改当天记录"
          items={[
            "右侧表格显示所选日期的全部记录，可直接编辑工时和工种，也可以勾选后批量删除。",
            "表格上方汇总显示当天出勤人数、记录条数、总工时、人均工时与工种分布，不受人员筛选影响。",
            "记录较多时可用表格上方的搜索框按人员筛选，支持拼音。",
          ]}
        />
        <Section
          title="其他"
          items={[
            "右上角「刷新」用于同时打开多个页面时同步数据，也会整体重新拉取当前页数据。",
            "选中历史或未来日期时，卡片右上角会显示对应标签，避免记错日期。",
          ]}
        />
      </>
    ),
    考勤记录: (
      <>
        <PageTitle>考勤记录页面</PageTitle>
        <Section
          title="筛选与查看"
          items={[
            "右上角按月份范围筛选；左上角按姓名搜索，支持拼音和汉字，可多选。",
            "「工时」列单位为小时，可精确到分钟。",
          ]}
        />
        <Section
          title="删除与新增"
          items={[
            "勾选左侧复选框可批量删除（仅当前页）。",
            "新增记录请到「人员签到」页，这里只做查看与删除。",
          ]}
        />
      </>
    ),
    人员管理: (
      <>
        <PageTitle>人员管理页面</PageTitle>
        <Section
          title="使用说明"
          items={[
            "左上角可筛选单人或多人，支持拼音和汉字搜索。",
            "「考勤记录数」是该人员的历史记录条数；删除人员会一并删除其考勤记录与薪资设置。",
          ]}
        />
      </>
    ),
    工作管理: (
      <>
        <PageTitle>工作管理页面</PageTitle>
        <Section
          title="使用说明"
          items={[
            "工种用于区分不同工作内容；删除工种会一并删除相关考勤记录与薪资设置。",
            "「基础」工种由系统使用，不可编辑和删除；未单独设置时薪的工种都按基础时薪计算。",
          ]}
        />
      </>
    ),
    薪资设置: (
      <>
        <PageTitle>薪资设置页面</PageTitle>
        <Section
          title="匹配顺序"
          items={[
            "先匹配（人员 + 工作 + 时薪），再匹配（人员 + 时薪），最后匹配（工作 + 时薪）。",
            "都没匹配到时使用「基础」时薪；工人为空表示「全部人员（默认）」。",
          ]}
        />
        <Section
          title="录入规则"
          items={[
            "工人和工种至少要选一个，也可以都选；两者都不选或与已有记录重复时无法保存。",
            "时薪单位为元/小时。",
          ]}
        />
      </>
    ),
    "工时&薪资显示": (
      <>
        <PageTitle>工时&薪资显示页面</PageTitle>
        <Section
          title="查看与筛选"
          items={[
            "左上角按人员筛选，支持拼音和汉字，可多选；右上角选择月份范围后点「应用」。",
            "主表显示所选范围内每人的合计工时与合计薪资；点行首箭头可三级展开：月 → 日 → 当天明细。",
            "最后一级的薪资悬浮可查看计算依据（来自「薪资设置」页）。",
          ]}
        />
        <Section
          title="导出与异常"
          items={[
            "右上角「导出」可把所选月份范围导出为 Excel，包含每人每月、每日与每条明细；范围较大时需要等待。",
            "未设置时薪的工种按基础时薪计算，页面顶部会给出提示。",
            "表格一直转圈通常表示后端异常，可先点右上角「刷新」，仍不行请检查后端服务。",
          ]}
        />
      </>
    ),
    undefined: "当前页面未设置帮助",
  };

  return (
    <>
      <FloatButton.BackTop
        style={{
          bottom: "80px", // 让开右下角的通知区域
          right: "20px",
        }}
      />
      <Drawer
        title={`${resource?.meta?.label} 帮助`}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        width={480}
        styles={{ body: { paddingTop: 20 } }}
      >
        {helps[String(resource?.meta?.label)]}
      </Drawer>
    </>
  );
};
