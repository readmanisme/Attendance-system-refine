import { Create, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Select, InputNumber, Alert } from "antd";
import { useState, useEffect, useMemo } from "react";

export const SalaryTypeCreate = () => {
  const { formProps, saveButtonProps } = useForm({
    // resource: __SalaryType_TableName,
    meta: { expand: ["worker_name", "work_type"] },
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

  const { result: recordsData } = useList({
    // resource: __SalaryType_TableName,
    pagination: { mode: "off" },
    meta: { expand: ["worker_name", "work_type"] },
  });

  const records = useMemo(() => recordsData?.data || [], [recordsData]);

  const [workerName, setWorkerName] = useState<any>(null);
  const [workType, setWorkType] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 校验逻辑
  useEffect(() => {
    if (!workerName && !workType) {
      setErrorMsg("工人和工种不能全为空");
      return;
    }

    const duplicate = records.find((record) => {
      const sameWorker = record.worker_name === workerName || (!record.worker_name && !workerName);
      const sameType = record.work_type === workType || (!record.work_type && !workType);
      return sameWorker && sameType;
    });

    if (duplicate) {
      const workerText = duplicate.expand?.worker_name?.name || "无工人";
      const typeText = duplicate.expand?.work_type?.name || "无工种";
      setErrorMsg(`当前记录与 ${workerText} / ${typeText} 重复`);
    } else {
      setErrorMsg(null);
    }
  }, [workerName, workType, records]);

  return (
    <Create
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={!!errorMsg} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item label="工人" name={["worker_name"]}>
          <Select {...nameSelectProps} allowClear onChange={setWorkerName} />
        </Form.Item>

        <Form.Item label="工种" name={["work_type"]}>
          <Select {...typeSelectProps} allowClear onChange={setWorkType} />
        </Form.Item>

        <Form.Item label="时薪" name={["SalaryNum"]} rules={[{ required: true }]}>
          <InputNumber min={0} defaultValue={10} changeOnWheel />
        </Form.Item>

        {errorMsg && <Alert message={errorMsg} type="error" showIcon />}
      </Form>
    </Create>
  );
};
