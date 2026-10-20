/**
 * antd 表格相关的小工具,消除各页面重复的内联 onCell 函数与筛选构建代码。
 */

/**
 * 生成 antd onCell / rowSelection.onCell / onRow 的处理函数,给单元格注入 data-testid。
 * 用法:
 *   onCell={cellTestId((i) => `row-id-${i}`)}
 *   onCell={cellTestId((i, r) => `row-month-${r.worker}-${i}`)}
 * antd 对 onCell 返回值的类型声明不包含 data-*,因此让 helper 返回 any。
 */
export const cellTestId =
  (
    makeTestId: (rowIndex: number, record: any) => string,
  ): ((record: any, rowIndex?: number) => any) =>
  (record, rowIndex) => ({ "data-testid": makeTestId(rowIndex ?? 0, record) });

/**
 * 斑马纹行类名，底色由 src/style/index.css 的 `.zebra-stripe` 提供。
 * 需要斑马纹但没走 DataTable 的表格(如签到页)用它自己拼 rowClassName。
 */
export const ZEBRA_ROW_CLASS = "zebra-stripe";

/**
 * 按行号给偶数行(第二行起)加斑马纹，并与调用方自己的行类名合并。
 * 用法: rowClassName={(_, index) => zebraRowClass(index, isEditing(id) ? "row-editing" : "")}
 */
export const zebraRowClass = (index: number, extra?: string): string =>
  [extra, index % 2 === 1 ? ZEBRA_ROW_CLASS : ""].filter(Boolean).join(" ");

/** 一个 refine 筛选对象(单字段 eq) */
export interface EqFilter {
  field: string;
  operator: "eq";
  value: string | number;
}

/**
 * 生成 `or` 连接的同字段多值筛选(如按多个 id / worker_id 过滤);
 * 无值时返回空数组,便于直接传给 useTable.setFilters。
 */
export const buildEqOrFilter = (
  field: string,
  values: Array<string | number>,
): Array<{ operator: "or"; value: EqFilter[] }> =>
  values?.length
    ? [
        {
          operator: "or",
          value: values.map((v) => ({ field, operator: "eq", value: v })),
        },
      ]
    : [];
