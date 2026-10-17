import { Edit, ListButton, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, InputNumber, Alert } from "antd";

const SalaryTypeEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
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

  // 时薪未修改时直接保存也无害(等于原值的更新),不再禁用按钮/弹出警告,
  // 避免用户一打开编辑页就看到"时薪未修改"的错误观感。
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ listButtonProps }) => (
        <>{listButtonProps && <ListButton {...listButtonProps} meta={{ foo: "bar" }} />}</>
      )}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton data-testid="save-button" {...saveButtonProps} />
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
