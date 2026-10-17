import { Edit, ListButton, TextField, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, Select } from "antd";
import dayjs from "dayjs";
import WorkMinutesInput from "@/components/WorkMinutesInput";

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
  // work_minutes 在库里就是整数分钟，直接用小时+分钟双框编辑（20 分钟填 0 时 20 分即可）
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      isLoading={formLoading}
      headerButtons={({ listButtonProps }) => (
        <>{listButtonProps && <ListButton {...listButtonProps} meta={{ foo: "bar" }} />}</>
      )}
    >
      <Form {...formProps} layout="vertical">
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
          label="工时(小时 + 分钟)"
          name="work_minutes"
        >
          <WorkMinutesInput />
        </Form.Item>
      </Form>
    </Edit>
  );
};
export default AttendanceRecordEdit;
