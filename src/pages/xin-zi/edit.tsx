import { Edit, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Input, Select, InputNumber, Alert } from "antd";
import { useState, useMemo } from "react";

export const SalaryTypeEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    // resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const workName = formProps.initialValues?.expand?.work_type?.name;
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
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });

  const [workerName, setWorkerName] = useState<any>(null);
  const [workType, setWorkType] = useState<any>(null);

  // 核心逻辑：检查重复和非法组合
  const { alertContent, isError } = useMemo(() => {
    if (!workerName && !workType) {
      return {
        alertContent: <Alert message="工人和工种不能全为空" type="error" showIcon />,
        isError: true,
      };
    }

    const records = recordsData?.data ?? [];

    for (const record of records) {
      const rWorker = record.worker_name;
      const rType = record.work_type;

      // 工人 + 工种 都选
      if (workerName && workType) {
        if (rWorker === workerName && rType === workType) {
          return {
            alertContent: (
              <Alert
                message={`当前记录与 ${record.expand?.worker_name?.name || "未知"} 工人 和 ${
                  record.expand?.work_type?.name || "未知"
                } 工种 重复`}
                type="error"
                showIcon
              />
            ),
            isError: true,
          };
        }
      }

      // 仅工人
      if (workerName && !workType) {
        if (rWorker === workerName && !rType) {
          return {
            alertContent: (
              <Alert
                message={`当前记录与 ${
                  record.expand?.worker_name?.name || "未知"
                } 工人（无工种）重复`}
                type="error"
                showIcon
              />
            ),
            isError: true,
          };
        }
      }

      // 仅工种
      if (!workerName && workType) {
        if (!rWorker && rType === workType) {
          return {
            alertContent: (
              <Alert
                message={`当前记录与 无工人 ${record.expand?.work_type?.name || "未知"} 工种 重复`}
                type="error"
                showIcon
              />
            ),
            isError: true,
          };
        }
      }
    }

    // 无错误
    return { alertContent: null, isError: false };
  }, [workerName, workType, recordsData]);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => (
        <SaveButton {...saveButtonProps} disabled={isError} />
      )}
    >
      <Form {...formProps} layout="vertical">
        <Form.Item label="Id" name={["id"]} rules={[{ required: true }]}>
          <Input readOnly disabled />
        </Form.Item>

        <Form.Item label="工人" name={["worker_name"]}>
          <Select
            {...nameSelectProps}
            allowClear
            onChange={setWorkerName}
            disabled={workName === "基础"}
          />
        </Form.Item>

        <Form.Item label="工种" name={["work_type"]}>
          <Select
            {...typeSelectProps}
            allowClear
            onChange={setWorkType}
            disabled={workName === "基础"}
          />
        </Form.Item>

        <Form.Item label="时薪" name={["SalaryNum"]} rules={[{ required: true }]}>
          <InputNumber min={0} defaultValue={10} changeOnWheel />
        </Form.Item>

        {alertContent}
        <Alert className="mt-2!" message="基础工种不能修改" type="warning" showIcon />
      </Form>
    </Edit>
  );
};
