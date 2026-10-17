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
  // 当前编辑记录的 id(编辑页 Form 里有 id 字段),重名校验时排除自己
  const currentId = Form.useWatch("id", form);
  const specialChars = useMemo(() => /[./\\|"'`<>:?*%$]/, []);

  const errorMsg = useMemo(() => {
    const trimmed = nameValue?.trim();

    if (!trimmed) {
      return `${label}不能为空`;
    } else if (trimmed.includes("_")) {
      return `${label}不能包含下划线`;
    } else if (specialChars.test(trimmed)) {
      return `${label}不能包含特殊字符`;
    } else if (
      namelist?.data?.some((item) => item.name === trimmed && String(item.id) !== String(currentId))
    ) {
      return `${label}已存在，若不想继续编辑可返回`;
    } else {
      return null;
    }
  }, [nameValue, currentId, namelist?.data, specialChars, label]);

  return { errorMsg };
};
