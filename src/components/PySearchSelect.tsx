import { Button, Select, Space, Tag } from "antd";
import { match } from "pinyin-pro";
import { useMemo, useState, useCallback, useRef } from "react";
import type { DefaultOptionType } from "antd/es/select";
import { useList } from "@refinedev/core";
import { useSelect } from "@refinedev/antd";
import { SearchOutlined } from "@ant-design/icons";

interface PySearchSelectProps {
  onChangeFn: (value: { value: string; label: string }) => void;
  tableOptions?: { table: string; optionLabel: string };
  placeholder?: string;
  Laberplaceholder?: string;
  onClearFn?: () => void;
  mode?: "multiple" | "tags";
  needButton?: boolean;
  UnCheckOutNames?: string[] | undefined;
  width?: number;
  type?: string | undefined;
}
/**
 * 自定义的选择器，支持拼音搜索,
 * 支持多行，默认数据用工人列表,
 * 启用按钮的时候，onChangeFn只会被按钮点击触发,
 */
export default function PySearchSelect({
  onChangeFn,
  tableOptions = { table: __Workers_TableName, optionLabel: "name" },
  placeholder = "请选择考勤人员",
  Laberplaceholder = "搜索工人：",
  onClearFn = () => {},
  mode = undefined,
  needButton = false,
  UnCheckOutNames = undefined,
  width = 250,
  type = undefined,
}: PySearchSelectProps) {
  const [highlightWords, setHighlightWords] = useState<string[]>([]);
  const SelectValue = useRef<{ value: string; label: string }>({
    value: "",
    label: "",
  });

  const { selectProps } = useSelect({
    resource: tableOptions.table,
    pagination: { mode: "off" },
    // @ts-expect-error，111
    optionLabel: tableOptions.optionLabel,
    sorters: [
      {
        field: "created",
        order: "desc",
      },
    ],
  });

  // ✅ useMemo 避免 options 每次都重建
  // const finalOptions = useMemo(() => {
  //   if (options) return options;
  //   if (rawWorkers?.data) {
  //     return rawWorkers.data.map((w) => ({
  //       label: w.name,
  //       value: w.id,
  //     }));
  //   }
  //   return [];
  // }, [options, rawWorkers]);

  /** 判断输入是否是拼音字母 */
  const isPinyin = (input: string) => /^[a-zA-Z]+$/.test(input);

  /** ✅ 统一的搜索逻辑函数 */
  const handleFilter = useCallback(
    (input: string, option?: { label?: string; value?: string }) => {
      if (!option?.label) return false;
      const label = option.label;

      if (isPinyin(input)) {
        const result = match(label, input);
        if (result) {
          const matchedChars = result.map((idx) => label[idx]);
          setHighlightWords((prev) => [...prev, ...matchedChars]);
          return true;
        }
        return false;
      }

      const lower = input.toLowerCase();
      if (label.toLowerCase().includes(lower)) {
        setHighlightWords([input]);
        return true;
      }
      return false;
    },
    []
  );

  const otherOptions = {}; //可以用于根据条件加入参数

  /** ✅ 高亮渲染函数 */
  const renderOptionLabel = useCallback(
    (option: DefaultOptionType) => {
      const label = option.label as string;

      // if (!highlightWords.length) return <span>{label}</span>;
      if (!highlightWords.length) {
        if (type === "qiandao") {
          return (
            <Space>
              {UnCheckOutNames?.includes(option.data.label) ? (
                <Tag color="red">待下班</Tag>
              ) : (
                <Tag color="green">待上班</Tag>
              )}
              {option.data.label}
            </Space>
          );
        }
        return <span>{label}</span>;
      }

      const regex = new RegExp(`(${highlightWords.join("|")})`, "gi");
      const parts = label.split(regex);
      if (type === "qiandao") {
        return (
          <Space>
            {UnCheckOutNames?.includes(option.data.label) ? (
              <Tag color="red">待下班</Tag>
            ) : (
              <Tag color="green">待上班</Tag>
            )}
            <span>
              {parts.map((part, idx) =>
                regex.test(part) ? (
                  <span key={idx} style={{ color: "#4169E1" }}>
                    {part}
                  </span>
                ) : (
                  <span key={idx}>{part}</span>
                )
              )}
            </span>
          </Space>
        );
      }
      return (
        <span>
          {parts.map((part, idx) =>
            regex.test(part) ? (
              <span key={idx} style={{ color: "#4169E1" }}>
                {part}
              </span>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </span>
      );
    },
    [UnCheckOutNames, highlightWords, type]
  );

  const handleClear = useCallback(() => {
    setHighlightWords([]);
    onClearFn();
  }, [onClearFn]);

  const handleChange = useCallback(
    (value: { value: string; label: string }) => {
      setHighlightWords([]);
      if (!needButton) onChangeFn(value);
      SelectValue.current = value;
    },
    [needButton, onChangeFn]
  );

  return (
    <Space>
      {Laberplaceholder && (
        <span style={{ width: Laberplaceholder ? 100 : 0 }}>
          {Laberplaceholder}
        </span>
      )}
      <Select
        {...selectProps}
        {...otherOptions}
        placeholder={placeholder}
        mode={mode}
        showSearch
        allowClear
        labelInValue
        optionFilterProp="label"
        style={{ width: width }}
        // @ts-expect-error, 111
        filterOption={handleFilter}
        onChange={handleChange} //选择和删除选项触发，输入内容不触发
        onClear={handleClear}
        onBlur={() => setHighlightWords([])}
        // onSelect={() => setHighlightWords([])}
        optionRender={renderOptionLabel}
        onSearch={(value: string) => {
          if (!value) {
            setHighlightWords([]);
            // 内容清空的时候，清空高亮词
          }
        }}
      />
      {needButton && (
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => onChangeFn(SelectValue.current)}
        >
          搜索
        </Button>
      )}
    </Space>
  );
}
