import { Edit, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";

export const AttendanceRecordEdit = () => {
  const { formProps, saveButtonProps, query, formLoading } = useForm({});
  const recordData = query?.data?.data;
  const { selectProps: nameSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
    defaultValue: recordData?.worker_id,
    queryOptions: {
      enabled: !!recordData?.worker_id,
    },
  });
  const { selectProps: workSelectProps } = useSelect({
    resource: __WorkTypes_TableName,
    optionLabel: "name",
  });
  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={formLoading}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label={"人员ID"}
          name={["worker_id"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...nameSelectProps} />
        </Form.Item>
        <Form.Item
          label={"签到时间"}
          name={["check_in"]}
          getValueProps={(value) => ({ value: value ? dayjs(value) : "" })}
          // rules={[
          //   {
          // required: true,
          //   },
          // ]}
        >
          <DatePicker showTime />
        </Form.Item>
        <Form.Item
          label={"工作类型"}
          name={["work"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...workSelectProps} allowClear />
        </Form.Item>
        <Form.Item
          label={"签出时间"}
          name={["check_out"]}
          getValueProps={(value) => ({ value: value ? dayjs(value) : "" })}
          // rules={[
          //   {
          // required: true,
          //   },
          // ]}
        >
          <DatePicker showTime />
        </Form.Item>
      </Form>
    </Edit>
  );
};
