import PySearchSelect from "@/components/PySearchSelect";
import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
  CreateButton,
  SaveButton,
  useSelect,
} from "@refinedev/antd";
import type { BaseRecord, CrudFilter, CrudFilters } from "@refinedev/core";
import { Form, Select, Space, Table } from "antd";
import { useMemo, useState } from "react";

export const WorkersList = () => {
  // const [SelectedPerson, setSelectedPerson] = useState<
  //   { value: string; label: string }[]
  // >([]);
  const get_filter = (values: any) => {
    if (!values){
      return [];
    }
    // let names = values.name;
    // if (!Array.isArray(names)) {
    //   names = [names];
    // }
    return [
      {
        operator: "or",
        value: values.map((r: any) => ({
          field: "id",
          operator: "eq",
          value: r.value,
        })),
      },
    ];
  };
  const { tableProps: workerData, setFilters } = useTable({
    syncWithLocation: true,
    sorters: {
      permanent: [
        {
          field: "created",
          order: "desc",
        },
      ],
    },
    filters: {
      defaultBehavior: "replace",
    },
  });

  return (
    <List headerButtons={<CreateButton>添加人员</CreateButton>}>
      <PySearchSelect
        onChangeFn={(value: { value: string; label: string }) => {
          // if (Array.isArray(value)) {
          //   setSelectedPerson(value);
          // } else {
          //   setSelectedPerson([value]);
          // }
          // @ts-expect-error，111
          setFilters(get_filter(value));
        }}
        placeholder="多选工人,支持拼音"
        mode="multiple"
        onClearFn={() => {
          // setSelectedPerson([]);
          setFilters([]);
        }}
        needButton={true}
      />

      <Table
        {...workerData}
        rowKey="id"
        className="mt-2"
        // pagination={{
        //   ...tableProps.pagination,
        //   position: ["bottomCenter"],
        //   size: "small",
        // }}
      >
        <Table.Column dataIndex="id" title={"ID"} />
        <Table.Column dataIndex="name" title={"姓名"} />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton size="small" recordItemId={record.id}>
                编辑
              </EditButton>
              <ShowButton size="small" recordItemId={record.id}>
                查看
              </ShowButton>
              <DeleteButton size="small" recordItemId={record.id}>
                删除
              </DeleteButton>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
