import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Select, InputNumber } from "antd";

export const SalaryTypeCreate = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
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
        <Form.Item label="工人" name={["worker_name"]}>
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
