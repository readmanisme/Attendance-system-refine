import { Edit, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";

export const AttendanceRecordEdit = () => {
  const { formProps, saveButtonProps,query,formLoading } = useForm({});
  const recordData = query?.data?.data;
  const { selectProps: nameSelectProps } = useSelect({
    resource: "workers_test",
    optionLabel: "name",
    defaultValue: recordData?.worker_id,
    queryOptions:{
      enabled:!!recordData?.worker_id,
    }
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
          getValueProps={(value) => ({ value: value ? dayjs.utc(value) : "", })}
          rules={[
            {
              // required: true,
            },
          ]}
        >
          <DatePicker
            showTime
          />
        </Form.Item>
        <Form.Item
          label={"签出时间"}
          name={["check_out"]}
          getValueProps={(value) => ({ value: value ? dayjs.utc(value) : "", })}
          rules={[
            {
              // required: true,
            },
          ]}
        >
          <DatePicker
            showTime
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
