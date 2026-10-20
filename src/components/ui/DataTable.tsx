import { Table, type TableProps } from "antd";
import { zebraRowClass } from "@/utils/tableHelpers";

/**
 * 统一表格：尺寸、分页器、总数展示一次配好。
 * 列级别的对齐/宽度仍由调用方控制；数字列给 className="num" 即右对齐。
 * 默认给偶数行加斑马纹；调用方若自己传了 rowClassName 会与之合并，不会互相覆盖。
 */
function DataTableInner<T extends object>({
  pagination,
  size = "middle",
  rowClassName,
  ...rest
}: TableProps<T>) {
  const mergedPagination =
    pagination === false
      ? false
      : {
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条`,
          // Table 的 size="middle" 默认会把分页降级成 small,这里固定用常规尺寸
          size: "default" as const,
          ...pagination,
        };

  return (
    <Table<T>
      size={size}
      {...rest}
      scroll={{ x: 'max-content' }}
      rowClassName={(record, index, indent) =>
        zebraRowClass(
          index,
          typeof rowClassName === "function"
            ? rowClassName(record, index, indent)
            : (rowClassName ?? ""),
        )
      }
      pagination={mergedPagination}
    />
  );
}

/** 保留 Table.Column 的 JSX 写法（<DataTable.Column ... />） */
export const DataTable = Object.assign(DataTableInner, {
  Column: Table.Column,
  ColumnGroup: Table.ColumnGroup,
  EXPAND_COLUMN: Table.EXPAND_COLUMN,
  SELECTION_COLUMN: Table.SELECTION_COLUMN,
});
