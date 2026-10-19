# UI 重写评估报告

> 评估对象：`Attendance-system-refine`（工人考勤 / 记工系统）  
> 评估方式：全量阅读 `src/` 下 81 个 TS/TSX 文件（10,251 行）、配置、E2E 与单测  
> 结论日期：2026-10-19
>
> ⚠️ **范围已裁剪（2026-10-19）**：不做暗色模式、不做移动端、不做可访问性，保留 antd + Refine。
> 本文件保留为**完整诊断依据**；实际执行以 [`UI重写执行清单.md`](./UI重写执行清单.md) 为准（8 天 / 3 个优先级）。

---

## 一、结论先行

**值得重写，但不建议"推倒重来换技术栈"。**

当前 UI 的问题，**七成不在组件库本身，而在"没有设计系统 + 页面壳混杂 + 信息层级平铺"**。  
换掉 antd / Refine 会带来 3~5 倍工作量，并直接摧毁现有 552 条 E2E 断言（114 个唯一 `data-testid`）——收益远小于代价。

推荐路线：**保留 antd 5 + Refine 作为内核，重写"设计系统层 + 布局壳 + 页面结构"，逐页迁移。**

预期收益：

| 维度     | 现状                  | 目标                 |
| ------ | ------------------- | ------------------ |
| 视觉一致性  | 三套样式方案混用，7 处硬编码色    | 单一 token 体系，0 硬编码色 |
| 首屏信息密度 | 签到页 20+ 交互元素平铺      | 主任务区 / 次任务区分离      |
| 常驻提示   | 17 个文件 31 处 `Alert` | 收敛为 Tooltip / 首次引导 |
| 暗色模式   | 无（Provider 名不副实）    | 可选，token 驱动        |
| 移动端    | 按钮换行、表格挤压           | 断点级适配              |
| 可访问性   | 图标按钮无 aria-label    | 全量补齐               |

---

## 二、现状盘点

### 2.1 技术栈

| 层   | 选型                                          | 备注                   |
| --- | ------------------------------------------- | -------------------- |
| 框架  | React 19 + React Compiler                   | 已开启 `compiler: true` |
| 元框架 | Refine 5（core / antd / react-router）        | UI 与数据层强绑定           |
| 组件库 | antd 5.29 + `@refinedev/antd`               | 全站唯一组件来源             |
| 样式  | Tailwind 4 + antd CSS-in-JS + `antd-style`  | 三套并存                 |
| 图标  | `@ant-design/icons` + `@tabler/icons-react` | 两套并存                 |
| 图表  | ECharts 6（按需注册）                             | 自写薄封装，质量不错           |
| 状态  | Zustand（persist）+ TanStack Query            | —                    |
| 构建  | Vite 8 + Electron                           | —                    |

### 2.2 页面清单

| 路由                   | 页面        | 类型            | 代码行数                       |
| -------------------- | --------- | ------------- | -------------------------- |
| `/qiandao`           | 人员签到（核心页） | 复合表单 + 可编辑表格  | 265 + 181 + 77             |
| `/attendance-record` | 考勤记录      | 列表 + 批量删除     | 188                        |
| `/workers`           | 人员管理      | CRUD          | 116 / 88 / 55              |
| `/workType`          | 工作管理      | CRUD          | 170 / 87 / 55              |
| `/xinzi`             | 薪资设置      | CRUD          | 116 / 89 / 60              |
| `/gongshi`           | 工时&薪资显示   | 三级展开表 + 导出    | 192 + 206 + 93             |
| `/tongji`            | 统计图表      | 4 Tab / 35 张图 | 224 + 334 + 152 + 195 + 89 |

统计页 35 张图分布：概览 9、时间模式 12、关系分析 4、个人分析 10。

---

## 三、UI 问题诊断

按"对体验的实际伤害"排序，而非按代码洁癖排序。

### P0 — 结构性体验问题

#### 1. 签到页（核心页）信息层级完全平铺

`src/pages/qian-dao/qian-dao.tsx:110-263`

一屏内同时存在约 20 个交互元素，且视觉权重接近：

```
标题「工时录入系统」
├─ 日期状态 Alert（今天/过去/未来）
├─ 人员多选
├─ 12 个快捷工时按钮 + 4 个 ±分钟按钮
├─ 小时输入框 + 分钟 Tag
├─ 日期选择 + 工种选择 + 录入按钮
├─ 状态 Alert（请选择人员/工时/合并提示/超限）
├─ 当天汇总卡片（4 个统计 + 工种 Tag）
├─ 说明 Alert（同键合并）
├─ 批量删除按钮
├─ 说明 Alert（可搜索筛选）
├─ 人员筛选
└─ 当天记录表格
```

用户每次录入都要在 6 个区块间做视觉跳转。**这是"不好用"的最大来源，不是配色。**

#### 2. 布局壳与页面容器打架

`src/pages/qian-dao/qian-dao.tsx:111-113`

```tsx
<List>                                        // Refine 自带 padding + 标题
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
    <div className="max-w-6xl mx-auto">       // 又一层居中 + 限宽
```

后果：

- 双重内边距，左右留白不可控；
- `bg-gray-50` 与 antd `colorBgLayout` 叠加，暗色下直接破功；
- `min-h-screen` 让短内容也永远出现滚动条；
- `max-w-6xl` 在 2K 屏上留下大片空白，表格被压窄。

其他页面（workers / workType / xinzi / gongshi / tongji）**没有**这层包裹，导致签到页与全站布局不一致。

#### 3. 页面标题重复

`src/pages/qian-dao/qian-dao.tsx:115`

```tsx
<AntdTitle level={3} className="mb-6! text-center">工时录入系统</AntdTitle>
```

`<List>` 已渲染一次标题区，这里再手写一个，出现"双标题 + 居中 vs 左对齐"冲突。

#### 4. 统计页 35 张图无页内导航

`src/pages/tong-ji/TimeTab.tsx` 单 Tab 纵向 12 张图，滚动长度可达数千像素。  
`src/pages/tong-ji/index.tsx:61-72` 的 `resetScroll()` 手动找滚动祖先 + `window.scrollTo`，正是"页面过长、切 Tab 丢失位置"的症状补丁。

### P1 — 视觉与一致性

#### 5. 没有设计 token 层

`src/contexts/color-mode/index.tsx:26-32`

```tsx
<ConfigProvider locale={locale} theme={{ ...RefineThemes.Blue }}>
```

全站视觉 = antd 默认 + Refine Blue。没有品牌色、圆角、阴影、间距、字号、数字排版的任何自定义。

#### 6. 三套样式方案混用，边界不清

| 方案             | 使用范围                      | 问题                                     |
| -------------- | ------------------------- | -------------------------------------- |
| Tailwind 4     | 27 个文件                    | 用 `mb-2!` / `mt-3!` 强制覆盖 antd，说明优先级没设计 |
| antd CSS-in-JS | 全站组件内部                    | 无法从外部统一改                               |
| `antd-style`   | 仅 `GradientButton.tsx` 一处 | 引入了一个库却只用一次                            |

`src/style/index.css` 全文只有一行 `@import "tailwindcss";`——没有任何 token、reset、字体、滚动条样式。

#### 7. 硬编码颜色（暗色模式的天敌）

| 文件                                | 行   | 颜色                  | 用途                |
| --------------------------------- | --- | ------------------- | ----------------- |
| `components/PySearchSelect.tsx`   | 104 | `#4169E1`           | 拼音高亮（**E2E 有断言**） |
| `components/WorkMinutesInput.tsx` | 63  | `#94a3b8`           | 换算提示              |
| `pages/tong-ji/ChartCard.tsx`     | 18  | `#999`              | 提示图标              |
| `components/GradientButton.tsx`   | 14  | `#6253e1 → #04befe` | 刷新按钮渐变            |
| `components/ErrorBoundary.tsx`    | 19  | `#FF4D4F`           | 错误图标              |
| `pages/tong-ji/download.ts`       | 25  | `#fff`              | PNG 导出背景          |

另有 7 处 Tailwind 灰度类（`bg-gray-50`、`border-gray-200`、`text-gray-500` 等），在暗色下全部失效。

#### 8. 无暗色模式

`ColorModeContextProvider` 名字暗示支持明暗切换，实际**没有任何暗色逻辑**，只传了 light token。  
`header/index.tsx:23` 用了 `useToken()`，是唯一"跟随主题"的写法，其余全是硬编码。

#### 9. 数字排版缺失

工时、金额、统计数字全部用默认字体，表格内未启用 `tabular-nums`，纵向不对齐。

### P2 — 反馈与状态

#### 10. `Alert` 滥用：31 处，多数是常驻噪音

| 页面                       | 数量 | 典型内容                        |
| ------------------------ | -- | --------------------------- |
| `workers/create`         | 3  | "离开页面不保留数据…" / "要求：姓名不能为空…" |
| `gong-shi/list_table`    | 3  | 未定价警告 / 基础工种缺失              |
| `qian-dao`               | 2  | "同一人同一天…" / "可在下方搜索框…"      |
| `attendance-record/list` | 2  | "点选复选框…" / "推荐到人员签到页面…"     |

**用户第二次访问后，这些全是视觉噪音，却占据首屏黄金位置。**

#### 11. 加载态四套并存

| 位置                             | 形态                           |
| ------------------------------ | ---------------------------- |
| `App.tsx:58-62` `RouteLoading` | 居中 `Spin size="large"`       |
| `RootComponent.tsx:61-78`      | 全屏 `Spin fullscreen` + Alert |
| `tongji/index.tsx:175`         | `<Spin spinning>` 包裹         |
| 表格                             | antd Table 自带 loading        |

无骨架屏，切页时布局跳动。

#### 12. 空状态不统一

- `tongji/index.tsx:218` → `<Empty>`
- `OverviewTab.tsx:178` → `<Alert type="success">`
- `DayStatsBar.tsx:32` → 纯文字
- `attendance-record` → 空白表格

#### 13. 页面级筛选器位置不统一

| 页面                       | 筛选器位置                    |
| ------------------------ | ------------------------ |
| `workers/list`           | 标题下方                     |
| `attendance-record/list` | 表格上方右侧                   |
| `gong-shi/list_table`    | 标题下方，右对齐                 |
| `tongji/index`           | 塞进 `headerButtons`（标题右侧） |

同一类操作，四个位置。

### P3 — 交互细节

#### 14. 快捷工时按钮无选中态

`BatchEntryPanel.tsx:96-123`：12 个小时 chip + 4 个 ±分钟按钮，尺寸相同、颜色相同、无当前值高亮。  
用户点完 8 之后，无法从按钮区确认"当前选的是 8"。

#### 15. 主次按钮权重失衡

「+30min」「-30min」「+10min」「-10min」与 12 个小时按钮同级；  
「录入」是唯一的 primary，但被 16 个按钮包围，反而不突出。

#### 16. 日期切换无快捷入口

只能打开日历点选，没有「今天 / 昨天 / 前天」。

#### 17. 表格行内编辑无视觉区分

`qian-dao.tsx:181-195`：编辑态只是把文本换成 `InputNumber` / `Select`，行背景、边框、操作列样式均无变化。

#### 18. 移动端适配不足

- Header：`Radio.Group` + 固定 `width:120` 的版本 Tag + 两个按钮，<640px 必然换行或溢出（`header/index.tsx:89-124`）。
- 签到页：12 个 chip 换行后占 3~4 行，录入按钮被推到首屏之外。
- 表格：无横向滚动容器，列多时挤压变形。

#### 19. 图标按钮缺 `aria-label`

`EditButton hideText` / `DeleteButton hideText`（qian-dao、attendance-record、workType、xinzi 共 10+ 处）、`FloatButton.BackTop`、`IconHelp` 均无文本标签，屏幕阅读器无法识别。

#### 20. 帮助内容硬编码且重复

`GlobalHelp.tsx:10-108`：`helps` 是硬编码对象，未走 i18n；第 4、5 条内容几乎完全重复（"选择日期的时候，默认是今日…"写了两遍）。

### P4 — 工程可维护性

#### 21. 与项目约定冲突

`AGENTS.md` 明确："使用了 react 编译器，所以非必要不使用记忆化"。  
实际：**21 个文件、70+ 处** `useMemo` / `useCallback`，`App.tsx:110` 还有手写 `React.memo`。

#### 22. 列表页复制粘贴

`workers/list`、`workType/list`、`xinzi/list`、`attendance-record/list` 都是  
`List + Alert + PySearchSelect + Table + 操作列` 的复制粘贴，列定义、批量删除、testid 生成各写一遍。

#### 23. `@ts-expect-error` 绕过类型

`App.tsx:145,169,216,239`、`PySearchSelect.tsx:53`、`qian-dao.tsx:169`、`attendance-record/list.tsx:132`、`ExportPopover.tsx:59,68` 等，重写时容易踩空。

#### 24. i18n 形同虚设

`src/locales/` 有完整中英文（162 行 × 2），但业务页面 **1,466 处中文硬编码**，切换语言只影响 Refine 内部文案。

---

## 四、重写的真实约束（必须先认清）

### 4.1 E2E 是最大枷锁，也是最大资产

```
唯一 data-testid：114 个
testid 断言次数：552 次
getByRole 断言：109 次
```

其中**部分断言依赖 antd 内部 DOM 结构**，换组件库必挂：

| 断言方式                                         | 位置                          | 依赖                            |
| -------------------------------------------- | --------------------------- | ----------------------------- |
| `getByRole("textbox", { name: "请选择日期" })`    | `tests/1-人员签到.spec.ts:47`   | antd DatePicker 的 placeholder |
| `getByTitle("2026-10-20")`                   | 同上                          | 日历单元格 `title` 属性              |
| `'<span style="color: rgb(65, 105, 225);">'` | `tests/拼音搜索组件.spec.ts:7-17` | 高亮内联样式，**逐字符比对 HTML**         |
| `getByTestId("row-checkbox-0")`              | 批量删除用例                      | antd Table 的 selection 列      |

**结论：任何"换组件库"的方案，都必须重写 552 条断言。**

### 4.2 Refine 与 antd 是深度绑定

`List` / `Create` / `Edit` / `useEditableTable` / `useSelect` / `SaveButton` / `DeleteButton` / `ThemedLayout` 全部来自 `@refinedev/antd`。  
脱离 antd 意味着改接 `@refinedev/core`，自实现上述全部 UI 组件——**这是"重写一个后台框架"，不是"重写 UI"**。

### 4.3 项目规模决定了"渐进"优于"推倒"

- 27 个页面组件、10,251 行 TS/TSX；
- 数据层、薪资计算、导出、图表聚合逻辑（`compute.ts` 1,492 行、`options.ts` 1,259 行）**与 UI 无关，不应被重写波及**；
- 单人项目，没有并行开发的人力冗余。

---

## 五、三条路线对比

|        | 方案 A：设计系统重构（推荐）                       | 方案 B：全量换 UI 库                                           | 方案 C：仅视觉微调  |
| ------ | ------------------------------------- | ------------------------------------------------------- | ----------- |
| 做法     | 保留 antd/Refine，重写 token、布局壳、页面结构、基础组件 | 换 shadcn/Radix，改接 `@refinedev/core`，自实现 List/Form/Table | 只改主题色、间距、圆角 |
| 工作量    | 中（约 15~20 个新文件 + 逐页迁移）                | 极大（等于重做前端）                                              | 小           |
| E2E 影响 | **几乎为零**（保留全部 testid）                 | 552 条断言全部重写                                             | 零           |
| 视觉提升   | 高（结构 + 视觉同时改善）                        | 最高                                                      | 低（换汤不换药）    |
| 风险     | 低，可逐页回滚                               | 高，易烂尾                                                   | 极低，但收益有限    |
| 适合     | 当前项目                                  | 有 3~5 人月预算的团队                                           | 只想"看起来新一点"  |

**推荐 A。** 如果预算只够做一件事，优先做「布局壳 + 签到页重排」，这两项贡献了 70% 的体验提升。

---

## 六、推荐方案：目标架构

### 6.1 新增目录

```
src/theme/
├── tokens.ts          # 品牌色、语义色、圆角、阴影、间距、字号、动效
├── antdTheme.ts       # light / dark 两套 ThemeConfig
└── global.css         # 字体、tabular-nums、滚动条、focus-visible

src/components/layout/
├── AppLayout.tsx      # 替换 ThemedLayoutV2
├── AppHeader.tsx      # 品牌 + 面包屑 + 全局操作（收敛现有 Header）
├── AppSider.tsx       # 导航（分组 + 折叠）
└── PageHeader.tsx     # 标题 + 描述 + 主/次操作 + 筛选槽位

src/components/ui/
├── PageShell.tsx      # 统一页面容器（替代散落的 p-4/max-w-6xl）
├── FilterBar.tsx      # 统一筛选区（左筛选 / 右范围 / 右操作）
├── DataTable.tsx      # 统一表格（尺寸、斑马纹、粘性表头、数字右对齐、空态）
├── StatCard.tsx       # 统一统计卡（替代 6 处 Row+Col+Card+Statistic）
├── EmptyState.tsx     # 统一空态
├── SkeletonPage.tsx   # 骨架屏
├── HelpTip.tsx        # 问号 Tooltip（替代常驻 Alert）
└── ConfirmDelete.tsx  # 统一删除确认文案
```

### 6.2 布局改造要点

| 现状                                        | 目标                                      |
| ----------------------------------------- | --------------------------------------- |
| Header 右侧堆 Radio + Tag + 刷新 + 帮助，左侧空白 60% | 左侧品牌 + 面包屑；右侧全局操作；开发工具收进「⋯」菜单，生产环境不渲染   |
| 版本 Tag 固定 `width:120` 红色                  | 弱化为文字 `v2026.10.16`，`text-tertiary`，无底色 |
| Sider 折叠按钮在左下角                            | 折叠按钮移至品牌行右侧                             |
| 页面无面包屑                                    | 二级页显示「人员管理 / 编辑」                        |
| 页面标题由各页 `List` 各自渲染                       | 统一 `PageHeader`（标题 + 一句描述 + 操作区）        |

### 6.3 签到页重排（收益最高）

```
┌─────────────────────────────────────────────────────────┐
│ 人员签到                         [今天][昨天]  [刷新]     │
├──────────────────────────┬──────────────────────────────┤
│  录入（主卡片）           │  当天记录（主卡片）           │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │ 人员  [多选搜索    ]│  │  │ 筛选 [人员]  删除选中  │  │
│  │ 日期  [2026-10-19] │  │  ├────────────────────────┤  │
│  │ 工种  [搬运      ] │  │  │ 表格（可编辑）          │  │
│  │ 工时  [8] 时 [0] 分│  │  │                        │  │
│  │ 快捷  [2][5][8][10]│  │  │                        │  │
│  │       [±10m][±30m] │  │  │                        │  │
│  │ ─────────────────  │  │  │                        │  │
│  │ 状态：可录入        │  │  │                        │  │
│  │ [    录 入    ]    │  │  │                        │  │
│  └────────────────────┘  │  └────────────────────────┘  │
│  当天汇总（紧凑条）       │                              │
└──────────────────────────┴──────────────────────────────┘
```

关键变化：

1. **两栏**：录入与记录并列，消除"上下滚动才能确认结果"的来回；
2. 快捷工时按常用度分组（`2 / 5 / 8 / 10` 主推，其余折叠），**当前值高亮**；
3. 常驻说明 Alert 改为标题旁 `HelpTip`；
4. 状态反馈固定在录入按钮上方，不再随内容长度跳位；
5. 当天汇总从 4 个 `Statistic` 卡片压缩为一条紧凑数字条；
6. 移动端自动堆叠为单栏，录入卡片置顶。


### 6.4 Alert 收敛策略

| 类型                  | 现状      | 目标                              |
| ------------------- | ------- | ------------------------------- |
| 常驻说明（"同键合并""可搜索筛选"） | `Alert` | `HelpTip` 问号图标                  |
| 首次使用引导              | 无       | 一次性 `Popover`（localStorage 记已读） |
| 校验状态（请选择人员/超限）      | `Alert` | 保留，但改为表单内联提示，位置固定               |
| 危险操作警告（删除关联记录）      | `Alert` | 移入确认弹窗                          |
| 数据异常（未定价工种）         | `Alert` | 保留（确实需要用户处理），但改为可关闭             |

目标：常驻 `Alert` 从 31 处降到 5 处以内。

---

## 七、分阶段实施计划

> 每阶段结束都可独立交付、独立回滚，不要求一次做完。

### 阶段 0：基线（0.5 天）

- [ ] 跑通 `pnpm test:e2e`，记录全绿基线
- [ ] 对 7 个页面各截一张 1536×864 基准图，存 `docs/ui-baseline/`
- [ ] 把 114 个 testid 抽成 `tests/helpers/testids.ts` 常量（可选，但强烈建议）
- [ ] 在 `docs/` 记录「不允许删除已有 testid」的约定

### 阶段 1：设计 token + 主题（1~1.5 天）

- [ ] `src/theme/tokens.ts`：品牌色、语义色（success/warning/error/info）、中性色阶、圆角（4/8/12）、阴影（3 级）、间距（4 的倍数）、字号（12/14/16/20/24/32）
- [ ] `src/theme/antdTheme.ts`：`components` 级覆盖（Button 高度、Card 圆角与阴影、Table 表头背景、Input 圆角、Tag 无边框）
- [ ] `global.css`：字体栈、`font-variant-numeric: tabular-nums`、`focus-visible` 描边、细滚动条
- [ ] 暗色模式：`theme.darkAlgorithm` + `useUiStore` 持久化 + Header 切换按钮（**可选，但 token 层要先留好口子**）
- [ ] 替换 7 处硬编码色为 token / CSS 变量（**注意 `PySearchSelect` 的颜色被 E2E 断言，改动需同步测试**）

### 阶段 2：布局壳（2 天）

- [ ] `AppLayout` / `AppHeader` / `AppSider` / `PageHeader`
- [ ] Header 重排：品牌 + 面包屑 + 全局操作；开发端口切换收进 `Dropdown`，生产不渲染
- [ ] Sider：菜单分组（日常操作 / 基础数据 / 分析），折叠按钮上移
- [ ] 移除各页 `min-h-screen` / `bg-gray-50` / `max-w-6xl`，统一由 `PageShell` 控制
- [ ] 替换 `App.tsx:236-240` 的 `ThemedLayoutV2`（保留 `ThemedSider` 的菜单生成逻辑或改为 `useMenu`）

### 阶段 3：基础组件（2 天）

- [ ] `PageShell` / `FilterBar` / `DataTable` / `StatCard` / `EmptyState` / `SkeletonPage` / `HelpTip` / `ConfirmDelete`
- [ ] `DataTable` 统一：`size="middle"`、斑马纹、粘性表头、数字列右对齐、空态插槽、分页器位置
- [ ] `SkeletonPage` 替换 4 处 `Spin`

### 阶段 4：逐页迁移（5~7 天）

按"收益 / 风险"排序：

| 顺序 | 页面    | 主要动作                          | 风险                         |
| -- | ----- | ----------------------------- | -------------------------- |
| 1  | 人员签到  | 两栏重排、快捷工时分组、Alert 收敛、汇总条压缩    | 中（testid 多，但结构可保留）         |
| 2  | 考勤记录  | `FilterBar` 统一、两个 Alert 合并、空态 | 低                          |
| 3  | 人员管理  | 抽 `DataTable`、操作列统一           | 低                          |
| 4  | 工作管理  | 同上 + 基础工种特殊态                  | 低                          |
| 5  | 薪资设置  | 同上 + 表单页统一                    | 低                          |
| 6  | 工时&薪资 | 展开表视觉层级、导出入口                  | 中（三级表结构复杂）                 |
| 7  | 统计图表  | Tab 内加锚点导航、统计卡统一、折叠区默认收起      | 中（35 张图，逐张确认不破坏 canvas 断言） |

**每迁完一页，立即跑该页对应的 E2E spec。**

### 阶段 5：响应式 + 可访问性（1.5 天）

- [ ] 断点：`<640` 单栏、`640~1024` 双栏降级、`>1024` 完整布局
- [ ] Header 小屏折叠为汉堡菜单
- [ ] 表格横向滚动容器 + 首列固定
- [ ] 所有图标按钮补 `aria-label`
- [ ] 键盘可达性：`focus-visible` 全站可见、Modal/Drawer 焦点陷阱确认

### 阶段 6：回归与验收（1 天）

- [ ] `pnpm test:unit` 全绿（当前 221 例）
- [ ] `pnpm test:e2e` 全绿（当前 552 断言）
- [ ] `pnpm build` + Electron 启动验证
- [ ] 新基准截图对比
- [ ] Lighthouse 可访问性 ≥ 90

**总计约 13~15 个工作日**（单人）。若只做「阶段 1 + 2 + 签到页」，约 4~5 天，可拿到 70% 的收益。

---

## 八、逐页改造要点（可直接当任务清单）

### 签到页 `src/pages/qian-dao/`

| 问题       | 改法                                                        | 文件                             |
| -------- | --------------------------------------------------------- | ------------------------------ |
| 双标题      | 删除手写 `AntdTitle`，用 `PageHeader`                           | `qian-dao.tsx:115`             |
| 布局打架     | 删除 `min-h-screen bg-gray-50 p-4 max-w-6xl`，改用 `PageShell` | `qian-dao.tsx:112-113`         |
| 信息平铺     | 拆为「录入卡片 / 记录卡片」两栏                                         | `qian-dao.tsx:110-263`         |
| 16 个按钮同级 | 分组 + 选中态 + 折叠次要项                                          | `BatchEntryPanel.tsx:96-123`   |
| 常驻 Alert | 改 `HelpTip`                                               | `qian-dao.tsx:122-127,144-149` |
| 汇总卡占位大   | 压缩为一行数字条                                                  | `DayStatsBar.tsx:15-76`        |
| 编辑态不明显   | 行背景 + 左侧色条 + 操作列固定                                        | `qian-dao.tsx:181-258`         |
| 日期无快捷    | 加「今天 / 昨天 / 前天」Segmented                                  | `BatchEntryPanel.tsx:142-148`  |

### 考勤记录 `src/pages/attendance-record/list.tsx`

| 问题                 | 改法                            |
| ------------------ | ----------------------------- |
| 两个 Alert 占首屏       | 合并为一个 `HelpTip` + 首次引导        |
| disabled「添加记录」按钮占位 | 移除，改为 `PageHeader` 描述里的说明     |
| 筛选区位置              | 统一进 `FilterBar`               |
| 批量删除按钮与筛选混排        | 移入 `DataTable` 的 `toolbar` 槽位 |

### 人员 / 工作 / 薪资列表

| 问题                           | 改法                     |
| ---------------------------- | ---------------------- |
| 三页结构重复                       | 抽 `CrudListPage` 配置化组件 |
| 操作列文案不一（有的 `hideText`，有的带文字） | 统一为图标 + Tooltip        |
| 删除确认文案不一                     | 统一 `ConfirmDelete`     |
| 基础工种特殊逻辑                     | 抽 `isBase` 标记，统一禁用样式   |

### 工时&薪资 `src/pages/gong-shi/`

| 问题                    | 改法                        |
| --------------------- | ------------------------- |
| 三级展开表视觉无层级            | 月/日/明细用缩进 + 背景深浅区分        |
| 未定价 Alert 长文          | 改为可关闭的 `Banner` + 「去设置」跳转 |
| 导出入口在 `headerButtons` | 移入 `PageHeader` 主操作       |

### 统计图表 `src/pages/tong-ji/`

| 问题                   | 改法                                             |
| -------------------- | ---------------------------------------------- |
| 35 张图无导航             | Tab 内加右侧锚点目录（`Affix`）                          |
| 6 个 `Statistic` 卡片不齐 | 统一 `StatCard`（等高、同字号、数字 tabular-nums）          |
| 图表卡片标题信息弱            | 标题 + 口径 `HelpTip` + 导出，统一 `ChartCard`（已有，微调即可） |
| 折叠区默认展开              | 默认收起，减少首屏长度                                    |
| `resetScroll` 补丁     | 加锚点导航后可保留，但不再是主要依赖                             |

---

## 九、风险登记

| 风险                     | 等级 | 缓解                                                     |
| ---------------------- | -- | ------------------------------------------------------ |
| E2E 因 DOM 变化失败         | 高  | 阶段 0 建基线；每页迁移后立即跑对应 spec；testid 一律保留                   |
| 拼音高亮颜色被断言              | 中  | `PySearchSelect.tsx:104` 改色时同步改 `tests/拼音搜索组件.spec.ts` |
| antd 版本升级带来样式漂移        | 中  | 锁定 5.x；token 层隔离，不直接改组件内部类名                            |
| Tailwind 与 antd 优先级冲突  | 中  | 禁用 `!important` 覆盖；统一用 antd token 或 `antd-style`       |
| 暗色模式遗漏硬编码色             | 中  | 阶段 1 全量替换；加 ESLint 规则禁止 `#` 字面色值                       |
| 布局改造导致 Electron 窗口尺寸问题 | 低  | 阶段 2 结束后在 Electron 内验证 1366×768 / 1920×1080            |
| 统计页 canvas 断言因布局变化失败   | 低  | `tests/7-统计图表.spec.ts` 有 canvas 数量下限断言，迁移动图表前先确认       |

---

## 十、验收标准

**视觉**

- [ ] 全站无硬编码色值（`grep -rE "#[0-9a-fA-F]{3,6}" src` 仅剩 token 文件）
- [ ] 所有页面使用同一 `PageShell` 内边距
- [ ] 所有表格数字列右对齐 + `tabular-nums`
- [ ] 常驻 `Alert` ≤ 5 处

**功能**

- [ ] 221 个单测全绿
- [ ] 552 条 E2E 断言全绿
- [ ] 签到页批量录入、合并、超限、重试四条主路径手工验证通过

**体验**

- [ ] 1366×768 下签到页首屏可见「录入按钮 + 当天记录前 3 行」
- [ ] 375×812 下无横向溢出、无按钮文字截断
- [ ] 键盘 Tab 可走完签到页全部控件

---

## 十一、需要你决策的 6 个问题

1. **是否保留 antd + Refine？**  
   推荐保留。换库意味着重写 552 条断言 + 自实现后台框架。
2. **是否需要暗色模式？**  
   如果需要，阶段 1 就要把 token 设计成双主题；如果不需要，也建议用 CSS 变量而非字面色值。
3. **视觉风格倾向？**
   - A. 克制专业（白底 + 单一品牌蓝 + 语义色，类似 Linear / Notion）
   - B. 保留现有蓝 + 渐变（`GradientButton` 的紫蓝渐变）
   - C. 更"工具感"（高信息密度、紧凑间距、类似 Excel / 飞书多维表格）
4. **签到页是否接受两栏布局？**  
   这是收益最大的一步，但会改变现有操作习惯（从左到右 vs 从上到下）。
5. **是否允许调整 E2E 测试？**  
   建议：**只允许新增，不允许删除已有 testid**。个别依赖 antd 内部 DOM 的断言（拼音高亮、日历 title）允许改写选择器。
6. **移动端优先级？**  
   如果只是桌面自用，阶段 5 可以砍掉一半工作量。

---

## 附录：关键代码位置索引

| 主题     | 文件:行                                            |
| ------ | ----------------------------------------------- |
| 布局与路由  | `src/App.tsx:233-272`                           |
| 主题配置   | `src/contexts/color-mode/index.tsx:24-35`       |
| 全局样式   | `src/style/index.css`（仅 1 行）                    |
| Header | `src/components/header/index.tsx:88-125`        |
| 签到页    | `src/pages/qian-dao/qian-dao.tsx:110-263`       |
| 录入面板   | `src/pages/qian-dao/BatchEntryPanel.tsx:57-180` |
| 当天汇总   | `src/pages/qian-dao/DayStatsBar.tsx:12-77`      |
| 拼音选择器  | `src/components/PySearchSelect.tsx:94-115`（高亮色） |
| 工时输入   | `src/components/WorkMinutesInput.tsx:39-68`     |
| 图表卡    | `src/pages/tong-ji/ChartCard.tsx:39-80`         |
| 统计页壳   | `src/pages/tong-ji/index.tsx:173-223`           |
| 帮助抽屉   | `src/components/GlobalHelp.tsx:10-125`          |
| E2E 契约 | `tests/*.spec.ts`（114 testid / 552 断言）          |
