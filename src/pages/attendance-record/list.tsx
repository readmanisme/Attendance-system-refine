import { DeleteButton, EditButton, List, useTable } from "@refinedev/antd";
import { useDeleteMany, BaseRecord, CrudFilter } from "@refinedev/core";
import { Button, Popconfirm, Tooltip } from "antd";
import { SwitchDataRange } from "@/components/SwitchDataRange";
import { useGetDatePickerFilter } from "@/utils/get_data_picker_filter";
import PySearchSelect from "@/components/PySearchSelect";
import { formatHoursExact } from "@/utils/workTime";
import { buildEqOrFilter, cellTestId } from "@/utils/tableHelpers";
import { DeleteOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useResourceParams } from "@refinedev/core";
import { useBatchRowSelection } from "../useBatchRowSelection";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";

const AttendanceRecordList = () => {
  const datePickerFilter = useGetDatePickerFilter();
  const { resource } = useResourceParams();
  const selection = useBatchRowSelection();

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

  const { mutateAsync: deleteManyAsync } = useDeleteMany();

  const { selectedRowKeys, clearSelection } = selection;
  const resourceName = resource?.name;
  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await deleteManyAsync({
        // @ts-expect-error,111
        resource: resourceName,
        ids: selectedRowKeys as number[],
      });
      clearSelection();
    } catch {
      // 删除失败:refine 已弹出错误通知,保留选中让用户直接重试
    }
  };

  return (
    <List
      breadcrumb={false}
      headerProps={{ subTitle: "按日期与人员查看历史记录；新增记录请到「人员签到」页" }}
      headerButtons={
        <Tooltip title="请到签到页面添加记录">
          {/* CreateButton 会导致 tooltip 位置异常，所以换成普通按钮 */}
          <Button data-testid="add-button" disabled icon={<PlusSquareOutlined />} size="middle">
            添加记录
          </Button>
        </Tooltip>
      }
    >
      {/* 原两个大块 Alert 合并为一行小字，testid 分别保留 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 16px",
          marginBottom: 10,
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        <span data-testid="help-alert">
          点选复选框可批量删除（仅当前页）；记录较多时可在右下角切换每页数量
        </span>
        <span data-testid="help-alert-2">查看某天的记录，推荐到「人员签到」页切换日期</span>
      </div>

      <FilterBar
        left={
          <PySearchSelect
            onChangeFn={(values) => {
              setFilters(buildEqOrFilter("worker_id", toOptionValues(values) ?? []) as CrudFilter[]);
              setCurrentPage(1);
              selection.clearSelection();
            }}
            placeholder="多选工人，支持拼音"
            mode="multiple"
            onClearFn={() => {
              setFilters([], "replace");
              setCurrentPage(1);
              selection.clearSelection();
            }}
            needButton
          />
        }
        right={
          <>
            <Popconfirm
              title="确认删除选中记录？"
              onConfirm={handleBatchDelete}
              disabled={!selection.selectedRowKeys.length}
            >
              <Button
                type="primary"
                data-testid="batch-delete-button"
                danger
                icon={<DeleteOutlined />}
                disabled={!selection.selectedRowKeys.length}
              >
                删除选中 ({selection.selectedRowKeys.length})
              </Button>
            </Popconfirm>

            <SwitchDataRange
              onApplyFn={() => {
                setCurrentPage(1);
                selection.clearSelection();
              }}
            />
          </>
        }
      />

      <DataTable
        {...tableProps}
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
        }}
        rowKey="id"
        // 固定列宽布局：所有列都给了 width，剩余空间按比例摊到每一列，
        // 避免只有"无 width 的列"吃掉全部剩余宽度、导致中间大片空白
        tableLayout="fixed"
        // @ts-expect-error,111
        rowSelection={selection.rowSelection}
      >
        <DataTable.Column
          dataIndex="id"
          title="ID"
          width={130}
          ellipsis
          onCell={cellTestId((i) => `row-id-${i}`)}
        />
        <DataTable.Column
          dataIndex={["expand", "worker_id", "name"]}
          title="人员姓名"
          width={160}
          onCell={cellTestId((i) => `row-name-${i}`)}
        />
        <DataTable.Column
          dataIndex="work_date"
          title="日期"
          width={150}
          onCell={cellTestId((i) => `row-date-${i}`)}
        />
        <DataTable.Column
          dataIndex="work_minutes"
          title="工时"
          className="num"
          width={110}
          render={(value: number | null) => formatHoursExact(value)}
          onCell={cellTestId((i) => `row-num-${i}`)}
        />
        <DataTable.Column
          dataIndex={["expand", "work", "name"]}
          title="工作类型"
          width={160}
          onCell={cellTestId((i) => `row-work-${i}`)}
        />
        <DataTable.Column
          title="操作"
          dataIndex="actions"
          width={120}
          align="right"
          render={(_: any, record: BaseRecord, index: number) => (
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <EditButton
                data-testid={`edit-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
              />
              <DeleteButton
                data-testid={`delete-button-${index}`}
                hideText
                size="small"
                recordItemId={record.id}
                disabled={selection.hasSelection}
              />
            </div>
          )}
        />
      </DataTable>
    </List>
  );
};

/** antd labelInValue 的选项载荷 → 纯 value 列表 */
const toOptionValues = (values: any): Array<string | number> =>
  values?.length ? values.map((r: any) => r.value) : [];

export default AttendanceRecordList;
