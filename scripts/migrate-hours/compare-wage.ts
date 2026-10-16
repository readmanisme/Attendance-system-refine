/**
 * 工资比对脚本：迁移前(29403, 签入签退模型) vs 迁移后(29401, 工时分钟模型)
 *
 * 端到端回归：
 *   旧侧 = 旧版前端逻辑(git 22de7a1, list_table.tsx) × 旧库数据 × 旧库时薪
 *   新侧 = 新版前端逻辑(list_table.tsx 现行) × 新库数据 × 新库时薪
 *
 * 旧逻辑要点（严格复刻 list_table.tsx @ 22de7a1）：
 *   - skip: check_in/check_out 无法解析、check_out 早于 check_in
 *   - durationHours = (check_out - check_in) 毫秒 / 3600000
 *   - day = 本地时区 check_in 的 YYYY-MM-DD
 *   - 时薪三级匹配: 人+工种 → 人 → 工种 → "基础"
 *   - recordSalary = durationHours × 时薪, 逐条 Decimal 累加
 *
 * 新逻辑要点（现行 list_table.tsx）：
 *   - durationHours = work_minutes / 60
 *   - day = work_date
 *   - 其余相同
 *
 * 只读不写，输出 JSON 报告到本目录。
 *
 * 用法（仓库根目录）：
 *   node scripts/migrate-hours/compare-wage.ts
 *   node scripts/migrate-hours/compare-wage.ts --old-url http://127.0.0.1:29403 --new-url http://127.0.0.1:29401
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Decimal from "decimal.js";

const argv = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return argv[i + 1]?.startsWith("--") ? "" : argv[i + 1];
}

const EMAIL = "shed2705@outlook.com";
const PASSWORD = "bPWU8GCMuqwKF9z";

// 及: 不在本仓库端口的库只读
const NEW_URL = (argValue("new-url") || "http://127.0.0.1:29401").replace(/\/+$/, "");
const OLD_URL = (argValue("old-url") || "http://127.0.0.1:29403").replace(/\/+$/, "");

const TABLES = {
  attendance: "attendance_record_test",
  workers: "workers_test",
  workTypes: "workType_test",
  salary: "SalaryType_test",
};

type AnyRec = Record<string, any>;
type Agg = { wage: Decimal; minutes: number; hoursMs: number };
const zeroAgg = (): Agg => ({ wage: new Decimal(0), minutes: 0, hoursMs: 0 });
const zeroMap = () => new Map<string, Agg>();

// ---------- HTTP ----------
async function req(
  url: string,
  path: string,
  init: { method?: string; body?: any; token?: string } = {},
): Promise<any> {
  const res = await fetch(`${url}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: init.token } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${url}${path} -> ${res.status}: 非JSON响应 ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`${url}${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function auth(url: string): Promise<string> {
  const endpoints = [
    "/api/collections/_superusers/auth-with-password",
    "/api/admins/auth-with-password",
  ];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const r = await req(url, endpoint, {
        method: "POST",
        body: { identity: EMAIL, password: PASSWORD },
      });
      return r.token as string;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function fetchAll(
  url: string,
  token: string,
  collection: string,
  expand = "",
): Promise<AnyRec[]> {
  const all: AnyRec[] = [];
  let page = 1;
  for (;;) {
    const r = await req(
      url,
      `/api/collections/${collection}/records?perPage=500&page=${page}${expand ? `&expand=${expand}` : ""}`,
      { token },
    );
    all.push(...(r.items ?? []));
    if (all.length >= r.totalItems || r.items.length === 0) break;
    page++;
  }
  return all;
}

// ---------- 日期工具（模拟 dayjs 行为） ----------
const TZ_OFFSET_MIN = new Date().getTimezoneOffset(); // UTC+8 => -480
function parseDate(value: any): Date | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(" ", "T");
  if (!normalized) return null;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}
function localDateKey(d: Date): string {
  const shifted = new Date(d.getTime() - TZ_OFFSET_MIN * 60000);
  return shifted.toISOString().slice(0, 10);
}

// ---------- 时薪字典（复刻 SalaryDict 构建逻辑） ----------
type Dict = Record<string, string>; // key -> 时薪字符串(Decimal 字符串, 精确保留)
function buildSalaryDict(salaryRows: AnyRec[]): Dict {
  const dict: Dict = {};
  for (const item of salaryRows) {
    const workerName = item?.expand?.worker_name?.name;
    const workType = item?.expand?.work_type?.name;
    const num = new Decimal(item?.SalaryNum ?? 0);
    if (workerName && workType) dict[`${workerName}_${workType}`] = num.toString();
    else if (workerName) dict[workerName] = num.toString();
    else if (workType) dict[workType] = num.toString();
  }
  if (!("基础" in dict)) dict["基础"] = "0";
  return dict;
}
function salaryKeyFor(dict: Dict, workerName: string, workName: string): string {
  if (`${workerName}_${workName}` in dict) return `${workerName}_${workName}`;
  if (workerName in dict) return workerName;
  if (workName in dict) return workName;
  return "基础";
}
function rateOf(dict: Dict, workerName: string, workName: string): Decimal {
  return new Decimal(dict[salaryKeyFor(dict, workerName, workName)] ?? "0");
}

// ---------- 侧实现 ----------
type SideResult = {
  url: string;
  groups: Map<string, Agg>; // `${workerName}|${day}|${workName}`
  months: Map<string, Agg>; // `${workerName}|${month}`
  skipped: Array<{ id: string; reason: string }>;
  dict: Dict;
  total: number;
};
type SideModel = "old" | "new";

function computeSide(
  url: string,
  model: SideModel,
  records: AnyRec[],
  workerNameById: Map<string, string>,
  workNameById: Map<string, string>,
  dict: Dict,
): SideResult {
  const groups = new Map<string, Agg>();
  const months = zeroMap();
  const skipped: Array<{ id: string; reason: string }> = [];

  const bump = (
    m: Map<string, Agg>,
    key: string,
    wageUp: Decimal,
    minutes: number,
    hoursMs: number,
  ) => {
    const a = m.get(key) ?? zeroAgg();
    a.wage = a.wage.plus(wageUp);
    a.minutes += minutes;
    a.hoursMs += hoursMs;
    m.set(key, a);
  };

  for (const rec of records) {
    const dbID = String(rec.id);
    const workerName = workerNameById.get(rec.worker_id) ?? "未知";
    const workName = workNameById.get(rec.work) ?? "未知";
    const rate = rateOf(dict, workerName, workName);

    let dayKey: string;
    let recordWage: Decimal;
    let minutes = 0;
    let hoursMs = 0;

    if (model === "old") {
      const checkIn = parseDate(rec.check_in);
      const checkOut = parseDate(rec.check_out);
      if (!checkIn) {
        skipped.push({ id: dbID, reason: "check_in 无法解析/缺失" });
        continue;
      }
      if (!checkOut) {
        skipped.push({ id: dbID, reason: "check_out 无法解析/缺失(未下班)" });
        continue;
      }
      if (checkOut.getTime() < checkIn.getTime()) {
        skipped.push({ id: dbID, reason: "check_out 早于 check_in" });
        continue;
      }
      const diffMs = checkOut.getTime() - checkIn.getTime();
      hoursMs = diffMs;
      dayKey = localDateKey(checkIn);
      // 旧逻辑: durationHours = ms/3600000; recordSalary = hours × rate
      recordWage = new Decimal(diffMs).div(3600000).mul(rate);
    } else {
      const minutesRaw = Number(rec.work_minutes) || 0;
      minutes = minutesRaw;
      hoursMs = minutesRaw * 60000;
      dayKey = String(rec.work_date ?? "").slice(0, 10);
      recordWage = new Decimal(minutesRaw).div(60).mul(rate);
    }

    const monthKey = dayKey.slice(0, 7);
    const gk = `${workerName}|${dayKey}|${workName}`;
    bump(groups, gk, recordWage, minutes, hoursMs);
    bump(months, `${workerName}|${monthKey}`, recordWage, minutes, hoursMs);
  }

  return { url, groups, months, skipped, dict, total: records.length };
}

// ---------- 报告工具 ----------
function fmtW(d: Decimal): string {
  return d.toSignificantDigits(12).toString();
}
function fmtHours(msOrMin: number, isMs: boolean): string {
  const h = new Decimal(isMs ? msOrMin : msOrMin * 60000).div(3600000);
  return h.toSignificantDigits(12).toString();
}

type RowDiff = {
  granule: "day" | "month";
  key: string;
  oldWage: string;
  newWage: string;
  diff: string;
  oldMinutesExact: string; // 旧侧按毫秒折算的精确分钟(BigDecimal 字符串)
  newMinutes: number;
  expectNewMinutes: number | null; // 若新侧分钟数 == 旧侧可复算的预期分钟(逐条 round(abs(ms)/60000)),
  benign: boolean; // 差异仅来自分钟取整
};

async function main() {
  console.log(`旧库(签入签退/原版): ${OLD_URL}   新库(工时/迁移后): ${NEW_URL}`);
  const tokenOld = await auth(OLD_URL);
  const tokenNew = await auth(NEW_URL);

  // ----- 基础字典 -----
  const workersOld = await fetchAll(OLD_URL, tokenOld, TABLES.workers);
  const workersNew = await fetchAll(NEW_URL, tokenNew, TABLES.workers);
  const workTypesOld = await fetchAll(OLD_URL, tokenOld, TABLES.workTypes);
  const workTypesNew = await fetchAll(NEW_URL, tokenNew, TABLES.workTypes);
  const salaryOld = await fetchAll(OLD_URL, tokenOld, TABLES.salary, "worker_name,work_type");
  const salaryNew = await fetchAll(NEW_URL, tokenNew, TABLES.salary, "worker_name,work_type");

  const sameIds = (a: AnyRec[], b: AnyRec[]) => {
    const na = new Map(a.map((r) => [String(r.id), String(r.name)]));
    const nb = new Map(b.map((r) => [String(r.id), String(r.name)]));
    const diffs: string[] = [];
    for (const [id, name] of na) {
      const o = nb.get(id);
      if (o === undefined) diffs.push(`仅旧库: ${id}=${name}`);
      else if (o !== name) diffs.push(`名字不同: ${id} 旧="${name}" 新="${o}"`);
      nb.delete(id);
    }
    for (const [id, name] of nb) diffs.push(`仅新库: ${id}=${name}`);
    return diffs;
  };

  const workerDiffs = sameIds(workersOld, workersNew);
  const workTypeDiffs = sameIds(workTypesOld, workTypesNew);

  // 时薪比对
  const dictOld = buildSalaryDict(salaryOld);
  const dictNew = buildSalaryDict(salaryNew);
  const salaryDiffs: string[] = [];
  for (const key of new Set([...Object.keys(dictOld), ...Object.keys(dictNew)])) {
    const o = dictOld[key];
    const n = dictNew[key];
    if (o === undefined) salaryDiffs.push(`仅旧库: ${key}=${o ?? "?"}`);
    else if (n === undefined) salaryDiffs.push(`仅新库: ${key}=${n ?? "?"}`);
    else if (o !== n) salaryDiffs.push(`时薪不同: ${key} 旧=${o} 新=${n}`);
  }

  // ----- 考勤记录 -----
  const repOld = await fetchAll(OLD_URL, tokenOld, TABLES.attendance);
  const repNew = await fetchAll(NEW_URL, tokenNew, TABLES.attendance);
  const oldModel = computeSide(
    OLD_URL,
    "old",
    repOld,
    new Map(workersOld.map((w) => [String(w.id), String(w.name)])),
    new Map(workTypesOld.map((w) => [String(w.id), String(w.name)])),
    dictOld,
  );
  const newModel = computeSide(
    NEW_URL,
    "new",
    repNew,
    new Map(workersNew.map((w) => [String(w.id), String(w.name)])),
    new Map(workTypesNew.map((w) => [String(w.id), String(w.name)])),
    dictNew,
  );

  // ----- 逐组比对 -----
  const diffs: RowDiff[] = [];
  let exactMatches = 0;
  const allKeys = new Set([...oldModel.groups.keys(), ...newModel.groups.keys()]);
  for (const key of allKeys) {
    const o = oldModel.groups.get(key);
    const n = newModel.groups.get(key);
    const oldWage = o?.wage ?? new Decimal(0);
    const newWage = n?.wage ?? new Decimal(0);
    const d = oldWage.minus(newWage);
    if (d.isZero()) {
      exactMatches++;
      continue;
    }
    const oldMinutes = o?.hoursMs ?? 0;
    const newMinutes = n?.minutes ?? 0;
    diffs.push({
      granule: "day",
      key,
      oldWage: oldWage.toString(),
      newWage: newWage.toString(),
      diff: d.toString(),
      oldMinutesExact: fmtHours(oldMinutes, true),
      newMinutes,
      expectNewMinutes: null,
      benign: false,
    });
  }

  // 按月汇总比对
  const monthDiffs: RowDiff[] = [];
  let monthExactMatches = 0;
  const allMonthKeys = new Set([...oldModel.months.keys(), ...newModel.months.keys()]);
  for (const key of allMonthKeys) {
    const o = oldModel.months.get(key);
    const n = newModel.months.get(key);
    const oldWage = o?.wage ?? new Decimal(0);
    const newWage = n?.wage ?? new Decimal(0);
    const d = oldWage.minus(newWage);
    if (d.isZero()) {
      monthExactMatches++;
      continue;
    }
    monthDiffs.push({
      granule: "month",
      key,
      oldWage: oldWage.toString(),
      newWage: newWage.toString(),
      diff: d.toString(),
      oldMinutesExact: fmtHours(o?.hoursMs ?? 0, true),
      newMinutes: n?.minutes ?? 0,
      expectNewMinutes: null,
      benign: false,
    });
  }

  // 分类: 逐组差异是否可由"分钟取整"解释
  // 迁移规则: 每条旧记录 work_minutes = round(abs(check_out - check_in)/60000) 再同组求和
  // 对 29403 的逐条毫秒差重算预期分钟数: 需要旧记录逐条数据
  const oldRecordsByFk = new Map<string, AnyRec[]>();
  for (const rec of repOld) {
    const workerName =
      new Map(workersOld.map((w) => [String(w.id), String(w.name)])).get(String(rec.worker_id)) ??
      "未知";
    const workName =
      new Map(workTypesOld.map((w) => [String(w.id), String(w.name)])).get(String(rec.work)) ??
      "未知";
    const checkIn = parseDate(rec.check_in);
    if (!checkIn) continue;
    const gk = `${workerName}|${localDateKey(checkIn)}|${workName}`;
    (oldRecordsByFk.get(gk) ?? oldRecordsByFk.set(gk, []).get(gk)!).push(rec);
  }
  for (const df of diffs) {
    const rows = oldRecordsByFk.get(df.key) ?? [];
    let expect = 0;
    for (const rec of rows) {
      const ci = parseDate(rec.check_in);
      const co = parseDate(rec.check_out);
      if (!ci || !co || co.getTime() < ci.getTime()) continue; // 旧工资记账跳过的记录,不再计入预期
      expect += Math.round(Math.abs(co.getTime() - ci.getTime()) / 60000);
    }
    df.expectNewMinutes = expect;
    df.benign = df.newMinutes === expect;
  }

  // 跳过记录统计（旧逻辑不计名单）
  const skippedOld = oldModel.skipped;

  // ----- 汇总 -----
  const totalOldWage: Decimal = [...oldModel.months.values()].reduce(
    (a, v) => a.plus(v.wage),
    new Decimal(0),
  );
  const totalNewWage: Decimal = [...newModel.months.values()].reduce(
    (a, v) => a.plus(v.wage),
    new Decimal(0),
  );
  const totalDiff = totalOldWage.minus(totalNewWage);

  const summary = {
    oldUrl: OLD_URL,
    newUrl: NEW_URL,
    recordCounts: { old: repOld.length, new: repNew.length },
    workerDiffs,
    workTypeDiffs,
    salaryDiffs,
    salaryCount: {
      old: Object.keys(dictOld).filter((k) => k !== "基础").length,
      new: Object.keys(dictNew).filter((k) => k !== "基础").length,
    },
    skipReasonsOld: Object.entries(
      skippedOld.reduce<Record<string, number>>((acc, s) => {
        acc[s.reason] = (acc[s.reason] ?? 0) + 1;
        return acc;
      }, {}),
    ),
    dayGranule: { exact: exactMatches, diffCount: diffs.length },
    monthGranule: { exact: monthExactMatches, diffCount: monthDiffs.length },
    totals: {
      old: totalOldWage.toString(),
      new: totalNewWage.toString(),
      diff: totalDiff.toString(),
    },
    dayDiffs: diffs,
    monthDiffs: monthDiffs,
    checkedAt: new Date().toISOString(),
  };

  // 终端摘要
  console.log(
    `记录: 旧${repOld.length} 新${repNew.length}  时薪条目: 旧${summary.salaryCount.old} 新${summary.salaryCount.new}`,
  );
  console.log(
    `工人字典差异: ${workerDiffs.length}  工种字典差异: ${workTypeDiffs.length}  时薪差异: ${salaryDiffs.length}`,
  );
  for (const s of [...workerDiffs, ...workTypeDiffs, ...salaryDiffs].slice(0, 10))
    console.log("  " + s);
  console.log(
    `旧逻辑跳过的记录 ${skippedOld.length} 条, 原因分布: ${JSON.stringify(summary.skipReasonsOld)}`,
  );
  console.log(`按日按工种组: 一致=${exactMatches} 有差异=${diffs.length}`);
  console.log(`按人按月:      一致=${monthExactMatches} 有差异=${monthDiffs.length}`);
  console.log(
    `总工资: 旧=${totalOldWage.toString()} 新=${totalNewWage.toString()} 差=${totalDiff.toString()}`,
  );
  for (const m of monthDiffs.slice(0, 30)) {
    console.log(
      `  [月] ${m.key}  旧=${m.oldWage} 新=${m.newWage} 差=${m.diff}  分钟 旧精确=${m.oldMinutesExact} 新=${m.newMinutes} 预期=${m.expectNewMinutes}${m.benign ? " ←仅分钟取整" : " ←数据不一致"}`,
    );
  }
  for (const d of diffs.slice(0, 30)) {
    if (d.granule === "day") {
      console.log(
        `  [日] ${d.key}  旧=${d.oldWage} 新=${d.newWage} 差=${d.diff}  分钟 旧精确=${d.oldMinutesExact} 新=${d.newMinutes} 预期=${d.expectNewMinutes}${d.benign ? " ←仅分钟取整" : " ←数据不一致"}`,
      );
    }
  }

  const outDir = dirname(fileURLToPath(import.meta.url));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(outDir, `wage-compare-${stamp}.json`);
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`报告已写入: ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
