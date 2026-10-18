import PocketBase from "pocketbase";
import {
  AttendanceRecord_TableName,
  SalaryType_TableName,
  Workers_TableName,
  WorkTypes_TableName,
  Backend_URL,
} from "../constants";

export const pb = new PocketBase(Backend_URL);

const BATCH_CHUNK = 250;

type AttachmentRecord = {
  worker_id: string;
  work: string;
  work_date: string;
  work_minutes: number;
};

/**
 * 测试数据注入/清理助手。
 *
 * 测试库(pocketbase-for-playwright-test)是 schema-only 的空库，所有数据由各测试按需注入。
 * 原则:
 *  1. 类实例在 spec 文件里创建，该文件所有测试共用；
 *  2. 通过 API 注入的记录 id 全部记录在案；
 *  3. 通过 UI 创建的数据虽然拿不到 id，但统一用 created > 启动时间 的范围清理；
 *  4. cleanup 依赖顺序: 考勤记录 → 薪资 → 人员 → 工种，防止悬空引用。
 */
export class TestDB {
  /** 本文件开始运行的时间(留 5s 余量，用于兜底清理 UI 创建的数据) */
  private startedAt = new Date(Date.now() - 5_000).toISOString().replace("T", " ");
  /** 通过 API 注入的记录: [表名, id] */
  private tracked: { table: string; id: string }[] = [];

  // ======================== 查询小工具 ========================

  private async listAll(table: string, filter?: string) {
    return pb.collection(table).getFullList({
      ...(filter ? { filter } : {}),
      batch: 500,
      fetchAll: true,
    } as any);
  }

  /** 先删掉同名旧数据(库里可能有上次失败运行残留)，再创建 */
  private async deleteByName(table: string, name: string) {
    const old = await pb.collection(table).getFullList({
      filter: `name = "${name}"`,
    });
    if (old.length > 0) {
      await this.deleteByIds(
        table,
        old.map((r: any) => r.id),
      );
    }
  }

  private async deleteByIds(table: string, ids: string[]) {
    for (let i = 0; i < ids.length; i += BATCH_CHUNK) {
      const chunk = ids.slice(i, i + BATCH_CHUNK);
      const batch = pb.createBatch();
      for (const id of chunk) {
        batch.collection(table).delete(id);
      }
      try {
        await batch.send();
      } catch (err: any) {
        // batch 失败时逐条删除，定位具体是哪一条出问题；已不存在的记录(404)视为已清理
        for (const id of chunk) {
          try {
            await pb.collection(table).delete(id);
          } catch (inner: any) {
            if (inner?.status === 404) continue;
            throw new Error(
              `[cleanup] 删除失败: table=${table} id=${id}\n` +
                `batch error: ${JSON.stringify(err?.response ?? err?.message ?? err)}\n` +
                `single error: ${JSON.stringify(inner?.response ?? inner?.message ?? inner)}`,
            );
          }
        }
      }
    }
  }

  // ======================== 数据注入 ========================

  /** 创建人员(会先清理同名残留并追踪 id)，名字会原样返回 */
  async seedWorker(name: string): Promise<{ id: string; name: string }> {
    await this.deleteByName(Workers_TableName, name);
    const record = await pb.collection(Workers_TableName).create({ name });
    this.tracked.push({ table: Workers_TableName, id: record.id });
    // 稍作间隔,保证 created 时间递增(否则同毫秒创建的记录排序不稳定)
    await new Promise((r) => setTimeout(r, 12));
    return { id: record.id, name };
  }

  async seedWorkers(names: string[]) {
    const workers: { id: string; name: string }[] = [];
    for (const name of names) {
      workers.push(await this.seedWorker(name));
    }
    return workers;
  }

  /** 批量创建工种 */
  async seedWorkTypes(names: string[]) {
    const types: { id: string; name: string }[] = [];
    for (const name of names) {
      types.push(await this.seedWorkType(name));
    }
    return types;
  }

  /** 创建工种(会先清理同名残留并追踪 id) */
  async seedWorkType(name: string): Promise<{ id: string; name: string }> {
    await this.deleteByName(WorkTypes_TableName, name);
    const record = await pb.collection(WorkTypes_TableName).create({ name });
    this.tracked.push({ table: WorkTypes_TableName, id: record.id });
    // 稍作间隔,保证 created 时间递增(否则同毫秒创建的记录排序不稳定)
    await new Promise((r) => setTimeout(r, 12));
    return { id: record.id, name };
  }

  /** 创建薪资条目(无 worker_id 表示工种默认时薪) */
  async seedSalary(opts: { workerId?: string; workTypeId?: string; salaryNum: number }) {
    const record = await pb.collection(SalaryType_TableName).create({
      worker_name: opts.workerId ?? "",
      work_type: opts.workTypeId ?? "",
      SalaryNum: opts.salaryNum,
    });
    this.tracked.push({ table: SalaryType_TableName, id: record.id });
    return record;
  }

  /** 创建考勤记录 */
  async seedRecord(opts: AttachmentRecord) {
    const record = await pb.collection(AttendanceRecord_TableName).create({
      worker_id: opts.worker_id,
      work: opts.work,
      work_date: opts.work_date,
      work_minutes: opts.work_minutes,
    });
    this.tracked.push({ table: AttendanceRecord_TableName, id: record.id });
    return record;
  }

  /** 批量创建考勤记录 */
  async seedRecords(records: AttachmentRecord[]) {
    for (let i = 0; i < records.length; i += BATCH_CHUNK) {
      const batch = pb.createBatch();
      for (const r of records.slice(i, i + BATCH_CHUNK)) {
        batch.collection(AttendanceRecord_TableName).create(r);
      }
      await batch.send();
    }
  }

  /**
   * 确保存在“基础”工种及其默认时薪 10。
   * 应用很多逻辑(默认时薪/未设时薪提示)依赖名为“基础”的工种。
   */
  async ensureBaseWork(): Promise<{ workTypeId: string; salaryId: string }> {
    const existing = await this.listAll(WorkTypes_TableName, `name = "基础"`);
    let workTypeId: string;
    if (existing.length > 0) {
      workTypeId = existing[0].id;
    } else {
      const created = await this.seedWorkType("基础");
      workTypeId = created.id;
    }
    const salaryList = await this.listAll(
      SalaryType_TableName,
      `work_type = "${workTypeId}" && worker_name = ""`,
    );
    let salaryId: string;
    if (salaryList.length > 0) {
      salaryId = salaryList[0].id;
    } else {
      const salary = await this.seedSalary({ workTypeId, salaryNum: 10 });
      salaryId = salary.id;
    }
    return { workTypeId, salaryId };
  }

  // ======================== 清理 ========================

  /**
   * 清理: 先删本文件注入的 id 数据，再按 created 时间范围兜底删 UI 创建的数据。
   * 表删除顺序: 考勤记录 → 薪资 → 工种 → 人员
   */
  async cleanup() {
    for (const table of [
      AttendanceRecord_TableName,
      SalaryType_TableName,
      WorkTypes_TableName,
      Workers_TableName,
    ]) {
      const timeBased : any[] = await this.listAll(table, `created > "${this.startedAt}"`);
      const trackedIds = this.tracked.filter((t) => t.table === table).map((t) => t.id);
      const ids = [...new Set([...trackedIds, ...timeBased.map((r: any) => r.id)])];
      if (ids.length === 0) continue;
      await this.deleteByIds(table, ids);
    }
    this.tracked = [];
    this.startedAt = new Date(Date.now() - 5_000).toISOString().replace("T", " ");
  }
}

export const WORKER_PREFIX = "测试员";
