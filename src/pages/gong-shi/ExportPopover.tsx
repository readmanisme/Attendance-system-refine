/**
 * "工时&薪资"页:导出 Excel 的确认弹窗(时间范围 + 可选单人)。
 * xlsx 库体积大,只在点击导出后动态加载(见 export_xlsx.ts)。
 */
import { App, Button, DatePicker, Popconfirm, Select, Space, Tooltip } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useState } from "react";
import { useSelect } from "@refinedev/antd";
import { IconHelp } from "@tabler/icons-react";
import { useConfigStore } from "@/stores";

const { RangePicker } = DatePicker;

export const ExportPopover = ({ salaryDict }: { salaryDict: Record<string, number> }) => {
  const { message } = App.useApp();
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [exportRange, setExportRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("year"),
    dayjs().endOf("year"),
  ]);
  const [exportPerson, setExportPerson] = useState<string>("");
  const { __BACKEND_API_URL__ } = useConfigStore();

  const { selectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  const handleExport = useCallback(async () => {
    setIsExportLoading(true);
    try {
      // 懒加载 xlsx 与导出逻辑
      const { default: exportExcel } = await import("./export_xlsx");
      await exportExcel(exportRange, exportPerson, salaryDict, __BACKEND_API_URL__);
    } catch (error) {
      console.error("导出考勤记录失败:", error);
      message.error("导出失败，请检查时间范围或后端连接后重试");
    } finally {
      setIsExportLoading(false);
    }
  }, [exportRange, exportPerson, salaryDict, __BACKEND_API_URL__, message]);

  return (
    <Popconfirm
      title="导出考勤记录"
      description={
        <div className="flex flex-col items-center justify-start gap-2">
          选择导出时间范围
          <br />
          <div>
            {exportRange[0].format("YYYY-MM-DD")} 至{" "}
            {exportRange[1].endOf("month").format("YYYY-MM-DD")}
          </div>
          <RangePicker
            size="small"
            picker="month"
            defaultValue={exportRange}
            // @ts-expect-error,111
            onChange={(date: [Dayjs, Dayjs]) => {
              // 清空(取消)时保持原范围不被覆盖
              if (date) {
                setExportRange(date);
              }
            }}
          />
          <Space>
            {/* @ts-expect-error,111 */}
            <Select
              {...selectProps}
              style={{ width: 120 }}
              onChange={(value: string) => {
                setExportPerson(value);
              }}
            />
            <Tooltip title="选择人名可导出单人记录，不选择导出全部人的记录">
              <div className="flex flex-row items-center gap-2">
                <IconHelp size={16} />
              </div>
            </Tooltip>
          </Space>
        </div>
      }
      onConfirm={handleExport}
      okText="进行导出"
      cancelText="取消操作"
      // 确认按钮显示导出进行中的 loading(原来只给弹层外的触发按钮,确认后无反馈)
      okButtonProps={{ loading: isExportLoading }}
    >
      <Button loading={isExportLoading}>导出考勤记录到Excel</Button>
    </Popconfirm>
  );
};
