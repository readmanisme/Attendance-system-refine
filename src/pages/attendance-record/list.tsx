import {
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { CrudFilter, useDeleteMany, BaseRecord } from "@refinedev/core";
import { Space, Table, Button, Popconfirm, Alert, Tooltip } from "antd";
import { useMemo, useCallback, useState } from "react";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
import PySearchSelect from "@/components/PySearchSelect";
import { formatHoursExact } from "@/utils/workTime";
import { DeleteOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useResourceParams } from "@refinedev/core";
const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();
  const { resource } = useResourceParams();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const canNotDelete = useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);
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
      permanent: [{ field: "created", order: "desc" }],
    },
    filters: {
      permanent: datePickerFilter as CrudFilter[],
      defaultBehavior: "replace",
    },
  });

  const { mutate: deleteMany } = useDeleteMany();

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
      onCell: (record: any, rowIndex: any) => ({ "data-testid": `row-checkbox-${rowIndex}` }),
    }),
    [selectedRowKeys],
  );

  // ✅ 统一用 formatHoursExact 渲染工时，避免在每个 cell render 中重复换算

  return (
    <List
      headerButtons={
        <Tooltip title="请到签到页面添加记录">
          {/* 因为CreateButton会导致tooltip位置异常，所以换成普通的button，无所谓，反正不用 */}
          <Button data-testid="add-button" disabled icon={<PlusSquareOutlined />}>
            添加记录
          </Button>
        </Tooltip>
      }
    >
      <Alert
        data-testid="help-alert"
        message="点选复选框选择记录，然后可以批量删除；只能选择当页记录，记录较多的情况下可以到右下角切换每页显示数量。"
        type="info"
        showIcon
        className="mb-2!"
      />
      <Alert
        data-testid="help-alert-2"
        message="要查看特定天数的记录，推荐到人员签到页面切换时间到此天查看"
        // 因为考勤记录页面和工时页面同步，而工时页面如果精细到天那么显示可能会出问题，因为月的数据直接从表读取而不是通过天的数据计算而来；不过也可以让这两个分离，设置两个存储，往组件里面传参数，不同参数用不同存储
        // 不过我觉得可能需求不是很大？
        type="info"
        showIcon
        className="mb-2!"
      />

      {/* 顶部操作区 */}
      <div className="flex flex-row justify-between items-center mb-2">
        <div className="flex flex-row gap-2 items-center"></div>

        <div className="flex gap-2 items-center">
          <Popconfirm
            title="确认删除选中记录？"
            onConfirm={handleBatchDelete}
            disabled={!selectedRowKeys.length}
          >
            <Button
              type="primary"
              data-testid="batch-delete-button"
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
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
        }}
        rowKey="id"
        // @ts-expect-error,111
        rowSelection={rowSelection}
        className="mt-2"
      >
        <Table.Column
          dataIndex="id"
          title="ID"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-id-${rowIndex}` })}
        />
        <Table.Column
          dataIndex={["expand", "worker_id", "name"]}
          title="人员姓名"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-name-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="work_date"
          title="日期"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-date-${rowIndex}` })}
        />
        <Table.Column
          dataIndex="work_minutes"
          title="工时"
          render={(value: number | null) => formatHoursExact(value)}
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-num-${rowIndex}` })}
        />
        <Table.Column
          dataIndex={["expand", "work", "name"]}
          title="工作类型"
          // @ts-expect-error,111
          onCell={(record: any, rowIndex: any) => ({ "data-testid": `row-work-${rowIndex}` })}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord, index) => (
            <Space>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
              />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
              <DeleteButton
                data-testid={`delete-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
                disabled={canNotDelete}
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
export default AttendanceRecordList;
