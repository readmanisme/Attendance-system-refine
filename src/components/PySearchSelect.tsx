import { Button, Flex, Select, Space, Tag } from "antd";
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
  width?: number | string;
  disabeld?: boolean;
  type?: string;
  value?: any;
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
  width = 250,
  disabeld = false,
  type = undefined,
  value = undefined,
}: PySearchSelectProps) {
  // 保持 Set<string> 的定义
  const [highlightWords, setHighlightWords] = useState(new Set<string>());
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

  /** 判断输入是否是拼音字母 */
  const isPinyin = (input: string) => /^[a-zA-Z]+$/.test(input);
  // console.log(highlightWords);
  /** ✅ 统一的搜索逻辑函数 */
  const handleFilter = useCallback((input: string, option?: { label?: string; value?: string }) => {
    if (!option?.label) return false;
    const label = option.label;

    if (isPinyin(input)) {
      const result = match(label, input, { v: true });
      if (result) {
        const matchedChars = result.map((idx) => label[idx]);
        
        // 🚨 修改点 1: 将匹配到的字符添加到 Set 中，而不是合并数组
        setHighlightWords((prev) => {
          const newSet = new Set(prev);
          matchedChars.forEach(char => newSet.add(char));
          return newSet;
        });
        
        return true;
      }
      return false;
    }

    const lower = input.toLowerCase();
    if (label.toLowerCase().includes(lower)) {
      // 🚨 修改点 2: 将输入内容设置为新的 Set
      setHighlightWords(new Set([input]));
      return true;
    }
    return false;
  }, []);

  const otherOptions: any = {}; //可以用于根据条件加入参数
  if (type === "qiandao") {
    otherOptions.value = value;
  }

  /** ✅ 高亮渲染函数 */
  const renderOptionLabel = useCallback(
    (option: DefaultOptionType) => {
      const label = option.label as string;

      // 🚨 修改点 3: 检查 Set 是否为空，使用 highlightWords.size
      if (!highlightWords.size) return <span>{label}</span>;

      // 将 Set 转换回数组以进行 join 操作用于创建正则表达式
      const highlightArray = Array.from(highlightWords);
      
      const regex = new RegExp(`(${highlightArray.join("|")})`, "gi");
      const parts = label.split(regex);
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
    [highlightWords]
  );

  const handleClear = useCallback(() => {
    // 🚨 修改点 4: 清空 Set
    setHighlightWords(new Set());
    onClearFn();
  }, [onClearFn]);

  const handleChange = useCallback(
    (value: { value: string; label: string }) => {
      // 🚨 修改点 5: 清空 Set
      setHighlightWords(new Set());
      if (!needButton) onChangeFn(value); //needButton的作用是避免即时筛选
      SelectValue.current = value;
    },
    [needButton, onChangeFn]
  );

  return (
    <Flex gap="small" align="center">
      {Laberplaceholder && <div>{Laberplaceholder}</div>}
      <Select
        // classNames={{
        // 	 root: "my-classname",
        // }}
        data-testid="py-search-select"
        {...selectProps}
        {...otherOptions}
        placeholder={placeholder}
        mode={mode}
        showSearch
        allowClear
        disabled={disabeld}
        labelInValue
        optionFilterProp="label"
        // style={{ width: '100%' }}
        style={{ width: width }}
        // className="w-full!"
        // classNames={{
        // 	 "root":"w-full!"
        // }}
        filterOption={handleFilter}
        onChange={handleChange} //选择和删除选项触发，输入内容不触发
        onClear={handleClear}
        onBlur={() => setHighlightWords(new Set())} // 🚨 修改点 6: 清空 Set
        // onSelect={() => setHighlightWords([])}
        optionRender={renderOptionLabel}
        onSearch={(value: string) => {
          // 输入内容的时候，高亮词重置
          setHighlightWords(new Set()); // 🚨 修改点 7: 清空 Set
          if (!value) {
            setHighlightWords(new Set()); // 🚨 修改点 8: 清空 Set
            // 内容清空的时候，清空高亮词
          }
        }}
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