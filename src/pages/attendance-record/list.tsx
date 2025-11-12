import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { CrudFilter, type BaseRecord } from "@refinedev/core";
import { Space, Table, Switch } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
import PySearchSelect from "@/components/PySearchSelect";
export const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();

  const get_filter = (values: any) => {
    if (!values) {
      return [];
    }
    return [
      {
        operator: "or",
        value: values.map((r: any) => ({
          field: "worker_id",
          operator: "eq",
          value: r.value,
        })),
      },
    ];
  };
  const { tableProps, setFilters, setCurrent } = useTable({
    resource: __AttendanceRecord_TableName,
    meta: {
      expand: ["work", "worker_id"],
    },
    syncWithLocation: true,
    sorters: {
      permanent: [
        {
          field: "check_in",
          order: "desc",
        },
      ],
    },
    filters: {
      // 这里operator是null的实际是不等于null，nnull实际上是等于null
      permanent: datePickerFilter as CrudFilter[],
      defaultBehavior: "replace",
    },
  });

  const [unclockoutfilter, setUnclockoutfilter] = useState(false);
  const handleUnclockoutfilterChange = (checked: boolean) => {
    setUnclockoutfilter(checked);
  };
  useEffect(() => {
    if (unclockoutfilter) {
      console.log("执行了过滤");
      setFilters([
        {
          field: "check_out",
          operator: "eq",
          value: "",
        },
      ]);
      setCurrent(1);
    } else {
      setFilters([], "replace");
    }
  }, [setCurrent, setFilters, unclockoutfilter]);
  return (
    <List headerButtons={<CreateButton>添加记录</CreateButton>}>
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          <div className="text-center text-black">过滤未下班记录</div>
          <Switch
            checked={unclockoutfilter}
            onChange={handleUnclockoutfilterChange}
          />
        </div>
        <SwitchDataRange onApplyFn={() => setCurrent(1)} />
      </div>
      <PySearchSelect
        onChangeFn={(value: { value: string; label: string }) => {
          // @ts-expect-error，111
          setFilters(get_filter(value));
          setCurrent(1);
        }}
        placeholder="多选工人,支持拼音"
        mode="multiple"
        onClearFn={() => {
          // setSelectedPerson([]);
          setFilters([]);
          setCurrent(1);
        }}
        needButton={true}
      />
      {/* <Table {...tableProps} rowKey="id" onChange={handleTableChange}> */}
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title={"ID"} />
        {/* <Table.Column dataIndex="worker_id" title={"人员ID"} /> */}
        <Table.Column
          dataIndex={["expand", "worker_id", "name"]}
          title={"人员姓名"}
        />
        <Table.Column
          dataIndex="check_in"
          title={"上班时间"}
          // DateField只显示到日期
          // slice(0,-5)去掉.000Z
          render={(_, record: BaseRecord) => {
            // return <>{record.check_in.slice(0, -5)}</>;
            return (
              <>
                {record.check_in
                  ? dayjs(record.check_in).format("YYYY-MM-DD HH:mm:ss")
                  : "--"}
              </>
            );
          }}
        />
        <Table.Column
          dataIndex="check_out"
          title={"下班时间"}
          // filterDropdown={(props) => (
          //   <FilterDropdown {...props}
          //   mapValue={(value)=>{
          //     if(value===""){
          //   }}}
          //   >
          //     <Select
          //     className="min-w-52"
          //       mode="multiple"
          //       placeholder="Select Category"
          //       options={[
          //         { label: "空值", value: "0" },
          //         { label: "非空", value: "1" },
          //       ]}
          //     />
          //   </FilterDropdown>
          // )}
          render={(_, record: BaseRecord) => {
            return (
              <>
                {record.check_out
                  ? dayjs(record.check_out).format("YYYY-MM-DD HH:mm:ss")
                  : "--"}
              </>
            );
          }}
        />
        <Table.Column
          dataIndex={["expand", "work", "name"]}
          title={"工作类型"}
        />
        <Table.Column
          title={"Actions"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
