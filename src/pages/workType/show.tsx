import React from "react";
import { useShow } from "@refinedev/core";
import { Show, TagField, TextField, DateField } from "@refinedev/antd";
import { Typography } from "antd";

const { Title } = Typography;

export const ShowWorkType = () => {
    const { query } = useShow();
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
            <Title level={5}>Type</Title>
            <TextField value={record?.name} />
            <Title level={5}>Updated</Title>
            <DateField value={record?.updated} />
        </Show>
    );
};
