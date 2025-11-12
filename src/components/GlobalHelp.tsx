import { useResourceParams } from "@refinedev/core";
import { FloatButton, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import { useSomeStore } from "@/stores";
export const GlobalHelp = () => {
  const { resource } = useResourceParams();
  const { helpOpen, setHelpOpen } = useSomeStore();
  // 值得注意，由于使用到了useResource这个用到react routerdom的hook，所以需要在路由组件包裹下使用，否则无效
  const helps: Record<string, React.ReactNode> = {
    人员签到: (
      <>
        <Paragraph>1、签到方式分为单人模式和多人模式。</Paragraph>
        <Paragraph>
          2、单人模式下，选择员工，选择考勤类型(仅签到)，点击上班或下班按钮，即可进行签到或签退。签到签退时间均为点击按钮时的当前时间。
        </Paragraph>
        <Paragraph>
          2、批量模式下，选择员工，选择考勤类型(仅签到)，选择时间，点击上班或下班按钮，即可进行签到或签退。未下班人员将显示在选择框的上方，并且选择框内选项也标注了未上班和未下班，便于批量选择。
        </Paragraph>
        <Paragraph>
          3、为防止数据异常，通过代码设计，存在下列约束：
          ①人员、工作（仅签到需要）、时间（批量模式下）均选择后才可以签到签退。
          <br />
          ②未签到者不能签退，未签退者不能签到。
          <br />
          ③下班时间不能早于上班时间；上班时间不能早于之前的下班时间（单人模式下没有）。
          <br />
          ④这些约束仅适用于时间位于今日的记录，其他时间的记录不受约束。所以不要进行跨日签到。
        </Paragraph>
        <Paragraph>
          4、此页面仅显示当天签到记录，需要显示其他日期的记录，请前往考勤记录页面。
        </Paragraph>
        <Paragraph>
          5、单人模式下，选择框支持拼音搜索和汉字搜索，批量模式下选择框仅支持汉字搜索。
        </Paragraph>
      </>
    ),
    考勤记录: (
      <>
        <Paragraph>
          1、！不要有签到和签退为空的记录，会导致薪资计算和工时显示出现错误。
        </Paragraph>
        <Paragraph>2、右上角可以通过单月和区间筛选考勤记录。</Paragraph>
        <Paragraph>
          3、这个页面添加和修改考勤记录的时候，并不存在“人员签到”界面中的那些约束，请注意不要出现数据异常。
        </Paragraph>
        <Paragraph>
          4、表的左上角可能筛选单人或多人，支持汉字搜索，不支持拼音搜索。
        </Paragraph>
        <Paragraph>
          5、表的左上角还可以通过一个开关切换是否显示未打卡的记录。
        </Paragraph>
      </>
    ),
    人员管理: (
      <>
        <Paragraph>
          1、人员名字中不可含有下划线"_" ！，否则会影响到薪资计算。
        </Paragraph>
        <Paragraph>2、人员名字不可以为空，也不可以重复。</Paragraph>
        <Paragraph>
          3、表的左上角可能筛选单人或多人，支持汉字搜索，不支持拼音搜索。
        </Paragraph>
        <Paragraph>3、批量录入的时候，一行一个姓名，空行将不被计入。</Paragraph>
      </>
    ),
    工作管理: (
      <>
        <Paragraph>
          1、此处的“基础”工作类型为系统内置，不可删除或修改，只能查看。用于作为基础薪资的计算。
        </Paragraph>
        <Paragraph>
          2、工作不能重复，并且名字不能为空，也不能包含下划线，否则不会被创建。
        </Paragraph>
      </>
    ),
    薪资设置: (
      <>
        <Paragraph>1、此处可设置不同人员或不同工作的时薪。</Paragraph>
        <Paragraph>
          2、薪资计算顺序为：首先匹配（人员，工作，时薪），然后匹配（人员，时薪），最后匹配（工作，时薪），如果都没有匹配到，则使用基础。
        </Paragraph>
        <Paragraph>
          3、“基础”工作为系统内置，不可删除，其用于计算未设置具体时薪的情况下的薪资。
        </Paragraph>
        <Paragraph>
          4、创建和编辑薪资记录的时候，工人和工种必选其一，也可全选。若未选其一，或者与已有记录重复，记录就无法成功储存。
        </Paragraph>
        <Paragraph>
          5、此处修改后，薪资显示界面的结果可能需要一点时间才能更新，尝试刷新页面。
        </Paragraph>
      </>
    ),
    "工时&薪资显示": (
      <>
        <Paragraph>
          1、如果表格一直在转圈，则表示发生未知错误，请联系管理员。
        </Paragraph>
        <Paragraph>
          2、未下班记录将不被计入，此外未设置时薪的工作都按照基础时薪计算。
        </Paragraph>
        <Paragraph>
          3、右上角可以按照人员筛选记录，支持汉字搜索和拼音搜索，支持多选。
        </Paragraph>
        <Paragraph>
          4、右上角可以导出选择月份范围内的考勤记录到Excel(包括每人每月，每日，每日的具体记录的工时和薪资)，如果范围较广，则需要一定的时间，请耐心等待，如果误点击二次确认中的导出按钮，可刷新页面阻止导出。
        </Paragraph>
        <Paragraph>5、表格右上角支持按照单月和区间筛选记录。</Paragraph>
        <Paragraph>
          6、表格支持三级展开，分别用于查看某人某月，某天，某天的具体工时与薪资。将鼠标悬浮到最后一级的薪资上，会显示薪资计算依据（根据“薪资管理”页面设置）。
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
  return (
    <>
      <FloatButton.BackTop
        style={{
          bottom: "10px", // 距离底部50px
          right: "20px", // 距离右侧24px
        }}
      />
      <Drawer
        title={`${resource?.meta?.label} 帮助`}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        {helps[String(resource?.meta?.label)]}
      </Drawer>
    </>
  );
};
