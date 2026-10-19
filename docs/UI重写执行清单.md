# UI 重写执行清单（裁剪版）

> ✅ **已全部完成（2026-10-19）**：M1–M5 落地，`lint 0` / `单测 221` / `E2E 61` / `build` 全绿。
> 实际改动与偏差见文末「六、实施记录」。

> 约束：**不做暗色模式 · 不做移动端 · 不做可访问性 · 保留 antd + Refine**
> 裁剪日期：2026-10-19 ｜ 完整诊断见 [`UI重写评估报告.md`](./UI重写评估报告.md)

---

## 一、裁剪结论

| 原方案内容 | 裁剪后 | 说明 |
|---|---|---|
| 设计 token（light + dark 双主题） | ✅ 保留，**仅 light** | 仍值得做，是统一视觉的地基 |
| 暗色模式（`darkAlgorithm` + 切换器 + 持久化） | ❌ 删除 | — |
| 移动端断点适配、汉堡菜单、表格横向滚动 | ❌ 删除 | 按桌面单分辨率设计 |
| `aria-label`、键盘可达性、焦点陷阱、对比度校验 | ❌ 删除 | — |
| 换组件库（shadcn/Radix） | ❌ 删除 | 保留 antd + Refine |
| 布局壳重写（Header / Sider / PageHeader） | ✅ 保留 | 收益高、风险低 |
| 签到页两栏重排 | ✅ 保留（**优先级最高**） | 桌面端收益最大 |
| 常驻 Alert 收敛 | ✅ 保留 | 31 处 → 5 处以内 |
| 列表页统一（FilterBar / DataTable） | ✅ 保留 | 消除四页复制粘贴 |
| 统计页锚点导航、StatCard 统一 | ✅ 保留 | — |
| 骨架屏 | ✅ 保留（降为 P2） | — |
| 硬编码色替换 | ✅ 保留（降为 P2） | 不做暗色后不紧急，纯维护性 |
| 记忆化清理（对齐 React Compiler 约定） | ✅ 保留（P2，可延后） | — |

**工作量：13~15 人日 → 8~9 人日。**

---

## 二、优先级清单

### P0 — 做了就能明显感觉到（约 3 天）

#### P0-1 签到页两栏重排（1.5 天）

**文件**：`src/pages/qian-dao/qian-dao.tsx`、`BatchEntryPanel.tsx`、`DayStatsBar.tsx`

| 动作 | 位置 |
|---|---|
| 删除手写 `<AntdTitle>工时录入系统</AntdTitle>`（双标题） | `qian-dao.tsx:115` |
| 删除 `min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8` + `max-w-6xl mx-auto` | `qian-dao.tsx:112-113` |
| 改为「左：录入卡片 / 右：记录卡片」两栏（`Row gutter` + `Col span={9/15}`） | `qian-dao.tsx:110-263` |
| 快捷工时 12 个 chip 分组：主推 `2 / 5 / 8 / 10`，其余收进「更多」 | `BatchEntryPanel.tsx:96-109` |
| 快捷工时加**选中态高亮**（当前分钟数匹配的 chip 高亮） | `BatchEntryPanel.tsx:97-108` |
| `+30/-30/+10/-10` 四个按钮降级为 `type="text"` 小按钮 | `BatchEntryPanel.tsx:110-123` |
| 日期旁加「今天 / 昨天」快捷按钮 | `BatchEntryPanel.tsx:142-148` |
| 当天汇总 4 个 `Statistic` 压缩为一行数字条 | `DayStatsBar.tsx:36-73` |

**验收**：1366×768 下首屏同时看到「录入按钮」和「当天记录前 3 行」；所有 `data-testid` 原样保留。

#### P0-2 常驻 Alert 收敛（0.5 天）

| 文件 | 现状 | 改法 |
|---|---|---|
| `qian-dao.tsx:122-127` | "同一人同一天…自动叠加" | 改标题旁 `HelpTip` 问号 |
| `qian-dao.tsx:144-149` | "可在下方搜索框…" | 删除，搜索框 placeholder 已表达 |
| `attendance-record/list.tsx:62-75` | 两个说明 Alert | 合并为一个 `HelpTip` + 首次访问提示 |
| `workers/list.tsx:86-92` | "删除人员将一并删除…" | 移入删除确认弹窗 |
| `workType/list.tsx:99-112` | 两个 Alert | 保留「基础工种不可编辑」（信息必要），删除另一个 |
| `gong-shi/list_table.tsx:145-153` | 未定价长文 Alert | 改为可关闭 `Banner` + 「去设置」跳转 |
| `xin-zi/list.tsx:53-68` | 两个 Alert | 合并为一个 |

**目标**：常驻 `Alert` 31 处 → **≤ 5 处**。

#### P0-3 Header 重排（0.5 天）

**文件**：`src/components/header/index.tsx`

| 动作 |
|---|
| 左侧加品牌 + 当前页标题（现在左侧 60% 是空白） |
| 版本 Tag 从红色 `width:120` 改为弱化文字 `v2026.10.16` |
| 开发端口 `Radio.Group` 收进「⋯」`Dropdown`（生产环境不渲染） |
| 刷新按钮保留 primary，帮助按钮改 `type="text"` |

#### P0-4 布局壳统一（0.5 天）

| 动作 | 文件 |
|---|---|
| 新建 `src/components/layout/PageShell.tsx`（统一 padding + 最大宽度） | 新增 |
| 新建 `src/components/layout/PageHeader.tsx`（标题 + 描述 + 操作槽位） | 新增 |
| 7 个页面统一接入 `PageShell`，删除各自的 `p-4` / `max-w-6xl` 类 | 全部页面 |

---

### P1 — 一致性与可维护性（约 3 天）

#### P1-1 设计 token（仅 light）（0.5 天）

**新增**：`src/theme/tokens.ts`、`src/theme/antdTheme.ts`、`src/theme/global.css`

- 品牌色、语义色（success / warning / error / info）、中性色阶
- 圆角：4 / 8 / 12；阴影：3 级；间距：4 的倍数；字号：12 / 14 / 16 / 20 / 24
- `components` 级覆盖：Button 高度、Card 圆角与阴影、Table 表头背景、Tag 无边框
- 数字排版：`font-variant-numeric: tabular-nums`（工时、金额列）
- 接入 `src/contexts/color-mode/index.tsx`，替换 `RefineThemes.Blue`

#### P1-2 列表页统一（2 天）

**新增**：`src/components/ui/FilterBar.tsx`、`src/components/ui/DataTable.tsx`、`src/components/ui/ConfirmDelete.tsx`

| 动作 | 影响文件 |
|---|---|
| 筛选区统一进 `FilterBar`（左：人员筛选 / 右：范围选择 + 主操作） | workers / workType / xinzi / attendance-record / gong-shi / tongji |
| 表格统一 `size="middle"` + 斑马纹 + 粘性表头 + 数字右对齐 | 同上 |
| 操作列统一为「图标 + Tooltip」，不再有的带文字有的不带 | workers / workType / xinzi / attendance-record |
| 删除确认文案统一（`ConfirmDelete`） | 同上 |
| `attendance-record` 移除 disabled 的「添加记录」按钮，改为页面描述说明 | `attendance-record/list.tsx:52-60` |

#### P1-3 空态与加载态统一（0.5 天）

**新增**：`src/components/ui/EmptyState.tsx`、`SkeletonPage.tsx`

| 现状 | 改为 |
|---|---|
| `App.tsx:58-62` 居中 Spin | `SkeletonPage`（页面骨架） |
| `tongji/index.tsx:218` `Empty` | `EmptyState`（带图标 + 主操作） |
| `OverviewTab.tsx:178` `Alert success` 当空态 | `EmptyState` |
| `DayStatsBar.tsx:32` 纯文字 | `EmptyState` 紧凑版 |

---

### P2 — 锦上添花（约 2.5 天，可延后）

#### P2-1 统计页（1 天）

| 动作 | 文件 |
|---|---|
| Tab 内加右侧锚点目录（`Affix`），解决 35 张图无导航 | `tong-ji/index.tsx` |
| 6 个 `Statistic` 卡片统一为 `StatCard`（等高、同字号） | `OverviewTab.tsx:96-141`、`TimeTab.tsx:23-44` |
| 概览底部「分布与画像」折叠区默认**收起** | `OverviewTab.tsx:282-284` |
| `resetScroll` 补丁保留（有了锚点后不再是主要依赖） | `index.tsx:61-72` |

#### P2-2 工时&薪资展开表（0.5 天）

- 月 / 日 / 明细三级用缩进 + 背景深浅区分层级
- 未定价提示改 `Banner`（与 P0-2 同批）

#### P2-3 硬编码色替换（0.5 天）

| 文件:行 | 现值 | 替换为 |
|---|---|---|
| `PySearchSelect.tsx:104` | `#4169E1` | `token.colorPrimary`（**E2E 有断言，需同步改 `tests/拼音搜索组件.spec.ts`**） |
| `WorkMinutesInput.tsx:63` | `#94a3b8` | `token.colorTextTertiary` |
| `ChartCard.tsx:18` | `#999` | `token.colorTextTertiary` |
| `GradientButton.tsx:14` | `#6253e1 → #04befe` | 视风格决策，改为品牌色渐变或删除 |
| `ErrorBoundary.tsx:19` | `#FF4D4F` | `token.colorError` |
| `download.ts:25` | `#fff` | 保持（导出 PNG 背景，与主题无关） |

#### P2-4 记忆化清理（0.5 天，可选）

项目已启用 React Compiler（`vite.config.ts:75`），`AGENTS.md` 明确"非必要不使用记忆化"。
当前 21 个文件 70+ 处 `useMemo` / `useCallback`，建议逐页迁移时顺手删掉纯性能目的的用法，**不要单独开一轮**。

---

## 三、执行顺序

```
M1（2 天）  token + PageShell + PageHeader + Header 重排
            → 交付：全站视觉立刻统一，布局不再打架

M2（1.5 天）签到页两栏 + Alert 收敛 + 快捷工时分组
            → 交付：核心页体验质变

M3（2 天）  列表页统一（FilterBar + DataTable + ConfirmDelete）
            → 交付：四页结构一致，操作列/删除文案统一

M4（1.5 天）空态/骨架屏 + 工时薪资展开表 + 统计页锚点
            → 交付：边角体验补齐

M5（1 天）  硬编码色替换 + 全量回归（单测 221 / E2E 552 断言 / build）
            → 交付：可发布
```

**合计 8 天。** 每个里程碑结束都跑一次对应 E2E spec，保证随时可回滚。

---

## 四、明确不再做的事

写下来避免以后反复讨论：

- ❌ 暗色模式、主题切换器
- ❌ 移动端 / 平板断点适配
- ❌ `aria-label`、键盘导航、焦点管理、对比度校验
- ❌ 更换组件库或自研后台框架
- ❌ i18n 补全（1466 处中文硬编码保持现状）
- ❌ 数据层、薪资计算、导出、图表聚合逻辑（`compute.ts` / `options.ts` / `salary.ts`）**一律不动**

---

## 五、还剩 2 个决策

**1. 签到页是否用两栏？**
- A. 两栏（左录入 / 右记录）——推荐，桌面端消除来回滚动
- B. 保持单栏，只做内部重排——改动小，但收益减半

**2. 视觉风格倾向？**
- A. 克制专业：白底 + 单一品牌蓝 + 语义色，弱化渐变（推荐）
- B. 保留现有蓝 + 紫蓝渐变（`GradientButton` 风格）
- C. 高密度工具感：紧凑间距、小字号、类似飞书多维表格

> 定完这两项，直接从 M1 开始。如果都不回，我按「A + A」执行。

---

## 六、实施记录（2026-10-19）

### 新增文件

| 文件 | 作用 |
|---|---|
| `src/theme/tokens.ts` | 品牌色 / 语义色 / 中性色 / 圆角 / 阴影 / 间距 / 字体 / 布局尺寸 |
| `src/theme/antdTheme.ts` | token → antd ThemeConfig（Layout / Menu / Card / Table / Button / Tag / Alert / Segmented / Statistic / Tabs / Form） |
| `src/components/layout/PageShell.tsx` | 统一限宽容器（1440），在 App 里包住 `<Outlet />` |
| `src/components/ui/HelpTip.tsx` | 问号 Tooltip，替代常驻说明 Alert |
| `src/components/ui/DataTable.tsx` | 统一表格（middle、分页总数、保留 `DataTable.Column` 写法） |
| `src/components/ui/FilterBar.tsx` | 统一筛选条（左筛选 / 右操作） |
| `src/components/ui/StatCard.tsx` | 统一统计卡 |
| `src/components/ui/EmptyState.tsx` | 统一空态（普通 / 紧凑） |
| `src/components/ui/SkeletonPage.tsx` | 页面骨架屏 |
| `src/components/ui/ChartNav.tsx` | 图表页页内锚点导航 |

### 删除

- `src/components/GradientButton.tsx`（紫蓝渐变按钮；全站唯一使用处已改为普通 primary Button）

### 主要改动

- `src/style/index.css`：从 1 行扩到设计系统基础样式（字体、tabular-nums、PageHeader、表格、卡片、滚动条、焦点）
- `src/contexts/color-mode/index.tsx`：改用 `antdTheme`
- `src/App.tsx`：`PageShell` 包 Outlet；骨架屏替代 Spin；通知改右下角
- `src/components/header/index.tsx`：版本 Tag → 弱化文字；开发端口 Radio → Dropdown；刷新按钮加图标；帮助改 text 按钮
- 签到页：两栏（左 420 录入 / 右自适应记录）、删双标题与 `min-h-screen` 包裹、快捷工时加选中态、日期加「今天/昨天」、汇总条压缩、说明 Alert → 一行小字
- 五个列表页：FilterBar + DataTable + 一行小字提示 + ID 列收窄 + 操作列统一
- 统计页：StatCard 统一、ChartNav 锚点、折叠区默认收起、EmptyState
- 工时&薪资：三级展开表加左侧色条层级、数字列右对齐
- 拼音高亮：`#4169E1` → `brand.primary`（`#2563eb`），同步更新 E2E 断言

### 验证

| 项 | 结果 |
|---|---|
| `pnpm lint` | 0 warning / 0 error |
| `pnpm tsc-check` | 仅剩既有 `providers/pocketbase/filters.ts` 1 个错误（与 UI 无关） |
| `pnpm test:unit` | 221 passed |
| `pnpm test:e2e` | 61 passed |
| `pnpm build` | 通过 |

### 与计划的差异（都是被真实约束逼出来的）

1. **Header 左侧未放面包屑**：会与 Edit 页面的 breadcrumb 重复，E2E 会定位到两个按钮。改为只优化右侧（版本弱化、端口收进 Dropdown、按钮降级）。
2. **通知改到右下角**：右上角通知堆叠会遮挡页面右上角操作按钮（真实 UX 问题，也让 E2E 点击超时）。BackTop 随之上移到 80px。
3. **人员下拉 `listHeight=180` + 「本次录入」预览区**：多选下拉会盖住下方控件，点工种/工时时会误选。用 130px 的预览区承接下拉展开空间，既解决遮挡，又提供提交前确认。
4. **`day-stats` 保持文本连续**：`1人` / `6h` 必须在同一元素内（E2E 有 `toContainText`），没有拆成两个 span。
5. **`+30min` 等按钮保持英文单位**：E2E 按 `getByRole("button", { name: "+30min" })` 定位。
6. **未加斑马纹**：antd 默认无斑马纹，加 `rowClassName` 会影响行背景与展开行，收益不明显，暂缓。
