import { Create, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Select, InputNumber, Alert } from "antd";
import { useState } from "react";

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
  const { data: records } = useList({
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const [IsError, setIsError] = useState(true);
  const [worker_name, setWorker_name] = useState<any>("");
  const [work_type, setWork_type] = useState<any>("");
  const get_alert = () => {
    if (!worker_name && !work_type) {
      setIsError(true);
      return <Alert message="工人和工种不能全为空" type="error" showIcon />;
    } else if (worker_name && work_type) {
      // 检查是否与records中的工人和工种重复
      for (const record of records?.data || []) {
        if (
          record.worker_name === worker_name &&
          record.work_type === work_type
        ) {
          setIsError(true);
          return (
            <Alert
              message={
                `当前记录与` +
                record.expand.worker_name.name +
                `工人和` +
                record.expand.work_type.name +
                `工种 重复`
              }
              type="error"
              showIcon
            />
          );
        } else {
          setIsError(false);
        }
      }
    } else if (worker_name && !work_type) {
      for (const record of records?.data || []) {
        if (record.worker_name === worker_name && !record.work_type) {
          setIsError(true);
          return (
            <Alert
              message={
                `当前记录与` +
                record.expand.worker_name.name +
                `工人 无工种 重复`
              }
              type="error"
              showIcon
            />
          );
        } else {
          setIsError(false);
        }
      }
    } else if (!worker_name && work_type) {
      for (const record of records?.data || []) {
        if (!record.worker_name && record.work_type === work_type) {
          setIsError(true);
          return (
            <Alert
              message={
                `当前记录与 无工人 ` +
                record.expand.work_type.name +
                `工种 重复`
              }
              type="error"
              showIcon
            />
          );
        } else {
          setIsError(false);
        }
      }
    }
  };
  return (
    <Create
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={IsError} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item label="工人" name={["worker_name"]}>
          <Select {...nameSelectProps} allowClear onChange={setWorker_name} />
        </Form.Item>
        <Form.Item label="工种" name={["work_type"]}>
          <Select {...TypeSelectProps} allowClear onChange={setWork_type} />
        </Form.Item>
        <Form.Item
          label="时薪"
          name={["SalaryNum"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber min={0} defaultValue={10} changeOnWheel />
        </Form.Item>
        {get_alert()}
      </Form>
    </Create>
  );
};
