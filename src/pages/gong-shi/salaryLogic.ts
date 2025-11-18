// salaryLogic.ts
import dayjs from "dayjs";
import Decimal from "decimal.js";

/** 按 worker_id 分组 */
export function groupByWorkerId(data: any[]) {
  const map = new Map<string, any[]>();
  for (const item of data || []) {
    const k = item.worker_id;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

/** 构建 SalaryDict： { "工人_工种": 数值 } */
export function buildSalaryDict(list: any[]) {
  const dict: Record<string, number> = {};
  for (const item of list || []) {
    const workerName = item?.expand?.worker_name?.name;
    const workType = item?.expand?.work_type?.name;
    const num = Number(item?.SalaryNum) || 0;

    if (workerName && workType) dict[`${workerName}_${workType}`] = num;
    else if (workerName) dict[workerName] = num;
    else if (workType) dict[workType] = num;
  }
  return dict;
}

/**
 * 工资计算核心函数
 * 输入:
 *  - attendanceRecords: 考勤记录
 *  - workerMap: workerId => 工人名
 *  - workTypeMap: workId => 工作类型名
 *  - salaryDict: 构建好的工资字典
 */
export function calcSalaryMaps(attendanceRecords: any[], workerMap: Map<string, string>, workTypeMap: Map<string, string>, salaryDict: Record<string, number>) {
  const dayDuringSalaryMap = new Map<string, Decimal>();
  const daySalaryMap = new Map<string, Map<string, Decimal>>();
  const monthSalaryMap = new Map<string, Map<string, Decimal>>();
  const matchSalaryMap = new Map<string, string>();

  for (const rec of attendanceRecords || []) {
    const dbID = rec.id as string;
    const workerName = workerMap.get(rec.worker_id) || "未知";
    const workName = workTypeMap.get(rec.work) || "未知";

    const checkIn = dayjs(rec.check_in);
    const checkOut = dayjs(rec.check_out);

    if (!checkIn.isValid() || !checkOut.isValid() || checkOut.isBefore(checkIn)) continue;

    const hours = new Decimal(checkOut.diff(checkIn)).div(1000 * 60 * 60);
    const day = checkIn.format("YYYY-MM-DD");
    const month = checkIn.format("YYYY-MM");

    // 匹配工资规则
    const salaryKey =
      `${workerName}_${workName}` in salaryDict
        ? `${workerName}_${workName}`
        : workerName in salaryDict
        ? workerName
        : workName in salaryDict
        ? workName
        : "基础";

    const salaryNum = new Decimal(salaryDict[salaryKey] ?? 0);
    const recordSalary = hours.mul(salaryNum);

    // 唯一 key 用于第三层表
    const uniqueKey = `${workerName}_${workName}_${day}_${dbID}`;
    dayDuringSalaryMap.set(uniqueKey, recordSalary);

    matchSalaryMap.set(dbID, `${salaryKey}:${salaryNum.toString()}`);

    // 日累计
    if (!daySalaryMap.has(workerName)) daySalaryMap.set(workerName, new Map());
    const dmap = daySalaryMap.get(workerName)!;
    dmap.set(day, (dmap.get(day) || new Decimal(0)).plus(recordSalary));

    // 月累计
    if (!monthSalaryMap.has(workerName)) monthSalaryMap.set(workerName, new Map());
    const mmap = monthSalaryMap.get(workerName)!;
    mmap.set(month, (mmap.get(month) || new Decimal(0)).plus(recordSalary));
  }

  return { dayDuringSalaryMap, daySalaryMap, monthSalaryMap, matchSalaryMap };
}

/** 检查未设置工资的工种提示 */
export function getUnsalariedWorkTypes(workTypeMap: Map<string, string>, salaryDict: Record<string, number>) {
  const allTypes = [...workTypeMap.values()];
  const unsalaried = allTypes.filter((t) => !(t in salaryDict));

  if (!unsalaried.length) return "";
  return `未设置工资的工作类型：${unsalaried.join(",")}，请设置其对应的工资,否则按照基础工资计算。`;
}
