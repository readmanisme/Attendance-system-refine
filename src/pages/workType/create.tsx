import React, { useCallback, useMemo, useState } from "react";
import { Create, SaveButton, useForm } from "@refinedev/antd";
import { Alert, Form, Input, Space, Tag } from "antd";
import { useCreateMany, useGo, useList, useResourceParams } from "@refinedev/core";

export const CreateWorkType = () => {
  const [IsError, setIsError] = React.useState(true);
  const { resource } = useResourceParams();
  const go = useGo();
  const { result: namelist } = useList({
    pagination: {
      mode: "off",
    },
  });
  const { mutate } = useCreateMany({
    resource: resource?.name,
    successNotification(_data, _values, resource) {
      go({
        to: { resource: resource!, action: "list" },
        type: "push",
      });
      return {
        message: `Successfully created ${resource}`,
        description: "Success",
        type: "success",
      };
    },
    errorNotification(error, _variables, resource) {
      return {
        message: `There was an error creating ${resource}(status code: ${error?.statusCode})`,
        description: "Failed to create record",
        type: "error",
      };
    },
  });
  const [inputValue, setInputValue] = useState("");
  const existingNames = useMemo(
    () => new Set(namelist?.data.map((i) => i.name) || []),
    [namelist]
  );

  const validateNames = useCallback(
    (value: string) => {
      const names = value
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      if (names.length === 0) return { status: "unknown", error: "" };

      if (names.some((n) => n.includes("_"))) {
        return {
          status: "error",
          error: (
            <span>
              以下姓名包含下划线：
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

      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      const existings = names.filter((n) => existingNames.has(n));
      const conflictNames = [...new Set([...duplicates, ...existings])];

      if (conflictNames.length > 0) {
        return {
          status: "error",
          error: (
            <span>
              以下姓名重复或已存在：
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
    [existingNames]
  );
  const { status, error } = useMemo(
    () => validateNames(inputValue),
    [inputValue, validateNames]
  );
  const handleSave = useCallback(() => {
    const names = inputValue
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    mutate({ values: names });
  }, [inputValue, mutate]);

  const alertProps = useMemo(() => {
    switch (status) {
      case "success":
        return {
          message: "校验通过",
          description: "数据校验通过，可以提交",
          type: "success",
        };
      case "error":
        return {
          message: "校验不通过",
          description: error,
          type: "error",
        };
      default:
        return {
          message: "未知",
          description: "请输入数据进行检查；",
          type: "info",
        };
    }
  }, [status, error]);

  return (
    <Create
      footerButtons={() => (
        <SaveButton onClick={handleSave} disabled={status !== "success"}>
          保存
        </SaveButton>
      )}
    >
      <Input.TextArea
        rows={15}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="请输入批量录入的工作，每行一个"
        className="mt-2 mb-2"
      />

      <Alert
        className="mt-2!"
        message="要求：工作不能为空、不能包含下划线、且不能与已有工作重复, 空行、前后空格将被忽略"
        type="info"
        showIcon
      />
      {/* @ts-expect-error, 111 */}
      <Alert className="mt-2!" showIcon {...alertProps} />
    </Create>
  );
};
