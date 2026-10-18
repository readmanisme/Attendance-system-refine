// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import WorkMinutesInput from "@/components/WorkMinutesInput";

beforeAll(() => {
  // antd 的部分组件在挂载时读取 matchMedia,jsdom 没有实现
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(cleanup);

const hourInput = () => document.querySelector<HTMLInputElement>("#wm")!;
const minuteInput = () => document.querySelector<HTMLInputElement>("#wm_min")!;

/** 受控包装:让 onChange 回写 value,模拟 antd Form.Item 的行为 */
function Harness({
  initial,
  showHint = true,
  onEmit,
}: {
  initial?: number | null;
  showHint?: boolean;
  onEmit?: (minutes: number | undefined) => void;
}) {
  const [value, setValue] = useState<number | null | undefined>(initial);
  return (
    <WorkMinutesInput
      id="wm"
      showHint={showHint}
      value={value}
      onChange={(minutes) => {
        setValue(minutes ?? null);
        onEmit?.(minutes);
      }}
    />
  );
}

describe("WorkMinutesInput 显示拆分", () => {
  test("90 分钟显示为 1 时 30 分", () => {
    render(<WorkMinutesInput id="wm" value={90} />);
    expect(hourInput().value).toBe("1");
    expect(minuteInput().value).toBe("30");
  });

  test("整点不显示多余分钟", () => {
    render(<WorkMinutesInput id="wm" value={480} />);
    expect(hourInput().value).toBe("8");
    expect(minuteInput().value).toBe("0");
  });

  test("不足一小时时小时框为 0", () => {
    render(<WorkMinutesInput id="wm" value={20} />);
    expect(hourInput().value).toBe("0");
    expect(minuteInput().value).toBe("20");
  });

  test("null 与 undefined 都显示为空", () => {
    render(<WorkMinutesInput id="wm" value={null} />);
    expect(hourInput().value).toBe("");
    cleanup();
    render(<WorkMinutesInput id="wm" value={undefined} />);
    expect(hourInput().value).toBe("");
  });

  test("负值视为未填,不显示负数", () => {
    render(<WorkMinutesInput id="wm" value={-30} />);
    expect(hourInput().value).toBe("");
    expect(minuteInput().value).toBe("");
  });
});

describe("WorkMinutesInput 上限与提示", () => {
  test("达到 24 小时时分钟框禁用", () => {
    render(<WorkMinutesInput id="wm" value={1440} />);
    expect(hourInput().value).toBe("24");
    expect(minuteInput().disabled).toBe(true);
  });

  test("23 小时 59 分时分钟框仍可用", () => {
    render(<WorkMinutesInput id="wm" value={1439} />);
    expect(minuteInput().disabled).toBe(false);
  });

  test("显示小数小时换算提示", () => {
    render(<WorkMinutesInput id="wm" value={90} />);
    expect(screen.getByText("= 1.5 小时")).toBeTruthy();
  });

  test("20 分钟按两位小数提示", () => {
    render(<WorkMinutesInput id="wm" value={20} />);
    expect(screen.getByText("= 0.33 小时")).toBeTruthy();
  });

  test("showHint=false 时不渲染提示", () => {
    render(<WorkMinutesInput id="wm" value={90} showHint={false} />);
    expect(screen.queryByText("= 1.5 小时")).toBeNull();
  });
});

describe("WorkMinutesInput 输入联动", () => {
  test("改分钟框时保留小时并回传总分钟", () => {
    const onEmit = vi.fn();
    render(<Harness initial={60} onEmit={onEmit} />);
    fireEvent.focus(minuteInput());
    fireEvent.change(minuteInput(), { target: { value: "45" } });
    expect(onEmit).toHaveBeenCalledWith(105);
  });

  test("改小时框时保留分钟并回传总分钟", () => {
    const onEmit = vi.fn();
    render(<Harness initial={90} onEmit={onEmit} />);
    fireEvent.focus(hourInput());
    fireEvent.change(hourInput(), { target: { value: "3" } });
    expect(onEmit).toHaveBeenCalledWith(210);
  });

  test("小时与分钟都清空后回传 0(与未填等价,业务层按不可录入处理)", () => {
    const onEmit = vi.fn();
    render(<Harness initial={90} onEmit={onEmit} />);
    fireEvent.focus(hourInput());
    fireEvent.change(hourInput(), { target: { value: "" } });
    fireEvent.focus(minuteInput());
    fireEvent.change(minuteInput(), { target: { value: "" } });
    // 清空小时框时分钟仍是 30,故清空分钟框得到 0 而不是 undefined;
    // 0 与 undefined 在录入校验里都是"未填",不会写出空记录。
    expect(onEmit).toHaveBeenLastCalledWith(0);
  });

  test("未填状态(undefined)下只填分钟不回填小时", () => {
    const onEmit = vi.fn();
    render(<Harness initial={null} onEmit={onEmit} />);
    fireEvent.focus(minuteInput());
    fireEvent.change(minuteInput(), { target: { value: "20" } });
    expect(onEmit).toHaveBeenLastCalledWith(20);
  });

  // 注:emit 里 "两框都为空 → onChange(undefined)" 的分支是防御性代码。
  // antd 在值本来就为空时不会派发 change,因此这条分支无法通过真实交互触发,
  // 保留在源码里作为兜底,不强行构造测试。

  test("小时填满 24 后再填分钟会被钳制到 1440", () => {
    const onEmit = vi.fn();
    render(<Harness initial={1439} onEmit={onEmit} />);
    fireEvent.focus(hourInput());
    fireEvent.change(hourInput(), { target: { value: "24" } });
    expect(onEmit).toHaveBeenLastCalledWith(1440);
  });
});
