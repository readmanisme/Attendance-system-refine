import { Button, Flex, Select } from "antd";
import { match } from "pinyin-pro";
import { useState, useCallback, useRef } from "react";
import type { DefaultOptionType } from "antd/es/select";
import { useSelect } from "@refinedev/antd";
import { SearchOutlined } from "@ant-design/icons";
import { brand } from "@/theme/tokens";

/** 单个选项,或 antd 多选模式下的选项数组 */
type SearchValue = { value: string; label: string };

export interface PySearchSelectProps {
  /** antd 原生 onChange 的完整载荷(多选模式为数组;labelInValue 下不会为 null) */
  onChangeFn: (value: SearchValue | SearchValue[]) => void;
  tableOptions?: { table: string; optionLabel: string };
  placeholder?: string;
  labelPlaceholder?: string;
  onClearFn?: () => void;
  mode?: "multiple" | "tags";
  needButton?: boolean;
  width?: number | string;
  disabled?: boolean;
  /** "qiandao" 时接受外部 value 实现受控 */
  type?: string;
  value?: any;
  /** 下拉列表高度；签到页放在页面底部，压低一点让下拉朝下展开，别盖住上面的工时 */
  listHeight?: number;
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
  labelPlaceholder = "搜索工人：",
  onClearFn = () => {},
  mode = undefined,
  needButton = false,
  width = 250,
  disabled = false,
  type = undefined,
  value = undefined,
  listHeight = 180,
}: PySearchSelectProps) {
  // 高亮词集合:拼音模式存匹配到的字符,汉字模式存输入词
  const [highlightWords, setHighlightWords] = useState(new Set<string>());
  const clearHighlight = useCallback(() => setHighlightWords(new Set()), []);
  // needButton 模式下,点击"搜索"按钮才把最后一次选择抛给 onChangeFn
  const SelectValue = useRef<SearchValue | SearchValue[]>({ value: "", label: "" });

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

  const isPinyin = (input: string) => /^[a-zA-Z]+$/.test(input);

  /** 统一的搜索逻辑:返回该选项是否命中,并顺势记录要高亮的词 */
  const handleFilter = useCallback((input: string, option?: DefaultOptionType) => {
    const label = typeof option?.label === "string" ? option.label : undefined;
    if (!label) return false;

    if (isPinyin(input)) {
      const result = match(label, input, { v: true });
      if (result) {
        setHighlightWords((prev) => {
          const newSet = new Set(prev);
          result.forEach((idx) => newSet.add(label[idx]));
          return newSet;
        });
        return true;
      }
      return false;
    }

    const lower = input.toLowerCase();
    if (label.toLowerCase().includes(lower)) {
      setHighlightWords(new Set([input]));
      return true;
    }
    return false;
  }, []);

  /** 高亮渲染:把命中的字符/词染成蓝色。
   * 注意:不能用带 g 标志的同一 regex 连续 test(会因 lastIndex 残留跳过部分匹配)。
   * split 的捕获组返回的就是命中子串,直接做集合判断即可。 */
  const renderOptionLabel = useCallback(
    (option: DefaultOptionType) => {
      const label = option.label as string;
      if (!highlightWords.size) return <span>{label}</span>;

      const parts = label.split(new RegExp(`(${[...highlightWords].join("|")})`));
      return (
        <span>
          {parts.map((part, idx) =>
            highlightWords.has(part) ? (
              <span key={idx} style={{ color: brand.primary }}>
                {part}
              </span>
            ) : (
              <span key={idx}>{part}</span>
            ),
          )}
        </span>
      );
    },
    [highlightWords],
  );

  const handleClear = useCallback(() => {
    clearHighlight();
    onClearFn();
  }, [clearHighlight, onClearFn]);

  const handleChange = useCallback(
    (value: SearchValue | SearchValue[]) => {
      clearHighlight();
      // needButton 的作用是避免即时筛选:点"搜索"按钮才触发 onChangeFn
      if (!needButton) onChangeFn(value);
      SelectValue.current = value;
    },
    [needButton, onChangeFn, clearHighlight],
  );

  return (
    <Flex gap="small" align="center" style={{ width: "100%" }}>
      {labelPlaceholder && <div>{labelPlaceholder}</div>}
      <Select
        data-testid="py-search-select"
        {...selectProps}
        {...(type === "qiandao" ? { value } : {})}
        placeholder={placeholder}
        mode={mode}
        showSearch
        allowClear
        disabled={disabled}
        labelInValue
        optionFilterProp="label"
        style={{ width: width }}
        listHeight={listHeight}
        filterOption={handleFilter}
        onChange={handleChange} //选择和删除选项触发
        onClear={handleClear}
        onBlur={clearHighlight}
        optionRender={renderOptionLabel}
        // 每次输入变化时重置高亮,由 handleFilter 在本轮过滤中重新累积
        onSearch={() => setHighlightWords(new Set())}
      />
      {needButton && (
        <Button
          data-testid="py-search-button"
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => onChangeFn(SelectValue.current)}
        >
          搜索
        </Button>
      )}
    </Flex>
  );
}
