# 用户自适应系统：Graphify 借鉴下的习惯库执行方案

这份文档是给后续 AI 实现者看的执行文档。

它只讨论两件事：

1. 习惯库内部怎样用图谱、索引、报告和解释工具组织 confirmed habits。
2. 工作区怎样通过引用层从习惯库取回合适习惯，并注入当前 session。

它不改变用户自适应系统的总架构。

## 0. 不可破坏的架构底线

必须坚持：

```text
Aether 工作区引用层  !=  用户自适应系统习惯库
```

两边是概念上不连通的区域，只能通过引用、binding、map 和关系边相互连接。

### 0.0 术语必须先对齐

实现者必须区分两个同名风险点：

- Aether 工作区里的 `project`：必须保留原名，表示当前 UI / session / worktree 的上一层工作区 project。
- 习惯库五层 scope 里的 `initiative`：表示真实长期事项、研究项目、工作目标或可复用工作流范围。它原先在早期文档中被写作 `project`，现在统一改名为 `initiative`。

**v1 不建立任何默认的 Aether project ↔ initiative 绑定**（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)）。initiative 归属由路由 classifier 在 proposal confirm 阶段决定。一个 initiative 天然可跨多个 Aether project，一个 Aether project 也可关联多个 initiative —— 都通过路由而非硬绑定实现。

### 0.1 习惯库是真源

习惯库保存：

- confirmed habit / policy / profile / task_scope / artifact_contract 的结构化真源。
- evidence refs。
- proposal review 结果。
- habit relation / redirect / tombstone。
- 可重建的 indexes / graph / report / wiki。

真源位置必须通过：

```ts
MemoryPath.adaptationRoot()
```

禁止硬编码用户目录、项目目录、`.opencode`、`.aether` 或任何绝对路径。

### 0.2 工作区只保存轻量背景 + refs

Aether 工作区侧的 `global_guidance` / `project_guidance` / `session binding` 只能保存：

- 极短 `summary`
- `stable_context`
- `habit_id`
- 引用来源
- subject / request_type 分块
- 排序和权重
- 当前 Aether project 禁用或 suppression
- 为什么引用这条 habit 的解释路径
- 最近使用统计
- context packet 快照引用

工作区侧不能复制习惯正文并成为第二真源。

如果 UI 需要展示习惯正文，必须通过 `habit_id` 从习惯库解析。

### 0.3 Graphify 借鉴不会把两边连成一个库

Graphify 的借鉴范围仅限：

- 习惯库内部的派生图谱。
- 习惯库派生索引。
- 从习惯库到工作区引用层的 matching / explanation 机制。

禁止做：

- 在 Aether project 目录里创建 `graphify-out/` 作为习惯真源。
- 把工作区 project/session 文档当作 habit graph 的源数据。
- 因为图谱里有边，就把 habit 自动复制到 project/session 文档。
- 让 inferred relation 绕过 proposal 或用户确认。

正确模型是：

```text
confirmed habit 真源
  -> 可重建 habit surface / index / graph / report
  -> scope matching 选择少量候选
  -> session review gate 询问用户是否加入/移出当前 session
  -> session binding 保存已确认的 habit_id
  -> context compiler 注入 current_session_habit
```

### 0.4 Graphify 在这里是“高频调用辅助层”，不是主链路

Graphify 更擅长回答：

- 库内部哪些节点相关。
- 哪些关系值得扩展。
- 怎样用图谱、报告和 query/path/explain 加快导航。

但用户自适应系统的主问题不是“只把库养大”，而是：

- 如何从新增聊天中持续发现和调用相关习惯。
- 如何在每轮 session 中高频、全面、准确地更新当前习惯候选。
- 如何在不静默越权的前提下让当前 session 真正使用到正确习惯。

因此在本系统里：

- Graphify 借鉴只能作为 query-time retrieval 的辅助层。
- 五层 scope、binding、trigger、path、subject、task、artifact 才是第一层检索入口。
- graph expansion 必须在这些入口之后发生，不能反客为主。

## 1. 用普通话解释 Graphify 里值得借的东西

### 1.1 `graph.json` 是地图，不是土地

Graphify 会把代码、文档、论文、图片里的概念变成一张图。

这张图很像“城市地图”：它告诉你哪里和哪里相连，但它不是城市本身。

迁移到习惯系统：

- 习惯真源是“城市本身”，也就是 confirmed habit records。
- `habit-graph.json` 是地图。
- 地图坏了可以重画；真源不能丢。

### 1.2 `GRAPH_REPORT.md` 是导游手册

Graphify 不要求 AI 每次读完整张图。它先生成一页报告，告诉 AI：

- 哪些节点最重要。
- 哪些区域自然聚成一组。
- 哪些连接很意外。
- 哪些地方证据不足。

迁移到习惯系统：

- `habit-report.md` 可以告诉 AI 和用户：当前习惯库里哪些习惯很核心，哪些工作流是一组，哪些规则冲突，哪些习惯太孤立。
- 这能帮助 AI 先有方向，再查细节。

### 1.3 `query / path / explain` 是问路工具

Graphify 支持：

- query：根据问题拉出一小片相关地图。
- path：找两个概念之间的路径。
- explain：解释一个节点和它的邻居。

迁移到习惯系统：

- query：这个请求可能用到哪些习惯？
- path：为什么从当前 session 找到了这条 global habit？
- explain：这条习惯为什么生效，它从哪些证据来，和哪些规则冲突？

这很重要，因为用户应该能问：

```text
为什么你现在用了这条习惯？
这条习惯为什么出现在当前 session？
如果我禁用它，会影响哪里？
```

### 1.4 `EXTRACTED / INFERRED / AMBIGUOUS` 是诚实标签

Graphify 会标记一条关系是：

- 明确发现的。
- 模型推断的。
- 不确定的。

迁移到习惯系统：

- `confirmed`：用户确认过，或结构化真源明确存在。
- `inferred`：模型根据使用情况推断，不能直接当长期规则。
- `ambiguous`：不确定，需要用户或后续证据判断。

高影响习惯必须特别保守：`inferred` 只能帮系统提出 proposal，不能直接扩大生效范围。

### 1.5 community 是自然分组，不是父子树

Graphify 会发现一些节点自然聚在一起。

这不是树，也不是“谁属于谁”。它只是说：“这些东西经常相互连接，可能是一组。”

迁移到习惯系统：

- “项目规划习惯”可能聚成一组。
- “写物理论证习惯”可能聚成一组。
- “代码实现后同步文档习惯”可能聚成一组。

community 只帮助检索和管理，不改变五层平行 scope 标签。

### 1.6 hyperedge / bundle 是一组习惯共同构成流程

普通图谱里，一条边只连接两个点。

但有些事情不是两个点能说清的。例如一个登录流程可能同时涉及 5 个函数。

Graphify 用 hyperedge 表示“这些点一起构成一个流程”。

迁移到习惯系统：

```text
项目规划讨论 workflow bundle:
  - 已确认决策写 implementation-decisions
  - 未决问题写 open-questions
  - 如果改了实现方案，同步 implementation guide
  - 结束前清理已经解决的 open-questions
```

这不是四条互相等价的习惯，而是一组协同规则。

### 1.7 cache / manifest 是“只更新变了的部分”

Graphify 不会每次重新处理所有文件。它会记录文件 hash，只更新变动过的部分。

迁移到习惯系统：

- confirmed habit 改了，重建对应 surface。
- relation 改了，重建对应 graph 边。
- project reference 改了，重建 reference index。
- 不要每轮聊天都扫描所有习惯。

## 2. 推荐分层实现

### Level 0：当前 v1 必须坚持的基础

这是最低要求，必须先稳定。

已存在或应保持：

- `habit-index.jsonl`
- `scope-map.json`
- `trigger-index.json`
- `path-index.json`
- `subject-index.json`
- `task-scope-index.json`
- `conflict-index.json`
- session binding 中的 `habit_ids`
- context compiler 注入 `current_session_habit`

要求：

- 当前 session 的 `habit_ids` 必须每轮注入。
- global / subject / initiative / task_scope / artifact 习惯不能因为层级存在就自动进入 session。
- 当前代码里，当前 session 生效习惯已经分成两类：已确认写入 `habit_ids` 的 imported habits，以及当前 session scratch 区中自动捕获且仍 active 的 scratch habits。
- AI 根据当前 session 聊天匹配到的“习惯库候选”仍应先进入 `session review gate`；但当前 session 中用户明确表达的新局部习惯会先进入 scratch 区，而不是先要求入库确认。
- AI 如果判断当前 session 已有 habit 可能不再适用、应降级、应移出或应被其他 habit 替代，也只能生成提醒或待确认操作，不能自动删除或移出 `habit_ids`。
- pending / rejected / deferred proposal 不能注入。
- project suppression 必须能阻止当前 Aether project 继续使用同类 habit。

不要在 Level 0 做：

- habit graph 可视化。
- embedding。
- 跨 Aether project 自动复用。
- 自动提升 global。
- 复杂 community detection。

### Level 1：v1.1 推荐实现，Graphify 借鉴的最小闭环

目标：

让习惯库有可查询的派生关系图，但仍不改变真源边界。

这一层必须优先做冲突审计，而不是完整用户解释路径。原因是：系统已经有 evidence / proposal 可作为第一层可审计来源，但如果没有冲突审计，graph expansion 可能把不该同时生效的习惯一起推入候选。

这一层还必须优先补齐 session review gate。原因是：对这个系统来说，最重要的不是让 graph 自己扩得很远，而是让 AI 能持续扫描新增聊天、持续找到候选、持续审查当前 session 已有 habit 是否需要更新，但最终增删都必须经过用户确认。

新增文件：

```text
MemoryPath.adaptationRoot()/indexes/
  habit-relations.jsonl
  habit-bundles.json
  habit-graph.json
  habit-report.md
  reference-index.json
```

其中：

- `habit-relations.jsonl`：关系边的派生或确认记录。
- `habit-bundles.json`：workflow bundle / hyperedge。
- `habit-graph.json`：由 habit surfaces、relations、bundles、reference docs 重建出的完整导航图。
- `habit-report.md`：给 AI 和用户快速读的一页式报告。
- `reference-index.json`：`global_guidance` / `project_guidance` / `session binding` 当前引用了哪些 habit id。
- `conflict-audit.json`：可选派生报告，记录冲突、覆盖、禁用、dangling relation 和需要 review 的 inferred / ambiguous relation。

### Level 2：v1.2 推荐实现，解释和调试工具

新增内部能力：

- `queryHabits(input)`
- `explainHabit(habit_id, session_id)`
- `pathBetweenHabits(source_id, target_id)`
- `whyHabitInSession(session_id, habit_id)`

新增 API：

```text
GET /adaptation/habits/explain?session_id=...&habit_id=...
GET /adaptation/habits/path?session_id=...&source=...&target=...
POST /adaptation/habits/query
POST /adaptation/habits/rebuild-graph
```

UI 可以先只做调试入口，不做大地图。

### Level 3：vNext，可视化和高级检索

后续再考虑：

- habit wiki。
- 图形化习惯地图。
- community detection。
- usage-based ranking。
- embedding / vector rerank。
- MCP habit graph 工具。
- 跨 project workflow map。
- 用户在图上拖拽、合并、拆分习惯。

## 3. Level 1 具体 schema

### 3.1 `HabitRelationEdge`

新增到 [types.ts](/home/bzz/Aether/packages/opencode/src/adaptation/types.ts) 或等价文件：

```ts
export const HabitRelationEdge = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "used_with",
    "derived_from",
    "promotes_from",
    "specializes",
    "generalizes",
    "conflicts_with",
    "suppressed_in",
    "supersedes",
    "redirects_to",
  ]),
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  scope: ScopeRef.optional(),
  source_ref: z.string().optional(),
  evidence_refs: z.array(z.string()).default([]),
  confidence: z.enum(["confirmed", "inferred", "ambiguous"]).default("inferred"),
  confidence_score: z.number().min(0).max(1).default(0.5),
  review_status: z.enum(["confirmed", "pending", "rejected", "needs_review"]).default("pending"),
  reason: z.string().default(""),
  created_at: z.string(),
  updated_at: z.string().optional(),
})
```

规则：

- `confirmed` edge 可以参与正常 matching。
- `inferred` edge 只能作为候选扩展和 proposal 依据。
- `ambiguous` edge 默认不自动引入 session，只用于报告和 review。
- `conflicts_with`、`suppressed_in` 是负向边，优先级高于 `used_with`。

### 3.2 `HabitBundle`

```ts
export const HabitBundle = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  relation: z.enum(["workflow", "co_applies", "maintenance_set"]).default("workflow"),
  habit_ids: z.array(z.string().min(1)).min(2),
  scope_refs: z.array(ScopeRef).default([]),
  triggers: z.array(z.string()).default([]),
  source_ref: z.string().optional(),
  evidence_refs: z.array(z.string()).default([]),
  confidence: z.enum(["confirmed", "inferred", "ambiguous"]).default("inferred"),
  confidence_score: z.number().min(0).max(1).default(0.5),
  review_status: z.enum(["confirmed", "pending", "rejected", "needs_review"]).default("pending"),
  reason: z.string().default(""),
  created_at: z.string(),
  updated_at: z.string().optional(),
})
```

规则：

- bundle 不替代单条 habit 真源。
- bundle 只说明“这些 habit 常一起构成一个流程”。
- confirmed workflow bundle 可以帮助一次性引入多个已确认低风险 habit。
- 高影响 bundle 即使 confirmed，也要遵守 context compiler 的安全和权限边界。

### 3.3 `HabitGraphNode`

```ts
export const HabitGraphNode = z.object({
  id: z.string().min(1),
  type: z.enum(["habit", "scope", "reference", "bundle"]),
  label: z.string().min(1),
  scope: ScopeRef.optional(),
  surface_ref: z.string().optional(),
  status: z.enum(["active", "suppressed", "superseded", "deleted"]).default("active"),
  community: z.string().optional(),
  priority: z.number().default(0),
})
```

### 3.4 `HabitGraph`

```ts
export const HabitGraph = z.object({
  version: z.literal("v1").default("v1"),
  updated_at: z.string(),
  nodes: z.array(HabitGraphNode).default([]),
  edges: z.array(HabitRelationEdge).default([]),
  bundles: z.array(HabitBundle).default([]),
  stats: z.object({
    habit_count: z.number().int().nonnegative(),
    edge_count: z.number().int().nonnegative(),
    bundle_count: z.number().int().nonnegative(),
    inferred_edge_count: z.number().int().nonnegative(),
    ambiguous_edge_count: z.number().int().nonnegative(),
  }),
})
```

## 4. Level 1 后端实现任务

### 4.1 修改类型文件

目标文件：

- [types.ts](/home/bzz/Aether/packages/opencode/src/adaptation/types.ts)

任务：

- 加入 `HabitRelationEdge`。
- 加入 `HabitBundle`。
- 加入 `HabitGraphNode`。
- 加入 `HabitGraph`。
- 导出对应 TypeScript 类型。

验收：

- `bun typecheck` 通过。
- 不使用 `any`。
- 不引入与现有 `HabitRelation` 冲突的命名；如果复用旧类型，要迁移字段并保持兼容。

### 4.2 修改索引构建

目标文件：

- [indexes.ts](/home/bzz/Aether/packages/opencode/src/adaptation/indexes.ts)

任务：

- 在 `indexFiles()` 增加：
  - `reference_index`
  - `habit_relations`
  - `habit_bundles`
  - `habit_graph`
  - `habit_report`
- 实现 `rebuildReferenceIndex()`。
- 实现 `rebuildHabitGraph()`。
- 实现 `renderHabitReport()`。
- `rebuildIndexes()` 调用这些新步骤。

规则：

- `habit-graph.json` 从 `habit-index.jsonl`、relations、bundles、reference-index 重建。
- 不从 Aether project 目录读 habit 真源。
- 如果 relation 指向不存在的 habit id，应进入 report 的 broken references，不应让 rebuild 崩溃。
- `inferred` / `ambiguous` 关系可以写入 graph，但 matching 阶段默认低权重。

验收：

- 删除 `indexes/habit-graph.json` 后，`rebuildIndexes()` 能重新生成。
- 空 habit 库也能生成合法空 graph。
- 无 dangling edge 写入 graph 的强连接区；dangling relation 应进入 report。

### 4.3 修改 habit 检索

目标文件：

- [habit.ts](/home/bzz/Aether/packages/opencode/src/adaptation/habit.ts)

任务：

- 新增读取 graph 的内部函数。
- 新增 `expandHabitCandidates()`。
- 新增 `auditSessionHabits()` 或同等逻辑：在扫描新增对话时，同时检查“当前 session 已有 habit 是否需要保留 / 弱化 / 移出 / 替换”。
- 新增 `explainHabit()`。
- 新增 `pathBetweenHabits()`。
- 保持 `listProjectHabits(... current: true)` 的语义不变：只返回当前 session `habit_ids` 中的 habit。

候选扩展规则：

```text
seed candidates
  = current session habit_ids
  + request trigger hits
  + same initiative reference hits（initiative 归属由路由 classifier / session binding 决定，不由 Aether project 派生）
  + subject/path/task hits

expand
  - confirmed used_with: 1 hop
  - confirmed specializes/generalizes: 1 hop
  - confirmed workflow bundle: only if bundle trigger matches
  - conflicts_with/suppressed_in: mark negative
  - inferred edge: candidate only, never auto-active when high impact
  - ambiguous edge: report only
```

排序建议：

```text
explicit session habit > same task > same initiative reference > same subject > global candidate
confirmed edge > inferred edge
not suppressed > suppressed
trigger match > text similarity
lower conflict risk > higher conflict risk
```

但排序结果只能决定：

- 哪些候选优先进入 review queue。
- 哪些当前 session habits 需要被重点复核。

它不能决定：

- 哪条新 habit 直接进入 `current_session_habit`
- 哪条已有 session habit 被直接移除

验收：

- 当前 session 已引入 habit 仍然全部返回。
- 新匹配到的 habit 不会因为高分或高置信而直接进入 `current_session_habit`，而是先进入用户确认流程。
- 当前 session 已有 habit 不会因为新聊天出现反证就被自动移除，只能进入“建议移出/建议替换”。
- graph 扩展不会把其他 Aether project / initiative 的 session reference 当强参考。
- inferred 高影响 habit 不会静默进入 `current_session_habit`。
- conflict / suppression 能阻止注入。

### 4.4 修改 context compiler

目标文件：

- [compile.ts](/home/bzz/Aether/packages/opencode/src/context/compile.ts)

任务：

- 保持当前 session `habit_ids` 必带。
- 在普通 matching 后调用 graph candidate expansion。
- 把新命中的 habits 写入 session review queue / pending activation，而不是直接写入 session `habit_ids`。
- 把“当前 session 已有 habits 是否该保留/移出/替换”的检查结果写入 review queue / pending removal，而不是直接改写 `habit_ids`。
- 只把用户确认后的 active habits 写入 session binding。
- 在 `audit.used_records` 或新 audit 字段中记录命中路径摘要。
- 当用户问当前习惯时，仍完整注入当前 session habits，不被 graph report 替代。

禁止：

- 把整个 `habit-graph.json` 放进 prompt。
- 把 `habit-report.md` 当作 current session habit。
- 让 graph edge 覆盖 system/developer/repo/user 当前指令。
- 让高置信 matching、graph score 或反证检测直接增删 session `habit_ids`。

验收：

- 普通请求 context 不明显膨胀。
- “当前习惯”问题能回答 UI 中当前 session habits 的完整列表。
- explain audit 可以说明某条 habit 是通过哪个 trigger / reference / relation 命中的。

### 4.5 新增 API

目标文件：

- [routes/adaptation.ts](/home/bzz/Aether/packages/opencode/src/server/routes/adaptation.ts)
- [index.ts](/home/bzz/Aether/packages/opencode/src/adaptation/index.ts)

建议路由：

```text
GET /adaptation/habits/explain?session_id=...&habit_id=...
GET /adaptation/habits/path?session_id=...&source=...&target=...
POST /adaptation/habits/query
POST /adaptation/habits/rebuild-graph
```

返回内容应用户可读：

- habit 标题和摘要。
- 当前是否 active / suppressed。
- 为什么命中。
- 来自哪些 reference / trigger / relation。
- 是否存在 conflict。
- 是否有 inferred / ambiguous 关系需要 review。

验收：

- 缺失 habit id 返回明确错误。
- 不泄露 memory root 绝对路径给普通 UI，除非 debug 模式明确需要。
- 不返回原始 evidence 长文本，除非用户打开 review detail。

## 5. Level 1 测试任务

新增或扩展测试：

```text
packages/opencode/test/adaptation/habit-graph.test.ts
packages/opencode/test/adaptation/habit-explain.test.ts
packages/opencode/test/adaptation/reference-index.test.ts
```

必须覆盖：

1. 工作区 reference 只保存轻量背景 + refs，不保存正文真源。
2. `rebuildIndexes()` 能生成 `habit-graph.json`。
3. confirmed `used_with` 可以扩展候选。
4. inferred high impact relation 不会自动引入 session。
5. `conflicts_with` 阻止注入或标记冲突。
6. workflow bundle 只在 trigger 匹配时展开。
7. 新命中的 habit 会进入待确认队列，而不是直接写入 `habit_ids`。
8. 建议移出 session habit 只能进入待确认队列，不能自动删除。
9. `listProjectHabits(current: true)` 只返回 session `habit_ids`。
10. `explainHabit()` 返回引用路径。
11. dangling relation 不崩溃，进入 report。
12. 删除派生 graph 后可重建。

测试运行：

```bash
cd /home/bzz/Aether/packages/opencode && bun test test/adaptation/habit-graph.test.ts
cd /home/bzz/Aether/packages/opencode && bun typecheck
```

## 6. Level 2 报告和解释任务

### 6.1 `habit-report.md`

报告应包含：

- Summary
  habit 数、relation 数、bundle 数、suppression 数。
- Core Habits
  高中心性或高引用次数习惯。
- Workflow Bundles
  已确认 workflow bundle。
- Surprising / Risky Relations
  inferred / ambiguous / cross-scope relation。
- Conflicts
  冲突和 suppression。
- Knowledge Gaps
  孤立习惯、dangling relation、缺少 trigger 的 habit。
- Suggested Review
  建议用户审阅的问题。

注意：

- report 是派生文件。
- report 不能进入普通 prompt 替代 current session habits。
- report 可以给 AI 做调试或管理入口。

### 6.2 explain 输出格式

`whyHabitInSession()` 建议返回：

```json
{
  "habit_id": "habit_x",
  "active": true,
  "summary": "...",
  "path": [
    {
      "kind": "session_binding",
      "label": "当前 session 已引用"
    },
    {
      "kind": "trigger",
      "label": "request_type=project_planning"
    },
    {
      "kind": "relation",
      "label": "used_with habit_y",
      "confidence": "confirmed"
    }
  ],
  "conflicts": [],
  "suppressed": false,
  "needs_review": []
}
```

用户可读文案应类似：

```text
这条习惯生效，是因为当前 session 已引用它，并且本轮请求匹配 project_planning trigger。它还和“维护 open-questions”这个已确认 workflow bundle 一起使用。没有发现当前项目禁用或冲突。
```

## 7. Level 3 后续增强

### 7.1 habit wiki

可生成：

```text
MemoryPath.adaptationRoot()/indexes/habit-wiki/
  index.md
  workflow-project-planning.md
  subject-physics.md
  core-habits.md
```

用途：

- 给用户管理习惯库。
- 给 AI 做离线导航。

限制：

- wiki 是派生阅读面，不是真源。
- 用户在 wiki 中编辑不能直接改真源，必须走管理 UI 或专门 API。

### 7.2 community detection

可以参考 Graphify 的 community 思路，但只能用于：

- 离线报告。
- UI 分组。
- rerank 的轻量参考。

不能用于：

- 自动提升 global。
- 自动确认 habit。
- 覆盖用户选择的 scope。

### 7.3 usage learning

可以记录：

- habit 被引用次数。
- 用户是否纠正。
- 用户是否手动禁用。
- 是否常和哪些 habit 一起出现。

这些记录只能影响排序和 proposal，不能静默改写真源。

## 8. 实现顺序建议

如果让一个新 AI 执行，按这个顺序：

1. 读本文件和六个权威文档。
2. 确认 01-07 v1 guide 已经完成并通过 typecheck。
3. 只做 Level 1 schema 和索引，不碰 UI。
4. 加测试保证 graph 是派生层，工作区只保存引用。
5. 接入 context compiler 的候选扩展，但保持 current session habits 必带。
6. 加冲突审计，确保 graph expansion 不会绕过 suppression / conflict / impact gate。
7. 加 `habit-report.md`。
8. 加 explain/path API。
9. 最后再考虑 UI 和 habit wiki。

每个批次后运行：

```bash
cd /home/bzz/Aether/packages/opencode && bun typecheck
python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether
python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
```

如果改前端，再运行：

```bash
cd /home/bzz/Aether/packages/app && bun typecheck
```

## 9. 完成标准

Level 1 完成时必须满足：

- 工作区和习惯库仍然物理与概念分离。
- 工作区引用层不保存习惯正文真源。
- `habit-graph.json` 可删除后重建。
- graph relation 有 confirmed / inferred / ambiguous 标签。
- inferred / ambiguous relation 不会静默扩大高影响习惯作用域。
- current session habits 仍然每轮注入。
- graph expansion 不会强行引入所有 global / subject habits。
- 用户能通过 explain/path 理解某条习惯为什么生效。
- typecheck、model routing guard、IPK doc audit 通过。

如果这些条件有任一不满足，说明 Graphify 借鉴已经越界，必须回滚或重构。

## 10. 可直接发给 AI 的实现 Prompt

把下面这段作为新会话的首条任务即可：

```text
请在 /home/bzz/Aether 中实现用户自适应系统的习惯库 Graphify 借鉴 Level 1。

必须先读并遵守：
- docs/IPK/02-user-adaptation-system/user-adaptation-habit-library-graphify-execution-plan.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md
- docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md

核心边界：
1. Aether 工作区引用层 != 用户自适应系统习惯库。
2. Aether 工作区里的 project 必须保留原名；习惯库五层 scope 里的长期事项层叫 initiative，不能再叫 project。
3. v1 **不建立**任何默认的 Aether project ↔ initiative 绑定；initiative 归属由路由 classifier 在 proposal confirm 阶段决定（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)）。
4. 习惯真源只能来自 confirmed habit/profile/policy/task_scope/artifact records；graph/report/index/wiki 都是可重建派生层。
5. 工作区 global/project/session 记录只保存 habit_id、引用、排序、分块、禁用、解释和统计，不能复制 habit 正文作为第二真源。
6. graph neighbor 只是候选，不能直接成为 current_session_habit。
7. inferred/ambiguous relation 不能绕过 proposal、用户确认、suppression、conflict audit 和 high-impact gate。
8. 当前 session 已有 habit_ids 必须每轮完整注入为 current_session_habit。
9. 至少在 v1 中，AI 根据聊天内容新匹配到的任何层级 habit，都必须先经用户确认后才能加入当前 session。
10. 至少在 v1 中，AI 对当前 session 已有 habit 的移出、替换、降级或删除建议，也只能提醒用户并等待确认。
11. AI 必须持续扫描新增聊天，并在寻找新 habits 的同时审查当前 session 已有 habits 是否需要更新，但这个审查结果只能进入 review queue。

实现顺序：
1. 全局搜索并确认代码中习惯 scope 使用 global/subject/initiative/task_scope/artifact；旧数据中的 scope.level="project" 只能作为 legacy 输入归一为 initiative，不能继续输出为新 scope。
2. 在 packages/opencode/src/adaptation/types.ts 中补齐 relation edge 的 confidence/status/source/review 字段，以及 graph/report/reference/conflict audit 需要的最小 schema。
3. 在 packages/opencode/src/adaptation/indexes.ts 中生成：
   - habit-relations.jsonl
   - habit-bundles.json
   - habit-graph.json
   - habit-report.md
   - reference-index.json
   - conflict-audit.json
4. graph 必须从 habit-index、relations、bundles、reference-index 重建；删除 graph 后 rebuildIndexes() 能恢复。
5. 在 packages/opencode/src/adaptation/habit.ts 增加候选扩展函数，但保持 listProjectHabits(... current: true) 只返回 session habit_ids。
6. 在 packages/opencode/src/context/compile.ts 中接入小范围 graph expansion 与 session audit loop；最终只有用户确认后的 habit 才写入 session binding。
7. 优先实现 conflict audit，再实现 explain/path API。
8. 增加测试，至少覆盖派生 graph 可重建、workspace 只保存引用、confirmed used_with 可扩候选、inferred high-impact 不会自动 active、conflict/suppression 阻止注入、legacy project scope 被归一为 initiative、session add/remove 都先走用户确认。

验证：
- cd /home/bzz/Aether/packages/opencode && bun test test/adaptation/habit-graph.test.ts test/adaptation/habit-suppression.test.ts test/adaptation/proposal-scope-choice.test.ts
- cd /home/bzz/Aether/packages/opencode && bun typecheck
- 如前端或 API schema 改动影响 app：cd /home/bzz/Aether/packages/app && bun typecheck
- python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether
- python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
- git diff --check

最终报告必须说明：
- 哪些文件实现了 initiative/project 术语隔离。
- graph/index/report 哪些是真源、哪些是派生。
- current_session_habit 是否仍只来自当前 session habit_ids。
- conflict audit 如何阻止不该注入的习惯。
- IPK 文档同步结果。
```
