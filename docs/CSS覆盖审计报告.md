# CSS 覆盖审计报告（2026-10-21）

背景：此前让 AI 优化 UI 时，为了美观引入了一些覆盖手段，破坏了组件原有状态（典型：禁用态失效）。本报告是按模式清单对全库的扫描结果。清单：① 测试选择器用于样式覆盖；② `!important` / 属性选择器压样式；③ 裸 `:hover` 缺 `:disabled` 守卫；④ 内联样式覆盖组件状态；⑤ `danger-hover` / `NEUTRAL_TESTIDS` 残留核对。

## P1 确认的问题：`.danger-hover` 压掉禁用态（已修复 2026-10-21）

`src/style/index.css:140-148`

```css
.ant-btn.danger-hover,
.ant-btn.danger-hover .anticon {
  color: var(--text-secondary) !important;
}
.ant-btn.danger-hover:hover,
.ant-btn.danger-hover:hover .anticon {
  color: var(--error) !important;
  background: #fef2f2 !important;
}
```

两个问题：

1. **没有 `:not(:disabled)` 守卫。** `!important` 无条件生效，antd 自己的禁用配色（`colorTextDisabled`）被压掉；且 CSS `:hover` 对禁用按钮依然命中——批量勾选行后鼠标划过"删除"按钮，**禁用按钮照样变红、出浅红底**，看起来可点。这正是"禁用状态失效"的根因。
2. **字面色违规。** `#fef2f2` 硬编码，违反本文件头部第 5 行的约定（"色值统一来自 src/theme/tokens.ts"）。tokens 里已有 `semantic.errorSoft`（`#fef2f2`）。

受影响调用点（`className="danger-hover"` 且**同时传了 `disabled`** 的，全部会踩坑）：

| 文件 | 位置 | disabled 条件 |
| --- | --- | --- |
| `src/pages/qian-dao/qian-dao.tsx` | 281-289 | `selection.hasSelection` |
| `src/pages/attendance-record/list.tsx` | 205-212 | `selection.hasSelection` |
| `src/pages/workType/list.tsx` | 169-174 | 基础工种不可删 |
| `src/pages/xin-zi/list.tsx` | 120-127 | 基础工种+空 worker |

另有 `src/pages/workers/list.tsx:72-85` 目前没传 `disabled`，属于同一模式族；将来一旦加 disabled 会原样复发。

**修复建议**：三处选择器全部加 `:not(:disabled)`（基态、`.anticon`、`:hover` 一并），`#fef2f2` 换成 `var(--error-soft)`（需在 `:root` 补这个变量，与 tokens 对齐）；或改为在 tokenConfig 里让 `error` 相关组件走 antd 原生 danger 配色，删掉这段 CSS。

## P2 残留机器：按 testid 决定颜色的死代码

`src/pages/qian-dao/BatchEntryPanel.tsx:67-116`

- `NEUTRAL_TESTIDS = new Set([""])` 已清空，但整套"按 testid 决定颜色/是否显示图标"的机器还在：`StatusLine` 里的 `neutral` 分支现在永远不可达（`testId` 不会是 `""`）。
- 相关注释（第 11 行、第 67 行）仍在描述已废弃的中性灰行为，会误导下一个读者（包括 AI）。

这一条比死代码本身更重要：**"用 testid 作为样式键"正是本次审计要清除的反模式本体**。机器留着，下次一句话就能让 AI 往 Set 里再填东西、把"未填完"的警告色又改成中性灰。建议整体删掉 `NEUTRAL_TESTIDS` 与 `neutral` 分支，`StatusLine` 直接按 `type` 映射颜色与图标。

## P3 观察项（判断题，非违规）

1. **`.row-editing` 的 `!important`**（index.css:132-134）：`background: var(--brand-soft) !important` 会连选中行底色一起压掉——"正在编辑 + 已勾选"的行看不出勾选态。低频组合，可接受，但值得知道。
2. **PageHeader 系列覆盖的 `!important` 未必必要**（index.css:74-97）：antd v5 的样式经 `:where()` 降权，普通选择器通常已能盖过，这些 `!important` 是过度防御；其中 subtitle 的 `color: var(--text-tertiary) !important` 是纯字色覆盖，无状态冲突风险。建议逐条降级为普通权重，只保留确实压不住的。
3. **斑马纹三条**（index.css:123-129）：设计上排除选中行、补 hover，注释把取舍写清楚了，**成立，不算问题**；但它依赖 antd 的 `:where()` 降权这一实现细节，antd 升级时最先碎的就是它。
4. **两份"色值真相源"**：`index.css:8-33` 的 `:root` 变量是 `tokens.ts` 的手抄副本（注释自称"保持一致"）。`tokens.ts` 第 4 行说"改这里 = 改全站"，但 CSS 这份并不会跟着变——这正是 AI 改一处漏一处、颜色漂移的土壤。建议由 tokens 统一注入 CSS 变量，或至少在多处加"改色请同步两处"的指针注释。

## 核对结果

- `danger-hover`：仍在（见 P1），5 处调用。
- `NEUTRAL_TESTIDS`：Set 已清空（如你所说），但机器未拆（见 P2）。
- 其他 testid 用于选择器的情况：未发现 CSS / JS 里还有按 testid 取样式键的机制；`data-testid` 现在只承担测试定位职责，属于正常用法。
- `!important` 全部集中在 `src/style/index.css`（23 处），无散落。
- 未发现内联样式里 `pointerEvents: none` / `cursor: not-allowed` 之类模拟禁用的 hack。
