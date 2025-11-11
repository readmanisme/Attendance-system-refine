import { useState } from "react";
import { Alert, Button, Space } from "antd";
import { sample, sampleSize } from "es-toolkit/array";
import dayjs from "dayjs";
import pb from "@/utils/pocketbase";
import {
  useCreateMany,
  useDeleteMany,
  useMany,
  useUpdateMany,
} from "@refinedev/core";
const _ = { sample, sampleSize };
export function TestPage() {
  const 集合 = {
    考勤记录: __AttendanceRecord_TableName,
    工人: __Workers_TableName,
    工作类型: __WorkTypes_TableName,
  };
  const [status_2, set_status] = useState("未进行");
  const start_time = Date.now();
  // you can also fetch all records at once via getFullList
  const records_time_test = async () => {
    // console.log("Fetching records...");
    const records = await pb
      .collection(__AttendanceRecord_TableName)
      .getFullList({});
    // const end_time = Date.now();
    // console.log(`${records.length} records fetched in ${(end_time - start_time)/1000}s`);
    // 43925 records fetched in 2.597s
  };
  // records_time_test()
  const gen_and_push_fake_data = async () => {
    const { fakerZH_CN: faker } = await import("@faker-js/faker");
    faker.seed(666);
    faker.setDefaultRefDate("2023-01-01T00:00:00.000Z");

    const workers_test_data = () => {
      set_status("开始生成工人数据");
      let workers = [];
      for (let i = 0; i < 100; i++) {
        workers.push(faker.person.fullName());
      }
      workers = workers.map((item) => ({ name: item }));
      return workers;
    };
    set_status("开始插入工人数据");
    // 可以擦除集合，https://pocketbase.io/docs/api-collections/#truncate-collection
    // 不过我这里就手动操作一下好了
    for (const worker of workers_test_data()) {
      const record = await pb.collection(集合["工人"]).create(worker);
    }
    const workers_2 = await pb.collection(集合["工人"]).getFullList();
    set_status("开始插入工作类型数据");
    const workType_test_data = () => {
      const workTypes = ["浇水", "移苗", "加工", "清理", "施肥", "割草"];
      const workTypes_new = workTypes.map((item) => ({ name: item }));
      // faker.preson.jobType()还没有本地化
      return workTypes_new;
    };
    for (const workType of workType_test_data()) {
      const record = await pb.collection(集合["工作类型"]).create(workType);
    }
    const workType_2 = await pb.collection(集合["工作类型"]).getFullList();
    set_status("开始插入考勤记录数据");

    function getAllValidDates(
      startMonth: number,
      endMonth: number,
      year: number
    ) {
      const dates = [];
      let currentDate = dayjs(`${year}-${startMonth}-01`);

      // 结束日期为下一年 1 月 1 日的前一天
      const endDate = dayjs(`${year}-${endMonth}-01`).endOf("month");

      while (
        currentDate.isBefore(endDate) ||
        currentDate.isSame(endDate, "day")
      ) {
        dates.push(currentDate.format("YYYY-MM-DD"));
        currentDate = currentDate.add(1, "day");
      }

      return dates;
    }

    const validDates = getAllValidDates(3, 11, 2024);

    const attendance_record_test_data = () => {
      const attendance_records = [];
      for (const day of validDates) {
        const that_day_workers = _.sampleSize(workers_2, 80);
        for (const worker of that_day_workers) {
          // const work = _.sample(workType_2).id
          const worker_id = worker.id;
          const work_segments = _.sample([1, 2, 3]);
          if (work_segments === 1) {
            const start_time = dayjs(day).set("hour", 8).toISOString();
            const check_in_time = dayjs(day)
              .set("hour", 8)
              .set("minute", 30)
              .toISOString();
            const end_time = dayjs(day).set("hour", 18).toISOString();
            const check_out_time = dayjs(day)
              .set("hour", 18)
              .set("minute", 30)
              .toISOString();
            const check_in = faker.date.between({
              from: start_time,
              to: check_in_time,
            });
            const check_out = faker.date.between({
              // from: check_out_time,
              // to: end_time,
              from: end_time,
              to: check_out_time,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in,
              check_out: check_out,
            });
          } else if (work_segments === 2) {
            const start_time_1 = dayjs(day).set("hour", 8).toISOString();
            const check_in_time_1 = dayjs(day)
              .set("hour", 8)
              .set("minute", 30)
              .toISOString();
            const end_time_1 = dayjs(day).set("hour", 12).toISOString();
            const check_out_time_1 = dayjs(day)
              .set("hour", 12)
              .set("minute", 30)
              .toISOString();
            const start_time_2 = dayjs(day).set("hour", 13).toISOString();
            const check_in_time_2 = dayjs(day)
              .set("hour", 13)
              .set("minute", 30)
              .toISOString();
            const end_time_2 = dayjs(day).set("hour", 18).toISOString();
            const check_out_time_2 = dayjs(day)
              .set("hour", 18)
              .set("minute", 30)
              .toISOString();
            const check_in_1 = faker.date.between({
              from: start_time_1,
              to: check_in_time_1,
            });
            const check_out_1 = faker.date.between({
              // from: check_out_time_1,
              // to: end_time_1,
              from: end_time_1,
              to: check_out_time_1,
            });
            const check_in_2 = faker.date.between({
              from: start_time_2,
              to: check_in_time_2,
            });
            const check_out_2 = faker.date.between({
              // from: check_out_time_2,
              // to: end_time_2,
              from: end_time_2,
              to: check_out_time_2,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in_1,
              check_out: check_out_1,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in_2,
              check_out: check_out_2,
            });
          } else if (work_segments === 3) {
            const start_time_1 = dayjs(day).set("hour", 8).toISOString();
            const check_in_time_1 = dayjs(day)
              .set("hour", 8)
              .set("minute", 30)
              .toISOString();
            const end_time_1 = dayjs(day).set("hour", 12).toISOString();
            const check_out_time_1 = dayjs(day)
              .set("hour", 12)
              .set("minute", 30)
              .toISOString();
            const start_time_2 = dayjs(day).set("hour", 13).toISOString();
            const check_in_time_2 = dayjs(day)
              .set("hour", 13)
              .set("minute", 30)
              .toISOString();
            const end_time_2 = dayjs(day).set("hour", 16).toISOString();
            const check_out_time_2 = dayjs(day)
              .set("hour", 16)
              .set("minute", 30)
              .toISOString();
            const start_time_3 = dayjs(day).set("hour", 18).toISOString();
            const check_in_time_3 = dayjs(day)
              .set("hour", 18)
              .set("minute", 30)
              .toISOString();
            const end_time_3 = dayjs(day).set("hour", 22).toISOString();
            const check_out_time_3 = dayjs(day)
              .set("hour", 22)
              .set("minute", 30)
              .toISOString();
            const check_in_1 = faker.date.between({
              from: start_time_1,
              to: check_in_time_1,
            });
            const check_out_1 = faker.date.between({
              // from: check_out_time_1,
              // to: end_time_1,
              from: end_time_1,
              to: check_out_time_1,
            });
            const check_in_2 = faker.date.between({
              from: start_time_2,
              to: check_in_time_2,
            });
            const check_out_2 = faker.date.between({
              // from: check_out_time_2,
              // to: end_time_2,
              from: end_time_2,
              to: check_out_time_2,
            });
            const check_in_3 = faker.date.between({
              from: start_time_3,
              to: check_in_time_3,
            });
            const check_out_3 = faker.date.between({
              // from: check_out_time_3,
              // to: end_time_3,
              from: end_time_3,
              to: check_out_time_3,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in_1,
              check_out: check_out_1,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in_2,
              check_out: check_out_2,
            });
            attendance_records.push({
              worker_id: worker_id,
              work: _.sample(workType_2)?.id,
              check_in: check_in_3,
              check_out: check_out_3,
            });
          }
        }
      }
      return attendance_records;
    };
    for (const attendance_record of attendance_record_test_data()) {
      const record = await pb
        .collection(集合["考勤记录"])
        .create(attendance_record);
    }
    set_status("数据插入完成");
  };

  const { mutate: CreateBatchRecord } = useCreateMany({
    resource: __WorkTypes_TableName,
  });
  const { mutate: UpdateBatchRecord } = useUpdateMany({
    resource: __WorkTypes_TableName,
  });
  const [ids, setIds] = useState();

  // const {
  //   result,
  //   query: { isLoading, isError },
  // } = useMany({
  //   resource: __AttendanceRecord_TableName,
  //   ids,
  // });
  const { mutate: DeleteBatchRecord } = useDeleteMany({});
  // const { mutate: UpsertBatchRecord } = useCreateMany({
  //   resource: __AttendanceRecord_TableName,
  // });
  const Batch_Data = [
    // {
    //   id: "hum6603y11lhe40",
    //   name: "基础",
    // },
    {
      id: "t79z4z42tw0m864",
      name: "割草",
    },
    {
      id: "9nmaij895286071",
      name: "施肥",
    },
    {
      id: "892t3lmr9i86cdq",
      name: "清理",
    },
    {
      id: "4j5z8e284yygvv3",
      name: "加工",
    },
    {
      id: "unc5e93y500caqp",
      name: "移苗",
    },
    {
      id: "47u95f1j4na68e4",
      name: "浇水",
    },
  ];
  function Batch_Operation(type: string) {
    if (type === "create") {
      CreateBatchRecord({ values: Batch_Data });
    }
    if (type === "update") {
      UpdateBatchRecord({
        ids: Batch_Data.map((item) => item.id),
        values: { name: "测试" },
      }); //不是我要的那种批量
    }
    if (type === "delete") {
      DeleteBatchRecord({
        ids: Batch_Data.map((item) => item.id),
        resource: __WorkTypes_TableName,
      });
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-500">
        TailwindCSS 安装检测，此处文字应该是蓝色
      </h1>
      <Button onClick={gen_and_push_fake_data} disabled={true}>
        向 PocketBase 推送假数据
      </Button>
      <Alert
        // 这里用时间线更好，但是没有必要
        type="info"
        message="假数据处理进度"
        description={status_2}
        showIcon
      />
      <Space>
        <Button onClick={() => Batch_Operation("create")}>批量 create</Button>
        {/* <Button onClick={() => setIds(["2u9sx55r9ykx1f9","jn20y08225l8ani","x85e186m011dya8"])}>批量 get</Button> */}
        <Button onClick={() => Batch_Operation("update")}>批量 update</Button>
        <Button onClick={() => Batch_Operation("delete")}>批量 delete</Button>
        {/* <Button onClick={records_time_test}>批量 upsert</Button> */}
      </Space>
    </div>
  );
}
