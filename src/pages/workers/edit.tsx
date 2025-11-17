import { Edit, SaveButton, useForm } from "@refinedev/antd";
import { Alert, Form, Input, Space } from "antd";
import React, { useCallback } from "react";
import { useNameValidation } from "../useNameValidation";

const WorkersEdit = () => {
  const { formProps, saveButtonProps, form } = useForm();

  const { errorMsg } = useNameValidation({
    form,
    label: "姓名",
  });

  const handleOnFinish = useCallback(
    (values: any) => {
      formProps.onFinish?.({id: values.id, name: values.name.trim()});
    },
    [formProps]
  );

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton
          {...saveButtonProps}
          disabled={!!errorMsg}
          data-testid="save-button"
        />
      )}
    >
      <Form {...formProps} layout="vertical" onFinish={handleOnFinish}>
        <Form.Item label="Id" name="id" rules={[{ required: true }]}>
          <Input readOnly disabled data-testid="id-input" />
        </Form.Item>

        <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
          <Input placeholder="请输入姓名" data-testid="name-input" />
        </Form.Item>

        <Space direction="vertical" className="w-full">
          <Alert
            data-testid="format-requirement-alert"
            message="姓名名称不能为空、不能重复、也不能包含下划线，前后空格会被忽略"
            type="info"
            showIcon
          />

          {errorMsg && (
            <Alert
              data-testid="error-alert"
              message={errorMsg}
              type="error"
              showIcon
            />
          )}
        </Space>
      </Form>
    </Edit>
  );
};

export default WorkersEdit;
