import { Create, SaveButton } from "@refinedev/antd";
import { useCreateMany, useGo, useList, useResourceParams } from "@refinedev/core";
import { Alert, Input } from "antd";
import React, { useCallback } from "react";
import { useBatchCreateForm } from "../useBatchCreateForm";

const CreateWorkType = () => {
  const { resource } = useResourceParams();
  const go = useGo();
  const { result: namelist } = useList({ pagination: { mode: "off" } });

  const { mutate } = useCreateMany({
    resource: resource?.name,
    mutationOptions: {
      onSuccess: (response) => {
        go({
          // @ts-expect-error,111
          to: { resource: resource?.name, action: "list" },
          type: "push",
        });
      },
    },
  });

  // 使用抽离 Hook，label="工作"
  const { inputValue, setInputValue, status, parseValues, alertProps } = useBatchCreateForm(
    namelist?.data || [],
    "工作"
  );

  const handleSave = useCallback(() => {
    mutate({ values: parseValues() });
  }, [parseValues, mutate]);

  return (
    <Create
      footerButtons={() => (
        <SaveButton onClick={handleSave} disabled={status !== "success"} data-testid="save-button">
          保存
        </SaveButton>
      )}
    >
      <Input.TextArea
        data-testid="name-input"
        rows={15}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="请输入批量录入的工作，每行一个"
        className="mt-2 mb-2"
      />

      <Alert
        data-testid="format-requirement-alert"
        message="要求：工作不能为空、不能包含下划线、且不能与已有工作重复，空行、前后空格将被忽略"
        type="info"
        className="mt-2!"
        showIcon
      />

      {/* @ts-expect-error,111 */}
      <Alert className="mt-2!" showIcon {...alertProps} />
    </Create>
  );
};

export default CreateWorkType;
