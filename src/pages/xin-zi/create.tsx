import React from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, DatePicker, Select, InputNumber } from "antd";
import dayjs from "dayjs";

export const SalaryTypeCreate = () => {
  const { formProps, saveButtonProps, query } = useForm({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["work_name", "work_type"],
    },
  });
  const Data = query?.data?.data;
  const { selectProps: nameSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
  });
  const { selectProps: TypeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
  });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="工人" name={["work_name"]}>
          <Select {...nameSelectProps} />
        </Form.Item>
        <Form.Item label="工种" name={["work_type"]}>
          <Select {...TypeSelectProps} />
        </Form.Item>
        <Form.Item label="时薪" name={["SalaryNum"]}>
          <InputNumber />
        </Form.Item>
      </Form>
    </Create>
  );
};
