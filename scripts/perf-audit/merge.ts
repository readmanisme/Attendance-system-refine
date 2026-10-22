/**
 * 把多次 collect.ts 的结果合并成一份「中位数结果」,消除单次运行的抖动。
 *
 *   node scripts/perf-audit/merge.ts results-1.json results-2.json results-3.json
 *   → 写出 results.json(每个数值取 3 次的中位数;Timing 节点只合并 median/min/max)
 *
 * 单次运行里 ×12 档要 500ms+,中位数本身就有 ±30% 波动;
 * 报告里的结论必须建立在多次运行的中位数上,否则「省了多少 ms」会随运气变化。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = import.meta.dirname;
const args = process.argv.slice(2);
const files = args.length ? args : ["results-1.json", "results-2.json", "results-3.json"];

const runs = files.map(
  (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>,
);
if (runs.length < 2) throw new Error("至少需要 2 份结果才能取中位数");

/** 注意:dataset.perDayRecords 也有 min/median/max,必须再要求 mean + repeat 才认作计时节点 */
const isTiming = (v: any): v is { median: number; min: number; max: number; mean: number; repeat: number } =>
  v &&
  typeof v === "object" &&
  typeof v.median === "number" &&
  typeof v.min === "number" &&
  typeof v.max === "number" &&
  typeof v.mean === "number" &&
  typeof v.repeat === "number";

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const merge = (values: any[]): any => {
  const first = values[0];
  if (isTiming(first)) {
    const all = values.filter(isTiming);
    return {
      median: +median(all.map((v) => v.median)).toFixed(3),
      min: +Math.min(...all.map((v) => v.min)).toFixed(3),
      max: +Math.max(...all.map((v) => v.max)).toFixed(3),
      mean: +median(all.map((v) => v.mean)).toFixed(3),
      repeat: first.repeat,
    };
  }
  if (typeof first === "number") {
    const nums = values.filter((v): v is number => typeof v === "number");
    return +median(nums).toFixed(3);
  }
  if (Array.isArray(first)) {
    return first.map((_, i) => merge(values.map((v) => (Array.isArray(v) ? v[i] : undefined))));
  }
  if (first && typeof first === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(first)) {
      out[key] = merge(values.map((v) => (v as any)?.[key]));
    }
    return out;
  }
  return first;
};

const merged = merge(runs);
(merged as any).meta = {
  ...(merged as any).meta,
  mergedFrom: files,
  mergedAt: new Date().toISOString(),
};

const outFile = path.join(dir, "results.json");
writeFileSync(outFile, JSON.stringify(merged, null, 2), "utf8");
console.log(`已合并 ${files.length} 次运行 → results.json`);

const p = (label: string, v: unknown) => console.log(`  ${label.padEnd(26)} ${v}`);
const c1 = (merged as any).compute[0];
const c12 = (merged as any).compute[3];
p("×1 全部聚合", `${c1.derived.sumAll}ms`);
p("×12 全部聚合", `${c12.derived.sumAll}ms`);
p("B1 ×1 现状/优化", `${(merged as any).items.B1.current.median} / ${(merged as any).items.B1.optimized.median}`);
p("B1 ×12 现状/优化", `${(merged as any).items.B1.scale12.current.median} / ${(merged as any).items.B1.scale12.optimized.median}`);
