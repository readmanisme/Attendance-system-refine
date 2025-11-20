// useNameValidation.ts
import { useList } from "@refinedev/core";
import { Form } from "antd";
import React, { useMemo } from "react";

interface UseNameValidationProps {
  form: any;
  label: string; // 例如 “姓名” 或 “工作”
}

export const useNameValidation = ({ form, label }: UseNameValidationProps) => {
  const { result: namelist } = useList({
    pagination: { mode: "off" },
  });

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const nameValue = Form.useWatch("name", form);
  const specialChars = useMemo(() => /[./\\|"'`<>:?*%$]/, []);

  React.useEffect(() => {
    const trimmed = nameValue?.trim();

    if (!trimmed) {
      setErrorMsg(`${label}不能为空`);
    } else if (trimmed.includes("_")) {
      setErrorMsg(`${label}不能包含下划线`);
    } else if (specialChars.test(trimmed)) {
      setErrorMsg(`${label}不能包含特殊字符`);
    } else if (namelist?.data?.some((item) => item.name === trimmed)) {
      setErrorMsg(`${label}已存在，若不想继续编辑可返回`);
    } else {
      setErrorMsg(null);
    }
  }, [nameValue, namelist?.data, specialChars, label]);

  return { errorMsg };
};
