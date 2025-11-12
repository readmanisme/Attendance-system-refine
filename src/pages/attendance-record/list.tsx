import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { CrudFilter, useDeleteMany, type BaseRecord } from "@refinedev/core";
import { Space, Table, Switch, Button, Popconfirm, Alert } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
import PySearchSelect from "@/components/PySearchSelect";
import { DeleteOutlined } from "@ant-design/icons";
import { useResourceParams } from "@refinedev/core";

export const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();
  const { resource } = useResourceParams();
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
  const {
    tableProps,
    setFilters,
    setCurrentPage: setCurrent,
  } = useTable({
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
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
      setSelectedRowKeys([]);
    } else {
      setFilters([], "replace");
      setSelectedRowKeys([]);
    }
  }, [setCurrent, setFilters, unclockoutfilter]);

  // 使用 useDeleteMany 批量删除
  const { mutate: deleteMany } = useDeleteMany();

  // 处理选择变化
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
      console.log("rowSelection", newSelectedRowKeys);
    },
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    deleteMany({
      // @ts-expect-error,111
      resource: resource?.name, // 替换为你的资源名
      ids: selectedRowKeys as number[], // 假设 id 是 number 类型
    });
  };

  return (
    <List headerButtons={<CreateButton>添加记录</CreateButton>}>
      <Alert
        message="点选复选框选择记录，然后可以批量删除；只能选择当页记录"
        type="info"
        showIcon
        className="mb-2!"
      />
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          <div className="text-center text-black">过滤未下班记录</div>
          <Switch
            checked={unclockoutfilter}
            onChange={handleUnclockoutfilterChange}
          />
        </div>
        <Popconfirm title="确认删除选中记录？" onConfirm={handleBatchDelete}>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            // onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            删除选中 ({selectedRowKeys.length})
          </Button>
        </Popconfirm>
        <SwitchDataRange
          onApplyFn={() => {
            setCurrent(1);
            setSelectedRowKeys([]);
          }}
        />
      </div>
      <PySearchSelect
        onChangeFn={(value: { value: string; label: string }) => {
          // @ts-expect-error，111
          setFilters(get_filter(value));
          setCurrent(1);
          setSelectedRowKeys([]);
        }}
        placeholder="多选工人,支持拼音"
        mode="multiple"
        onClearFn={() => {
          // setSelectedPerson([]);
          setFilters([]);
          setCurrent(1);
          setSelectedRowKeys([]);
        }}
        needButton={true}
      />
      <Table {...tableProps} rowKey="id" rowSelection={rowSelection}>
        <Table.Column dataIndex="id" title={"ID"} />
        <Table.Column
          dataIndex={["expand", "worker_id", "name"]}
          title={"人员姓名"}
        />
        <Table.Column
          dataIndex="check_in"
          title={"上班时间"}
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
