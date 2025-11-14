import { Edit, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Input, Select, InputNumber, Alert } from "antd";
import { useState, useMemo } from "react";

const SalaryTypeEdit = () => {
  const { formProps, saveButtonProps } = useForm({
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
    pagination: { mode: "off" },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });

  const [workerName, setWorkerName] = useState<any>(null);
  const [workType, setWorkType] = useState<any>(null);

  // ---- 只返回 boolean（不返回对象） ----
  const isError = useMemo(() => {
    if (!workerName && !workType) {
      return true;
    }

    const records = recordsData?.data ?? [];

    for (const record of records) {
      const rWorker = record.worker_name;
      const rType = record.work_type;

      if (workerName && workType) {
        if (rWorker === workerName && rType === workType) {
          return true;
        }
      }

      if (workerName && !workType) {
        if (rWorker === workerName && !rType) {
          return true;
        }
      }

      if (!workerName && workType) {
        if (!rWorker && rType === workType) {
          return true;
        }
      }
    }

    return false;
  }, [workerName, workType, recordsData?.data]);

  // ---- 只返回 JSX | null（不返回对象） ----
  const alertContent = useMemo(() => {
    if (!workerName && !workType) {
      return <Alert message="工人和工种不能全为空" type="error" showIcon />;
    }

    const records = recordsData?.data ?? [];

    for (const record of records) {
      const rWorker = record.worker_name;
      const rType = record.work_type;

      if (workerName && workType) {
        if (rWorker === workerName && rType === workType) {
          return (
            <Alert
              message={`当前记录与 ${record.expand?.worker_name?.name || "未知"} 工人 和 ${
                record.expand?.work_type?.name || "未知"
              } 工种 重复`}
              type="error"
              showIcon
            />
          );
        }
      }

      if (workerName && !workType) {
        if (rWorker === workerName && !rType) {
          return (
            <Alert
              message={`当前记录与 ${record.expand?.worker_name?.name || "未知"} 工人（无工种）重复`}
              type="error"
              showIcon
            />
          );
        }
      }

      if (!workerName && workType) {
        if (!rWorker && rType === workType) {
          return (
            <Alert
              message={`当前记录与 无工人 ${record.expand?.work_type?.name || "未知"} 工种 重复`}
              type="error"
              showIcon
            />
          );
        }
      }
    }

    return null;
  }, [workerName, workType, recordsData?.data]);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      footerButtons={({ saveButtonProps }) => <SaveButton {...saveButtonProps} disabled={isError} />}
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
export default SalaryTypeEdit;
