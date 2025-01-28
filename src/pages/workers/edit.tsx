import { Edit, SaveButton, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Form, Input, Space } from "antd";
import { useState } from "react";

export const WorkersEdit = () => {
  const { formProps, saveButtonProps } = useForm({});
  const [Inputvalue, setInputValue] = useState("");
  const [IsError, setIsError] = useState(true);
  const { data: namelist } = useList({
    pagination: {
      mode: "off",
    },
  });
  const get_alert = () => {
    if (Inputvalue.trim() === "") {
      setIsError(true);
      return <Alert message="姓名不能为空" type="error" showIcon />;
    } else if (Inputvalue.includes("_")) {
      setIsError(true);
      return <Alert message="姓名不能包含下划线" type="error" showIcon />;
    } else if (namelist?.data.some((item) => item.name === Inputvalue)) {
      setIsError(true);
      return <Alert message="姓名已存在" type="error" showIcon />;
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
          label={"姓名"}
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
          <Alert message="要求：姓名不能为空, 不能包含下划线, 且不能与已有姓名重复" />
          {get_alert()}
        </Space>
      </Form>
    </Edit>
  );
};
