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
        <Paragraph strong>0、右上角刷新数据按钮，用于应对需要打开两个页面的情况，当在其中一个页面刷新数据后，点击此按钮在另一个页面中同步新的数据。</Paragraph>
        <Paragraph>1、签到是上下班一起，选择人员，选择工作，选择日期，选择时间，然后录入即可。</Paragraph>
        <Paragraph>
          2、选择人员可以搜索，支持拼音搜索和汉字搜索，支持多选。
        </Paragraph>
        <Paragraph>
          3、选择时间的时候，既可以手动选择时间区间，可以点击 快速选择工时 下方的按钮快速设置时间，这种方式设置的时间必定以7:00开始。同时旁边显示当前所选时间区间是多少工时；
          <br />
          为保证数据正确性，选择的时间不能与之前相关人员已有的签到记录的时间范围冲突。
        </Paragraph>
        <Paragraph>
          4、选择日期的时候，默认是今日，也可以选择以前和未来的日期，不过会显示相应的提示避免忽略。
          <br />
          选择相应的日期就会显示那天的签到记录。并可以进行录入和修改。
        </Paragraph>
        <Paragraph>
          5、选择日期的时候，默认是今日，也可以选择以前和未来的日期，不过会显示相应的提示避免忽略。
          <br />
          选择相应的日期就会显示那天的签到记录。
        </Paragraph>
        <Paragraph>
          6、下方的表格显示所选日期的签到记录，可以进行编辑和删除操作。
          <br />
          编辑包括修改工时和工作，修改工时就会让开始时间从7:00开始。
          <br />
          删除可以单个和批量删除，批量删除使用左边的复选框进行。
        </Paragraph>
      </>
    ),
    考勤记录: (
      <>
        <Paragraph>1、右上角可以按照日期筛选考勤记录；左上角可以按照姓名搜索记录，可以多选。</Paragraph>
        <Paragraph>2、可以使用左边复选框进行批量删除。</Paragraph>
        <Paragraph>3、添加考勤记录请到签到页面录入。</Paragraph>
      </>
    ),
    人员管理: (
      <>
        <Paragraph>1、表的左上角可以筛选单人或多人，支持拼音和汉字搜索。</Paragraph>
      </>
    ),
    工作管理: (
      <>
      </>
    ),
    薪资设置: (
      <>
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
