import { Edit, ListButton, TextField, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, InputNumber, Select } from "antd";
import dayjs from "dayjs";

const AttendanceRecordEdit = () => {
  const { formProps, saveButtonProps, formLoading } = useForm({
    meta: { expand: ["worker_id"] },
  });

  const { selectProps: workSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  // work_date 在库里是 "YYYY-MM-DD" 文本，用 getValueProps/normalize 转换
  // work_minutes 在库里是整数分钟，界面上按小时编辑（可精确到分钟，如1/3小时）
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      isLoading={formLoading}
      headerButtons={({ listButtonProps }) => (
        <>{listButtonProps && <ListButton {...listButtonProps} meta={{ foo: "bar" }} />}</>
      )}
    >
      <Form {...formProps} layout="vertical" form={form}>
        <Form.Item label="人员姓名" name={["expand", "worker_id", "name"]}>
          {/* @ts-expect-error,111 */}
          <TextField data-testid="worker-name" />
        </Form.Item>

        <Form.Item
          label="日期"
          name="work_date"
          getValueProps={(value: any) => ({ value: value ? dayjs(value) : null })}
          normalize={(value: any) => (value ? value.format("YYYY-MM-DD") : value)}
          rules={[{ required: true, message: "请选择日期" }]}
        >
          <DatePicker data-testid="work-date" allowClear={false} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item
          label="工作类型"
          name="work"
          rules={[{ required: true, message: "请选择工作类型" }]}
        >
          <Select data-testid="work-type" {...workSelectProps} allowClear style={{ width: 200 }} />
        </Form.Item>

        <Form.Item
          label="工时(小时，可精确到分钟如0.3333)"
          name="work_minutes"
          getValueProps={(value: any) => ({
            value: value == null ? undefined : value / 60,
          })}
          normalize={(value: any) => (value == null ? undefined : Math.round(value * 60))}
        >
          <InputNumber
            min={0}
            max={24}
            step={0.5}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
export default AttendanceRecordEdit;
