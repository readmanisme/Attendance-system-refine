/**
 * 签到页上方的批量录入面板:人员多选、日期、工时快捷键/输入框、工作选择、录入确认。
 * 逻辑在 useBatchEntry hook 里;这里只负责展示与交互。
 */
import dayjs from "dayjs";
import {
  Alert,
  Button,
  DatePicker,
  Flex,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { IconHelp } from "@tabler/icons-react";
import { minutesToHours } from "@/utils/workTime";
import PySearchSelect from "@/components/PySearchSelect";
import type { WorkerOption, useBatchEntry } from "./useBatchEntry";

type BatchEntry = ReturnType<typeof useBatchEntry>;

// 快捷工时(小时)
const hourChips = [2, 2.5, 5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 12, 13];

interface BatchEntryPanelProps {
  batch: BatchEntry;
  /** 工作选择器的 useSelect props(编辑行内也要用,所以由页面提供) */
  workTypeSelectProps: any;
}

export function BatchEntryPanel({ batch, workTypeSelectProps }: BatchEntryPanelProps) {
  const {
    checkDate,
    setCheckDate,
    minutes,
    adjustMinutes,
    setHoursValue,
    workType,
    setWorkType,
    batchWorkers,
    setBatchWorkers,
    luruDisabled,
    alertDescription,
    alertType,
    dataTestid,
    submitBatch,
  } = batch;

  const isPast = checkDate.isBefore(dayjs(), "day");
  const isFuture = checkDate.isAfter(dayjs(), "day");

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6 mt-2">
        <Space direction="vertical" className="w-full">
          <Flex gap="small">
            <Alert
              data-testid={isPast ? "past-alert" : isFuture ? "future-alert" : "today-alert"}
              className="flex-1"
              message={
                isPast
                  ? "你正在过去日期中进行操作"
                  : isFuture
                    ? "你正在未来日期中进行操作"
                    : "你正在录入今日数据"
              }
              type={isPast ? "warning" : isFuture ? "error" : "success"}
              showIcon
            />
          </Flex>
          <PySearchSelect
            onChangeFn={(value) => {
              setBatchWorkers(value as WorkerOption[]);
            }}
            placeholder="多选工人,支持拼音"
            labelPlaceholder=""
            mode="multiple"
            width="100%"
            value={batchWorkers}
            type="qiandao"
          />
        </Space>
        <Space direction="vertical">
          <Space direction="vertical">
            <Tooltip title="工时可以精确到分钟">
              <div data-testid="hour-tooltip" className="flex flex-row items-center gap-2">
                快速选择工时：
                <IconHelp size={16} />
              </div>
            </Tooltip>
            <Space wrap>
              {hourChips.map((hour) => (
                <Button
                  data-testid={`hour-button-${hour}`}
                  color="blue"
                  variant="filled"
                  key={hour}
                  size="small"
                  onClick={() => setHoursValue(hour)}
                >
                  {hour}
                </Button>
              ))}
            </Space>
            <Space>
              <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(30)}>
                +30min
              </Button>
              <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(-30)}>
                -30min
              </Button>
              <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(10)}>
                +10min
              </Button>
              <Button color="blue" variant="dashed" size="small" onClick={() => adjustMinutes(-10)}>
                -10min
              </Button>
            </Space>
          </Space>
          <Space>
            <InputNumber
              data-testid="hours-input"
              min={0}
              max={24}
              step={0.5}
              value={minutesToHours(minutes)}
              onChange={(v) => v != null && setHoursValue(v)}
              formatter={(v) => `${v}小时`}
              parser={(v) => Math.round(Number(String(v).replace(/[^0-9.]/g, "")) * 100) / 100}
              style={{ width: 110 }}
            />
            <Tag data-testid="time-difference" color="blue" style={{ width: 90 }}>
              {minutes}分钟
            </Tag>
          </Space>

          <Space>
            <DatePicker
              style={{ width: 120 }}
              allowClear={false}
              value={checkDate}
              onChange={setCheckDate}
            />

            <Select
              placeholder="工作"
              data-testid="work-type-select"
              {...workTypeSelectProps}
              style={{ width: 120 }}
              allowClear={{ clearIcon: <CloseCircleOutlined data-testid="clear-icon" /> }}
              // 自定义图标使得可以被良好的选择，否则会是很长的选择器
              labelInValue
              value={workType}
              onChange={setWorkType}
            />

            <Popconfirm
              title="确认要录入吗？"
              description="请确保信息准确"
              okText="确认"
              cancelText="取消"
              onConfirm={submitBatch}
            >
              <Button data-testid="submit-button" type="primary" disabled={luruDisabled}>
                录入
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      </div>

      <Alert data-testid={dataTestid} description={alertDescription} type={alertType} showIcon />
    </>
  );
}
