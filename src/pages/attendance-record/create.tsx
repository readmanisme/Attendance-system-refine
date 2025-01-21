import { Create, CreateButton, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, Input, Select } from "antd";

export const AttendanceRecordCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { selectProps: nameSelectProps } = useSelect({
    resource: __Workers_TableName,
    optionLabel: "name",
  });
  // console.log("nameSelectProps", nameSelectProps);
  return (
    <Create saveButtonProps={saveButtonProps} >
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
        {/* <Form.Item
          label={"日期"}
          name={["date"]}
          // rules={[
          //   {
              required: true,
          //   },
          // ]}
        >
          <Input />
        </Form.Item> */}
        <Form.Item
          label={"签到时间"}
          name={["check_in"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <DatePicker
            showTime
            onChange={(value, dateString) => {
              // console.log('Selected Time: ', value);
              // console.log('Formatted Selected Time: ', dateString);
            }}
            onOk={(value) => {
              // console.log('onOk: ', value);
            }}
          />
        </Form.Item>
        <Form.Item
          label={"签出时间"}
          name={["check_out"]}
          // rules={[
          //   {
          //     required: true,
          //   },
          // ]}
        >
          <DatePicker
            showTime
            onChange={(value, dateString) => {
              // console.log('Selected Time: ', value);
              // console.log('Formatted Selected Time: ', dateString);
            }}
          />
        </Form.Item>
      </Form>
    </Create>
  );
};
