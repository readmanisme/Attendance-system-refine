import { List as LList, useSimpleList, useTable } from "@refinedev/antd";
import {
  Button,
  Space,
  Popconfirm,
  Table,
  Tooltip,
  DatePicker,
  Alert,
} from "antd";
const { RangePicker } = DatePicker;
import { CrudFilter, useList } from "@refinedev/core";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";
import PocketBase from "pocketbase";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import _ from "lodash";
import { useSomeStore } from "@/stores";
import { SwitchDataRangeGongShi } from "@/components/SwitchDataRangeGongShi";
export default function GongShiList() {
  const [SalaryLoading, setSalaryLoading] = useState(true);
  const { GongShiData, setGongShiData } = useSomeStore();
  // const [GongShiData, setGongShiData]=useState([dayjs("2024-05-05").startOf('month').format('YYYY-MM')])
  const get_select_filter = (value: { value: string; label: string }[]) => {
    const list = value?.map((item) => item?.value);
    const filters: CrudFilter[] = [];
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
  const get_month_view_filter = (type: "month" | "day" | "a") => {
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
          // {
          //   field: "work_month",
          //   operator: "eq",
          //   value: GongShiData,
          // },
          {
            operator: "and",
            value: [
              {
                field: "work_month",
                operator: "gte",
                value: GongShiData[0],
              },
              {
                field: "work_month",
                operator: "lte",
                value: GongShiData[1],
              },
            ],
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
          // {
          //   field: "work_date",
          //   operator: "startswith",
          //   value: GongShiData,
          // },
          {
            operator: "and",
            value: [
              {
                field: "work_date",
                operator: "gte",
                value: dayjs(GongShiData[0])
                  .startOf("month")
                  .format("YYYY-MM-DD"),
              },
              {
                field: "work_date",
                operator: "lt",
                value: dayjs(GongShiData[1])
                  .endOf("month")
                  .format("YYYY-MM-DD"),
              },
            ],
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
                value: dayjs(GongShiData[0])
                  .startOf("month")
                  .toISOString()
                  .replace("T", " "),
              },
              {
                field: "check_in",
                // 这里合适着了，不用改成check_out
                operator: "lte",
                value: dayjs(GongShiData[1])
                  .endOf("month")
                  .toISOString()
                  .replace("T", " "),
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
    filters: [get_month_view_filter("month") as CrudFilter],
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
    filters: [get_month_view_filter("day") as CrudFilter],
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
    filters: [get_month_view_filter("a") as CrudFilter],
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
        if (worker.id !== undefined) {
          // 添加条件判断
          acc[worker.id] = worker.name;
        }
        return acc;
      }, {}) ?? {}
    );
  }, [tableProps.dataSource]);

  const workTypeDetails = useMemo(() => {
    return (
      workType_test_data?.data?.reduce((acc, workType) => {
        if (workType.id !== undefined) {
          // 添加条件判断
          acc[workType.id] = workType.name;
        }
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
  const listProps_work_type = listProps?.dataSource?.map(
    (item) => item.expand?.work_type?.name
  );

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
  const MatchSalary: { [key: string]: string } = useMemo(() => ({}), []);
  const DayDuringSalaryDict = useMemo(() => {
    if (_.isEmpty(SalaryDict)) return {};
    return (
      attendance_record_data?.data?.reduce((dict, item) => {
        const workerName = workerDetails[item.worker_id];
        const workName = workTypeDetails[item.work];
        const day = dayjs(item.check_in).format("YYYY-MM-DD").slice(0, 10);
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
        if (!MatchSalary[dbID!]) {
          MatchSalary[dbID!] = matchValue;
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
  const DaySalaryDict: { [key: string]: { [key: string]: Decimal } } =
    useMemo(() => {
      if (_.isEmpty(DayDuringSalaryDict)) return {};
      return Object.entries(DayDuringSalaryDict).reduce(
        (
          aggregatedDict: { [key: string]: { [key: string]: Decimal } },
          [key, salary]
        ) => {
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
      (
        monthlySalaryDict: { [key: string]: { [key: string]: Decimal } },
        [workerName, dailySalaries]
      ) => {
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
    // @ts-expect-error,这里MonthSalaryDict在不知道什么情况下会存在undefined的key
    // if (!_.isEmpty(MonthSalaryDict) && !(undefined in MonthSalaryDict)) {
    if (!(undefined in MonthSalaryDict)) {
      // console.log("MonthSalaryDict", MonthSalaryDict)
      setSalaryLoading(false);
    }
  }, [MonthSalaryDict]);
  const export_range = useRef([dayjs().startOf("year"), dayjs().endOf("year")]);
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
    const start = export_range.current[0].toISOString().replace("T", " ");
    const end = export_range.current[1]
      .endOf("month")
      .toISOString()
      .replace("T", " ");
    const start_day = export_range.current[0].format("YYYY-MM-DD");
    const end_day = export_range.current[1].endOf("month").format("YYYY-MM-DD");
    const start_month = export_range.current[0].format("YYYY-MM");
    const end_month = export_range.current[1].format("YYYY-MM");
    const attendanceRecords = await pb.collection(集合.考勤记录).getFullList({
      filter:
        "check_in !=null && check_out !=null && check_in >= '" +
        start +
        "' && check_in <= '" +
        end +
        "'",
    });
    const workers = await pb.collection(集合.工人).getFullList();
    const workTypes = await pb.collection(集合.工作类型).getFullList();
    const workerDetails = workers.reduce(
      (acc: Record<string, string>, worker) => {
        acc[worker.id] = worker.name;
        return acc;
      },
      {}
    );
    const workTypeDetails = workTypes.reduce(
      (acc: Record<string, string>, workType) => {
        acc[workType.id] = workType.name;
        return acc;
      },
      {}
    );
    const workHoursMonth = await pb.collection(集合.月工时).getFullList({
      filter:
        "work_month >= '" +
        start_month +
        "' && work_month <= '" +
        end_month +
        "'",
    });
    const workHoursDay = await pb.collection(集合.日工时).getFullList({
      filter:
        "work_date >= '" + start_day + "' && work_date <= '" + end_day + "'",
      // work_date在数据库中的类型不像日期，但确实能这么过滤
    });
    const attendanceSheetData = attendanceRecords.map((record) => {
      const dbID = record.id;
      const duration = Decimal.div(
        dayjs(record.check_out).diff(dayjs(record.check_in)),
        1000 * 60 * 60
      ).toString();
      const worker_name = workerDetails[record.worker_id];
      const work_name = workTypeDetails[record.work];
      // const check_in = dayjs(record.check_in);
      // const key=`${worker_name}_${work_name}_${dayjs(record.check_in).format("YYYY-MM-DD")}_${dbID}`
      const salaryKey =
        `${worker_name}_${work_name}` in SalaryDict
          ? `${worker_name}_${work_name}`
          : worker_name in SalaryDict
          ? worker_name
          : work_name in SalaryDict
          ? work_name
          : "基础";
      const matchValue = salaryKey + ":" + SalaryDict[salaryKey];
      return {
        序号: dbID,
        工人: worker_name,
        // 签到时间: record.check_in,
        // 签退时间: record.check_out,
        签到时间: dayjs(record.check_in).format("YYYY/MM/DD HH:mm"),
        签退时间: dayjs(record.check_out).format("YYYY/MM/DD HH:mm"),
        工作类型: work_name,
        总工时: duration,
        薪资: Decimal.mul(duration, SalaryDict[salaryKey]).toString(),
        // 创建时间: record.created,
        // 更新时间: record.updated
      };
    });

    const workHoursDaySheetData = workHoursDay.map((record) => {
      const worker_name = workerDetails[record.worker_id];
      const date = record.work_date;
      // 通过attendanceSheetData，筛选worker和date相同的记录，计算每天的薪资
      const attendance_records = attendanceSheetData.filter(
        (record) =>
          record.工人 === worker_name &&
          dayjs(record.签到时间).format("YYYY-MM-DD") === date
      );
      // const total_work_hours = attendance_records.reduce(
      //   (acc, record) => acc + parseFloat(record.总工时),
      //   0
      // );
      const xinzi = attendance_records.reduce(
        (acc, record) => Decimal.add(acc, record.薪资),
        new Decimal(0)
      );
      return {
        序号: record.id,
        工人: worker_name,
        日期: date,
        总工时: record.total_work_hours,
        薪资: xinzi.toString(),
      };
    });

    const workHoursMonthSheetData = workHoursMonth.map((record) => {
      const worker_name = workerDetails[record.worker_id];
      const month = record.work_month;
      // 通过workHoursDaySheetData，筛选worker和month相同的记录，计算每月的薪资
      const work_hours_day_records = workHoursDaySheetData.filter(
        (record) =>
          record.工人 === worker_name &&
          dayjs(record.日期).format("YYYY-MM") === month
      );
      // const total_work_hours = work_hours_day_records.reduce(
      //   (acc, record) => acc + parseFloat(record.总工时),
      //   0
      // );
      const xinzi = work_hours_day_records.reduce(
        (acc, record) => Decimal.add(acc, record.薪资),
        new Decimal(0)
      );
      return {
        序号: record.id,
        工人: worker_name,
        月份: month,
        总工时: record.total_work_hours,
        薪资: xinzi.toString(),
      };
    });

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
  const TableExpandedRowRender = (
    record: { id: string; name: string },
    index: number,
    indent: number,
    expanded: boolean
  ) => {
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
    const expandedRowRender_d2 = (
      record: {
        worker: string;
        month: string;
        total_work_hours: string;
        xinzi: string;
      },
      index: number,
      indent: number,
      expanded: boolean
    ) => {
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
        // const date=dayjs(record.work_date).format("YYYY-MM-DD");
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
      const expandedRowRender_d3 = (
        record: {
          worker: string;
          date: string;
          total_work_hours: string;
          xinzi: string;
        },
        index: number,
        indent: number,
        expanded: boolean
      ) => {
        const work_date = record.date;
        const records =
          attendance_records?.filter((record) =>
            dayjs(record.check_in).format("YYYY-MM-DD").startsWith(work_date)
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
            matchvalue: MatchSalary[dbID!],
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
            render: (value: any, record: any, index: number) => {
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

  const [exportRange, setExportRange] = useState([
    dayjs().startOf("year"),
    dayjs().endOf("year"),
  ]);
  if (!Object.values(workTypeDetails).includes("基础")) {
    return (
      <Alert
        message="基础工作类型不存在，请添加"
        type="error"
        showIcon
        description="如果基础工资类型不存在，也请添加基础工作后添加"
      />
    );
  }
  const get_un_salary_work = () => {
    // 找出没有设置工资的工作
    const work_types = Object.values(workTypeDetails);
    const un_salary_work_types = work_types.filter((item) => !SalaryDict[item]);
    if (_.isEmpty(un_salary_work_types)) return "";
    return (
      "未设置工资的工作类型：" +
      un_salary_work_types.join(",") +
      "，请设置其对应的工资,否则按照基础工资计算。"
    );
  };
  if (!listProps.loading && !listProps_work_type?.includes("基础")) {
    return (
      <Alert
        message="基础工资类型不存在，请添加"
        type="error"
        showIcon
        description="如果基础工作类型不存在，请添加基础工作类型，并设置其对应的工资。"
      />
    );
  }
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
              description={
                <div className="flex flex-col items-center justify-start gap-2">
                  选择导出时间范围
                  <br />
                  <div>
                    {exportRange[0].format("YYYY-MM-DD")} 至{" "}
                    {exportRange[1].endOf("month").format("YYYY-MM-DD")}
                  </div>
                  <RangePicker
                    size="small"
                    picker="month"
                    defaultValue={export_range.current as [Dayjs, Dayjs]}
                    // @ts-expect-error,有个看不太懂的错误，不管了
                    onChange={(date: [Dayjs, Dayjs], dateString: string) => {
                      export_range.current = date;
                      setExportRange(date);
                    }}
                  />
                </div>
              }
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
            <Alert
        message="未下班记录将不被计入"
        type="info"
        showIcon
        className="mb-2"
      />
      <div className="flex items-center justify-end mb-2">
        {get_un_salary_work() !== "" && (
          <Alert
            message={get_un_salary_work()}
            type="warning"
            showIcon
            className="mb-2 mr-2 w-full"
          />
        )}
        <SwitchDataRangeGongShi />
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
        key={JSON.stringify(GongShiData)}
        // !!!通过强制重渲染避免在还未计算完成的时候取值导致错误
        // 不加JSON.stringify似乎也能跑，他会自动转换
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
          // @ts-expect-error,这里泛型很不好搞
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
