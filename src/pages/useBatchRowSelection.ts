import { useState } from "react";

/** 表格批量选择(复选框)与单行删除的禁用状态,供批量删除场景共用
 * (人员签到页、考勤记录页)。
 */
export function useBatchRowSelection() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    onCell: (record: any, rowIndex: number) => ({ "data-testid": `row-checkbox-${rowIndex}` }),
  };

  /** 清空选中(批量删除后 / 切换筛选或日期范围时用) */
  const clearSelection = () => setSelectedRowKeys([]);

  return {
    /** 当前选中的行 key */
    selectedRowKeys,
    /** 直接传给 Table 的 rowSelection */
    rowSelection,
    clearSelection,
    /** 是否有选中项:有选中时单行删除按钮需要禁用 */
    hasSelection: selectedRowKeys.length > 0,
  };
}
