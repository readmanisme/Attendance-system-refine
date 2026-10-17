import { Create, SaveButton } from "@refinedev/antd";
import { useCreateMany, useGo, useList, useResourceParams } from "@refinedev/core";
import { Alert, Input } from "antd";
import React, { useCallback, useState } from "react";
import { useBatchCreateForm } from "../useBatchCreateForm";

const CreateWorkType = () => {
  const { resource } = useResourceParams();
  const go = useGo();
  const { result: namelist } = useList({ pagination: { mode: "off" } });

  const { mutateAsync } = useCreateMany({
    resource: resource?.name,
  });

  // 是否正在提交:防止保存中重复点击/双击
  const [isSaving, setIsSaving] = useState(false);
  const resourceName = resource?.name;

  // 使用抽离 Hook，label="工作"
  const { inputValue, setInputValue, status, parseValues, alertProps } = useBatchCreateForm(
    namelist?.data || [],
    "工作",
  );

  const handleSave = useCallback(async () => {
    const values = parseValues();
    if (!values.length || isSaving) return;
    setIsSaving(true);
    try {
      await mutateAsync({ values });
      go({
        // @ts-expect-error,111
        to: { resource: resourceName, action: "list" },
        type: "push",
      });
    } catch {
      // 失败:refine 已弹出错误通知,输入保留在页面上,用户可直接重试
    } finally {
      setIsSaving(false);
    }
  }, [mutateAsync, parseValues, go, resourceName, isSaving]);

  return (
    <Create
      footerButtons={() => (
        <SaveButton
          onClick={handleSave}
          disabled={status !== "success" || isSaving}
          loading={isSaving}
          data-testid="save-button"
        >
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
