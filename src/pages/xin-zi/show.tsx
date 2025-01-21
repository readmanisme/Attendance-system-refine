import React from "react";
import { useShow } from "@refinedev/core";
import { Show, TagField, TextField, DateField } from "@refinedev/antd";
import { Typography } from "antd";

const { Title } = Typography;

export const SalaryTypeShow = () => {
  const { query } = useShow({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  const { data, isLoading } = query;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Collection Name</Title>
      <TextField value={record?.collectionName} />
      <Title level={5}>Created</Title>
      <DateField value={record?.created} />
      <Title level={5}>Id</Title>
      <TextField value={record?.id} />
      <Title level={5}>工人</Title>
      <TextField value={record?.expand?.worker_name?.name } />
      <Title level={5}>工种</Title>
      <TagField value={record?.expand?.work_type?.name} />
      <Title level={5}>Updated</Title>
      <DateField value={record?.updated} />
    </Show>
  );
};
