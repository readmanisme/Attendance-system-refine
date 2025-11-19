import { Create, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Select, InputNumber, Alert } from "antd";
import { useState, useEffect, useMemo } from "react";

const SalaryTypeCreate = () => {
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

  const [workerName, setWorkerName] = useState<any>(null);
  const [workType, setWorkType] = useState<any>(null);
  // 移除 errorMsg 的 useState

  // 校验逻辑：使用 useMemo 代替 useEffect
  const errorMsg = useMemo<string | null>(() => {
    if (!workerName && !workType) {
      return "工人和工种不能全为空";
    }

    const duplicate = recordsData?.data.find((record: any) => {
      // 注意：这里的类型推断可能需要根据实际数据结构调整，我添加了any
      const sameWorker =
        record.worker_name === workerName ||
        (!record.worker_name && !workerName);
      const sameType =
        record.work_type === workType || (!record.work_type && !workType);
      return sameWorker && sameType;
    });

    if (duplicate) {
      const workerText = duplicate.expand?.worker_name?.name || "无工人";
      const typeText = duplicate.expand?.work_type?.name || "无工种";
      return `当前记录与 ${workerText} / ${typeText} 重复`;
    }

    return null;
  }, [workerName, workType, recordsData?.data]);

  return (
    <Create
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={!!errorMsg} data-testid="save-button" />
      )}
    >
      <Alert className="mb-2!" message="创建之后只能修改薪资，要修改只能删除" type="warning" showIcon data-testid="warn-alert" />
      <Form {...formProps} layout="vertical">
        <Form.Item label="工人" name={["worker_name"]}>
          <Select {...nameSelectProps} allowClear onChange={setWorkerName} data-testid="worker-select" style={{ width: 200 }}/>
        </Form.Item>

        <Form.Item label="工种" name={["work_type"]}>
          <Select {...typeSelectProps} allowClear onChange={setWorkType} data-testid="work-type-select" style={{ width: 200 }}/>
        </Form.Item>

        <Form.Item label="时薪" name={["SalaryNum"]} rules={[{ required: true }]} initialValue={10}>
          <InputNumber min={0} changeOnWheel data-testid="salary-input" />
        </Form.Item>

        {errorMsg && <Alert message={errorMsg} type="error" showIcon data-testid="error-alert" />}
      </Form>
    </Create>
  );
};
export default SalaryTypeCreate;