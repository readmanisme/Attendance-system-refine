import { Edit, TextField, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, InputNumber, Select, message } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";

 const AttendanceRecordEdit = () => {
  const { formProps, saveButtonProps, formLoading, form } = useForm({
    meta: { expand: ["worker_id"] },
  });

  const { selectProps: workSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
    pagination: { mode: "off" },
  });

  const check_in = Form.useWatch("check_in", form);
  const check_out = Form.useWatch("check_out", form);

  // 🔹 只在依赖项变化时更新工时，避免死循环渲染
  useEffect(() => {
    if (check_in && check_out) {
      const start = dayjs(check_in);
      const end = dayjs(check_out);

      // 保证在同一天
      if (!start.isSame(end, "day")) {
        const newEnd = start.hour(end.hour()).minute(end.minute());
        form.setFieldValue("check_out", newEnd);
        message.warning("签到和签出时间必须在同一天，已自动调整日期。");
        return;
      }

      // 保证签到时间早于签出时间
      if (end.isBefore(start)) {
        const adjusted = start.add(1, "hour");
        form.setFieldValue("check_out", adjusted);
        message.warning("签出时间必须晚于签到时间，已自动调整。");
        return;
      }

      const hours = end.diff(start, "hour", true);
      form.setFieldValue("workTime", parseFloat(hours.toFixed(2)));
    }
  }, [check_in, check_out, form]);

  // 🔹 限制只能选择与签到日期相同的日期
  const disabledDate = (current: any) => {
    if (!check_in) return false;
    return !dayjs(current).isSame(dayjs(check_in), "day");
  };

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={formLoading}>
      <Form {...formProps} layout="vertical" form={form}>
        <Form.Item label="人员姓名" name={["expand", "worker_id", "name"]}>
          {/* @ts-expect-error,111 */}
          <TextField />
        </Form.Item>

        <Form.Item
          label="签到时间"
          name="check_in"
          getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
          rules={[{ required: true, message: "请选择签到时间" }]}
        >
          <DatePicker
            showTime
            allowClear={false}
            format="YYYY-MM-DD HH:mm"
            onChange={(value) => {
              const out = form.getFieldValue("check_out");
              // @ts-expect-error,111
              if (out && !dayjs(value).isSame(out, "day")) {
                form.setFieldValue("check_out", value.add(1, "hour"));
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label="工作类型"
          name="work"
          rules={[{ required: true, message: "请选择工作类型" }]}
        >
          <Select {...workSelectProps} allowClear />
        </Form.Item>

        <Form.Item
          label="签出时间"
          name="check_out"
          getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
          rules={[{ required: true, message: "请选择签出时间" }]}
        >
          <DatePicker
            showTime
            allowClear={false}
            format="YYYY-MM-DD HH:mm"
            disabledDate={disabledDate}
          />
        </Form.Item>

        <Form.Item label="工时" name="workTime">
          <InputNumber disabled step={0.5} changeOnWheel />
        </Form.Item>
      </Form>
    </Edit>
  );
};
export default AttendanceRecordEdit;