import { Select } from "antd";
import { match } from "pinyin-pro";
import { useRef } from "react";
import { Highlight } from "@mantine/core";
import { DefaultOptionType } from "antd/es/select";
import { useList } from "@refinedev/core";
export default function PySearchSelect({
  onChangeFn,
  options,
  placeholder = "请选择考勤人员",
  onClearFn = () => {},
  mode=undefined,
}: {
  onChangeFn: (value: { value: string; label: string }) => void;
  options: DefaultOptionType[] | null;
  placeholder?: string;
  onClearFn?: () => void;
  mode?: "multiple" | "tags" | undefined;
}) {
  // onChangeFn用于接收选择的选项以做他用
  // options用于提供选项列表,默认是工人列表
  const HighlightWord = useRef<string[]>([]);
  const SelectSearch = (
    input: string,
    option: { label: string; value: string } | undefined
  ) => {
    HighlightWord.current = [input];
    // useEffect(() => {
    //   setHighlightWord([input])
    //   }, [input]);
    // Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks
    // 不使用useEffect会触发Cannot update a component (QianDaoPage) while rendering a different component (Select)
    return option?.label.toLowerCase().indexOf(input.toLowerCase()) !== -1;
  };

  const SelectSearchPingying = (
    input: string,
    option: { label: string; value: string } | undefined
  ) => {
    const code = input[0].charCodeAt(0);
    // 检查是不是拼音
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      if (option && option.label) {
        const matchResult = match(option?.label, input);
        if (matchResult) {
          const hanzi = [];
          for (let i = 0; i < matchResult.length; i++) {
            const first = matchResult[i];
            hanzi.push(option?.label.slice(first, first + 1));
          }
          HighlightWord.current = hanzi;
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return SelectSearch(input, option);
    }
  };
  const { data: raw_workers } = useList({
    resource: __Workers_TableName,
    pagination: { mode: "off" },
  });
  if (options === null && raw_workers && raw_workers.data) {
    options = raw_workers?.data.map((worker) => ({
      label: worker.name,
      value: worker.id,
    }));
  }
  // else{
  //   options = [];
  // }
  return (
    <Select
      placeholder={placeholder}
      mode={mode}
      showSearch
      allowClear
      labelInValue
      optionFilterProp="label"
      style={{ width: 180 }}
      filterOption={(input, option) => {
        return SelectSearchPingying(
          input,
          option as { label: string; value: string }
        );
      }}
      options={options!}
      // onChange={(value) => {
      onChange={(value: { value: string; label: string }) => {
        HighlightWord.current = [];
        onChangeFn(value);
      }}
      onBlur={() => {
        HighlightWord.current = [];
      }}
      onClear={() => {
        HighlightWord.current = [];
        onClearFn();
      }}
      optionRender={(option) => {
        return (
          <Highlight highlight={HighlightWord.current}>
            {option.label as string}
          </Highlight>
        );
      }}
    />
  );
}
