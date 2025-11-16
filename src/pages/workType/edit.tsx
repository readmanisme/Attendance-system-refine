import { Edit, SaveButton, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Form, Input, Space } from "antd";
import React, { useCallback, useMemo } from "react";

const EditWorkType: React.FC = () => {
  const { formProps, saveButtonProps, form } = useForm();
  const { result: namelist } = useList({
    pagination: { mode: "off" },
  });

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 实时监听 name 字段变化
  const nameValue = Form.useWatch("name", form);
  const specialChars = useMemo(() => /[./\\|"'`<>:?*%$]/, []);
  React.useEffect(() => {
    if (!nameValue || nameValue.trim() === "") {
      setErrorMsg("工作不能为空");
    } else if (nameValue.includes("_")) {
      setErrorMsg("工作不能包含下划线");
    } else if (specialChars.test(nameValue)) {
      setErrorMsg("工作不能包含特殊字符");
    } else if (namelist?.data?.some((item) => item.name === nameValue.trim())) {
      setErrorMsg("工作已存在，若不想继续编辑可返回");
    } else {
      setErrorMsg(null);
    }
  }, [nameValue, namelist?.data, specialChars]);
  const handleOnFinish = useCallback(
    (values: any) => {
      if (formProps.onFinish) {
        formProps.onFinish(values.trim());
      }
    },
    [formProps]
  );
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={!!errorMsg} data-testid="save-button" />
      )}
    >
      <Form {...formProps} layout="vertical" onFinish={handleOnFinish}>
        <Form.Item label="Id" name="id" rules={[{ required: true }]}>
          <Input readOnly disabled data-testid="id-input" />
        </Form.Item>

        <Form.Item label="工作名称" name="name" rules={[{ required: true }]}>
          <Input placeholder="请输入工作名称" data-testid="name-input" />
        </Form.Item>

        <Space direction="vertical" className="w-full">
          <Alert
            data-testid="format-requirement-alert"
            message="工作名称不能为空、不能重复、也不能包含下划线，前后空格会被忽略"
            type="info"
            showIcon
          />
          {errorMsg && <Alert data-testid="error-alert" message={errorMsg} type="error" showIcon />}
        </Space>
      </Form>
    </Edit>
  );
};
export default EditWorkType;
