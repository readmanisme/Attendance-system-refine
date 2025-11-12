import { Edit, SaveButton, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Form, Input, Space } from "antd";
import React from "react";

export const WorkersEdit = () => {
  const { formProps, saveButtonProps, form } = useForm();
  const { result: namelist } = useList({
    pagination: {
      mode: "off",
    },
  });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 实时监听 name 字段变化
  const nameValue = Form.useWatch("name", form);

  React.useEffect(() => {
    if (!nameValue || nameValue.trim() === "") {
      setErrorMsg("姓名不能为空");
    } else if (nameValue.includes("_")) {
      setErrorMsg("姓名不能包含下划线");
    } else if (nameValue !== nameValue.trim()) {
      setErrorMsg("姓名不能包含前后空格");
    } else if (namelist?.data?.some((item) => item.name === nameValue)) {
      setErrorMsg("姓名已存在，若不想继续编辑可返回");
    } else {
      setErrorMsg(null);
    }
  }, [nameValue, namelist]);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={!!errorMsg} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item label="Id" name="id" rules={[{ required: true }]}>
          <Input readOnly disabled />
        </Form.Item>

        <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Space direction="vertical" className="w-full">
          <Alert
            message="姓名名称不能为空、不能重复、也不能包含下划线，前后空格会被忽略"
            type="info"
            showIcon
          />
          {errorMsg && <Alert message={errorMsg} type="error" showIcon />}
        </Space>
      </Form>
    </Edit>
  );
};
