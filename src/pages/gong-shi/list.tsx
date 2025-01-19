import { List as LList, useSimpleList } from "@refinedev/antd";
import { Line } from "@ant-design/plots";
import {
  Card,
  Collapse,
  CollapseProps,
  Pagination,
  Select,
  Tag,
  List,
  Button,
  Space,
  Drawer,
  Popconfirm,
} from "antd";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import PocketBase from "pocketbase";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useRef, useState } from "react";
import Paragraph from "antd/es/typography/Paragraph";

export default function GongShiList() {
  const PySearchSelectValue = useRef([]);
  const get_select_filter = (value) => {
    const list = value?.map((item) => item?.value);
    const filters = [];
    list?.forEach((id) => {
      filters.push({
        field: "id",
        operator: "eq",
        value: id,
      });
    });
    return filters;
  };

  const { listProps, setFilters } = useSimpleList({
    resource: __Workers_TableName,
    filters: {
      defaultBehavior: "replace",
      // permanent:get_select_filter(PySearchSelectValue.current)
    },
  });

  const get_month_view_filter = () => {
    const data = listProps.dataSource;
    const ids = data?.map((item) => item.id);
    const filters = [];
    ids?.forEach((id) => {
      filters.push({
        field: "worker_id",
        operator: "eq",
        value: id,
      });
    });
    return filters;
  };
  const {
    data: month_view_data,
    isLoading,
    isError,
  } = useList({
    resource: __WorkHours_Month_ViewName,
    queryOptions: {
      enabled: !listProps.loading,
    },
    filters: [
      {
        operator: "or",
        value: get_month_view_filter(),
      },
    ],
    pagination: {
      mode: "off",
    },
  });
  const {
    data: day_view_data,
    isLoading: day_view_loading,
    isError: day_view_error,
  } = useList({
    resource: __WorkHours_Day_ViewName,
    queryOptions: {
      enabled: !listProps.loading,
    },
    filters: [
      {
        operator: "or",
        value: get_month_view_filter(),
      },
    ],
    pagination: {
      mode: "off",
    },
  });
  const {
    data: attendance_record_data,
    isLoading: attendance_record_loading,
    isError: attendance_record_error,
  } = useList({
    resource: __AttendanceRecord_TableName,
    queryOptions: {
      enabled: !listProps.loading,
    },
    filters: [
      {
        operator: "or",
        value: get_month_view_filter(),
      },
    ],
    pagination: {
      mode: "off",
    },
  });
  const {
    data: workType_test_data,
    isLoading: workType_test_loading,
    isError: workType_test_error,
  } = useList({
    resource: __WorkTypes_TableName,
    pagination: {
      mode: "off",
    },
  });

  function renderItem(item: any) {
    // 这里的item是worker
    const month_records =
      month_view_data?.data?.filter((record) => record.worker_id === item.id) ??
      [];
    const day_records =
      day_view_data?.data?.filter((record) => record.worker_id === item.id) ??
      [];
    const attendance_records =
      attendance_record_data?.data?.filter(
        (record) => record.worker_id === item.id
      ) ?? [];

    const workerDetails =
      listProps.dataSource?.reduce((acc, worker) => {
        acc[worker.id] = worker.name;
        return acc;
      }, {}) ?? {};

    const workTypeDetails =
      workType_test_data?.data?.reduce((acc, workType) => {
        acc[workType.id] = workType.name;
        return acc;
      }, {}) ?? {};

    const getNestedList = (work_date: string) => {
      const records =
        attendance_records?.filter((record) =>
          record.check_in.startsWith(work_date)
        ) ?? [];

      return records.map((record) => {
        const worker_name = workerDetails[record.worker_id];
        const work_name = workTypeDetails[record.work];
        const check_in = dayjs(record.check_in);
        const check_out = dayjs(record.check_out);
        return (
          <List.Item key={record.id}>
            <p>
              {worker_name} 在 {check_in.format("YYYY-MM-DD HH:mm:ss")} 到{" "}
              {check_out.format("YYYY-MM-DD HH:mm:ss")} 进行了工作 {work_name},
              共计 <Tag color="blue">{check_out.diff(check_in, "hours")}</Tag>{" "}
              小时
            </p>
          </List.Item>
        );
      });
    };

    // const nestItems: CollapseProps["items"] = day_records.map((record) => ({
    //   key: record.work_date,
    //   label: (
    //     <p>
    //       此人在 {record.work_date} 日工作了{" "}
    //       <Tag color="blue">{record.total_work_hours}</Tag> 小时
    //     </p>
    //   ),
    //   children: <List size="small">{getNestedList(record.work_date)}</List>,
    //   extra: <p>展开以查看详情</p>,
    // }));
    const getnestItems = (work_month: string) => {
      const records =
        day_records?.filter((record) =>
          record.work_date.startsWith(work_month)
        ) ?? [];
      return records.map((record) => {
        const worker_name = workerDetails[record.worker_id];
        const work_name = workTypeDetails[record.work];
        return {
          key: record.work_date,
          label: (
            <p>
              {worker_name}在 {record.work_date} 日进行工作{work_name}共计{" "}
              <Tag color="blue">{record.total_work_hours}</Tag> 小时
            </p>
          ),
          children: <List size="small">{getNestedList(record.work_date)}</List>,
          extra: <p>展开以查看详情</p>,
        };
      });
    };

    const collapseItems: CollapseProps["items"] = month_records.map(
      (record) => ({
        key: record.work_month,
        label: (
          <p>
            {workerDetails[record.worker_id]} 在 {record.work_month} 月工作了{" "}
            <Tag color="blue">{record.total_work_hours}</Tag> 小时
          </p>
        ),
        children: (
          <Collapse size="small" items={getnestItems(record.work_month)} />
        ),
        extra: <p>展开以查看详情</p>,
      })
    );

    const collapse = (
      <Collapse
        size="middle"
        items={collapseItems}
        destroyInactivePanel={false}
      />
    );

    return (
      <List.Item>
        <Card title={item.name} className="w-full">
          {collapse}
        </Card>
      </List.Item>
    );
  }

  const [isExportLoading, setIsExportLoading] = useState(false);
  const exportToExcel = async () => {
    setIsExportLoading(true);
    const pb = new PocketBase(__BACKEND_API_URL__);

    const 集合 = {
      考勤记录: __AttendanceRecord_TableName,
      工人: __Workers_TableName,
      工作类型: __WorkTypes_TableName,
      月工时: __WorkHours_Month_ViewName,
      日工时: __WorkHours_Day_ViewName,
    };
    const attendanceRecords = await pb.collection(集合.考勤记录).getFullList({
      filter: "check_in !=null && check_out !=null",
    });
    const workers = await pb.collection(集合.工人).getFullList();
    const workTypes = await pb.collection(集合.工作类型).getFullList();
    const workHoursMonth = await pb.collection(集合.月工时).getFullList();
    const workHoursDay = await pb.collection(集合.日工时).getFullList();
    const attendanceSheetData = attendanceRecords.map((record) => ({
      序号: record.id,
      工人: workers.find((worker) => worker.id === record.worker_id)?.name,
      // 签到时间: record.check_in,
      // 签退时间: record.check_out,
      签到时间: dayjs(record.check_in).format("YYYY/MM/DD HH:mm"),
      签退时间: dayjs(record.check_out).format("YYYY/MM/DD HH:mm"),
      工作类型: workTypes.find((work) => work.id === record.work)?.name,
      // 创建时间: record.created,
      // 更新时间: record.updated
    }));

    const workHoursDaySheetData = workHoursDay.map((record) => ({
      序号: record.id,
      工人: workers.find((worker) => worker.id === record.worker_id)?.name,
      日期: record.work_date,
      总工时: record.total_work_hours,
    }));

    const workHoursMonthSheetData = workHoursMonth.map((record) => ({
      序号: record.id,
      工人: workers.find((worker) => worker.id === record.worker_id)?.name,
      月份: record.work_month,
      总工时: record.total_work_hours,
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    // 添加每个工作表
    const workHoursMonthSheet = XLSX.utils.json_to_sheet(
      workHoursMonthSheetData
    );
    XLSX.utils.book_append_sheet(wb, workHoursMonthSheet, "工时(月)");

    const workHoursDaySheet = XLSX.utils.json_to_sheet(workHoursDaySheetData);
    XLSX.utils.book_append_sheet(wb, workHoursDaySheet, "工时(日)");

    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceSheetData);
    XLSX.utils.book_append_sheet(wb, attendanceSheet, "考勤记录");
    // 导出Excel
    XLSX.writeFile(wb, "工时记录.xlsx");
    setIsExportLoading(false);
  };
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <LList
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Space>
            <PySearchSelect
              onChangeFn={(value: { value: string; label: string }) => {
                setFilters(get_select_filter([value]), "replace");
                // PySearchSelectValue.current=[value];
              }}
              options={null}
              onClearFn={() => {
                setFilters([], "replace");
              }}
            />
            <Popconfirm
              title="导出考勤记录"
              description="你确定需要导出考勤记录吗?"
              onConfirm={exportToExcel}
              // onCancel={cancel}
              okText="进行导出"
              cancelText="取消操作"
            >
              <Button loading={isExportLoading}>导出所有考勤记录到Excel</Button>
            </Popconfirm>

            <Button type="primary" onClick={() => setHelpOpen(true)}>
              查看帮助
            </Button>
            <Drawer
              title="帮助"
              open={helpOpen}
              onClose={() => setHelpOpen(false)}
            >
              <Paragraph>
                1、导出所有考勤记录到Excel需要一定的时间，请耐心等待
              </Paragraph>
              <Paragraph>
                2、如果误点击二次确认中的导出按钮，可刷新页面组织导出
              </Paragraph>
            </Drawer>
          </Space>
        </>
      )}
    >
      <List
        {...listProps}
        pagination={{
          ...listProps.pagination,
          showSizeChanger: false,
          // 关闭条目显示数量改变，性能和显示都会好一些
        }}
        renderItem={renderItem}
      />
      {/* <Pagination defaultCurrent={1} total={50} /> */}
    </LList>
  );
}
