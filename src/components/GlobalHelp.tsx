import { useResourceParams } from "@refinedev/core";
import { FloatButton, Drawer } from "antd";
import { Typography } from "antd";
import { useUiStore } from "@/stores";
const { Title, Paragraph } = Typography;
export const GlobalHelp = () => {
  const { resource } = useResourceParams();
  const { helpOpen, setHelpOpen } = useUiStore();
  // 值得注意，由于使用到了useResource这个用到react routerdom的hook，所以需要在路由组件包裹下使用，否则无效
  const helps: Record<string, React.ReactNode> = {
    人员签到: (
      <>
        <Title level={3} className="text-center">
          工时录入页面
        </Title>
        <Paragraph>
          0、右上角刷新数据按钮，用于应对需要打开两个页面的情况，当在其中一个页面刷新数据后，点击此按钮在另一个页面中同步新的数据。同时也起到更方便的刷新页面的作用。
        </Paragraph>
        <Paragraph>
          1、录入只需选择人员、工作、日期和工时即可，工时可以精确到分钟（如0.5、0.3333小时）。
        </Paragraph>
        <Paragraph>2、选择人员可以搜索，支持拼音搜索和汉字搜索，支持多选。</Paragraph>
        <Paragraph>
          3、工时既可以点击 快速选择工时
          下方的按钮快速设置，也可以在旁边的输入框直接输入小时数，还可以用分钟加减按钮微调；旁边显示当前所选工时的分钟数。
          <br />
          同一人同一天的相同工作不会产生第二条记录，而是自动叠加为一个总工时。
        </Paragraph>
        <Paragraph>
          4、选择日期的时候，默认是今日，也可以选择以前和未来的日期，不过会显示相应的提示避免忽略。
          <br />
          选择相应的日期就会显示那天的工时记录。并可以进行录入和修改。
        </Paragraph>
        <Paragraph>
          5、选择日期的时候，默认是今日，也可以选择以前和未来的日期，不过会显示相应的提示避免忽略。
          <br />
          选择相应的日期就会显示那天的工时记录。
        </Paragraph>
        <Paragraph>
          6、下方的表格显示所选日期的工时记录，可以进行编辑和删除操作。
          <br />
          编辑包括修改工时和工作。
          <br />
          删除可以单个和批量删除，批量删除使用左边的复选框进行。
        </Paragraph>
      </>
    ),
    考勤记录: (
      <>
        <Title level={3} className="text-center">
          考勤记录页面
        </Title>
        <Paragraph>
          1、右上角可以按照日期筛选考勤记录；左上角可以按照姓名搜索记录，可以多选。
        </Paragraph>
        <Paragraph>2、可以使用左边复选框进行批量删除。</Paragraph>
        <Paragraph>3、添加考勤记录请到工时录入页面。</Paragraph>
      </>
    ),
    人员管理: (
      <>
        <Title level={3} className="text-center">
          人员管理页面
        </Title>
        <Paragraph>1、表的左上角可以筛选单人或多人，支持拼音和汉字搜索。</Paragraph>
      </>
    ),
    工作管理: (
      <>
        <Title level={3} className="text-center">
          工作管理页面
        </Title>
      </>
    ),

    薪资设置: (
      <>
        <Title level={3} className="text-center">
          薪资设置页面
        </Title>
        <Paragraph>1、此处可设置不同人员或不同工作的时薪。</Paragraph>
        <Paragraph>
          2、薪资计算顺序为：首先匹配（人员，工作，时薪），然后匹配（人员，时薪），最后匹配（工作，时薪），如果都没有匹配到，则使用基础。
        </Paragraph>
        <Paragraph>
          3、创建和编辑薪资记录的时候，工人和工种必选其一，也可全选。若未选其一，或者与已有记录重复，记录就无法成功储存。
        </Paragraph>
      </>
    ),
    "工时&薪资显示": (
      <>
        <Title level={3} className="text-center">
          工时&薪资显示页面
        </Title>
        <Paragraph>1、如果表格一直在转圈，则表示发生未知错误，请联系管理员。</Paragraph>
        <Paragraph>2、此外未设置时薪的工作都按照基础时薪计算。</Paragraph>
        <Paragraph>3、右上角可以按照人员筛选记录，支持汉字搜索和拼音搜索，支持多选。</Paragraph>
        <Paragraph>
          4、右上角可以导出选择月份范围内的考勤记录到Excel(包括每人每月，每日，每日的具体记录的工时和薪资)，如果范围较广，则需要一定的时间，请耐心等待，如果误点击二次确认中的导出按钮，可刷新页面阻止导出。
        </Paragraph>
        <Paragraph>5、表格右上角支持按照时间筛选记录。</Paragraph>
        <Paragraph>
          6、表格支持三级展开，分别用于查看某人某月，某天，某天的具体工时与薪资。将鼠标悬浮到最后一级的薪资上，会显示薪资计算依据（根据“薪资管理”页面设置）。
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
