import { AntdInferencer } from "@refinedev/inferencer/antd";
const resource=__SalaryType_TableName
export const SampleList = () => {
  return (
    <AntdInferencer resource={resource} action="list"  />
  );
};

export const SampleShow = () => {
  return (
    <AntdInferencer resource={resource}  action="show" id="1" />
  );
};

export const SampleCreate = () => {
  return (
    <AntdInferencer resource={resource}  action="create" />
  );
};

export const SampleEdit = () => {
  return (
    <AntdInferencer resource={resource}  action="edit" id="1" />
  );
};