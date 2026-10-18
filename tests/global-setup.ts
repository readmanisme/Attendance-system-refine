import PocketBase from "pocketbase";
import {
  AttendanceRecord_TableName,
  Backend_URL,
  SalaryType_TableName,
  Workers_TableName,
  WorkTypes_TableName,
} from "./constants";
import { startPocketBase, stopPocketBase } from "./pocketbase-process";

/**
 * 清空业务表。
 * 上一次运行如果中途崩溃(或被杀掉),afterEach 不会执行,残留数据会留到下一次:
 * "第一个工人就是自己"这类断言就会失准。测试库是 schema-only 的,开跑前清空是安全的。
 * 删除顺序:考勤记录 → 薪资 → 工种 → 人员(避免悬空引用)。
 */
async function purgeBusinessData() {
  const pb = new PocketBase(Backend_URL);
  pb.autoCancellation(false);
  for (const table of [
    AttendanceRecord_TableName,
    SalaryType_TableName,
    WorkTypes_TableName,
    Workers_TableName,
  ]) {
    const rows = await pb.collection(table).getFullList({ batch: 500, fetchAll: true } as any);
    if (rows.length === 0) continue;
    const batch = pb.createBatch();
    for (const row of rows) batch.collection(table).delete(row.id);
    await batch.send();
    console.log(`[pw] 清理残留数据: ${table} ${rows.length} 条`);
  }
}

export default async function globalSetup() {
  await startPocketBase();
  await purgeBusinessData();
  // 无论测试正常结束还是中途崩溃退出，都保证杀掉测试后端进程
  process.on("exit", () => {
    void stopPocketBase();
  });
  process.on("SIGINT", () => {
    void stopPocketBase();
    process.exit(130);
  });
}
