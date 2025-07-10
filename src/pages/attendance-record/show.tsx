import { Show, TextField, DateField } from "@refinedev/antd";
import { useOne, useShow } from "@refinedev/core";
import { Typography } from "antd";

const { Title } = Typography;

export const AttendanceRecordShow = () => {
  const { queryResult } = useShow({
    meta:{
      expand:["work"]
    }
  });
  const { data, isLoading } = queryResult;

  const record = data?.data;
  const { data: names, isLoading: namesLoading } = useOne({
    resource: __Workers_TableName,
    id: record?.worker_id || "",
    queryOptions:{
      enabled:!!record
    }
  });

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>{"ID"}</Title>
      <TextField value={record?.id} />
      <Title level={5}>{"人员ID"}</Title>
      
      <TextField value={record?.worker_id} />
      <Title level={5}>{"人员姓名"}</Title>
      <TextField value={namesLoading? "loading..." : names?.data?.name} />
      <Title level={5}>{"上班时间"}</Title>
      {/* <DateField value={record?.check_in} /> */}
      <TextField value={record?.check_in} />
      <Title level={5}>{"工作类型"}</Title>
      <TextField value={record?.expand?.work?.name} />
      <Title level={5}>{"下班时间"}</Title>
      {/* <DateField value={record?.check_out} /> */}
      <TextField value={record?.check_out} />
    </Show>
  );
};
