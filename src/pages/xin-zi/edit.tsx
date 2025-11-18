import { Edit, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, InputNumber, Alert } from "antd";

const SalaryTypeEdit = () => {
  const { formProps, saveButtonProps, form } = useForm({
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const salaryNum_init = formProps.initialValues?.SalaryNum;
  const { selectProps: nameSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  const { selectProps: typeSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  const salaryNum = Form.useWatch("SalaryNum", form);
  const isError = salaryNum === salaryNum_init;
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton data-testid="save-button" {...saveButtonProps} disabled={isError} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item label="Id" name={["id"]} rules={[{ required: true }]}>
          <Input readOnly disabled data-testid="id-input" />
        </Form.Item>

        <Form.Item label="工人" name={["worker_name"]}>
          <Select
            data-testid="worker-select"
            {...nameSelectProps}
            allowClear
            // onChange={setWorkerName}
            disabled
          />
        </Form.Item>

        <Form.Item label="工种" name={["work_type"]}>
          <Select
            data-testid="work-select"
            {...typeSelectProps}
            allowClear
            // onChange={setWorkType}
            disabled
          />
        </Form.Item>

        <Form.Item label="时薪" name={["SalaryNum"]} rules={[{ required: true }]}>
          <InputNumber min={0} changeOnWheel data-testid="salary-input" />
        </Form.Item>
        {isError && (
          <Alert
            data-testid="no-change-alert"
            message="时薪未修改，不想修改可以返回"
            type="warning"
            showIcon
          />
        )}
        <Alert
          data-testid="warning-alert"
          className="mt-2!"
          message="只可修改时薪,要修改工人或工种请删除后重新创建；注意修改时薪会导致以前的所有考勤记录的工资重新计算"
          type="warning"
          showIcon
        />
      </Form>
    </Edit>
  );
};
export default SalaryTypeEdit;
