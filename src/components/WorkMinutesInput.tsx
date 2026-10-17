/**
 * 工时输入组件:小时 + 分钟双输入框。
 * value 为整数分钟(直接绑定库里的 work_minutes),两框联动拆分/合并,
 * 解决"20 分钟 = 0.3333 小时"这类短工时难以按小时单位录入的问题。
 */
import { InputNumber } from "antd";
import Decimal from "decimal.js";

interface WorkMinutesInputProps {
  /** 整数分钟(null/undefined = 未填) */
  value?: number | null;
  /** 变化回调,回传整数分钟;两框均为空时回传 undefined */
  onChange?: (minutes: number | undefined) => void;
  /** antd Form.Item 自动注入,绑到小时框,分钟框用 `${id}_min` */
  id?: string;
  /** 是否显示小数小时换算提示(如 "= 0.33 小时"),表格内紧凑场景可关闭 */
  showHint?: boolean;
}

export default function WorkMinutesInput({
  value,
  onChange,
  id,
  showHint = true,
}: WorkMinutesInputProps) {
  const maxMinutes = 24 * 60;
  const maxHours = Math.floor(maxMinutes / 60);
  const hours = value == null || value < 0 ? undefined : Math.floor(value / 60);
  const minutes = value == null || value < 0 ? undefined : value % 60;

  const emit = (nextHours: number | undefined, nextMinutes: number | undefined) => {
    if (nextHours == null && nextMinutes == null) {
      onChange?.(undefined);
      return;
    }
    onChange?.(Math.min((nextHours ?? 0) * 60 + (nextMinutes ?? 0), maxMinutes));
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <InputNumber
        id={id}
        min={0}
        max={maxHours}
        precision={0}
        value={hours}
        onChange={(v) => emit(v ?? undefined, minutes)}
        suffix="时"
        style={{ width: 80 }}
      />
      <InputNumber
        id={id ? `${id}_min` : undefined}
        min={0}
        max={59}
        precision={0}
        value={minutes}
        disabled={hours != null && hours >= maxHours}
        onChange={(v) => emit(hours, v ?? undefined)}
        suffix="分"
        style={{ width: 80 }}
      />
      {showHint && value != null && (
        <span style={{ color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>
          = {new Decimal(value).dividedBy(60).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()} 小时
        </span>
      )}
    </span>
  );
}
