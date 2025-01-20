import { List as LList, useSimpleList, useTable } from "@refinedev/antd";
import { Button, Space, Popconfirm, Table, Tooltip } from "antd";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import PocketBase from "pocketbase";
import PySearchSelect from "@/components/PySearchSelect";
import { useRef, useState } from "react";
import { render } from "@antv/g2";

export default function GongShiList() {
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

  const { tableProps, setFilters } = useTable({
    resource: __Workers_TableName,
    filters: {
      defaultBehavior: "replace",
    },
  });
  const get_month_view_filter = () => {
    const data = tableProps.dataSource;
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
      enabled: !tableProps.loading,
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
      enabled: !tableProps.loading,
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
      enabled: !tableProps.loading,
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
  const workerDetails =
    tableProps.dataSource?.reduce((acc, worker) => {
      acc[worker.id] = worker.name;
      return acc;
    }, {}) ?? {};

  const workTypeDetails =
    workType_test_data?.data?.reduce((acc, workType) => {
      acc[workType.id] = workType.name;
      return acc;
    }, {}) ?? {};
  const { listProps } = useSimpleList({
    resource: __SalaryType_TableName,
    meta: {
      expand: ["work_name", "work_type"],
    },
  });
  const GetSalaryDict = () => {
    const dict: Record<string, number> = {};
    const data = listProps?.dataSource;
    data?.forEach((item) => {
      if (item?.expand?.work_name?.name && item?.expand?.work_type?.name) {
        dict[item?.expand?.work_name?.name + "_" + item?.expand?.work_type?.name] =
          item?.SalaryNum;
      } else if (item?.expand?.work_name?.name) {
        dict[item?.expand?.work_name?.name] = item?.SalaryNum;
      } else if (item?.expand?.work_type?.name) {
        dict[item?.expand?.work_type?.name] = item?.SalaryNum;
      } else {
        dict["基础"] = item?.SalaryNum;
        // 不应该发生，因为基础本身就是一种工种
      }
    });
    return dict;
  };
  const SalaryDict = GetSalaryDict();
  const Get_day_during_SalaryDict = () => {
    const dict = {};
    const data = attendance_record_data?.data;
    data?.forEach((item) => {
      const worker_name = workerDetails[item.worker_id];
      const work_name = workTypeDetails[item.work];
      const day = item.check_in.slice(0, 10);
      if (SalaryDict[worker_name + "_" + work_name]) {
        dict[worker_name + "_" + work_name + "_" + day] =
          SalaryDict[worker_name + "_" + work_name];
      } else if (SalaryDict[worker_name]) {
        // dict[worker_name+"_"+day]=SalaryDict[worker_name];
        dict[worker_name + "_" + work_name + "_" + day] =
          SalaryDict[worker_name];
      } else if (SalaryDict[work_name]) {
        // dict[work_name+"_"+day]=SalaryDict[work_name];
        dict[worker_name + "_" + work_name + "_" + day] = SalaryDict[work_name];
      } else {
        // dict["基础"+"_"+day]=SalaryDict["基础"];
        dict[worker_name + "_" + work_name + "_" + day] = SalaryDict["基础"];
      }
    });
    return dict;
  };
  const day_during_SalaryDict = Get_day_during_SalaryDict();
  const Get_day_SalaryDict = () => {
    // 将day_during_SalaryDict按照人员和日期聚合，计算每人每天的薪资
    const aggregatedDict = {};

    for (const key in day_during_SalaryDict) {
      const [worker_name, work_name, day] = key.split("_");
      const salary = day_during_SalaryDict[key];

      if (!aggregatedDict[worker_name]) {
        aggregatedDict[worker_name] = {};
      }

      if (!aggregatedDict[worker_name][day]) {
        aggregatedDict[worker_name][day] = 0;
      }

      aggregatedDict[worker_name][day] += salary;
    }

    return aggregatedDict;
  };
  const day_SalaryDict = Get_day_SalaryDict();
  const Get_month_SalaryDict = () => {
    // 将day_SalaryDict按照人员和月份聚合，计算每人每月的薪资
    const monthlySalaryDict = {};

    for (const worker_name in day_SalaryDict) {
      const dailySalaries = day_SalaryDict[worker_name];

      for (const day in dailySalaries) {
        const salary = dailySalaries[day];
        const month = day.slice(0, 7); // 提取年月部分，例如 "2023-10"

        if (!monthlySalaryDict[worker_name]) {
          monthlySalaryDict[worker_name] = {};
        }

        if (!monthlySalaryDict[worker_name][month]) {
          monthlySalaryDict[worker_name][month] = 0;
        }

        monthlySalaryDict[worker_name][month] += salary;
      }
    }

    return monthlySalaryDict;
  };
  const month_SalaryDict = Get_month_SalaryDict();
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
  const TableExpandedRowRender = (record, index, indent, expanded) => {
    const item = record;
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

    const expandDataSource = month_records.map((record) => ({
      key: record.work_month,
      worker: workerDetails[record.worker_id],
      // worker: record.name,
      month: record.work_month,
      total_work_hours: record.total_work_hours,
      xinzi: month_SalaryDict[workerDetails[record.worker_id]][record.work_month],
    }));
    const expandColumns = [
      {
        title: "月份",
        dataIndex: "month",
        key: "month",
      },
      {
        title: "工人",
        dataIndex: "worker",
        key: "worker",
      },
      {
        title: "总工时",
        dataIndex: "total_work_hours",
        key: "total_work_hours",
      },
      {
        title: "薪资",
        dataIndex: "xinzi",
        key: "xinzi",
      },
    ];
    const expandedRowRender_d2 = (record, index, indent, expanded) => {
      // d2,表示depth 2，第二层
      const item = record;
      const work_month = item.month;
      // 这里取month而不是work_month，因为这是表的record，取决于表的字段设置
      const records =
        day_records?.filter((record) =>
          record.work_date.startsWith(work_month)
        ) ?? [];
      const dataSource_d2 = records.map((record) => {
        const worker_name = workerDetails[record.worker_id];
        // const work_name = workTypeDetails[record.work];
        return {
          key: record.work_date,
          worker: worker_name,
          date: record.work_date,
          // work: work_name,
          total_work_hours: record.total_work_hours,
          xinzi: day_SalaryDict[worker_name][record.work_date],
        };
      });
      const columns_d2 = [
        {
          title: "日期",
          dataIndex: "date",
          key: "date",
        },
        {
          title: "工人",
          dataIndex: "worker",
          key: "worker",
        },
        // {
        //   title: "工作类型",
        //   dataIndex: "work",
        //   key: "work",
        // },
        {
          title: "总工时",
          dataIndex: "total_work_hours",
          key: "total_work_hours",
        },
        {
          title: "薪资",
          dataIndex: "xinzi",
          key: "xinzi",
        },
      ];
      const expandedRowRender_d3 = (record, index, indent, expanded) => {
        const work_date = record.date;
        const records =
          attendance_records?.filter((record) =>
            record.check_in.startsWith(work_date)
          ) ?? [];
        const dataSource_d3 = records.map((record) => {
          const worker_name = workerDetails[record.worker_id];
          const work_name = workTypeDetails[record.work];
          const check_in = dayjs(record.check_in);
          const check_out = dayjs(record.check_out);
          return {
            key: record.id,
            worker: worker_name,
            check_in: check_in.format("YYYY-MM-DD HH:mm"),
            check_out: check_out.format("YYYY-MM-DD HH:mm"),
            work: work_name,
            total_work_hours: check_out.diff(check_in, "hours"),
            xinzi:
              day_during_SalaryDict[
                worker_name +
                  "_" +
                  work_name +
                  "_" +
                  check_in.format("YYYY-MM-DD")
              ],
          };
        });
        const columns_d3 = [
          {
            title: "工人",
            dataIndex: "worker",
            key: "worker",
          },
          {
            title: "签到时间",
            dataIndex: "check_in",
            key: "check_in",
          },
          {
            title: "签退时间",
            dataIndex: "check_out",
            key: "check_out",
          },
          {
            title: "工作类型",
            dataIndex: "work",
            key: "work",
          },
          {
            title: "总工时",
            dataIndex: "total_work_hours",
            key: "total_work_hours",
          },
          {
            title: "薪资",
            dataIndex: "xinzi",
            key: "xinzi",
            render: (value, record, index) => {
              return (
                <Tooltip title="xinzi">
                  <span>value</span>
                </Tooltip>
              );
            },
          },
        ];
        return (
          <Table
            columns={columns_d3}
            dataSource={dataSource_d3}
            size="small"
            pagination={false}
          />
        );
      };

      return (
        <Table
          columns={columns_d2}
          dataSource={dataSource_d2}
          size="small"
          expandable={{
            expandedRowRender: expandedRowRender_d3,
            expandRowByClick: true,
          }}
        />
      );
    };
    return (
      <Table
        columns={expandColumns}
        dataSource={expandDataSource}
        // pagination={false}
        expandable={{
          expandedRowRender: expandedRowRender_d2,
          expandRowByClick: true,
        }}
        size="small"
      />
    );
  };
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
          </Space>
        </>
      )}
    >
      {/* <List
        {...listProps}
        pagination={{
          ...listProps.pagination,
          showSizeChanger: false,
          // 关闭条目显示数量改变，性能和显示都会好一些
        }}
        renderItem={renderItem}
      /> */}
      {/* <Pagination defaultCurrent={1} total={50} /> */}
      <Table
        {...tableProps}
        rowKey="id"
        size="small"
        expandable={{
          expandedRowRender: TableExpandedRowRender,
          expandRowByClick: true,
        }}
      >
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="name" title="姓名" />
        {/* <Table.Column dataIndex="content" title="Content" /> */}
      </Table>
    </LList>
  );
}
