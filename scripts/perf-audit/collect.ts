/**
 * 性能审计采集脚本(纯 node 运行,不依赖 bun / vitest):
 *
 *   node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts
 *
 * 做三件事:
 *   1. 从真实后端(默认 127.0.0.1:29401)读数据,记录数据画像与各页面的请求开销;
 *   2. 对统计页聚合层按 1/3/6/12 倍真实分布放大,测各 builder 的耗时与全量遍历次数;
 *   3. 对报告中每一条「重复/冗余」问题做定点量化(现状 vs 优化版)。
 *
 * 输出:scripts/perf-audit/results.json(原始数据)+ 控制台摘要。
 */
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import {
  PB_URL,
  TABLES,
  buildMonthlyInputs,
  countTraversal,
  fetchList,
  findDuplicatesIndexOf,
  findDuplicatesSet,
  fmtBytes,
  fmtMs,
  measure,
  measureAsync,
  monthlyCurrent,
  monthlyEqual,
  monthlyOptimized,
  now,
  round2,
  salaryStatsFull,
  salaryStatsRecordsOnly,
  scaleRecords,
} from "./lib.ts";
import {
  buildContext,
  buildHealth,
  buildOverview,
  buildProfiles,
  buildRelation,
  buildSankey,
  filterRecordsByMonth,
  minutesToHours,
} from "@/pages/tong-ji/compute";
import { computeSalaryStats, resolveSalaryKey } from "@/utils/salary";
import { resolveBatchState } from "@/pages/qian-dao/batchState";

// ======================== 单页请求(不翻页) ========================
const fetchOnce = async (
  collection: string,
  opts: { page?: number; perPage?: number; filter?: string; sort?: string; expand?: string } = {},
) => {
  const url = new URL(`/api/collections/${collection}/records`, PB_URL);
  url.searchParams.set("page", String(opts.page ?? 1));
  url.searchParams.set("perPage", String(opts.perPage ?? 10));
  if (opts.filter) url.searchParams.set("filter", opts.filter);
  if (opts.sort) url.searchParams.set("sort", opts.sort);
  if (opts.expand) url.searchParams.set("expand", opts.expand);
  const t0 = now();
  const res = await fetch(url);
  const text = await res.text();
  const ms = now() - t0;
  if (!res.ok) throw new Error(`${collection} ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { items: any[]; totalItems: number };
  return {
    items: json.items,
    total: json.totalItems,
    ms,
    bytes: Buffer.byteLength(text, "utf8"),
    httpRequests: 1,
  };
};

const sumRequests = (list: Array<{ ms: number; bytes: number; httpRequests: number; items?: any[] }>) => ({
  logicalQueries: list.length,
  httpRequests: list.reduce((s, r) => s + r.httpRequests, 0),
  bytes: list.reduce((s, r) => s + r.bytes, 0),
  /** 单次(不重复)墙钟耗时,作为量级参考 */
  wallMs: round2(list.reduce((s, r) => s + r.ms, 0)),
  /** 实际下载到的行数(单页查询只算该页,不算 totalItems) */
  rows: list.reduce((s, r) => s + (r.items?.length ?? 0), 0),
});

const main = async () => {
  const startedAt = new Date();
  const tStart = now();
  console.log(`\n=== 性能审计采集 ===`);
  console.log(`backend : ${PB_URL}`);
  console.log(`node    : ${process.version}`);
  console.log(`cpu     : ${cpus()[0]?.model ?? "unknown"} × ${cpus().length}\n`);

  // ======================== 1. 数据画像 ========================
  const workersAll = await fetchList(TABLES.workers);
  const workTypesAll = await fetchList(TABLES.workTypes);
  const salaryAll = await fetchList(TABLES.salary, { expand: "worker_name,work_type" });
  // 统计页实际用的查询:带 expand
  const attendanceExpanded = await fetchList(TABLES.attendance, {
    expand: "work,worker_id",
    sort: "",
  });

  const records = attendanceExpanded.items;
  const salaryRecords = salaryAll.items;

  const days = [...new Set(records.map((r) => r.work_date))].sort();
  const workersInData = new Set(records.map((r) => r.worker_id));
  const worksInData = new Set(records.map((r) => r.work));
  const personDayKeys = new Set(records.map((r) => `${r.worker_id}|${r.work_date}`));
  const months = [...new Set(days.map((d) => d.slice(0, 7)))].sort();
  const spanDays = days.length
    ? Math.round(
        (Date.parse(`${days[days.length - 1]}T00:00:00Z`) - Date.parse(`${days[0]}T00:00:00Z`)) /
          86400000,
      ) + 1
    : 0;

  const perDayCount = new Map<string, number>();
  const perPersonDayCount = new Map<string, number>();
  for (const r of records) {
    perDayCount.set(r.work_date, (perDayCount.get(r.work_date) ?? 0) + 1);
    const k = `${r.worker_id}|${r.work_date}`;
    perPersonDayCount.set(k, (perPersonDayCount.get(k) ?? 0) + 1);
  }
  const dayCounts = [...perDayCount.values()].sort((a, b) => a - b);
  const pdCounts = [...perPersonDayCount.values()].sort((a, b) => a - b);

  const dataset = {
    records: records.length,
    workers: workersAll.total,
    workersInRecords: workersInData.size,
    workTypes: workTypesAll.total,
    worksInRecords: worksInData.size,
    salaries: salaryAll.total,
    from: days[0] ?? "",
    to: days[days.length - 1] ?? "",
    spanDays,
    activeDays: days.length,
    months: months.length,
    personDays: personDayKeys.size,
    recordsPerActiveDay: round2(records.length / Math.max(1, days.length)),
    recordsPerPersonDay: round2(records.length / Math.max(1, personDayKeys.size)),
    perDayRecords: {
      min: dayCounts[0] ?? 0,
      median: dayCounts[Math.floor(dayCounts.length / 2)] ?? 0,
      p95: dayCounts[Math.floor(dayCounts.length * 0.95)] ?? 0,
      max: dayCounts[dayCounts.length - 1] ?? 0,
    },
    perPersonDayRecords: {
      median: pdCounts[Math.floor(pdCounts.length / 2)] ?? 0,
      max: pdCounts[pdCounts.length - 1] ?? 0,
    },
    /** 每天的平均在场人数(关系图 O(天×人数²) 的输入) */
    avgWorkersPerDay: round2(
      [...perDayCount.keys()].reduce((s, d) => {
        const set = new Set(records.filter((r) => r.work_date === d).map((r) => r.worker_id));
        return s + set.size;
      }, 0) / Math.max(1, days.length),
    ),
  };

  console.log(
    `数据: ${dataset.records} 条 / ${dataset.workersInRecords} 人 / ${dataset.worksInRecords} 工种 / ` +
      `${dataset.months} 个月(${dataset.from}~${dataset.to}) / ${dataset.personDays} 人天`,
  );

  // ======================== 2. 请求层 ========================
  const gte = `${dataset.from.slice(0, 7)}-01`;
  const lte = (() => {
    const [y, m] = dataset.to.slice(0, 7).split("-").map(Number);
    return `${dataset.to.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  })();
  const rangeFilter = `work_date>='${gte}' && work_date<='${lte}'`;

  // 主表:现状的 7 个逻辑查询
  const gongshiCurrent = async () => {
    const out = [];
    out.push(await fetchOnce(TABLES.workers, { perPage: 10, page: 1 }));
    out.push(await fetchList(TABLES.workTypes));
    out.push(await fetchList(TABLES.salary, { expand: "worker_name,work_type" }));
    out.push(await fetchList(TABLES.attendance, { filter: rangeFilter }));
    out.push(await fetchList(TABLES.workers)); // allWorkers
    out.push(await fetchList(TABLES.workers, { sort: "-created" })); // PySearchSelect
    out.push(await fetchOnce(TABLES.attendance, { perPage: 1, sort: "-work_date" })); // A3
    return sumRequests(out);
  };
  const gongshiOptimized = async () => {
    const out = [];
    out.push(await fetchOnce(TABLES.workers, { perPage: 10, page: 1 }));
    out.push(await fetchList(TABLES.workTypes));
    out.push(await fetchList(TABLES.salary, { expand: "worker_name,work_type" }));
    out.push(await fetchList(TABLES.attendance, { filter: rangeFilter }));
    out.push(await fetchList(TABLES.workers)); // 合并成一份全量(去掉 A2/A3)
    return sumRequests(out);
  };

  // 展开表:按人再查一遍(A6)
  const topWorkerIds = [...personDayKeys]
    .reduce((acc: Array<[string, number]>, k) => {
      const id = k.split("|")[0];
      const hit = acc.find(([w]) => w === id);
      if (hit) hit[1]++;
      else acc.push([id, 1]);
      return acc;
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const expandOne = async () =>
    sumRequests([
      await fetchList(TABLES.attendance, {
        filter: `worker_id='${topWorkerIds[0]}' && ${rangeFilter}`,
      }),
    ]);
  const expandTen = async () => {
    const out = [];
    for (const id of topWorkerIds) {
      out.push(await fetchList(TABLES.attendance, { filter: `worker_id='${id}' && ${rangeFilter}` }));
    }
    return sumRequests(out);
  };
  // 改造后:从主表已拿到的全量里本地过滤(0 请求)
  const rangeRecordsRaw = await fetchList(TABLES.attendance, { filter: rangeFilter });
  const localFilter = () => {
    const t0 = now();
    const byWorker = new Map<string, any[]>();
    for (const r of rangeRecordsRaw.items) {
      const k = String(r.worker_id);
      if (!byWorker.has(k)) byWorker.set(k, []);
      byWorker.get(k)!.push(r);
    }
    const out = topWorkerIds.map((id) => byWorker.get(id) ?? []);
    return { ms: now() - t0, groups: out.length };
  };

  // 签到页:同一天两条查询(A4)
  const sampleDay = days[Math.floor(days.length / 2)] ?? dataset.to;
  const qiandaoCurrent = async () =>
    sumRequests([
      await fetchList(TABLES.workTypes),
      await fetchList(TABLES.attendance, {
        filter: `work_date='${sampleDay}'`,
        expand: "work,worker_id",
        sort: "-created",
      }),
      await fetchList(TABLES.attendance, { filter: `work_date='${sampleDay}'`, expand: "work" }),
      await fetchList(TABLES.workers, { sort: "-created" }),
    ]);
  const qiandaoOptimized = async () =>
    sumRequests([
      await fetchList(TABLES.workTypes),
      await fetchList(TABLES.attendance, {
        filter: `work_date='${sampleDay}'`,
        expand: "work,worker_id",
        sort: "-created",
      }),
      await fetchList(TABLES.workers, { sort: "-created" }),
    ]);

  // 导出(A5)
  const exportAll = async () =>
    sumRequests([
      await fetchList(TABLES.attendance, { filter: `work_minutes != null && ${rangeFilter}` }),
      await fetchList(TABLES.workers),
      await fetchList(TABLES.workTypes),
    ]);

  // 统计页首屏(2 个全量查询)
  const tongjiRequests = async () =>
    sumRequests([
      await fetchList(TABLES.attendance, { expand: "work,worker_id" }),
      await fetchList(TABLES.salary, { expand: "worker_name,work_type" }),
    ]);

  const requests = {
    gongshi: {
      current: await measureAsync(async () => void (await gongshiCurrent()), 5, 1),
      currentDetail: await gongshiCurrent(),
      optimized: await measureAsync(async () => void (await gongshiOptimized()), 5, 1),
      optimizedDetail: await gongshiOptimized(),
    },
    expand: {
      one: await measureAsync(async () => void (await expandOne()), 5, 1),
      oneDetail: await expandOne(),
      ten: await measureAsync(async () => void (await expandTen()), 3, 1),
      tenDetail: await expandTen(),
      localFilter: measure(() => void localFilter(), 7, 2),
      localFilterResult: localFilter(),
    },
    qiandao: {
      current: await measureAsync(async () => void (await qiandaoCurrent()), 5, 1),
      currentDetail: await qiandaoCurrent(),
      optimized: await measureAsync(async () => void (await qiandaoOptimized()), 5, 1),
      optimizedDetail: await qiandaoOptimized(),
    },
    export: { detail: await exportAll() },
    tongji: { detail: await tongjiRequests() },
  };

  console.log(
    `请求: 工时页 ${requests.gongshi.currentDetail.logicalQueries} 查询 / ` +
      `${requests.gongshi.currentDetail.httpRequests} HTTP / ${fmtBytes(requests.gongshi.currentDetail.bytes)}`,
  );

  // ======================== 3. 计算层(按规模) ========================
  /** 取这批记录自身的完整月份范围(放大后数据被平移,不能沿用原始范围,否则会被 filter 裁掉) */
  const rangeOf = (l: any[]): [string, string] => {
    const ms = [...new Set(l.map((r) => (r.work_date as string).slice(0, 7)))].sort();
    return [ms[0], ms[ms.length - 1]];
  };
  const scales = [1, 3, 6, 12];
  const compute: any[] = [];

  for (const factor of scales) {
    const list = factor === 1 ? records : scaleRecords(records, factor);
    const repeat = factor <= 3 ? 7 : 5;
    const range = rangeOf(list);

    const tFilter = measure(() => void filterRecordsByMonth(list, range), repeat, 2);
    const tCtx = measure(() => void buildContext(list, salaryRecords), repeat, 2);
    const ctx = buildContext(list, salaryRecords);
    const tOverview = measure(() => void buildOverview(list, salaryRecords, ctx), repeat, 2);
    const overview = buildOverview(list, salaryRecords, ctx);
    const tProfiles = measure(() => void buildProfiles(list, salaryRecords, ctx), repeat, 2);
    const tRelation = measure(() => void buildRelation(list), repeat, 1);
    const tSankey = measure(() => void buildSankey(list), repeat, 2);
    const tHealth = measure(() => void buildHealth(list, overview), repeat, 2);

    // 模拟 index.tsx 挂载时 7 个 useMemo 的顺序
    const tAll = measure(() => {
      const f = filterRecordsByMonth(list, range);
      const c = buildContext(f, salaryRecords);
      const o = buildOverview(f, salaryRecords, c);
      buildRelation(f);
      buildProfiles(f, salaryRecords, c);
      buildSankey(f);
      buildHealth(f, o);
    }, repeat, 1);

    // 只看「概览」Tab 真正需要的那几项
    const tOverviewOnly = measure(() => {
      const f = filterRecordsByMonth(list, range);
      const c = buildContext(f, salaryRecords);
      const o = buildOverview(f, salaryRecords, c);
      buildProfiles(f, salaryRecords, c);
      buildHealth(f, o);
    }, repeat, 1);

    // 全量遍历次数(Proxy 计数,不计时)
    const { proxy, count } = countTraversal(list);
    const t: Record<string, number> = {};
    let prev = count();
    filterRecordsByMonth(proxy, range);
    t.filter = count() - prev;
    prev = count();
    const c2 = buildContext(proxy, salaryRecords);
    t.context = count() - prev;
    prev = count();
    const o2 = buildOverview(proxy, salaryRecords, c2);
    t.overview = count() - prev;
    prev = count();
    buildRelation(proxy);
    t.relation = count() - prev;
    prev = count();
    buildProfiles(proxy, salaryRecords, c2);
    t.profiles = count() - prev;
    prev = count();
    buildSankey(proxy);
    t.sankey = count() - prev;
    prev = count();
    buildHealth(proxy, o2);
    t.health = count() - prev;
    const traversals = { ...t, total: Object.values(t).reduce((s, v) => s + v, 0) };

    /**
     * 由各 builder 单独测量值求和得到,而不是用 tAll/tOverviewOnly 的独立测量:
     * 高倍档单次执行 500ms+,堆分配巨大,两次独立测量的中位数会出现交叉(all < overviewOnly),
     * 求和口径同源、可加,更适合做「省了多少」的结论。
     */
    const sumAll =
      tFilter.median +
      tCtx.median +
      tOverview.median +
      tProfiles.median +
      tRelation.median +
      tSankey.median +
      tHealth.median;
    const sumOverviewOnly =
      tFilter.median + tCtx.median + tOverview.median + tProfiles.median + tHealth.median;

    compute.push({
      factor,
      records: list.length,
      months: new Set(list.map((r) => (r.work_date as string).slice(0, 7))).size,
      personDays: new Set(list.map((r) => `${r.worker_id}|${r.work_date}`)).size,
      timings: {
        filter: tFilter,
        context: tCtx,
        overview: tOverview,
        profiles: tProfiles,
        relation: tRelation,
        sankey: tSankey,
        health: tHealth,
        all: tAll,
        overviewOnly: tOverviewOnly,
      },
      /** 可加的推导值(报告以此为准) */
      derived: {
        sumAll: round2(sumAll),
        sumOverviewOnly: round2(sumOverviewOnly),
        relationPlusSankey: round2(tRelation.median + tSankey.median),
        wastedMs: round2(sumAll - sumOverviewOnly),
        wastedRatio: round2(((sumAll - sumOverviewOnly) / Math.max(sumAll, 0.0001)) * 100),
      },
      traversals,
    });

    console.log(
      `规模 ×${factor} (${list.length} 条): 全部聚合 ${fmtMs(sumAll)} / ` +
        `仅概览 ${fmtMs(sumOverviewOnly)} / 遍历 ${traversals.total} 遍`,
    );
  }

  // ======================== 4. 定点问题量化 ========================
  const items: any = {};

  // B1:月度聚合(现状 vs 一次遍历)
  {
    const input = buildMonthlyInputs(records);
    const a = monthlyCurrent(input);
    const b = monthlyOptimized(input);
    const same = monthlyEqual(a, b);
    const cur = measure(() => void monthlyCurrent(input), 7, 2);
    const opt = measure(() => void monthlyOptimized(input), 7, 2);
    items.B1 = {
      months: input.monthList.length,
      personDays: input.shiftTotals.size,
      activeDays: input.allDays.length,
      /** 现状:每月扫一遍人天 + 每月扫一遍日期 */
      theoreticalIterations: input.monthList.length * input.shiftTotals.size +
        input.monthList.length * input.allDays.length,
      current: cur,
      optimized: opt,
      speedup: round2(cur.median / Math.max(opt.median, 0.0001)),
      identicalResult: same,
    };
    // 放大规模下再测一次
    for (const factor of [6, 12]) {
      const bigList = scaleRecords(records, factor);
      const bigInput = buildMonthlyInputs(bigList);
      const bc = measure(() => void monthlyCurrent(bigInput), 5, 1);
      const bo = measure(() => void monthlyOptimized(bigInput), 5, 1);
      items.B1[`scale${factor}`] = {
        records: bigList.length,
        months: bigInput.monthList.length,
        personDays: bigInput.shiftTotals.size,
        theoreticalIterations:
          bigInput.monthList.length * bigInput.shiftTotals.size +
          bigInput.monthList.length * bigInput.allDays.length,
        current: bc,
        optimized: bo,
        speedup: round2(bc.median / Math.max(bo.median, 0.0001)),
        identicalResult: monthlyEqual(monthlyCurrent(bigInput), monthlyOptimized(bigInput)),
      };
    }
  }

  // B2:shiftTotals 被遍历的次数与代价
  {
    const input = buildMonthlyInputs(records);
    const shiftTotals = input.shiftTotals;
    const onePass = () => {
      let n = 0;
      for (const [, m] of shiftTotals) if (m > 600) n++;
      return n;
    };
    const t = measure(() => void onePass(), 7, 2);
    items.B2 = {
      shiftTotalsSize: shiftTotals.size,
      /** 4 次全量遍历 + 每月 1 次 */
      traversals: 4 + input.monthList.length,
      theoreticalIterations: shiftTotals.size * (4 + input.monthList.length),
      onePassMs: t,
    };
  }

  // B6:rangeTotals 二次聚合 vs 直接取引擎结果
  {
    const workerMap = new Map(workersAll.items.map((w: any) => [w.id, w.name]));
    const workTypeMap = new Map(workTypesAll.items.map((t: any) => [t.id, t.name]));
    const salaryDict = Object.fromEntries(
      salaryRecords.map((s: any) => [
        s.expand?.worker_name?.name && s.expand?.work_type?.name
          ? `${s.expand.worker_name.name}_${s.expand.work_type.name}`
          : (s.expand?.worker_name?.name ?? s.expand?.work_type?.name ?? "基础"),
        Number(s.SalaryNum) || 0,
      ]),
    );
    const stats = computeSalaryStats(rangeRecordsRaw.items, { workerMap, workTypeMap, salaryDict });

    const secondPass = () => {
      const totals = new Map<string, { minutes: number; salary: any }>();
      for (const rec of rangeRecordsRaw.items) {
        const id = String(rec.worker_id);
        const cur = totals.get(id) ?? { minutes: 0, salary: 0 };
        cur.minutes += Number(rec.work_minutes) || 0;
        cur.salary += Number(stats.recordMap.get(String(rec.id))?.salary ?? 0);
        totals.set(id, cur);
      }
      return totals;
    };
    const fromEngine = () => {
      const totals = new Map<string, number>();
      for (const [id, byDay] of stats.dayMinutesMap) {
        let s = 0;
        for (const m of byDay.values()) s += m;
        totals.set(id, s);
      }
      return totals;
    };
    const t1 = measure(() => void secondPass(), 7, 2);
    const t2 = measure(() => void fromEngine(), 7, 2);
    items.B6 = {
      records: rangeRecordsRaw.items.length,
      secondPass: t1,
      fromEngine: t2,
      speedup: round2(t1.median / Math.max(t2.median, 0.0001)),
    };
  }

  // B7:引擎产出 5 张表 vs 只产 recordMap
  {
    const workerMap = new Map(workersAll.items.map((w: any) => [w.id, w.name]));
    const workTypeMap = new Map(workTypesAll.items.map((t: any) => [t.id, t.name]));
    const salaryDict = { 基础: 10 };
    const full = measure(() => void salaryStatsFull(rangeRecordsRaw.items, workerMap, workTypeMap, salaryDict), 7, 2);
    const only = measure(
      () => void salaryStatsRecordsOnly(rangeRecordsRaw.items, workerMap, workTypeMap, salaryDict),
      7,
      2,
    );
    items.B7 = {
      records: rangeRecordsRaw.items.length,
      full,
      recordsOnly: only,
      speedup: round2(full.median / Math.max(only.median, 0.0001)),
    };
  }

  // B8:批量录入状态机(O(人数 × 当天记录数))
  {
    const dayRecords = records.filter((r) => r.work_date === sampleDay);
    const recordsByKey = new Map<string, any>();
    for (const r of dayRecords) recordsByKey.set(`${r.worker_id}|${r.work}`, r);
    const workerIds = [...new Set(dayRecords.map((r) => r.worker_id))];
    const workId = dayRecords[0]?.work ?? "";
    const mkWorkers = (n: number) =>
      workerIds.slice(0, n).map((id) => ({ key: id, label: workerMapName(id) }));
    function workerMapName(id: string) {
      return workersAll.items.find((w: any) => w.id === id)?.name ?? id;
    }
    const run = (n: number) =>
      measure(
        () =>
          void resolveBatchState({
            workers: mkWorkers(n),
            workType: { value: workId, label: "工种" },
            minutes: 480,
            recordsByKey,
          }),
        7,
        2,
      );
    items.B8 = {
      dayRecords: dayRecords.length,
      workersInDay: workerIds.length,
      n1: run(1),
      n10: run(10),
      n30: run(Math.min(30, workerIds.length)),
      /** 每次调用的内层迭代次数 = 选中人数 × 当天记录数 */
      theoreticalIterations: {
        n1: 1 * recordsByKey.size,
        n10: 10 * recordsByKey.size,
        n30: Math.min(30, workerIds.length) * recordsByKey.size,
      },
    };
  }

  // B9:重复检测 O(n²)
  {
    const make = (n: number) => Array.from({ length: n }, (_, i) => `工人${i}`);
    const cases: any = {};
    for (const n of [100, 500, 1000, 2000]) {
      const names = make(n);
      const a = measure(() => void findDuplicatesIndexOf(names), 5, 1);
      const b = measure(() => void findDuplicatesSet(names), 5, 1);
      cases[`n${n}`] = {
        indexOf: a,
        set: b,
        speedup: round2(a.median / Math.max(b.median, 0.0001)),
        same: JSON.stringify(findDuplicatesIndexOf(names)) === JSON.stringify(findDuplicatesSet(names)),
      };
    }
    items.B9 = cases;
  }

  // B11:展示用两位小数,Decimal vs 原生
  {
    const values = Array.from({ length: 1000 }, (_, i) => (i * 37) % 1440);
    const decimalVersion = () => {
      let s = 0;
      for (const v of values) s += minutesToHours(v);
      return s;
    };
    const nativeVersion = () => {
      let s = 0;
      for (const v of values) s += Math.round((v / 60) * 100) / 100;
      return s;
    };
    const a = measure(decimalVersion, 7, 2);
    const b = measure(nativeVersion, 7, 2);
    items.B11 = {
      iterations: values.length,
      decimal: a,
      native: b,
      speedup: round2(a.median / Math.max(b.median, 0.0001)),
    };
  }

  // B12:河流图重算工种合计 vs 复用 workTypePie
  {
    const overview = buildOverview(records, salaryRecords, buildContext(records, salaryRecords));
    const workTypeMonthly = overview.workTypeMonthly;
    const recompute = () => {
      const totals = new Map<string, number>();
      for (const m of workTypeMonthly)
        for (const [name, minutes] of Object.entries(m.workMinutes))
          totals.set(name, (totals.get(name) ?? 0) + minutes);
      return totals;
    };
    const reuse = () => {
      const totals = new Map<string, number>();
      for (const w of overview.workTypePie) totals.set(w.name, Math.round(w.hours * 60));
      return totals;
    };
    const a = measure(recompute, 7, 2);
    const b = measure(reuse, 7, 2);
    items.B12 = {
      months: workTypeMonthly.length,
      works: overview.workTypePie.length,
      recompute: a,
      reuse: b,
      speedup: round2(a.median / Math.max(b.median, 0.0001)),
    };
  }

  // B13:resolveSalaryKey 每条记录被算两次
  {
    const workerMap = new Map(workersAll.items.map((w: any) => [w.id, w.name]));
    const workTypeMap = new Map(workTypesAll.items.map((t: any) => [t.id, t.name]));
    const salaryDict = { 基础: 10 };
    const twice = () => {
      for (const r of records) {
        const wn = workerMap.get(r.worker_id) ?? "未知";
        const kn = workTypeMap.get(r.work) ?? "未知";
        resolveSalaryKey(wn, kn, salaryDict);
        resolveSalaryKey(wn, kn, salaryDict);
      }
    };
    const once = () => {
      for (const r of records) {
        const wn = workerMap.get(r.worker_id) ?? "未知";
        const kn = workTypeMap.get(r.work) ?? "未知";
        resolveSalaryKey(wn, kn, salaryDict);
      }
    };
    const a = measure(twice, 7, 2);
    const b = measure(once, 7, 2);
    items.B13 = {
      records: records.length,
      calls: records.length * 2,
      twice: a,
      once: b,
      saved: round2(a.median - b.median),
    };
  }

  // A1:只看概览 vs 全量聚合的差值(按规模;用可加的 builder 之和)
  items.A1 = compute.map((c) => ({
    factor: c.factor,
    records: c.records,
    all: c.derived.sumAll,
    overviewOnly: c.derived.sumOverviewOnly,
    relationPlusSankey: c.derived.relationPlusSankey,
    wastedMs: c.derived.wastedMs,
    wastedRatio: c.derived.wastedRatio,
  }));

  // ======================== 4.5 端到端(请求 + 聚合) ========================
  /** 统计页首屏:2 个全量查询 + 7 个 useMemo 全部跑完(现状) */
  const tongjiE2E = async () => {
    const [att, sal] = await Promise.all([
      fetchList(TABLES.attendance, { expand: "work,worker_id" }),
      fetchList(TABLES.salary, { expand: "worker_name,work_type" }),
    ]);
    const f = filterRecordsByMonth(att.items, rangeOf(att.items));
    const c = buildContext(f, sal.items);
    const o = buildOverview(f, sal.items, c);
    buildRelation(f);
    buildProfiles(f, sal.items, c);
    buildSankey(f);
    buildHealth(f, o);
    return { bytes: att.bytes + sal.bytes, http: att.httpRequests + sal.httpRequests };
  };
  /** 统计页首屏(改造后:relation/sankey 延后到对应 Tab) */
  const tongjiE2EOverviewOnly = async () => {
    const [att, sal] = await Promise.all([
      fetchList(TABLES.attendance, { expand: "work,worker_id" }),
      fetchList(TABLES.salary, { expand: "worker_name,work_type" }),
    ]);
    const f = filterRecordsByMonth(att.items, rangeOf(att.items));
    const c = buildContext(f, sal.items);
    const o = buildOverview(f, sal.items, c);
    buildProfiles(f, sal.items, c);
    buildHealth(f, o);
    return { bytes: att.bytes + sal.bytes, http: att.httpRequests + sal.httpRequests };
  };

  items.e2e = {
    tongji: await measureAsync(async () => void (await tongjiE2E()), 3, 1),
    tongjiOverviewOnly: await measureAsync(async () => void (await tongjiE2EOverviewOnly()), 3, 1),
    tongjiPayload: await tongjiE2E(),
  };

  // ======================== 5. 输出 ========================
  const result = {
    meta: {
      generatedAt: startedAt.toISOString(),
      backend: PB_URL,
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      cpu: `${cpus()[0]?.model ?? "unknown"} × ${cpus().length}`,
      totalMemMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    dataset,
    requests,
    compute,
    items,
  };

  const outFile = new URL(`./${process.env.OUT ?? "results.json"}`, import.meta.url);
  writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`\n结果已写入: ${outFile.pathname.replace(/^\//, "")}`);
  console.log(`总耗时: ${((now() - tStart) / 1000).toFixed(1)}s\n`);

  // 控制台关键摘要
  const p = (label: string, v: string) => console.log(`  ${label.padEnd(28)} ${v}`);
  console.log(`--- 请求层 ---`);
  p("工时页 现状", `${requests.gongshi.currentDetail.logicalQueries} 查询 / ${requests.gongshi.currentDetail.httpRequests} HTTP / ${fmtBytes(requests.gongshi.currentDetail.bytes)}`);
  p("工时页 优化后", `${requests.gongshi.optimizedDetail.logicalQueries} 查询 / ${requests.gongshi.optimizedDetail.httpRequests} HTTP / ${fmtBytes(requests.gongshi.optimizedDetail.bytes)}`);
  p("展开 1 人", `${requests.expand.oneDetail.logicalQueries} 查询 / ${fmtBytes(requests.expand.oneDetail.bytes)} / ${fmtMs(requests.expand.one.median)}`);
  p("展开 10 人", `${requests.expand.tenDetail.logicalQueries} 查询 / ${fmtBytes(requests.expand.tenDetail.bytes)} / ${fmtMs(requests.expand.ten.median)}`);
  p("本地过滤 10 人", `${fmtMs(requests.expand.localFilter.median)}(0 请求)`);
  p("签到页 现状/优化", `${requests.qiandao.currentDetail.logicalQueries} → ${requests.qiandao.optimizedDetail.logicalQueries} 查询`);
  p("统计页 2 个全量", `${requests.tongji.detail.httpRequests} HTTP / ${fmtBytes(requests.tongji.detail.bytes)}`);

  console.log(`--- 计算层(真实数据) ---`);
  const c1 = compute[0];
  p("全部聚合", fmtMs(c1.derived.sumAll));
  p("仅概览所需", fmtMs(c1.derived.sumOverviewOnly));
  p("全量遍历次数", `${c1.traversals.total} 遍`);
  p("B1 月度聚合 现状", fmtMs(items.B1.current.median));
  p("B1 月度聚合 优化", fmtMs(items.B1.optimized.median));

  console.log(`--- 放大规模 ---`);
  for (const c of compute) {
    p(`×${c.factor} (${c.records} 条)`, `全部 ${fmtMs(c.derived.sumAll)} / 仅概览 ${fmtMs(c.derived.sumOverviewOnly)} / 遍历 ${c.traversals.total} 遍`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
