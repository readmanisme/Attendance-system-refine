import { Create, SaveButton } from "@refinedev/antd";
import { useCreateMany, useGo, useList, useResourceParams } from "@refinedev/core";
import { Alert, Input } from "antd";
import React, { useCallback } from "react";
import { useBatchCreateForm } from "../useBatchCreateForm";

const WorkersCreate: React.FC = () => {
  const { resource } = useResourceParams();
  const go = useGo();

  const { result: namelist } = useList({ pagination: { mode: "off" } });

  const { mutate } = useCreateMany({
    resource: resource?.name,
  });

  // 使用抽离的 Hook，label="姓名"
  const { inputValue, setInputValue, status, parseValues, alertProps } = useBatchCreateForm(
    namelist?.data || [],
    "姓名"
  );

  const handleSave = useCallback(() => {
    mutate(
      { values: parseValues() },
      {
        onSuccess: (response) => {
          go({
            // @ts-expect-error,111
            to: { resource: resource?.name, action: "list" },
            type: "push",
          });
        },
      }
    );
  }, [mutate, parseValues, go, resource?.name]);

  return (
    <Create
      footerButtons={() => (
        <SaveButton data-testid="save-button" onClick={handleSave} disabled={status !== "success"}>
          保存
        </SaveButton>
      )}
    >
      <Alert
        data-testid="leave-alert"
        message="离开页面不保留数据，请自行保存数据。推荐在别处准备好数据，复制粘贴到此处。"
        type="warning"
        className="mb-2!"
        showIcon
      />
      <Input.TextArea
        data-testid="name-input"
        rows={15}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="请输入批量录入的姓名，每行一个"
        className="mt-2 mb-2"
      />

      <Alert
        data-testid="format-requirement-alert"
        message="要求：姓名不能为空、不能包含下划线、且不能与已有姓名重复，空行、前后空格将被忽略"
        type="info"
        className="mt-2!"
        showIcon
      />

      {/* @ts-expect-error,1111 */}
      <Alert className="mt-2!" showIcon {...alertProps} />
    </Create>
  );
};

export default WorkersCreate;
