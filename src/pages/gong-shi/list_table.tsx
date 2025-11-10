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
import { IconHelp } from "@tabler/icons-react";
import dayjs, { Dayjs } from "dayjs";
import PySearchSelect from "@/components/PySearchSelect";
import { useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
import _ from "lodash";
import { useSomeStore } from "@/stores";
import { SwitchDataRangeGongShi } from "@/components/SwitchDataRangeGongShi";
export default function GongShiList() {
  // ======================== useState等 ========================
  const [SalaryLoading, setSalaryLoading] = useState(true);
  const { GongShiData, setGongShiData } = useSomeStore();
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [exportRange, setExportRange] = useState([
    dayjs().startOf("year"),
    dayjs().endOf("year"),
  ]);
  const [SelectedPerson, setSelectedPerson] = useState<
    { value: string; label: string }[]
  >([]);
  // ======================== 暂存 ========================

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
    // return filters;
    return [
      {
        operator: "or",
        value: filters,
      },
    ] as CrudFilter[];
  };
  const get_month_view_filter = (type: "month" | "day" | "a") => {
    // const data = tableProps.dataSource;
    const ids = SelectedPerson?.map((item) => item.value);

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
                operator: "lte",
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
              {
                field: "check_out",
                operator: "ne",
                value: "",
              },
            ],
          },
        ],
      };
    }
  };
  // ======================== 获取数据 ========================

  const { tableProps: workerData } = useTable({
    resource: __Workers_TableName,
    filters: {
      defaultBehavior: "replace",
    },
  });

  const FilteredworkerData = useMemo(() => {
    if (!SelectedPerson.length) {
      return workerData;
    }
    return {
      ...workerData,
      // dataSource不是SelectedPerson的去掉
      dataSource: workerData.dataSource?.filter((item) =>
        SelectedPerson.some((person) => person.value === item.id)
      ),
    };
  }, [SelectedPerson, workerData]);

  const {
    data: month_view_data,
    isLoading,
    isError,
  } = useList({
    resource: __WorkHours_Month_ViewName,
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
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
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
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
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
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

  const { listProps } = useSimpleList({
    resource: __SalaryType_TableName,
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // ======================== 衍生数据计算 ========================
  function useGroupByWorkerId<T extends { worker_id: string }>(
    data: { data?: T[] } | null | undefined
  ) {
    return useMemo(() => {
      return (
        data?.data?.reduce((acc, item) => {
          if (!acc.has(item.worker_id)) {
            acc.set(item.worker_id, []);
          }
          acc.get(item.worker_id)!.push(item);
          return acc;
        }, new Map<string, T[]>()) || new Map()
      );
    }, [data]);
  }
  // @ts-expect-error,111
  const month_view_data_map = useGroupByWorkerId(month_view_data);
  // @ts-expect-error,111
  const day_view_data_map = useGroupByWorkerId(day_view_data);
  // @ts-expect-error,111
  const attendance_record_data_map = useGroupByWorkerId(attendance_record_data);

  const workerDetails = useMemo(() => {
    return (
      workerData.dataSource?.reduce((acc, worker) => {
        if (worker.id !== undefined) {
          // 添加条件判断
          acc[worker.id] = worker.name;
        }
        return acc;
      }, {}) ?? {}
    );
  }, [workerData.dataSource]);

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

  const listProps_work_type = useMemo(() => {
    return listProps?.dataSource?.map((item) => item.expand?.work_type?.name);
  }, [listProps?.dataSource]);

  const SalaryDict = useMemo(() => {
    const data = listProps?.dataSource;
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

  useEffect(() => {
    // @ts-expect-error,这里MonthSalaryDict在不知道什么情况下会存在undefined的key
    if (!(undefined in MonthSalaryDict)) {
      setSalaryLoading(false);
    }
  }, [MonthSalaryDict]);

  // ======================== 导出xlsx文件 ========================

  const exportToExcel = async () => {
    setIsExportLoading(true);
    const { default: exportExcel } = await import(
      "@/pages/gong-shi/export_xlsx"
    );
    await exportExcel(exportRange, SalaryDict);
    setIsExportLoading(false);
  };
  // ======================== 拓展表定义 ========================

  const TableExpandedRowRender = (
    record: { id: string; name: string },
    index: number,
    indent: number,
    expanded: boolean
  ) => {
    const item = record;
    // 这里的item是worker
    const month_records = month_view_data_map.get(item.id) ?? [];
    const day_records = day_view_data_map.get(item.id) ?? [];
    const attendance_records = attendance_record_data_map.get(item.id) ?? [];

    const expandDataSource = month_records.map((record) => ({
      key: record.work_month,
      worker: workerDetails[record.worker_id],
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
    // ======================== 拓展表 第二层 定义 ========================

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
        return {
          key: record.work_date,
          worker: worker_name,
          date: record.work_date,
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
      // ======================== 拓展表 第三层 定义 ========================

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
                  <div className="flex flex-row items-center gap-2">
                    {value}
                    <IconHelp size={16} />
                  </div>
                </Tooltip>
              );
            },
          },
        ];
        // ======================== 拓展表 返回ui ========================

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
  // ======================== UI ========================

  return (
    <LList
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Space>
            <PySearchSelect
              onChangeFn={(value: { value: string; label: string }) => {
                if (_.isArray(value)) {
                  setSelectedPerson(value);
                } else {
                  setSelectedPerson([value]);
                }
              }}
              placeholder="选择工人,支持拼音"
              options={null}
              mode="multiple"
              onClearFn={() => {
                setSelectedPerson([]);
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
                    // @ts-expect-error,111
                    defaultValue={exportRange}
                    // @ts-expect-error,有个看不太懂的错误，不管了
                    onChange={(date: [Dayjs, Dayjs], dateString: string) => {
                      setExportRange(date);
                    }}
                  />
                </div>
              }
              onConfirm={exportToExcel}
              okText="进行导出"
              cancelText="取消操作"
            >
              <Button loading={isExportLoading}>导出考勤记录到Excel</Button>
            </Popconfirm>
          </Space>
        </>
      )}
    >
      <Alert
        message="未下班记录将不被计入"
        type="info"
        showIcon
        className="mb-2!"
      />
      <div className="flex items-center justify-end mb-2">
        {get_un_salary_work() !== "" && (
          <Alert
            message={get_un_salary_work()}
            type="warning"
            showIcon
            className="mb-2! mr-2! w-full"
          />
        )}
        <SwitchDataRangeGongShi />
      </div>
      <Table
        key={JSON.stringify(GongShiData)}
        // !!!通过强制重渲染避免在还未计算完成的时候取值导致错误
        // 不加JSON.stringify似乎也能跑，他会自动转换
        {...FilteredworkerData}
        pagination={{
          ...FilteredworkerData.pagination,
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
          // @ts-expect-error,111
          expandedRowRender: TableExpandedRowRender,
          expandRowByClick: true,
        }}
      >
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="name" title="姓名" />
      </Table>
    </LList>
  );
}
