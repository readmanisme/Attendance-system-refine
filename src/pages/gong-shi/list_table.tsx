import { List as LList, useSimpleList, useTable } from "@refinedev/antd";
import { Button, Space, Popconfirm, Table, Tooltip, DatePicker } from "antd";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import PocketBase from "pocketbase";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import _ from "lodash";
import { useSomeStore } from "@/stores";
export default function GongShiList() {
  const [SalaryLoading, setSalaryLoading] = useState(true);
  const { GongShiData, setGongShiData } = useSomeStore();
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
  const get_month_view_filter = (type) => {
    const data = tableProps.dataSource;
    const ids = data?.map((item) => item.id);

    if (type === "month") {
      const filters = ids?.map((id) => ({
        field: "worker_id",
        operator: "eq",
        value: id,
      }));
      return {
        operator: "and",
        value: [
          {
            operator: "or",
            value: filters,
          },
          {
            field: "work_month",
            operator: "eq",
            value: GongShiData,
          },
        ],
      };
    } else if (type === "day") {
      const filters = ids?.map((id) => ({
        field: "worker_id",
        operator: "eq",
        value: id,
      }));
      return {
        operator: "and",
        value: [
          {
            operator: "or",
            value: filters,
          },
          {
            field: "work_date",
            operator: "startswith",
            value: GongShiData,
          },
        ],
      };
    } else if (type === "a") {
      const worker_filters = ids?.map((id) => ({
        field: "worker_id",
        operator: "eq",
        value: id,
      }));
      return {
        operator: "and",
        value: [
          {
            operator: "or",
            value: worker_filters,
          },
          {
            operator: "and",
            value: [
              {
                field: "check_in",
                operator: "gte",
                value: dayjs(GongShiData).startOf("month").toISOString().replace("T", " "),
              },
              {
                field: "check_in",
                // 这里合适着了，不用改成check_out
                operator: "lte",
                value: dayjs(GongShiData).endOf("month").toISOString().replace("T", " "),
              },
            ],
          },
        ],
      };
    }
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
    filters: [get_month_view_filter("month")],
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
    filters: [get_month_view_filter("day")],
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
    filters: [get_month_view_filter("a")],
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
  const workerDetails = useMemo(() => {
    return (
      tableProps.dataSource?.reduce((acc, worker) => {
        acc[worker.id] = worker.name;
        return acc;
      }, {}) ?? {}
    );
  }, [tableProps.dataSource]);

  const workTypeDetails = useMemo(() => {
    return (
      workType_test_data?.data?.reduce((acc, workType) => {
        acc[workType.id] = workType.name;
        return acc;
      }, {}) ?? {}
    );
  }, [workType_test_data?.data]);
  const { listProps } = useSimpleList({
    resource: __SalaryType_TableName,
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // const dataSource = listProps?.dataSource;
  // console.log("dataSource", listProps?.dataSource);
  // const SalaryLoading=useRef(false);
  // const [SalaryLoading, setSalaryLoading] = useState(false);
  const SalaryDict = useMemo(() => {
    // setSalaryLoading(true);
    // SalaryLoading.current=true;
    const data = listProps?.dataSource;
    // console.log("data", data)
    if (!data) return {};

    return data.reduce<Record<string, number>>((acc, item) => {
      const workName = item?.expand?.worker_name?.name;
      const workType = item?.expand?.work_type?.name;

      if (workName && workType) {
        acc[`${workName}_${workType}`] = item?.SalaryNum || 0;
      } else if (workName) {
        acc[workName] = item?.SalaryNum || 0;
      } else if (workType) {
        acc[workType] = item?.SalaryNum || 0;
      } else {
        acc["基础"] = item?.SalaryNum || 0; // 不应该发生
      }

      return acc;
    }, {});
  }, [listProps?.dataSource]);
  // const SalaryDict = GetSalaryDict();
  // console.dir(SalaryDict);
  const MatchSalary = useMemo(() => ({}), []);
  const DayDuringSalaryDict = useMemo(() => {
    if (_.isEmpty(SalaryDict)) return {};
    return (
      attendance_record_data?.data?.reduce((dict, item) => {
        const workerName = workerDetails[item.worker_id];
        const workName = workTypeDetails[item.work];
        const day = item.check_in.slice(0, 10);
        const dbID = item.id;
        const check_in = dayjs(item.check_in);
        const check_out = dayjs(item.check_out);
        const duration = Decimal.div(check_out.diff(check_in), 1000 * 60 * 60);
        const key = `${workerName}_${workName}_${day}_${dbID}`;
        // !!!这里一定要使用dbID，不然工作重复就会导致异常
        const salaryKey =
          `${workerName}_${workName}` in SalaryDict
            ? `${workerName}_${workName}`
            : workerName in SalaryDict
            ? workerName
            : workName in SalaryDict
            ? workName
            : "基础";
        const matchValue = salaryKey + ":" + SalaryDict[salaryKey];
        // 如果不在MatchSalary中，就添加
        if (!MatchSalary[dbID]) {
          MatchSalary[dbID] = matchValue;
        }

        dict[key] = Decimal.mul(duration, SalaryDict[salaryKey]);
        return dict;
      }, {}) || {}
    );
  }, [
    MatchSalary,
    SalaryDict,
    attendance_record_data?.data,
    workTypeDetails,
    workerDetails,
  ]);
  // const day_during_SalaryDict = Get_day_during_SalaryDict();
  const DaySalaryDict = useMemo(() => {
    if (_.isEmpty(DayDuringSalaryDict)) return {};
    return Object.entries(DayDuringSalaryDict).reduce(
      (aggregatedDict, [key, salary]) => {
        const [workerName, workName, day] = key.split("_");
        aggregatedDict[workerName] = aggregatedDict[workerName] || {};
        aggregatedDict[workerName][day] =
          // (aggregatedDict[workerName][day] || 0) + salary;
          Decimal.add(aggregatedDict[workerName][day] || 0, salary);

        return aggregatedDict;
      },
      {}
    );
  }, [DayDuringSalaryDict]);
  // const day_SalaryDict = Get_day_SalaryDict();
  const MonthSalaryDict = useMemo(() => {
    if (_.isEmpty(DaySalaryDict)) return {};
    return Object.entries(DaySalaryDict).reduce(
      (monthlySalaryDict, [workerName, dailySalaries]) => {
        monthlySalaryDict[workerName] = Object.entries(dailySalaries).reduce(
          (monthlySalaries, [day, salary]) => {
            const month = day.slice(0, 7);
            // monthlySalaries[month] = (monthlySalaries[month] || 0) + salary;
            monthlySalaries[month] = Decimal.add(
              monthlySalaries[month] || 0,
              salary
            );
            return monthlySalaries;
          },
          monthlySalaryDict[workerName] || {}
        );
        return monthlySalaryDict;
      },
      {}
    );
  }, [DaySalaryDict]);
  // const month_SalaryDict = Get_month_SalaryDict();

  useEffect(() => {
    // setSalaryLoading(true)
    // if (!tableProps.loading){
    //   console.log("别的",listProps)
    // }
    if (!_.isEmpty(MonthSalaryDict) && !(undefined in MonthSalaryDict)) {
      // console.log("MonthSalaryDict", MonthSalaryDict)
      setSalaryLoading(false);
    }
  }, [MonthSalaryDict]);

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
      xinzi:
        MonthSalaryDict[workerDetails[record.worker_id]][
          record.work_month
        ].toString(),
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
          xinzi: DaySalaryDict[worker_name][record.work_date].toString(),
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
          const dbID = record.id;
          return {
            key: record.id,
            worker: worker_name,
            check_in: check_in.format("YYYY-MM-DD HH:mm"),
            check_out: check_out.format("YYYY-MM-DD HH:mm"),
            work: work_name,
            total_work_hours: Decimal.div(
              check_out.diff(check_in),
              1000 * 60 * 60
            ).toString(),
            matchvalue: MatchSalary[dbID],
            xinzi:
              DayDuringSalaryDict[
                worker_name +
                  "_" +
                  work_name +
                  "_" +
                  check_in.format("YYYY-MM-DD") +
                  "_" +
                  dbID
              ].toString(),
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
                <Tooltip title={record.matchvalue}>
                  <span>{value}</span>
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
              description="你确定需要导出全量考勤记录吗?"
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
      <div className="flex items-center justify-end mb-2">
      <DatePicker
        picker="month"
        allowClear={false}
        className="w-56"
        defaultValue={dayjs(GongShiData)}
        onChange={(date, dateString) => {
          setSalaryLoading(true);
          setGongShiData(dateString);
        }}
      />
      </div>
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
      key={GongShiData}
      // !!!通过强制重渲染避免在还未计算完成的时候取值导致错误
        {...tableProps}
        pagination={{
          ...tableProps.pagination,
          onChange: (page, pageSize) => {
            setSalaryLoading(true);
          },
        }}
        loading={SalaryLoading}
        // 在这里判断salary那些字段是不是空的没有作用，因为换页的时候它们都不是空的
        // 判断tableProps.loading作用不大，因为他加载完后工资计算还没完
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
