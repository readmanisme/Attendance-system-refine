/**
 * 极简 ESM resolve hook:把源码里的 "@/xxx" 别名映射到 src/xxx,
 * 并补全省略的扩展名(.ts / .tsx / index.ts)。
 *
 * 目的:让 `node scripts/perf-audit/collect.ts` 能直接 import 真实源码
 * (compute.ts / salary.ts / batchState.ts 内部用的是 "@/..." 别名),
 * 不必为了跑基准而引入 vitest 或改动源码。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "src");

const CANDIDATES = (base) => [
  base,
  `${base}.ts`,
  `${base}.tsx`,
  path.join(base, "index.ts"),
  path.join(base, "index.tsx"),
];

export async function resolve(specifier, context, nextResolve) {
  // 别名:@/utils/salary → src/utils/salary
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    for (const candidate of CANDIDATES(base)) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  // 相对路径缺扩展名(源码里不写 .ts),补全后再交给默认解析
  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const parent = context.parentURL ? path.dirname(new URL(context.parentURL).pathname) : ROOT;
    const base = path.resolve(parent, specifier);
    for (const candidate of CANDIDATES(base)) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
