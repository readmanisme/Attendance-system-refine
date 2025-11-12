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
import { useCallback, useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
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
  const { tableProps: workerData, setFilters } = useTable({
    resource: __Workers_TableName,
    syncWithLocation: false,
    filters: {
      defaultBehavior: "replace",
    },
  });

  const workerMap = useMemo(() => {
    const m = new Map<string, string>();
    workerData.dataSource?.forEach((w: any) => {
      if (w?.id !== undefined) m.set(w.id, w.name);
    });
    return m;
  }, [workerData.dataSource]);

  const selectedIds = useMemo(
    () => SelectedPerson.map((p) => p.value),
    [SelectedPerson]
  );

  const idFilters = useMemo(() => {
    if (!selectedIds.length) {
      return [...workerMap.keys()].map((id) => ({
        field: "worker_id",
        operator: "eq",
        value: id,
      }));
    }
    return selectedIds.map((id) => ({
      field: "worker_id",
      operator: "eq",
      value: id,
    }));
  }, [selectedIds, workerMap]);

  useEffect(() => {
    if (selectedIds.length) {
      setFilters([
        {
          operator: "or",
          value: selectedIds.map((id) => ({
            field: "id",
            operator: "eq",
            value: id,
          })),
        },
      ]);
    } else {
      setFilters([]);
    }
  }, [selectedIds, setFilters]);

  const monthViewFilter = useMemo(() => {
    const temp = [
      {
        operator: "and",
        value: [
          { field: "work_month", operator: "gte", value: GongShiData[0] },
          { field: "work_month", operator: "lte", value: GongShiData[1] },
        ],
      },
    ];
    if (idFilters.length) {
      temp.unshift({
        operator: "or",
        value: idFilters,
      });
    }
    return {
      operator: "and",
      value: temp,
    };

    // 依赖 selectedIds, GongShiData（来自 store）
  }, [GongShiData, idFilters]);

  const dayViewFilter = useMemo(() => {
    const temp = [
      {
        operator: "and",
        value: [
          {
            field: "work_date",
            operator: "gte",
            value: dayjs(GongShiData[0]).startOf("month").format("YYYY-MM-DD"),
          },
          {
            field: "work_date",
            operator: "lte",
            value: dayjs(GongShiData[1]).endOf("month").format("YYYY-MM-DD"),
          },
        ],
      },
    ];
    if (idFilters.length) {
      temp.unshift({
        operator: "or",
        value: idFilters,
      });
    }
    return {
      operator: "and",
      value: temp,
    };
  }, [GongShiData, idFilters]);

  const attendanceFilter = useMemo(() => {
    const temp = [
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
    ];
    if (idFilters.length) {
      temp.unshift({
        operator: "or",
        value: idFilters,
      });
    }
    return {
      operator: "and",
      value: temp,
    };
  }, [GongShiData, idFilters]);

  // ======================== 获取数据 ========================

  const { data: month_view_data } = useList({
    resource: __WorkHours_Month_ViewName,
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
    filters: [monthViewFilter as CrudFilter],
    pagination: {
      mode: "off",
    },
  });

  const { data: day_view_data } = useList({
    resource: __WorkHours_Day_ViewName,
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
    filters: [dayViewFilter as CrudFilter],
    pagination: {
      mode: "off",
    },
  });

  const { data: attendance_record_data } = useList({
    resource: __AttendanceRecord_TableName,
    // queryOptions: {
    //   enabled: !tableProps.loading,
    // },
    filters: [attendanceFilter as CrudFilter],
    pagination: {
      mode: "off",
    },
  });

  const { data: workType_test_data } = useList({
    resource: __WorkTypes_TableName,
    pagination: {
      mode: "off",
    },
  });

  const { listProps } = useSimpleList({
    resource: __SalaryType_TableName,
    // syncWithLocation: false, //如果不设置这个，那么table的筛选设置就会被读取；不过更好的方法是
    //关掉table的syncWithLocation，反正我也没什么要刷新的，而且刷新后选择器就会消失，无所谓了
    pagination: {
      mode: "off",
    },
    meta: {
      expand: ["worker_name", "work_type"],
    },
  });
  // ======================== 衍生数据计算 ========================

  const useGroupByWorkerId = (data: any) => {
    return useMemo(() => {
      const map = new Map();
      (data?.data || []).forEach((item: any) => {
        const k = item.worker_id;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(item);
      });
      return map;
    }, [data?.data]);
  };
  const month_view_data_map = useGroupByWorkerId(month_view_data);
  const day_view_data_map = useGroupByWorkerId(day_view_data);
  const attendance_record_data_map = useGroupByWorkerId(attendance_record_data);

  const workTypeMap = useMemo(() => {
    const m = new Map<string, string>();
    workType_test_data?.data?.forEach((t: any) => {
      if (t?.id !== undefined) m.set(t.id, t.name);
    });
    return m;
  }, [workType_test_data?.data]);

  // listProps_work_type (用于检测有没有 "基础")
  const listProps_work_type = useMemo(() => {
    return listProps?.dataSource?.map((item) => item.expand?.work_type?.name);
  }, [listProps?.dataSource]);

  const SalaryDict = useMemo(() => {
    const data = listProps?.dataSource || [];
    const dict: Record<string, number> = {};
    data.forEach((item: any) => {
      const workName = item?.expand?.worker_name?.name;
      const workType = item?.expand?.work_type?.name;
      const num = Number(item?.SalaryNum) || 0;
      if (workName && workType) dict[`${workName}_${workType}`] = num;
      else if (workName) dict[workName] = num;
      else if (workType) dict[workType] = num;
      else dict["基础"] = num; // 不应该发生
    });
    return dict;
  }, [listProps?.dataSource]);

  const { dayDuringSalaryMap, daySalaryMap, monthSalaryMap, matchSalaryMap } =
    useMemo(() => {
      const dayDuringSalaryMap = new Map<string, Decimal>();
      const daySalaryMap = new Map<string, Map<string, Decimal>>();
      const monthSalaryMap = new Map<string, Map<string, Decimal>>();
      const matchSalaryMap = new Map<string, string>();

      const salaryDict = SalaryDict; // local ref
      const attendanceList = attendance_record_data?.data || [];

      for (const rec of attendanceList) {
        const dbID = rec.id as string;
        const workerName = workerMap.get(rec.worker_id) || "未知";
        const workName = workTypeMap.get(rec.work) || "未知";
        // 计算时长小时
        const checkIn = dayjs(rec.check_in);
        const checkOut = dayjs(rec.check_out);
        // 防止异常数据
        if (
          !checkIn.isValid() ||
          !checkOut.isValid() ||
          checkOut.isBefore(checkIn)
        ) {
          continue;
        }
        const durationHours = new Decimal(checkOut.diff(checkIn)).dividedBy(
          1000 * 60 * 60
        );

        const day = checkIn.format("YYYY-MM-DD");
        //const day = dayjs(item.check_in).format("YYYY-MM-DD").slice(0, 10);

        const month = day.slice(0, 7);

        const salaryKey =
          `${workerName}_${workName}` in salaryDict
            ? `${workerName}_${workName}`
            : workerName in salaryDict
            ? workerName
            : workName in salaryDict
            ? workName
            : "基础";
        const salaryNum = new Decimal(salaryDict[salaryKey] ?? 0);
        // 单条记录工资
        const recordSalary = durationHours.mul(salaryNum);

        const uniqueKey = `${workerName}_${workName}_${day}_${dbID}`;

        dayDuringSalaryMap.set(uniqueKey, recordSalary);

        // match salary mapping
        matchSalaryMap.set(dbID, `${salaryKey}:${salaryNum.toString()}`);

        // accumulate daySalaryMap
        if (!daySalaryMap.has(workerName))
          daySalaryMap.set(workerName, new Map());
        const workerDayMap = daySalaryMap.get(workerName)!;
        workerDayMap.set(
          day,
          (workerDayMap.get(day) || new Decimal(0)).plus(recordSalary)
        );

        // accumulate monthSalaryMap
        if (!monthSalaryMap.has(workerName))
          monthSalaryMap.set(workerName, new Map());
        const workerMonthMap = monthSalaryMap.get(workerName)!;
        workerMonthMap.set(
          month,
          (workerMonthMap.get(month) || new Decimal(0)).plus(recordSalary)
        );
      }

      return {
        dayDuringSalaryMap,
        daySalaryMap,
        monthSalaryMap,
        matchSalaryMap,
      };
    }, [attendance_record_data?.data, SalaryDict, workerMap, workTypeMap]);

  // useEffect(() => {
  //   if (monthSalaryMap.size !== 0) {
  //     setSalaryLoading(false);
  //   }
  // }, [monthSalaryMap.size]);
  useEffect(() => {
    // 只要这些计算结果存在，说明计算已完成
    if (
      dayDuringSalaryMap &&
      daySalaryMap &&
      monthSalaryMap &&
      matchSalaryMap
    ) {
      setSalaryLoading(false);
    }
  }, [dayDuringSalaryMap, daySalaryMap, monthSalaryMap, matchSalaryMap]);

  // ======================== 导出xlsx文件 ========================

  const exportToExcel = useCallback(async () => {
    setIsExportLoading(true);
    try {
      const { default: exportExcel } = await import(
        "@/pages/gong-shi/export_xlsx"
      );
      await exportExcel(exportRange, SalaryDict);
    } finally {
      setIsExportLoading(false);
    }
  }, [exportRange, SalaryDict]);
  // ======================== 拓展表定义 ========================

  const TableExpandedRowRender = useCallback(
    (record: { id: string; name: string }) => {
      const workerId = record.id;
      const month_records = month_view_data_map.get(workerId) ?? [];
      const day_records = day_view_data_map.get(workerId) ?? [];
      const attendance_records = attendance_record_data_map.get(workerId) ?? [];

      // 二级表数据（按月）
      const expandDataSource = month_records.map((r: any) => {
        const workerName = workerMap.get(r.worker_id) || "未知";
        const month = r.work_month;
        const total_work_hours = r.total_work_hours;
        const xinzi = (
          monthSalaryMap.get(workerName)?.get(month) || new Decimal(0)
        ).toString();
        return {
          key: month,
          worker: workerName,
          month,
          total_work_hours,
          xinzi,
        };
      });

      const expandColumns = [
        { title: "月份", dataIndex: "month", key: "month" },
        { title: "工人", dataIndex: "worker", key: "worker" },
        {
          title: "总工时",
          dataIndex: "total_work_hours",
          key: "total_work_hours",
        },
        { title: "薪资", dataIndex: "xinzi", key: "xinzi" },
      ];

      // depth2 render
      const expandedRowRender_d2 = (rowRecord: any) => {
        const work_month = rowRecord.month;
        const records = day_records.filter((d: any) =>
          d.work_date.startsWith(work_month)
        );
        const dataSource_d2 = records.map((r: any) => {
          const worker_name = workerMap.get(r.worker_id) || "未知";
          const xinzi = (
            daySalaryMap.get(worker_name)?.get(r.work_date) || new Decimal(0)
          ).toString();
          return {
            key: r.work_date,
            worker: worker_name,
            date: r.work_date,
            total_work_hours: r.total_work_hours,
            xinzi,
          };
        });

        const columns_d2 = [
          { title: "日期", dataIndex: "date", key: "date" },
          { title: "工人", dataIndex: "worker", key: "worker" },
          {
            title: "总工时",
            dataIndex: "total_work_hours",
            key: "total_work_hours",
          },
          { title: "薪资", dataIndex: "xinzi", key: "xinzi" },
        ];

        // depth3 render
        const expandedRowRender_d3 = (d2Record: any) => {
          const work_date = d2Record.date;
          const recs = attendance_records.filter((ar: any) =>
            dayjs(ar.check_in).format("YYYY-MM-DD").startsWith(work_date)
          );

          const dataSource_d3 = recs.map((r: any) => {
            const worker_name = workerMap.get(r.worker_id) || "未知";
            const work_name = workTypeMap.get(r.work) || "未知";
            const check_in = dayjs(r.check_in);
            const check_out = dayjs(r.check_out);
            const dbID = String(r.id);
            const uniqueKey = `${worker_name}_${work_name}_${check_in.format(
              "YYYY-MM-DD"
            )}_${dbID}`;
            return {
              key: dbID,
              worker: worker_name,
              check_in: check_in.format("YYYY-MM-DD HH:mm"),
              check_out: check_out.format("YYYY-MM-DD HH:mm"),
              work: work_name,
              total_work_hours: new Decimal(check_out.diff(check_in))
                .dividedBy(1000 * 60 * 60)
                .toString(),
              matchvalue: matchSalaryMap.get(dbID) || "",
              xinzi: (
                dayDuringSalaryMap.get(uniqueKey) || new Decimal(0)
              ).toString(),
            };
          });

          const columns_d3 = [
            { title: "工人", dataIndex: "worker", key: "worker" },
            { title: "签到时间", dataIndex: "check_in", key: "check_in" },
            { title: "签退时间", dataIndex: "check_out", key: "check_out" },
            { title: "工作类型", dataIndex: "work", key: "work" },
            {
              title: "总工时",
              dataIndex: "total_work_hours",
              key: "total_work_hours",
            },
            {
              title: "薪资",
              dataIndex: "xinzi",
              key: "xinzi",
              render: (value: any, rec: any) => (
                <Tooltip title={rec.matchvalue}>
                  <div className="flex flex-row items-center gap-2">
                    {value}
                    <IconHelp size={16} />
                  </div>
                </Tooltip>
              ),
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
          size="small"
          expandable={{
            expandedRowRender: expandedRowRender_d2,
            expandRowByClick: true,
          }}
        />
      );
    },
    // 依赖列表：只在下面这些映射变化时重建函数体（以减少 Table 重建）
    [
      month_view_data_map,
      day_view_data_map,
      attendance_record_data_map,
      workerMap,
      monthSalaryMap,
      daySalaryMap,
      workTypeMap,
      matchSalaryMap,
      dayDuringSalaryMap,
    ]
  );

  const hasBaseWorkType = useMemo(() => {
    return listProps_work_type?.includes("基础");
  }, [listProps_work_type]);

  const get_un_salary_work = useMemo(() => {
    const work_types = [...workTypeMap.values()];
    const un_salary_work_types = work_types.filter(
      (item) => !(item in SalaryDict)
    );
    if (!un_salary_work_types.length) return "";
    return `未设置工资的工作类型：${un_salary_work_types.join(
      ","
    )}，请设置其对应的工资,否则按照基础工资计算。`;
  }, [workTypeMap, SalaryDict]);
  // 使用稳定的 key 来避免 JSON.stringify 全表重渲染（GongShiData 由 store 提供，取 valueOf）
  const gongShiKey = useMemo(() => {
    try {
      return `${GongShiData?.[0]?.valueOf?.() ?? ""}-${
        GongShiData?.[1]?.valueOf?.() ?? ""
      }`;
    } catch {
      return "gs-default";
    }
  }, [GongShiData]);

  if (!hasBaseWorkType) {
    return (
      <Alert
        message="基础工作类型不存在，请添加"
        type="error"
        showIcon
        description="如果基础工资类型不存在，也请添加基础工作后添加"
      />
    );
  }
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
                if (Array.isArray(value)) {
                  setSelectedPerson(value);
                } else {
                  setSelectedPerson([value]);
                }
              }}
              placeholder="多选工人,支持拼音"
              mode="multiple"
              needButton={true}
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
        {get_un_salary_work !== "" && (
          <Alert
            message={get_un_salary_work}
            type="warning"
            showIcon
            className="mb-2! mr-2! w-full"
          />
        )}
        <SwitchDataRangeGongShi />
      </div>
      <Table
        key={gongShiKey}
        // !!!通过强制重渲染避免在还未计算完成的时候取值导致错误
        // 不加JSON.stringify似乎也能跑，他会自动转换
        {...workerData}
        pagination={{
          ...workerData.pagination,
          onChange: (page, pageSize) => {
            setSalaryLoading(true);
            // console.log("page", page, "pageSize", pageSize);
          },
        }}
        loading={SalaryLoading}
        // loading={listProps.loading}
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
