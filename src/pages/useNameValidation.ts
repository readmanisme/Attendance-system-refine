// useNameValidation.ts
import { useList } from "@refinedev/core";
import { Form } from "antd";
import { useMemo } from "react";

interface UseNameValidationProps {
  form: any;
  label: string; // 例如 “姓名” 或 “工作”
}

export const useNameValidation = ({ form, label }: UseNameValidationProps) => {
  const { result: namelist } = useList({
    pagination: { mode: "off" },
  });

  const nameValue = Form.useWatch("name", form);
  const specialChars = useMemo(() => /[./\\|"'`<>:?*%$]/, []);

  const errorMsg = useMemo(() => {
    const trimmed = nameValue?.trim();

    if (!trimmed) {
      return `${label}不能为空`;
    } else if (trimmed.includes("_")) {
      return `${label}不能包含下划线`;
    } else if (specialChars.test(trimmed)) {
      return `${label}不能包含特殊字符`;
    } else if (namelist?.data?.some((item) => item.name === trimmed)) {
      return `${label}已存在，若不想继续编辑可返回`;
    } else {
      return null;
    }
  }, [nameValue, namelist?.data, specialChars, label]);

  return { errorMsg };
};
