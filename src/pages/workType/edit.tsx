import { Edit, SaveButton, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Form, Input, Space } from "antd";
import React from "react";

export const EditWorkType = () => {
  const { formProps, saveButtonProps } = useForm();
  const [InputValue, setInputValue] = React.useState("");
  const [IsError, setIsError] = React.useState(true);
  const { data: namelist } = useList({
    pagination: {
      mode: "off",
    },
  });
  const get_alert = () => {
    if (InputValue.trim() === "") {
      setIsError(true);
      return <Alert message="工作不能为空" type="error" showIcon />;
    } else if (InputValue.includes("_")) {
      setIsError(true);
      return <Alert message="工作不能包含下划线" type="error" showIcon />;
    } else if (namelist?.data.some((item) => item.name === InputValue)) {
      setIsError(true);
      return <Alert message="工作已存在" type="error" showIcon />;
    } else {
      setIsError(false);
    }
  };
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={IsError} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Id"
          name={["id"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input readOnly disabled />
        </Form.Item>
        <Form.Item
          label="工作名称"
          name={["name"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input onChange={(e) => setInputValue(e.target.value)} />
        </Form.Item>
        <Space direction="vertical" className="w-full">
          <Alert
            message="工作名称不能为空，也不能重复,也不能有下划线"
            type="info"
          />
          {get_alert()}
        </Space>
      </Form>
    </Edit>
  );
};
