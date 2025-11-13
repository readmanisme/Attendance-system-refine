import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { CrudFilter, useDeleteMany, BaseRecord } from "@refinedev/core";
import { Space, Table, Switch, Button, Popconfirm, Alert, Tooltip } from "antd";
import dayjs from "dayjs";
import { useMemo, useCallback, useState, useEffect } from "react";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
import PySearchSelect from "@/components/PySearchSelect";
import { DeleteOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useResourceParams } from "@refinedev/core";

export const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();
  const { resource } = useResourceParams();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [unclockoutfilter, setUnclockoutfilter] = useState(false);

  // useMemo 避免每次渲染都重新创建过滤函数
  const getFilter = useCallback((values: any) => {
    if (!values?.length) return [];
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
  }, []);

  const { tableProps, setFilters, setCurrentPage } = useTable({
    resource: __AttendanceRecord_TableName,
    meta: {
      expand: ["work", "worker_id"],
    },
    sorters: {
      permanent: [{ field: "check_in", order: "desc" }],
    },
    filters: {
      permanent: datePickerFilter as CrudFilter[],
      defaultBehavior: "replace",
    },
  });
  // 为tableProps.dataSource的每一个数据添加workTime字段，值为check_out - check_in
  const dataSourceWithWorkTime = useMemo(() => {
    return tableProps.dataSource?.map((item) => {
      if (!item.check_out) return item;
      const checkIn = dayjs(item.check_in);
      const checkOut = dayjs(item.check_out);
      return {
        ...item,
        workTime: checkOut.diff(checkIn, "hour", true),
      };
    });
  }, [tableProps.dataSource]);

  const { mutate: deleteMany } = useDeleteMany();

  // 🚀 用 useEffect 优化过滤逻辑
  useEffect(() => {
    const filters = unclockoutfilter
      ? [{ field: "check_out", operator: "eq", value: "" }]
      : [];
    // @ts-expect-error,111
    setFilters(filters, "replace");
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }, [unclockoutfilter, setFilters, setCurrentPage]);

  const handleBatchDelete = useCallback(() => {
    if (!selectedRowKeys.length) return;
    deleteMany({
      // @ts-expect-error,111
      resource: resource?.name,
      ids: selectedRowKeys as number[],
    });
    setSelectedRowKeys([]);
  }, [deleteMany, resource?.name, selectedRowKeys]);

  // ✅ 用 useMemo 固定 rowSelection 对象引用，避免 tableProps 导致 re-render
  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: setSelectedRowKeys,
    }),
    [selectedRowKeys]
  );

  // ✅ 封装格式化函数，避免在每个 cell render 中新建 dayjs 实例
  const formatDateTime = useCallback(
    (date?: string) =>
      date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : "--",
    []
  );

  return (
    <List
      headerButtons={
        <Tooltip title="请到签到页面添加记录"> 
        {/* 因为CreateButton会导致tooltip位置异常，所以换成普通的button，无所谓，反正不用 */}
          <Button disabled icon={<PlusSquareOutlined />}>添加记录</Button>
        </Tooltip>
      }
    >
      <Alert
        message="点选复选框选择记录，然后可以批量删除；只能选择当页记录，记录较多的情况下可以到右下角切换每页显示数量。"
        type="info"
        showIcon
        className="mb-2!"
      />
      <Alert
        message="要查看特定天数的记录，推荐到人员签到页面切换时间到此天查看"
        // 因为考勤记录页面和工时页面同步，而工时页面如果精细到天那么显示可能会出问题，因为月的数据直接从表读取而不是通过天的数据计算而来；不过也可以让这两个分离，设置两个存储，往组件里面传参数，不同参数用不同存储
        // 不过我觉得可能需求不是很大？
        type="info"
        showIcon
        className="mb-2!"
      />

      {/* 顶部操作区 */}
      <div className="flex flex-row justify-between items-center mb-2">
        <div className="flex flex-row gap-2 items-center">
          <span className="text-black">过滤未下班记录</span>
          <Switch checked={unclockoutfilter} onChange={setUnclockoutfilter} />
        </div>

        <div className="flex gap-2 items-center">
          <Popconfirm
            title="确认删除选中记录？"
            onConfirm={handleBatchDelete}
            disabled={!selectedRowKeys.length}
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedRowKeys.length}
            >
              删除选中 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>

          <SwitchDataRange
            onApplyFn={() => {
              setCurrentPage(1);
              setSelectedRowKeys([]);
            }}
          />
        </div>
      </div>

      {/* 工人筛选 */}
      <PySearchSelect
        onChangeFn={(value: any) => {
          // @ts-expect-error,111
          setFilters(getFilter(value));
          setCurrentPage(1);
          setSelectedRowKeys([]);
        }}
        placeholder="多选工人,支持拼音"
        mode="multiple"
        onClearFn={() => {
          setFilters([], "replace");
          setCurrentPage(1);
          setSelectedRowKeys([]);
        }}
        needButton
      />

      {/* 表格部分 */}
      <Table
        {...tableProps}
        dataSource={dataSourceWithWorkTime}
        rowKey="id"
        rowSelection={rowSelection}
        className="mt-2"
      >
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column
          dataIndex={["expand", "worker_id", "name"]}
          title="人员姓名"
        />
        <Table.Column
          dataIndex="check_in"
          title="上班时间"
          render={(value: string) => formatDateTime(value)}
        />
        <Table.Column
          dataIndex="check_out"
          title="下班时间"
          render={(value: string) => formatDateTime(value)}
        />
        <Table.Column
          dataIndex="workTime"
          title="工时"
          // render={(value: string) => formatDateTime(value)}
        />
        <Table.Column dataIndex={["expand", "work", "name"]} title="工作类型" />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
