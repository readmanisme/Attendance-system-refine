import { Table, type TableProps } from "antd";

/**
 * 统一表格：尺寸、分页器、总数展示一次配好。
 * 列级别的对齐/宽度仍由调用方控制；数字列给 className="num" 即右对齐。
 */
function DataTableInner<T extends object>({ pagination, size = "middle", ...rest }: TableProps<T>) {
  const mergedPagination =
    pagination === false
      ? false
      : {
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条`,
          ...pagination,
        };

  return <Table<T> size={size} {...rest} pagination={mergedPagination} />;
}

/** 保留 Table.Column 的 JSX 写法（<DataTable.Column ... />） */
export const DataTable = Object.assign(DataTableInner, {
  Column: Table.Column,
  ColumnGroup: Table.ColumnGroup,
  EXPAND_COLUMN: Table.EXPAND_COLUMN,
  SELECTION_COLUMN: Table.SELECTION_COLUMN,
});
