/**
 * 签到页左侧「录入」卡片：日期、工种、工时、人员、录入确认。
 * 逻辑在 useBatchEntry hook 里；这里只负责展示与交互。
 *
 * 布局取舍（2026-10-20）：
 * - 顺序改成 日期 → 工种 → 工时 → 人员 → 录入：日期/工种/工时常常连续几次录入都不变，
 *   人员才是每次都要改的，放在按钮上方可以少走鼠标。
 * - 人员选择器放最后，多选下拉展开时只盖住「本次录入」预览和录入按钮（按钮此时本来就禁用），
 *   不会再挡住日期/工种等必填项。
 * - 状态提示从整块 Alert 改成一行状态文字：首屏不再被 40px 的黄色告警占掉；
 *   未选人/未选工种这类"还没填完"用中性灰，只有合并/超限/失败才用彩色。
 */
import dayjs from "dayjs";
import { Button, Card, DatePicker, Flex, InputNumber, Select, Tag } from "antd";
import {
  CheckCircleFilled,
  CloseCircleOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from "@ant-design/icons";
import { formatHoursHm, minutesToHours } from "@/utils/workTime";
import PySearchSelect from "@/components/PySearchSelect";
import { HelpTip } from "@/components/ui/HelpTip";
import type { WorkerOption, useBatchEntry } from "./useBatchEntry";

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

/** 未填完的三种状态用中性灰，别一进页面就弹黄色警告 */
const NEUTRAL_TESTIDS = new Set(["no-worker-alert", "no-work-alert", "no-minutes-alert"]);

/** 状态行：替代原来的整块 Alert，高度从约 40px 降到约 20px */
const StatusLine = ({
  testId,
  type,
  children,
}: {
  testId: string;
  type: "success" | "info" | "warning" | "error";
  children: React.ReactNode;
}) => {
  const neutral = NEUTRAL_TESTIDS.has(testId);
  const color = neutral
    ? "var(--text-tertiary)"
    : type === "success"
      ? "var(--success)"
      : type === "error"
        ? "var(--error)"
        : type === "warning"
          ? "var(--warning)"
          : "var(--info)";
  const icon = neutral ? null : type === "success" ? (
    <CheckCircleFilled />
  ) : type === "error" ? (
    <CloseCircleOutlined />
  ) : type === "warning" ? (
    <ExclamationCircleFilled />
  ) : (
    <InfoCircleFilled />
  );
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        minHeight: 20,
        fontSize: 12,
        lineHeight: "20px",
        color,
      }}
    >
      {icon ? <span style={{ marginTop: 1 }}>{icon}</span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
};

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
        <Field label="日期">
          <Flex gap={6}>
            <DatePicker
              style={{ flex: 1, minWidth: 0 }}
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
            // 140px 刚好让下拉在按钮上方朝下展开（不翻转到上方挡住工时）
            listHeight={140}
          />
        </Field>

        {/* 提交前确认压成一行：人数 · 工时 · 工种 · 日期 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "0 6px",
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: "20px",
          }}
        >
          <span>本次录入</span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: batchWorkers.length ? "var(--text)" : "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {batchWorkers.length}
          </span>
          <span>人 ·</span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: minutes ? "var(--text)" : "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {minutesToHours(minutes) ?? 0}
          </span>
          <span>
            小时 · {workType?.label ?? "未选工种"} · {checkDate.format("YYYY-MM-DD")}
          </span>
        </div>

        <StatusLine testId={dataTestid} type={alertType}>
          {alertDescription}
        </StatusLine>

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
  );
}
