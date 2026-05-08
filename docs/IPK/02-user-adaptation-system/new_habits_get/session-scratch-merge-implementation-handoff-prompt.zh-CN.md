# 发给新 AI 的实现 Prompt：从用户发言提取新习惯与 session scratch 合并系统

下面这段 prompt 可以直接发给一个全新的 AI。它的目标不是继续讨论方案，而是让新 AI 阅读对应权威文件后，完整准确地实现这次已经拍板的“从用户发言提取新习惯 + session 内 scratch 合并 / 冲突处理”功能。

---

你现在在仓库 `/home/bzz/Aether` 中工作。你的任务是实现 **从用户发言中提取新习惯，并在当前 session 内完成 imported habits / scratch habits 的查重、合并、覆盖、冲突审阅**。

不要重新设计一套方案。先严格阅读下面文件，并按本文档中已经拍板的规则实现。

## 1. 必读文件与优先级

请按顺序阅读：

1. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md`
   这是本次任务的最高优先级设计文档。它定义了最新拍板的提取、对比、合并、冲突弹窗、evidence、`superseded`、prompt 时效性等规则。
2. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md`
   这是 session scratch habits 的已落地机制和扩展设计。若与第 1 个文件冲突，以第 1 个文件为准。
3. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md`
   读取与 `after_user_message`、LLM-only extraction、session scratch habits、prompt 当前用户要求优先级、UI 命中接口相关的决策。
4. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md`
   读取实现契约、路径、安全、触发时机和验证要求。
5. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/03-phase-3-scope-read-and-context-packet.zh-CN.md`
   读取当前 session habit surface 如何注入 prompt，以及“当前消息只影响后续轮次”的约束。
6. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/04-phase-4-signal-extraction-and-summary.zh-CN.md`
   读取 LLM-only 提取、不得使用 regex fallback、`after_user_message` 行为。
7. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/06-phase-6-ui-and-user-review.zh-CN.md`
   读取 current session habits、scratch dialog、review UI 和命中接口展示边界。
8. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md`
   读取已有 schema、scratch 状态和 evidence / proposal / binding 结构。
9. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md`
   只用于确认哪些是非阻塞后续项。不要把 open questions 里的未定想法当成当前必须实现的行为。

如果文档之间存在冲突，优先级是：

```text
new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md
> user-adaptation-system-implementation-decisions.zh-CN.md
> user-adaptation-session-scratch-habits-execution-plan.zh-CN.md
> user-adaptation-v1-implementation-guide/*
> schema / overview / historical discussion docs
```

## 2. 本次必须实现的最终行为

### 2.1 触发时机和回答时效性

- 用户消息写入后触发 `after_user_message` 习惯提取。
- assistant 当前轮回答不等待习惯提取、查重或冲突弹窗完成。
- 当前轮 prompt 只注入“本条用户消息发出之前已经生效”的 imported habits 和 active scratch habits。
- 当前用户消息中刚刚提出的要求，由回答模型直接阅读当前消息本身来遵守。
- prompt 必须明确写入优先级：如果本次用户发言与已注入习惯冲突，本次回答以用户当前要求为准，忽略冲突的已有习惯。
- 习惯提取 AI、习惯对比 AI、回答用户的 AI 是相互独立的调用；习惯相关链路后台并行，尽量在下一次用户发言前产出结果。

### 2.2 提取链路必须只看用户发言

- 快链路只从用户消息中提取习惯。
- assistant 文本不能作为 habit evidence。
- 如果用户明确同意 assistant 的行为标准，真正证据是用户的同意表达，而不是 assistant 的复述。
- v1 不接入文件改动、工具调用、代码 diff、命令轨迹作为快链路 evidence。

### 2.3 不允许 regex fallback 或硬编码 gate

- 从用户发言中提取习惯时，必须完全依赖 LLM 语义分类 / 结构化输出。
- 不得用 regex、关键词列表、二次 gate 决定是否捕获 scratch。
- 不得因为用户没有匹配某个硬编码句式就丢弃 LLM 认为有效的习惯。
- LLM 不可用、模型未配置、输出无法解析时，本轮不写 scratch / signal，也不要把消息标记为已处理；等待后续重试或用户手动整理。
- regex / 关键词线索未来可以作为“必须触发 LLM 复核”的参考层讨论，但不进入当前实现。

### 2.4 LLM 提取结果

把现有“单消息单分类”升级为“单条用户消息 -> 多个候选习惯”。

每条候选必须支持：

- `candidate_id`
- `summary`
- `canonical_text`
- `state_suggestion: active | pending`
- `kind`
- `impact`
- `explicit`
- `temporary`
- `confidence`
- `scope_hint`
- `traits`
- `evidence[]`

每条 evidence 必须至少包含：

- `evidence_id`
- `session_id`
- `message_id`
- `quote`
- `reason`
- `source = user_message`
- `created_at`

数据层预留：

- `start_offset`
- `end_offset`
- `source_role = user`
- `jump_scope = session_local`

提取 prompt 必须要求候选习惯偏原子化：一条候选尽量只对应一件事，减少一条 candidate 同时和多条已有习惯复杂冲突或重合。

同一条用户消息中，同义或高度相近的习惯应合并成一个 candidate，但 evidence 必须逐条保留，不能融合。v1 可以不做同一条用户消息内部冲突检测。

### 2.5 candidate-vs-imported 对比

每条 candidate 必须先和当前 session 中所有 imported habits 对比，不包括 scratch habits。

v1 使用全量比较，不使用 embedding 预筛选。原因是当前不能依赖 embedding 模型，而且一个 session 通常不会有太多 imported habits。全量比较的性能和成本只作为后续测试反馈项。

LLM comparator 输入：

- 一条 candidate。
- 当前 session 的所有 imported habits。
- imported habits 必须带稳定 id 和编号。

LLM comparator 输出：

- `relation: none | overlap | conflict`
- imported habit id / number
- `conflict_kind: full | partial | null`
- `comparison_summary`

规则：

- imported overlap：静默记录正式习惯命中事件，不弹窗、不要求用户确认、不创建 scratch。
- imported overlap 命中记录只需要保留结构化接口，供后续习惯作用范围、置信度提升/下降、命中次数统计使用；当前不实现完整 UI。
- imported conflict：记录 conflict review item，等待批量冲突弹窗。不要立即暂停 imported，不要立即写 active scratch。

### 2.6 imported conflict 批量弹窗

所有 candidate-vs-imported 对比完成后，对有 conflict 的 candidate 统一弹窗。

弹窗按 candidate 分组，不按每一对冲突分散处理：

```text
新候选习惯 A 与以下 N 条当前生效正式习惯冲突
```

每个分组展示：

- candidate 摘要。
- 冲突 imported habit 列表。
- 每条冲突的 AI 对比分析。

用户对 candidate 做一次整体选择：

- 保留现有正式习惯：candidate 不进入 active scratch。
- 采用新 session 要求：暂停 / shadow 该 candidate 冲突的所有 imported references，candidate 写入 active scratch。
- 用户直接输入新的局部解决要求：v1 直接生成一条覆盖当前冲突组的 active scratch，并暂停 / 替换该冲突组里的相关条目。

用户自由输入不做复杂的进一步原子化拆分。以后可以增强，但当前实现不要把它做复杂。

正式习惯库真源不能被这个弹窗直接改写；这里只改变当前 session 的 imported reference / scratch 状态，并记录维护事件或 review 结果。

### 2.7 candidate-vs-scratch 对比

只有 candidate 与 imported habits 既不 overlap 也不 conflict 后，才进入 scratch 对比。

candidate 与当前 session 中所有 active / pending scratch habits 对比。

LLM comparator 输入：

- 一条 candidate。
- 当前 session scratch active / pending habits。
- scratch habits 必须带稳定 id 和编号。

LLM comparator 输出：

- `relation: none | overlap | conflict`
- scratch id / number
- `conflict_kind: full | partial | null`
- `comparison_summary`
- 如果 overlap 但有细微差别，直接返回 `merged_summary` 和 `merged_canonical_text`。

LLM 只负责判断和建议文本；真正的数据变更由程序按固定矩阵执行。

### 2.8 scratch 合并和冲突矩阵

必须实现以下矩阵：

- 新 active + 旧 active overlap：合并到旧 active，evidence 逐条追加，更新 summary / canonical_text，保持 active。
- 新 active + 旧 pending overlap：合并 evidence，更新 summary / canonical_text，旧 pending 提升为 active。
- 新 active + 旧 active/pending conflict：新 active 替换旧 scratch；旧 scratch 标记为 `superseded`，记录 `superseded_by`，不物理删除。
- 新 pending + 旧 active overlap：合并 evidence，保持旧 active。
- 新 pending + 旧 pending overlap：合并 evidence，保持 pending。
- 新 pending + 旧 active conflict：默认保留旧 active，新 pending 不进入 prompt，只作为带冲突标记的 pending review item；用户在批量弹窗中采用或输入新要求后才激活。
- 新 pending + 旧 pending conflict：不弹窗，双方保留 pending，并互相记录 conflict marker。

`superseded` 规则：

- `superseded` 条目继续在习惯暂存区显示，明确标记“已被覆盖”。
- `superseded` 条目不进入 prompt。
- `superseded` 条目不参与后续 active/pending 匹配。
- 如果用户之后又提到一个被覆盖的习惯，直接恢复或生成新的 active scratch，并把这次提及当成新的 candidate 重新走查重和冲突流程。
- v1 不把“新提及与旧 superseded 条目的重合”作为特殊证据互引；以后再设计。

### 2.9 evidence 和跳转

- evidence 必须逐条保存，不能把多个 evidence 合成一个。
- UI v1 至少支持跳转到 `session_id + message_id` 对应消息，并展示 quote。
- `start_offset / end_offset` 作为可选字段预留；能稳定定位就写，不能稳定定位也不阻塞 capture。
- 跨 session evidence 跳转、quote 高亮、跨设备定位属于后续能力。

### 2.10 命中记录接口

- imported overlap 只静默记录命中事件。
- 不要求当前实现完整“当前上下文 / 本轮命中记录 UI”。
- 但需要预留结构化命中记录接口，后续用于习惯作用范围、置信度提升或下降、命中次数统计。
- 不要把 `audit.used_records / omitted_reason` 原样当用户可见命中记录。

## 3. 建议代码阅读路径

先检查当前实现，不要凭空重写：

- `/home/bzz/Aether/packages/opencode/src/adaptation/types.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/scratch.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/habit-classify.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/semantic.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/llm.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/signal.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/summary.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/proposal.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/render.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/storage.ts`
- `/home/bzz/Aether/packages/opencode/src/adaptation/index.ts`
- `/home/bzz/Aether/packages/opencode/src/server/routes/adaptation.ts`
- `/home/bzz/Aether/packages/opencode/src/session/prompt.ts`
- `/home/bzz/Aether/packages/app/src/context/adaptation.tsx`
- `/home/bzz/Aether/packages/app/src/components/adaptation-scratch-dialog.tsx`
- `/home/bzz/Aether/packages/app/src/components/adaptation-current-context-dialog.tsx`
- `/home/bzz/Aether/packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`
- `/home/bzz/Aether/packages/app/src/pages/session/message-timeline.tsx`

重点检查现状：

- `ScratchHabit` 是否已有 `evidence[]`、`conflicts[]`、`state`。
- 当前 extraction 是否仍然只返回一条分类，而不是多个 candidates。
- 当前 scratch merge 是否仍依赖 text norm / similarity heuristic，而不是 LLM comparator。
- 当前 imported conflict 是否仍然会立即 shadow / remove imported reference。
- UI 是否已有 scratch evidence 展示、message jump、proposal inbox jump 能力。

## 4. 推荐实现阶段

不要一次性糊一个巨大补丁。按阶段推进：

### Phase 1：类型和存储

- 增加 `ExtractedHabitCandidate`。
- 扩展 `ScratchEvidence`。
- 增加 imported / scratch comparator result 类型。
- 增加 conflict review batch / review item 类型。
- 增加 hit / maintenance event 结构，用于 imported overlap 命中记录接口。
- 确保 `superseded` 状态和 `superseded_by` 可用。

### Phase 2：LLM extraction

- 改 prompt 和 parser，让一条用户消息返回多个 candidates。
- 每个 candidate 支持多个 evidence。
- 强制 LLM-only，不加 regex fallback。
- 不可解析时跳过，不标记 processed。

### Phase 3：candidate-vs-imported comparator

- 每条 candidate 全量比较当前 session imported habits。
- imported habits 编号。
- overlap 写 hit / maintenance event，不创建 scratch。
- conflict 写 batch review，不立即改 habit surface。
- none 进入 scratch comparator。

### Phase 4：candidate-vs-scratch comparator 和 merge matrix

- 实现 scratch comparator。
- overlap 使用 comparator 返回的 `merged_summary / merged_canonical_text`。
- 按矩阵执行 active/pending merge、replace、superseded、pending conflict marker。

### Phase 5：冲突 review 和 UI

- imported conflict 批量弹窗按 candidate 分组。
- pending-vs-active scratch conflict 批量弹窗。
- 支持用户选择保留现有 / 采用 candidate / 输入新局部解决要求。
- 用户输入新要求时直接生成覆盖当前冲突组的 active scratch。

### Phase 6：prompt priority 和 evidence UI

- session prompt 注入“最新用户发言优先于已有习惯”的严格规则。
- evidence 至少支持 message-level jump 和 quote 展示。
- `superseded` 在暂存区显示“已被覆盖”，但不进入 prompt 和匹配。

### Phase 7：测试、SDK、文档同步

- 覆盖提取多 candidates、多 evidence。
- 覆盖 imported overlap 不创建 scratch。
- 覆盖 imported conflict 不立即暂停，等待 review。
- 覆盖 scratch merge 矩阵。
- 覆盖 `superseded` 不进入 prompt / 匹配，但 UI 可见。
- 覆盖自由输入生成覆盖当前冲突组的 active scratch。
- 如果改动 API route 或 SDK 类型，运行 JS SDK 生成脚本。
- 同步更新 docs/IPK，清理 open questions。

## 5. 测试和验证要求

不要从 repo root 跑测试。按 package 跑：

```bash
cd /home/bzz/Aether/packages/opencode && bun typecheck
cd /home/bzz/Aether/packages/app && bun typecheck
```

根据实际改动补充运行相关测试，例如：

```bash
cd /home/bzz/Aether/packages/opencode && bun test test/adaptation/scratch-habits.test.ts
```

每批代码 / 文档改动后必须运行：

```bash
python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether
python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
```

如果改动 API route 或 generated SDK 类型，运行：

```bash
cd /home/bzz/Aether && ./packages/sdk/js/script/build.ts
```

## 6. 不要做的事

- 不要把慢链路 `signal / summary / proposal` 重新变成 scratch 生效的前置门槛。
- 不要从 assistant 回复中提取 habit evidence。
- 不要使用 regex fallback 或关键词 gate。
- 不要引入 embedding 预筛选 imported habits；v1 全量比较。
- 不要让 imported conflict 立即静默改 session habit surface；必须进入 review / 弹窗。
- 不要把用户弹窗自由输入做复杂原子化拆分；v1 直接覆盖当前冲突组。
- 不要物理删除被替换的 scratch；用 `superseded`。
- 不要强制实现完整命中记录 UI；只保留接口。
- 不要改正式习惯库真源，除非用户走正式入库 / 修改流程确认。

## 7. 最终交付时必须说明

完成后请报告：

1. 哪些提取 / comparator / merge / UI 阶段已经实现。
2. 修改了哪些后端文件。
3. 修改了哪些前端文件。
4. 新增或修改了哪些类型和 API contract。
5. `after_user_message` 是否仍然不阻塞当前回答。
6. 是否完全移除了用户习惯提取中的 regex fallback / hard gate。
7. imported overlap 是否只记录 hit event，不创建 scratch。
8. imported conflict 是否等待批量 review，而不是立即暂停 imported。
9. scratch merge matrix 是否覆盖 active/pending 的 overlap/conflict 组合。
10. `superseded` 是否 UI 可见但不进入 prompt / 匹配。
11. evidence 是否逐条保存并可跳到 message。
12. 用户自由输入是否生成覆盖当前冲突组的 active scratch。
13. 跑了哪些 typecheck / tests / routing guard / IPK doc audit。
14. 还有哪些 open questions 是文档允许保留的非阻塞项。

现在请开始实现。先读文件，检查当前代码，再分阶段落地；不要先输出一大段重新设计。

---

