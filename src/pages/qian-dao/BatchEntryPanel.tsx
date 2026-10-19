/**
 * 签到页左侧「录入」卡片：人员多选、日期、工时快捷/输入、工作选择、录入确认。
 * 逻辑在 useBatchEntry hook 里；这里只负责展示与交互。
 */
import dayjs from "dayjs";
import { Alert, Button, Card, DatePicker, Flex, InputNumber, Select, Tag } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { formatHoursHm, minutesToHours } from "@/utils/workTime";
import PySearchSelect from "@/components/PySearchSelect";
import { HelpTip } from "@/components/ui/HelpTip";
import type { WorkerOption, useBatchEntry } from "./useBatchEntry";
import { DayStatsBar } from "./DayStatsBar";

type BatchEntry = ReturnType<typeof useBatchEntry>;

// 快捷工时(小时)。全部直接可见——常用值置前，其余靠后，避免折叠带来的二次点击
const hourChips = [2, 2.5, 5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 12, 13];

interface BatchEntryPanelProps {
  batch: BatchEntry;
  /** 工作选择器的 useSelect props(编辑行内也要用,所以由页面提供) */
  workTypeSelectProps: any;
}

/** 表单行：标签 + 控件，避免用 Form.Item 注入非表单组件 */
const Field = ({
  label,
  hint,
  children,
  testId,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div
      data-testid={hint ? undefined : testId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        color: "var(--text-secondary)",
      }}
    >
      {label}
      {hint ? <HelpTip title={hint} testId={testId} /> : null}
    </div>
    {children}
  </div>
);

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
    isSubmitting,
    alertDescription,
    alertType,
    dataTestid,
    submitBatch,
  } = batch;

  const isPast = checkDate.isBefore(dayjs(), "day");
  const isFuture = checkDate.isAfter(dayjs(), "day");

  const statusTag = isPast ? (
    <Tag data-testid="past-alert" color="warning" style={{ marginInlineEnd: 0 }}>
      历史日期
    </Tag>
  ) : isFuture ? (
    <Tag data-testid="future-alert" color="error" style={{ marginInlineEnd: 0 }}>
      未来日期
    </Tag>
  ) : (
    <Tag data-testid="today-alert" color="success" style={{ marginInlineEnd: 0 }}>
      今日
    </Tag>
  );

  const today = dayjs().minute(0).second(0).millisecond(0);

  return (
    <>
      <Card
        size="small"
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            录入
            <HelpTip title="同一人同一天同一工种不会产生第二条记录，会自动叠加为总工时" />
          </span>
        }
        extra={statusTag}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="人员">
            <PySearchSelect
              onChangeFn={(value) => {
                setBatchWorkers(value as WorkerOption[]);
              }}
              placeholder="多选工人，支持拼音"
              labelPlaceholder=""
              mode="multiple"
              width="100%"
              value={batchWorkers}
              type="qiandao"
            />
          </Field>

          {/* 录入预览：既是提交前的确认，也给人员下拉留出展开空间，避免下拉盖住下方控件 */}
          <div
            style={{
              minHeight: 130,
              padding: "10px 12px",
              background: "var(--bg-subtle)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>本次录入</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {batchWorkers.length}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>人</span>
              <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>
                {minutesToHours(minutes)} 小时
              </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 4 }}>
                · {workType?.label ?? "未选工种"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, overflow: "hidden" }}>
              {batchWorkers.slice(0, 8).map((worker) => (
                <Tag key={worker.key} bordered={false} style={{ marginInlineEnd: 0 }}>
                  {worker.label}
                </Tag>
              ))}
              {batchWorkers.length > 8 && (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: "22px" }}>
                  +{batchWorkers.length - 8}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {checkDate.format("YYYY-MM-DD")} · 同人同工种自动合并
            </div>
          </div>

          <Field label="日期">
            <Flex gap={6}>
              <DatePicker
                style={{ flex: 1 }}
                allowClear={false}
                value={checkDate}
                onChange={setCheckDate}
              />
              <Button onClick={() => setCheckDate(today)}>今天</Button>
              <Button onClick={() => setCheckDate(today.subtract(1, "day"))}>昨天</Button>
            </Flex>
          </Field>

          <Field label="工种">
            <Select
              placeholder="选择工作"
              data-testid="work-type-select"
              {...workTypeSelectProps}
              style={{ width: "100%" }}
              allowClear={{ clearIcon: <CloseCircleOutlined data-testid="clear-icon" /> }}
              // 自定义图标使得可以被良好的选择，否则会是很长的选择器
              labelInValue
              value={workType}
              onChange={setWorkType}
            />
          </Field>

          <Field label="工时" testId="hour-tooltip" hint="工时可以精确到分钟">
            <Flex gap={8} align="center">
              <InputNumber
                data-testid="hours-input"
                min={0}
                max={24}
                step={0.5}
                value={minutesToHours(minutes)}
                onChange={(v) => v != null && setHoursValue(v)}
                formatter={(v) => `${v}小时`}
                parser={(v) => Math.round(Number(String(v).replace(/[^0-9.]/g, "")) * 100) / 100}
                style={{ flex: 1 }}
              />
              <Tag
                data-testid="time-difference"
                color="blue"
                style={{
                  marginInlineEnd: 0,
                  minWidth: 84,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatHoursHm(minutes)}
              </Tag>
            </Flex>

            {/* 快捷工时：当前值高亮，其余为浅底按钮 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {hourChips.map((hour) => {
                const active = minutes === Math.round(hour * 60);
                return (
                  <Button
                    data-testid={`hour-button-${hour}`}
                    key={hour}
                    size="small"
                    type={active ? "primary" : "default"}
                    onClick={() => setHoursValue(hour)}
                    style={{ minWidth: 42 }}
                  >
                    {hour}
                  </Button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 2 }}>
                微调
              </span>
              <Button size="small" type="text" onClick={() => adjustMinutes(30)}>
                +30min
              </Button>
              <Button size="small" type="text" onClick={() => adjustMinutes(-30)}>
                -30min
              </Button>
              <Button size="small" type="text" onClick={() => adjustMinutes(10)}>
                +10min
              </Button>
              <Button size="small" type="text" onClick={() => adjustMinutes(-10)}>
                -10min
              </Button>
            </div>
          </Field>

          <Alert
            data-testid={dataTestid}
            description={alertDescription}
            type={alertType}
            showIcon
          />

          <Button
            data-testid="submit-button"
            type="primary"
            size="large"
            block
            disabled={luruDisabled}
            loading={isSubmitting}
            onClick={submitBatch}
          >
            录入
          </Button>
        </div>
      </Card>

      {/* 所选日期的简单统计(随日期切换实时更新) */}
      <DayStatsBar checkDate={checkDate} />
    </>
  );
}
