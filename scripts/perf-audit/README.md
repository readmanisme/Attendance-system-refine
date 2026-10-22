# perf-audit：重复/冗余数据获取与计算的实测采集

对 `审查报告-重复计算与冗余请求.md` 里列出的每条问题做**真实测量**，输出可复现的原始数据，
供 `性能实测报告-重复计算与冗余请求.md` 引用。

## 运行

```powershell
# 单轮(约 30s)；需要 PocketBase 已运行在 29401
node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts

# 推荐：跑 3 轮取中位数(单轮 ±30% 抖动，报告必须建立在多轮中位上)
$env:OUT="results-1.json"; node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts
$env:OUT="results-2.json"; node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts
$env:OUT="results-3.json"; node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts
Remove-Item Env:OUT
node scripts/perf-audit/merge.ts   # → results.json

# 换后端端口
$env:PB_URL="http://127.0.0.1:29402"; node --expose-gc --import ./scripts/perf-audit/register.mjs scripts/perf-audit/collect.ts
```

- `--expose-gc`：每轮计时前手动 GC，避免堆抖动污染结论（脚本里用 `globalThis.gc?.()`，没有该参数也能跑，只是数据会抖）。
- `--import ./scripts/perf-audit/register.mjs`：注册 `loader.mjs`，把源码里的 `@/xxx` 别名解析到 `src/xxx`。
  这样脚本能直接 import 真实源码（`compute.ts` / `salary.ts` / `batchState.ts`），不必复制逻辑，也不必引入 vitest。
- `OUT` 环境变量：指定输出文件名，用于多轮采集。

## 文件

| 文件 | 作用 |
|---|---|
| `collect.ts` | 主脚本：数据画像 → 请求层 → 计算层（4 档规模）→ 定点问题 → 端到端 |
| `lib.ts` | 计时工具、遍历计数（Proxy）、PB 全量拉取、数据放大、**现状逻辑复刻** |
| `merge.ts` | 多轮结果按「逐项中位数」合并成 `results.json` |
| `loader.mjs` / `register.mjs` | 极简 ESM resolve hook，只做别名与扩展名补全 |
| `results.json` | 合并后的中位数结果（报告以此为准） |
| `results-1/2/3.json` | 三轮原始结果 |

## 测量口径

- **耗时**：`measure()` = warmup 2 次 + 重复 N 次（取中位数），每轮前 `gc()`。
- **遍历次数**：`countTraversal()` 用 Proxy 拦截 `Symbol.iterator` / `forEach` / `map` / `filter` / `reduce` 等迭代入口，
  统计「整个记录数组被完整遍历」的次数。只用于计数，不参与计时。
- **请求**：复刻 PocketBase SDK 的 `getFullList`（`perPage=500` 串行翻页），同时记录
  逻辑查询数、实际 HTTP 请求数、响应体字节数、下载行数。
- **数据放大**：`scaleRecords(base, k)` 把真实记录整体平移复制 k 份（第 k 份日期后移 `spanDays*k` 天），
  保持人数/工种/工时分布不变，让记录数与天数同比例增长。
- **现状复刻**：`monthlyCurrent` 逐行对齐 `compute.ts:414-456`；`monthlyOptimized` 是「按月份分桶」的等价实现，
  脚本用 `monthlyEqual()` 逐字段断言两者结果一致（`identicalResult`）。

## 注意

- 只在 node 里测「数据获取 + 聚合」，**不含 React 渲染与 ECharts 绘制**，所以数字是首屏的**下界**。
- 请求耗时走 localhost，与真实部署环境（同机 electron）接近；跨网络部署时请求耗时会被放大。
- `gongshi` / `qiandao` 的耗时中位数在 40ms 上下抖动，报告里只用**查询数 / 字节数 / 行数**这些确定值下结论。
