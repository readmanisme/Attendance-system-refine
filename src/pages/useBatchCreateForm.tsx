import { useCallback, useMemo, useState } from "react";
import { Tag } from "antd";

/**
 * 通用批量创建输入校验 Hook
 */
export function useBatchCreateForm(namelist: any[], label: string) {
  const [inputValue, setInputValue] = useState("");

  /** 已存在集合 */
  const existingNames = useMemo(
    () => new Set(namelist?.map((i) => i.name) || []),
    [namelist]
  );

  const specialChars = useMemo(() => /[./\\|"'`<>:?*%$]/, []);

  /** 校验输入 */
  const validateNames = useCallback(
    (value: string) => {
      const names = value
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      if (names.length === 0) return { status: "unknown", error: "" };

      // 下划线
      if (names.some((n) => n.includes("_"))) {
        return {
          status: "error",
          error: (
            <span>
              以下{label}包含下划线：
              {names
                .filter((n) => n.includes("_"))
                .map((n, i) => (
                  <Tag color="red" key={i}>
                    {n}
                  </Tag>
                ))}
            </span>
          ),
        };
      }

      // 特殊字符
      if (names.some((n) => specialChars.test(n))) {
        return {
          status: "error",
          error: (
            <span>
              以下{label}包含特殊字符：
              {names
                .filter((n) => specialChars.test(n))
                .map((n, i) => (
                  <Tag color="red" key={i}>
                    {n}
                  </Tag>
                ))}
            </span>
          ),
        };
      }

      // 重复 & 已存在
      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      const existings = names.filter((n) => existingNames.has(n));
      const conflictNames = [...new Set([...duplicates, ...existings])];

      if (conflictNames.length > 0) {
        return {
          status: "error",
          error: (
            <span>
              以下{label}重复或已存在：
              {conflictNames.map((n, i) => (
                <Tag color="red" key={i}>
                  {n}
                </Tag>
              ))}
            </span>
          ),
        };
      }

      return { status: "success", error: "" };
    },
    [existingNames, specialChars, label]
  );

  const { status, error } = useMemo(
    () => validateNames(inputValue),
    [inputValue, validateNames]
  );

  /** 提交格式化 */
  const parseValues = () =>
    inputValue
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

  /** 提示框配置 */
  const alertProps = useMemo(() => {
    switch (status) {
      case "success":
        return {
          "data-testid": "success-alert",
          message: "校验通过",
          description: "数据校验通过，可以提交",
          type: "success",
        };
      case "error":
        return {
          "data-testid": "error-alert",
          message: "校验不通过",
          description: error,
          type: "error",
        };
      default:
        return {
          "data-testid": "unknown-alert",
          message: "未知",
          description: "请输入数据进行检查；",
          type: "info",
        };
    }
  }, [status, error]);

  return {
    inputValue,
    setInputValue,
    status,
    error,
    parseValues,
    alertProps,
  };
}