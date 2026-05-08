# 用户自适应系统：Scope Matching / Scope Read / Scope Promotion 机制说明

本文集中说明用户自适应系统中三个最核心的运行机制：

- `scope matching`
  判断当前请求、证据、会话或行动属于哪些习惯作用域。
- `scope read`
  在运行时从相关作用域读取少量习惯记录，并编译成 `context_packet`。
- `scope promotion`
  把低层作用域中观察到的习惯，经过证据、合并和确认后，提升到更高作用域。

本文不是替代 schema 或存储契约。涉及存储根、权限边界和长期真源时，以：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
- [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
- [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)

为准。

补充说明：

- `project_policy` 已作为历史遗留对象删除。当前 project 层只保留 `project_guidance`；重复候选的缩圈与降噪由 guidance 维护、proposal merge 和后续 routing 机制承担。
- 本文中若后文出现"v1 默认把 Aether project 一对一绑定到 initiative"之类的表述，**以决策 doc 为准**：v1 不做任何默认绑定，initiative 归属由路由 classifier 决定。
- `task_scope` / `artifact` 的真源位置以存储契约为准，已经不在 `projects/<project_id>/` 下。

## 0. 当前状态

当前已经拍板：

- 内部长期作用域至少包括 `global / subject / initiative / task_scope / artifact`。
- 这五个作用域是习惯库中的平行存储层，不是树状父子层级；它们标记适用范围，而不是所有权归属。
- Aether 工作区和习惯库是两个概念上不连通的区域；工作区侧只通过引用、binding、map 和关系边使用习惯库中的真源习惯。
- `session` 是过程层和证据来源，不是长期习惯真源。
- 当前 session 对应的习惯记录是运行时真正生效的集合；Aether 全局和当前 project 的习惯记录主要为 session 匹配提供强参考。
- `scope matching` 和 `scope read` 应尽量自动完成，只在低置信度、冲突或高影响时询问用户。
- `scope promotion` 如果会扩大长期影响范围或改变未来默认行动方式，必须通过 proposal 让用户确认。
- 用户不应被迫为每条 signal 手动选择层级。
- v1 UI 可以简化展示层级，但内部 schema 应保留完整作用域，避免未来迁移成本。

当前仍未完全拍板：

- 各类 matching / promotion 的具体阈值。
- exact prompt wording。
- 用户可配置自动化等级。
- promotion proposal 的 UI 分组方式。
- demotion / scope narrowing 的具体流程。
- `workflow_profile` / `pattern_profile` 是否进入 vNext。

因此本文中的 prompt 和阈值属于 v1 推荐模板，不是不可调整的最终 prompt。

## 1. 五个习惯库层级

| 作用域 | 中文解释 | 主要保存 | 典型触发 |
|---|---|---|---|
| `global` | 用户整体层 | 跨项目、跨主题长期成立的交流和工作倾向 | 当前请求没有更具体规则，或某条习惯已确认适用于多数场景 |
| `subject` | 学科 / 主题层 | 某个主题内的知识坐标、术语偏好、解释习惯 | 请求被识别为某个主题，或 session / project 已绑定 subject |
| `initiative` | 长期事项层 | 一个真实长期事项、研究项目或工作目标内跨 task_scope 成立的背景、约束和默认规则 | 当前 session 被路由 classifier 分类到某个 initiative bucket（不再依赖 project/worktree 默认映射） |
| `task_scope` | 长期任务层 | 一个持续任务的目标、状态、局部习惯、维护规则和引用 | 当前 session 绑定了任务，或 matcher 判断正在延续某个长期任务 |
| `artifact` | 具体产物层 | 某个文件或输出目标的写法、路径、格式和联动更新规则 | 用户要求更新文件、生成产物，或当前请求引用了具体 artifact |

这里的 `initiative` 是习惯库五层之一，不是 Aether 工作区里的 `project`。v1 **不建立任何默认的 project ↔ initiative 绑定**（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)）；Aether project / worktree 仅作为路由 classifier 的上下文信号之一，不是 initiative 的身份来源。

这五层只描述“习惯可能适合在哪些范围被使用”。它们不是树，也不保证严格包含关系：

- 一个具体 task 习惯可能被多个 subject 或多个 project 复用。
- 一个 subject 习惯可能只在某些 project / task 中适用。
- 一个 project 工作流习惯可能只在 planning 请求中适用，而不适用于同 project 的所有行动。
- 一个 global 习惯可能仍然需要按 subject、任务类型或用户当前目标筛选后才能进入 session。

因此，五层作用域是候选入口和风险/解释标签；真正的运行时生效集合应理解为 `imported active habits + scratch active habits`：其中 imported 分支通过 session binding 的 `habit_ids` 进入，scratch 分支来自当前 session 暂存区。

## 1.1 Aether 工作区三类引用对象

Aether 工作区侧当前对应**三类平行**的工作区对象（**不是**树状归属，也**不是**习惯库五层的别名，见 [user-adaptation-system-top-level-constraint.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md)）：

- `global_guidance`
- `project_guidance`
- `session binding` / `session habit record`

这些记录不是习惯真源，而是对习惯库的引用层。`project_guidance` ≠ `initiative`，工作区 `global_guidance` ≠ 习惯库 `global`。

- `global_guidance`：记录跨 Aether 工作区稳定成立的轻量背景 + refs，以及 subject 分块，给 session matching 提供候选入口。
- `project_guidance`：记录当前 project 工作区的轻量项目背景、常用 refs、同 project session 的使用痕迹和高置信重复线索，给同 project session 提供强参考。
- `session binding / session habit record`：记录当前 session 的实际挂载状态，以及已引入并应在每轮聊天中被注意的 habit 引用；这是运行时真正生效的集合。

v1 可以用 session binding 的 `habit_ids` 近似 session habit record，用 `project_guidance`、`global_guidance` 和 habit index 近似工作区 guidance + 引用层。更完整的 subject block、关系边和使用统计可以在后续版本补齐。

## 2. 三个机制的关系

```text
用户请求 / 会话 / 文件 / 工具轨迹
  -> scope matching
     判断相关 initiative / task_scope / subject / artifact
  -> scope read
     读取少量相关长期记录，编译 context_packet
  -> 模型回答或行动

会话证据 / signals / summaries
  -> scope matching
     判断证据最初属于哪个作用域
  -> scope promotion
     发现是否应提升到更高作用域
  -> proposal inbox
  -> 用户确认
  -> 写入更高层长期对象
  -> 如果确认发生在当前 session，立即刷新该 session 的 scope binding 和 context_packet 快照
```

关键区别：

- `scope matching` 是“这件事和哪里有关”。
- `scope read` 是“这轮应该读哪些习惯来服务用户”。
- `scope promotion` 是“这条习惯以后是否应该影响更大范围”。

前两者通常应自动做；第三者在高影响或扩大范围时需要用户确认。

确认 proposal 不是只改变长期真源。第一版要求确认请求如果带有当前 `session_id`，后端应把 task_scope / subject / artifact 等相关作用域绑定回该 session，并立即重编译一个新的 `context_packet` 快照。这样 UI 的“当前习惯”能马上展示新规则，模型下一轮请求也能引用同一份已确认记录。

“当前习惯”列表不应等同于“当前 project 下所有习惯”，也不应等同于“所有 global / subject 习惯”。当前代码里，运行时读取当前习惯时，应以 session habit record / session binding 过滤 imported habits，并叠加当前 session scratch active habits：只有已经经过用户确认并写入 `habit_ids` 的 imported habits，以及当前 session 中仍 active 的 scratch habits 可见；global / subject / initiative / task_scope / artifact 习惯都不能仅因 matching 命中就直接成为当前习惯。未来如果要浏览历史任务习惯、同 project 参考习惯或跨项目全局习惯，应另做管理视图。

已经引入当前 session 的 imported habits 数量预期较少，但每条都重要。当前代码里，scratch active habits 也会进入每轮 context compiler 注入，而不是只在用户询问习惯列表时注入。当用户直接询问当前习惯时，模型应能回答 UI “当前 Session 习惯”中可见的完整列表；此时应同时读取 imported + scratch 两组 active habit surface，并把本轮预算放宽到能完整解释当前列表。

## 3. 相关存储路径

长期真源通过 resolver 获取：

```text
MemoryPath.adaptationRoot()
```

第一版关键锚点：

```text
MemoryPath.adaptationRoot()/global/
MemoryPath.adaptationRoot()/initiatives/<initiative_id>/
MemoryPath.adaptationRoot()/task-scopes/<scope_id>/
MemoryPath.adaptationRoot()/artifacts/<artifact_id>/
MemoryPath.adaptationRoot()/workspace/global-guidance.json
MemoryPath.adaptationRoot()/workspace/projects/<project_id>/
MemoryPath.adaptationRoot()/bindings/sessions/<session_id>/
MemoryPath.cacheRoot()/adaptation/context-packets/
```

session db 只保存绑定、引用、快照和过程数据，例如：

```text
session_id -> project_id
session_id -> task_scope_id
session_id -> subject_ids
session_id -> habit_ids
session_id -> signal_ids
session_id -> proposal_ids
session_id -> context_packet_id
session_id -> context_packet_snapshot
```

session db 不能成为这些对象的唯一长期真源：

```text
workspace/global-guidance.json
subject-profile.json
workspace/projects/<project_id>/project-guidance.json
initiative-policy.json
task-scope.json
artifact-contract.json
IPK piece
```

JSON / Markdown 规则：

- `.json` 是结构化真源。
- `.md` 是从 `.json` 渲染出来的人类可读审阅镜像。
- Markdown 冲突时，以 JSON 为准并重新渲染。

## 4. 相关模块与路由

推荐后端模块：

```text
packages/opencode/src/adaptation/
  signal.ts
  summary.ts
  promotion.ts
  proposal.ts
  profile.ts
  policy.ts
  storage.ts
  types.ts

packages/opencode/src/task-scope/
  index.ts
  scope.ts
  matcher.ts
  storage.ts
  types.ts

packages/opencode/src/artifact/
  contract.ts
  writer.ts
  storage.ts
  types.ts

packages/opencode/src/context/
  compile.ts
  packet.ts
  priority.ts
  action.ts
```

推荐路由：

```text
/adaptation/global
/adaptation/subjects
/adaptation/proposals
/adaptation/promotions
/task-scope
/artifact
```

`context compiler` 更适合作为内部服务，不必第一版公开成外部 API。

`/adaptation/promotions` 第一版可以只是 proposal 的筛选视图或轻量子路由，不一定要成为独立对象库。关键是 promotion proposal 必须可审阅、可合并、可追踪来源。

## 5. Scope Matching

### 5.1 定义

`scope matching` 判断当前对象与哪些长期作用域相关。

v1 当前补充了一条保守 guidance 规则：

- 先看显式运行时线索：`session binding`、当前 request、task matcher、打开文件、artifact path。
- 如果这些线索不足，再读取很小的 guidance 对象缩小范围，而不是直接平铺扫描全库。
- 当前第一版 guidance 由 `project_guidance + global_guidance` 组成：优先用两者 `subject_ids` 的并集缩小候选 subject；当两者 `task_scope_refs` 合并后只有单一候选且当前无显式 task_scope 时，可把它作为软提示参与候选检索。
- 这些 guidance 只影响“先搜哪里”，不直接把任何 habit 写入 `session binding`，也不让它自动成为当前习惯。

对象可以是：

- 当前用户请求。
- 当前 assistant 响应。
- 一段会话证据。
- 一个 signal。
- 一次文件写入行动。
- 一个待生成的 summary。
- 一个待生成的 proposal。
- 一次 query-time context 编译。

`scope matching` 本身不写入高层长期习惯。它只输出候选绑定和置信度。

### 5.2 触发时机

第一版建议在这些时机触发：

- 用户打开或继续一个 session。
- 用户发送请求前，准备调用模型时。
- 当前工作目录、repo、worktree 或 project 变化时。
- 用户选中消息并触发总结、整理或记录时。
- 用户请求写文件、更新 artifact 或执行工具时。
- 一次 assistant 响应完成并准备提取 signals 时。
- session summary 更新后，准备运行会话后集中提取时。
- 生成 proposal 或 promotion candidate 前。
- 用户手动选择“当前任务 / 当前项目记忆”时。

### 5.3 输入

运行时输入：

- `session_id`
- 当前 cwd / project / worktree / repo 信息
- 当前打开文件或用户引用的路径
- 用户本轮请求文本
- 当前消息选择范围
- v1 当前不接入最近工具调用和文件改动摘要
- session db 中已有绑定
- 用户手动选择的 scope

长期记录输入：

- project binding index
- task_scope binding index
- project_guidance 摘要 / refs
- task_scope 的 title、goal、status_summary、workflow_habits
- artifact_contract 的 path、role、update_triggers
- subject_profile 的 subject_id、aliases、known anchors
- recent signals / summaries 的轻量索引
- 必要时只读 IPK piece surface 或 summary

### 5.4 匹配顺序

第一版推荐按以下顺序判断：

1. 当前用户显式指定的 scope。
2. session db 中已有绑定。
3. 当前 artifact 或路径命中。
4. 当前 Aether `project_id` 工作区引用层（用于 session ↔ project 索引；**不**派生 initiative target）。
5. 当前请求的 subject 分类。
6. 当前请求与已有 task_scope 的相似度。
7. recent session / recent task_scope 的连续性。
8. global 作为最后兜底。

如果多个 scope 都命中：

- `artifact` 可以作为最具体规则参与，但不应替代 task/project。
- `task_scope` 通常只选一个 primary，必要时允许少量 secondary。
- `subject` 可以多个，但 v1 应限制数量。
- `global` 只作为背景规则，不应压过更具体规则。

### 5.5 输出结构

建议输出：

```json
{
  "session_id": "ses_xxx",
  "project_id": "proj_aether",
  "task_scope": {
    "primary": "scope_user_adaptation_v1",
    "secondary": []
  },
  "subject_ids": ["user-adaptation-system", "aether-architecture"],
  "artifact_ids": ["artifact_adaptation_open_questions_zh"],
  "confidence": {
    "project": 0.94,
    "task_scope": 0.87,
    "subject": 0.82,
    "artifact": 0.76
  },
  "reasons": [
    "当前工作目录属于 Aether repo。",
    "用户请求涉及用户自适应系统设计文档。",
    "打开文件位于 docs/IPK/02-user-adaptation-system/。"
  ],
  "needs_user_confirmation": false
}
```

### 5.6 自动、询问和拒绝

AI 可以自动 matching：

- session 已有绑定。
- 当前路径明确命中 artifact。
- 当前 project / worktree 映射稳定。
- 当前请求与 task_scope 高置信匹配。

AI 应询问用户：

- task_scope 候选多个且置信度接近。
- 当前请求可能开启一个新长期任务。
- artifact 路径相似但不确定。
- project/worktree 映射存在冲突。
- 自动绑定会影响后续 signal 写入位置。

AI 不应静默 matching：

- 把一个敏感主题自动绑定为长期 subject。
- 把临时 session 要求当成 project 规则。
- 在低置信情况下创建新长期 task_scope。

### 5.7 Matching Prompt Contract

exact prompt 可以后续调优，但 v1 prompt 应遵守以下 contract：

```text
你是用户自适应系统的 scope matcher。

任务：
判断当前请求、会话证据或行动轨迹最相关的长期作用域。

你只能输出 JSON。
不要写入长期记忆。
不要生成用户画像结论。
不要把临时要求提升为长期习惯。
优先使用已有 session binding。
如果证据不足，设置 needs_user_confirmation=true。

可用作用域：
- global
- subject
- project
- task_scope
- artifact
- session

输入包括：
- 当前请求
- 当前 session_id
- 当前 project/worktree/repo 摘要
- 当前打开文件/引用路径
- 已有 bindings
- 候选 task_scopes
- 候选 subjects
- 候选 artifact_contracts

输出 JSON 字段：
- project_id
- task_scope.primary
- task_scope.secondary
- subject_ids
- artifact_ids
- confidence
- reasons
- needs_user_confirmation
- clarification_question
```

禁止：

- 输出“用户一定是某种人”这类深层人格推断。
- 因为一次请求就生成 global 习惯。
- 在证据不足时硬选长期 scope。

### 5.8 渐进披露检索

长期使用后，用户习惯数量会越来越多，scope matching 不能每次浏览所有习惯。

因此 v1 应把 scope matching 设计成渐进披露检索，而不是平铺扫描，也不是从 `global` 根节点做树遍历。

推荐分层：

```text
L0 当前运行时线索
  session_id / cwd / worktree / open files / request text / selected messages

L1 绑定与精确索引
  session habit_ids / project mapping / artifact path index / subject alias index

L2 scope map
  global_guidance refs / project_guidance refs / same-project session refs / task_scope catalog / subject catalog / artifact catalog

L3 habit surfaces
  只读取候选入口附近的短小 habit cards / policy surfaces

L4 full records
  只在 top candidates 中读取完整 JSON 真源

L5 evidence
  只有解释、审计、proposal review 或冲突处理时才读取原始 evidence refs
```

这样做的目标：

- 大多数请求只查 L0-L3。
- 只有少量候选进入 L4。
- 证据层 L5 不进入普通 query-time prompt。
- 用户可以检查“为什么这条习惯被调用”，但系统不会每轮全量扫描。

v1 查询优先级建议：

1. 当前 session 已引入的 `habit_ids` 必带。
2. 当前 project 的 project reference 和同 project session refs 作为强参考。
3. `global_guidance` 中与当前 subject / request type 相关的 refs 分块作为次强参考。
4. 习惯库五层中的 habit surfaces 作为候选库按需补充。
5. 不参考其他 project 的 project/session reference；跨 project 的习惯只能通过习惯库自身的 global / subject / relation map 被重新匹配进入。

### 5.9 Scope Map / Habit Index

五层作用域本身不应建成树；它们是平行 scope 标签。实际查找依靠关系边、索引和 map。

同一层级的习惯可能互相影响，例如：

- 两个 task_scope 都维护同一组 docs。
- 一个 subject policy 会影响多个 project。
- 一个 artifact_contract 会覆盖 task_scope policy。
- 一组稳定 `project_guidance` refs 可帮助多个相似候选在同一 project 中更快缩圈与去重。
- 一个 workflow habit 可能适用于多个 project，但不适合进入 global。

因此除了五层作用域，还需要索引和图结构。

建议把查找结构分成两类：

- 路牌：稳定、可重建的结构化索引，例如 subject index、scope map、trigger index、path index、conflict index。
- 引路人：面向某个方面的 routing map / learned guide，例如“项目规划时优先看哪些习惯”“物理问题时从哪些 subject 与 project refs 开始”“写文档时哪些 workflow habits 更常用”。

路牌负责让系统不会迷路；引路人负责让系统少走弯路。两者都应是派生结构，不是真源。

v1 推荐新增派生索引层，具体目录以存储契约为准，可以概念上包括：

```text
MemoryPath.adaptationRoot()/indexes/
  scope-map.json
  habit-index.jsonl
  trigger-index.json
  path-index.json
  subject-index.json
  task-scope-index.json
  conflict-index.json
```

这些都是派生索引，不是长期习惯真源。坏了可以从 profile / policy / task_scope / artifact_contract 重建。

推荐索引职责：

- `scope-map.json`
  记录五层习惯之间、习惯与 Aether reference docs 之间的引用关系、覆盖关系和常用入口。
- `habit-index.jsonl`
  每条已确认习惯的一张轻量卡片，用于快速过滤。
- `trigger-index.json`
  从 request_type、action_type、workflow trigger 找到候选 policy。
- `reference-index.json`
  记录 `global_guidance` / `project_guidance` / `session binding` 当前引用了哪些 habit id，以及按 subject / request type 的分块。
- `path-index.json`
  从文件路径、glob、artifact role 找到 artifact_contract。
- `subject-index.json`
  从 subject alias、关键词、topic 入口找到 subject_profile。
- `task-scope-index.json`
  从 project、title、goal、recent sessions、artifact refs 找到候选 task_scope。
- `conflict-index.json`
  记录已知覆盖、冲突、替代和禁用关系。

后续 habit graph 不应只存“父子边”。推荐最少支持：

- `used_with`：常一起进入 session 的习惯。
- `derived_from`：由某条或某组习惯/证据生成。
- `specializes`：更具体的局部版本。
- `generalizes`：更泛化的高层版本。
- `conflicts_with`：冲突或需要二选一。
- `supersedes` / `redirects_to`：被替代或迁移。
- `suppressed_in`：在某个 initiative / subject / request type 中禁用。

### 5.10 Habit Surface

为了避免每次读取完整习惯 JSON，建议为每条可调用习惯生成 `habit surface`。

它类似 IPK piece 的 surface，不是真源，而是给 matching / routing / context compiler 快速使用的 AI 工作面。

推荐字段：

```json
{
  "id": "habit_pol_op_planning_doc_sync",
  "scope": {
    "level": "initiative",
    "target": "proj_aether"
  },
  "kind": "operation_policy",
  "title": "项目规划讨论自动沉淀",
  "summary": "项目规划/系统设计讨论中，已确认决策写入 decisions，未决方向写入 open-questions。",
  "triggers": [
    "project_planning",
    "system_design",
    "implementation_planning",
    "documentation_design"
  ],
  "applies_when": [
    "用户正在讨论项目结构、系统设计或实现方案。",
    "当前 project 是 Aether。"
  ],
  "excludes_when": [
    "用户只是学习某个概念。",
    "用户明确要求不要修改文档。"
  ],
  "priority": 70,
  "impact": "high",
  "confidence": 0.92,
  "confirmed": true,
  "last_used_at": "2026-04-12T00:00:00+08:00",
  "target_ref": {
    "object": "initiative_policy",
    "path": "initiatives/ini_aether_main/initiative-policy.json",
    "fields": ["operation_policy"]
  },
  "related": [
    "artifact_adaptation_open_questions_zh",
    "scope_user_adaptation_v1"
  ]
}
```

query-time matching 应优先读取 habit surfaces，而不是完整 JSON。

完整 JSON 只在这些情况读取：

- surface 命中且要注入 context_packet。
- 用户打开详情。
- 规则冲突需要裁剪。
- proposal review 需要展示具体写入字段。
- surface 过期需要重建。

### 5.11 Scope Matching Skill / Router

这里的 “skill” 更适合实现成 Aether 内部的 `scope router` 或 `adaptation retrieval skill`，而不是让模型每次自由发挥。

推荐工作流：

```text
输入当前请求和运行时线索
  -> 规则层先查精确绑定和 path index
  -> 索引层查 trigger / subject / task / artifact map
  -> 语义层只对候选 habit surfaces 做 rerank
  -> 读取 top K full records
  -> 交给 scope read / context compiler
```

这个 router 应尽量先用确定性信息：

- session binding
- project/worktree mapping
- artifact path
- explicit user selection
- request_type
- trigger tags

再使用模型语义判断。

模型不应该直接浏览所有习惯 JSON。模型只看：

- 少量候选 scope 摘要。
- 少量 habit surface。
- 必要时 top K full records。

### 5.12 其他效率增强方法

除了五层作用域和 scope map，还可以使用：

- request_type classifier
  先判断是项目规划、学习、写文件、代码实现、调研、闲聊等。
- trigger tags
  每条 policy / habit 带触发标签。
- path / artifact routing
  文件请求优先从 path-index 找 artifact_contract。
- recency and last-used boost
  最近使用过且未被用户否定的习惯优先。
- confidence / impact gates
  低置信或高影响规则不直接注入，只进入 proposal 或 UI 提醒。
- negative rules
  记录“不要在这种场景使用某习惯”。
- conflict graph
  提前记录谁覆盖谁，避免 query-time 临时争吵。
- lazy evidence loading
  普通回答不读原始 evidence，只有解释和 review 时读。
- compact scope summaries
  每个 task_scope / project 维护短摘要，作为匹配入口。
- usage telemetry
  记录哪条习惯被调用、是否被用户纠正，用于后续排序。

### 5.13 和 IPK Map 的关系

可以借鉴 IPK 的 map 思路，但 adaptation map 和 IPK map 的职责不同。

IPK map 负责：

- 内容、知识、灵感、piece、topic、方法、关系。

adaptation scope map 负责：

- 用户习惯、工作流策略、作用域、触发条件、覆盖关系、调用路由。

两者可以轻量联动：

- task_scope 可以引用 IPK piece。
- context compiler 必要时读取相关 piece surface。
- adaptation 不复制 IPK 正文。
- IPK 不替代 adaptation policy。

v1 推荐：

- 不做复杂可视化大地图。
- 先做机器可用的 `scope-map.json`、`habit-index.jsonl` 和 path/trigger/task/subject 索引。
- UI 只展示“当前使用了哪些习惯”和“为什么命中”。

vNext 再考虑：

- 图形化习惯地图。
- 跨 project workflow map。
- 冲突和覆盖关系可视化。
- 类似 IPK 的多层导航。

### 5.14 为什么这个结构可行

这个设计不是要求系统每次从根节点遍历整棵习惯树。

它可行的关键在于：

- query-time matching 只做轻量路由。
- 长期维护阶段提前生成 surface、index、map 和 summary。
- 大多数请求有强运行时线索，例如 session binding、project/worktree、打开文件、request_type、artifact path。
- full record 和 evidence 都是按需展开，而不是默认读取。
- 索引是派生层，可以后台重建和优化，不会污染长期真源。

`llm-wiki.md` 提供了一个可参考经验：

- 不把每次 query 都退回到 raw sources 重新 RAG。
- LLM 维护一个持久结构层，把 synthesis、cross-reference 和 index 持续更新。
- query 时先读 `index.md` 找入口，再 drill into 相关页面。
- 中等规模时，一个结构化 index 就能显著降低检索复杂度。
- 规模更大时，再引入专门搜索工具，例如 BM25 / vector / rerank。

迁移到 adaptation 后，对应关系是：

| LLM Wiki | 用户自适应系统 |
|---|---|
| raw sources | session evidence / signals / confirmed JSON 真源 |
| wiki pages | profile / policy / task_scope / artifact_contract |
| index.md | scope-map / habit-index / trigger-index / path-index |
| page summary | habit surface |
| query against wiki | scope matching + scope read |
| lint | habit lint / conflict audit / stale rule audit |

因此 adaptation matching 不应设计成：

```text
读所有习惯
  -> 让模型判断哪些有用
```

而应设计成：

```text
运行时线索
  -> 精确索引
  -> scope map
  -> habit surfaces
  -> top K full records
  -> context_packet
```

复杂度控制来自逐层过滤：

- path index 把文件类请求直接收敛到少数 artifact。
- trigger index 把 workflow 请求收敛到少数 operation policy。
- task_scope index 把当前 project 和 recent session 收敛到少数任务。
- subject index 把主题请求收敛到少数 subject。
- habit surface 让模型只 rerank 短卡片，不读长 JSON。
- conflict index 让覆盖关系提前结构化，不在 prompt 中临时争论。

这和 IPK 不同的是：IPK map 主要导航内容；adaptation scope map 主要导航行为规则。

v1 的现实目标不是一次做出完美匹配，而是：

- 先让 80% 明确场景靠绑定、路径、trigger、task index 命中。
- 对低置信或冲突场景询问用户。
- 把用户纠正反向写入 index / negative rule / proposal。
- 随使用逐步提高 surface 和 map 质量。

### 5.14a Graphify 对习惯库检索的具体借鉴

本地 Graphify 项目提供了一个已经跑通的“原始材料 -> 派生图谱 -> 报告 / wiki / 查询工具”的实现样板。迁移到习惯库时，应借鉴它的结构，不照搬它的领域假设。

可借鉴部分：

- `GRAPH_REPORT.md`
  一页式报告先暴露 god nodes、community、surprising connections、knowledge gaps。习惯库可以对应生成 `habit-report.md` 或 session/project reference report，让模型和用户先看结构摘要，再进入具体 habit。
- `graph.json`
  作为可查询的持久图谱，但它是从真源记录重建的导航层。习惯库可对应 `habit-graph.json` / relation index，用来回答邻居、路径、冲突和共同使用关系。
- `query / path / explain`
  Graphify 不把整张图塞进 prompt，而是按问题拉小子图或最短路径。习惯系统也应提供“为什么命中这条习惯”“这条习惯来自哪里”“它和哪些规则一起生效”的解释路径。
- Leiden / community detection
  可以用于发现 habit community，例如项目规划、写文件、物理学习、代码实现等自然簇；但 community 只是推荐入口，不是强制作用域。
- hyperedges
  Graphify 用 hyperedge 表达多节点共同参与的流程。习惯系统应允许 workflow bundle，例如“项目规划讨论 -> decisions / open-questions / implementation guide 同步维护”这一组习惯。
- confidence labels
  Graphify 区分 `EXTRACTED / INFERRED / AMBIGUOUS`。习惯系统应区分用户确认、显式证据、模型推断和歧义关系；推断关系不能直接扩大高影响习惯的生效范围。
- cache / manifest / dirty rebuild
  Graphify 用 hash cache 和 manifest 只处理变更文件。习惯系统应让 habit surface、relation graph、reference index 都可增量重建，避免每次全量扫描。
- wiki export
  Graphify 生成 agent 可读的 `index.md + community pages`。习惯库未来可以生成面向用户管理的 habit wiki，但 v1 不应把 wiki 当真源。
- Q&A writeback
  Graphify 可把高价值查询结果写回 memory。习惯系统可以借鉴为“用户纠正 / 命中解释 / 反证”写入 evidence 或 proposal，而不是只在当轮丢弃。

不应直接照搬的部分：

- 代码 AST 提取、文件类型检测、Neo4j / HTML 可视化不是习惯库 v1 的核心。
- topology clustering 不能替代用户确认和 scope matching；习惯的风险、禁用、冲突和当前 session 目标比图中心性更重要。
- LLM 提取出的 inferred edge 不能直接写成高层习惯真源，只能作为 proposal 或待验证 relation。

因此，习惯库的推荐检索形态是：

```text
current session habit_ids
  -> reference / trigger / path / subject / task indexes
  -> habit graph 邻近节点和 workflow bundles
  -> habit surfaces rerank
  -> top K full records
  -> context_packet
```

### 5.14b 五层 Scope 与查询怎样耦合

用户习惯不是普通知识节点。普通知识库里，一条知识和另一条知识通常可以用相似度、引用关系、主题关系来比较；但习惯还多了一个问题：

```text
这条习惯应该在哪些场景影响 AI 行动？
```

因此五层 scope 不是树，也不是装饰标签，而是 query-time matching 的主先验。

推荐把每次查询看成生成一个 `activation vector`：

```json
{
  "global": 0.2,
  "subject": 0.8,
  "project": 0.7,
  "task_scope": 0.9,
  "artifact": 0.1
}
```

这个向量不是固定值，而是由当前 session / request / initiative / subject / task / artifact 共同决定。

### 5.14b.1 五层的查询含义

| scope | 查询意义 | 典型强入口 | 默认风险 |
|---|---|---|---|
| `global` | 用户跨场景长期偏好；召回面大，精度最低 | 当前 session 已引用、用户明确问总体偏好、无更具体上下文 | 错用会污染所有场景，因此不能无条件进入 |
| `subject` | 当前领域内的偏好和解释方式 | subject classifier 高置信、用户提到学科/领域、当前 project 绑定 subject | subject 识别错会引入不相关领域习惯 |
| `initiative` | 当前长期事项 / 研究项目 / 工作目标内的工作习惯 | initiative mapping、同 initiative reference、同 initiative session refs | 不应跨 initiative 静默复用 |
| `task_scope` | 当前长期任务的局部默认 | session binding、task matcher、recent task activity | 精度高但范围窄，不能自动推广 |
| `artifact` | 当前文件/产物/输出目标的维护规则 | path-index、artifact contract、用户提到具体文件 | 对当前行动影响强，必须尊重当前用户请求和权限 |

### 5.14b.2 Scope 先验与 Graph 邻居的关系

推荐顺序：

```text
1. 用 scope / binding / path / trigger 找 seed candidates
2. 用 relation graph 从 seed 扩展少量邻居
3. 对邻居重新计算 scope fit
4. 通过 conflict / suppression / impact gate
5. 把新命中与当前 session 复核结果写入 review queue
6. 只有用户确认的 habit 才能写入 session habit_ids
```

因此：

- graph 邻居不是 active habit。
- graph 邻居必须重新过 scope fit。
- `used_with` 只能增加候选分，不代表必用。
- `conflicts_with`、`suppressed_in` 应优先拦截。
- `inferred` relation 只能辅助候选和 proposal，不能直接扩大高影响习惯的作用范围。
- 高分候选也只能决定“优先提醒用户确认”，不能静默加入当前 session。

### 5.14b.3 推荐评分模型

v1 不必实现复杂机器学习模型，但应保留这个逻辑：

```text
score(habit) =
  session_pin_boost
  + scope_prior
  + trigger_match
  + reference_strength
  + graph_relation_boost
  + recency_or_usage_boost
  - conflict_penalty
  - suppression_penalty
  - scope_mismatch_penalty
  - high_impact_uncertainty_penalty
```

其中：

- `session_pin_boost`
  当前 session 已有 `habit_ids` 的 habit 必带。
- `scope_prior`
  来自五层 scope 的激活向量。
- `trigger_match`
  来自 request_type / action_type / workflow trigger。
- `reference_strength`
  同 initiative reference、同 initiative session refs、`global_guidance` refs 的分块引用。v1 下当前 session 的 initiative 归属由路由 classifier 或用户手选决定，不再由 Aether project 自动映射。
- `graph_relation_boost`
  只对 confirmed relation 给明显加分；inferred relation 低加分；ambiguous 不加分或进入 review。
- `conflict_penalty`
  已知冲突、覆盖、禁用优先级高于普通加分。

### 5.14b.4 Subject 怎样带动各层级习惯

subject 不是只读取 `subject` 层。

当系统高置信识别当前请求属于某个 subject，例如物理、编程或用户自适应系统时，它应该做的是：

```text
subject activation
  -> 读取该 subject 的 profile / policy surface
  -> 找当前 session 已绑定的 initiative（由路由 classifier 或手选得到）下与该 subject 相关的 initiative habits
  -> 找当前 task_scope 中 subject-compatible habits
  -> 找 artifact 中 subject-compatible rules
  -> 用 relation graph 扩展少量 confirmed neighbors
```

也就是说，subject 是一个横切入口。它提高“同领域相关习惯”的候选概率，但不表示 subject 层习惯自动覆盖 initiative / task / artifact。

### 5.14b.5 Initiative 怎样限制 subject 的扩散

同一个 subject 的习惯可能在不同 initiative 或 Aether project 中用法不同。

因此 v1 应遵守：

- 当前 session 所属 initiative 的 reference 和同 initiative 的其它 session refs 是强参考；initiative 归属由路由 classifier 或已有 session binding 决定，不再由 Aether project 默认映射。
- 其他 initiative / Aether project 的 reference 不作为强参考。
- 跨 initiative 复用只能通过习惯库自身的 global / subject / relation map 重新匹配，而不是直接拿别的 initiative 的 session habits。
- 如果 subject habit 和当前 Aether project suppression 冲突，project suppression 优先阻止注入。

### 5.14b.6 Artifact 为什么通常最具体

artifact habit 对当前行动影响强，例如文件格式、同步更新、保护区块、输出结构。

当用户明确提到文件或 artifact path 命中时：

- artifact habit 可获得最高精度先验。
- 但 artifact habit 不能覆盖当前用户本轮明确要求。
- artifact habit 涉及写文件时，仍必须遵守 Aether 文件权限和安全确认。
- artifact habit 可以向上查 task_scope / initiative policy，也可以横向查 partner artifacts，但不能全量扫描 project。

### 5.14b.7 执行习惯不是 scope，而是 kind / trigger

“执行习惯”不应成为第六层。

例如：

- “项目规划后写 decisions”
- “修改代码后跑 typecheck”
- “更新 IPK 代码后同步 docs/IPK”
- “写某类文档时先清理 open-questions”

这些都是 operation / workflow habits。它们应该用：

- `kind`
- `request_type`
- `action_type`
- `trigger`
- `workflow bundle`

来表达，并挂在合适 scope 上。

同一个执行习惯可以是：

- global operation habit
- subject operation habit
- project operation habit
- task_scope workflow habit
- artifact maintenance habit

它在哪里生效，由 scope + trigger + relation + conflict gate 共同决定。

### 5.15 Map Traversal 不是从根全量深搜

顺着 map 寻找习惯时，确实需要逐层深入，但不是固定从 `global` 根节点开始逐层遍历。

正确模型是：

```text
从当前最强入口进入
  -> 查对应 map / index
  -> 展开少量邻近节点
  -> 读取 habit surfaces
  -> rerank
  -> 只展开 top K full records
```

当前最强入口可能是：

- 用户显式选择的 task / project / artifact。
- 当前打开文件或用户提到的路径。
- 当前 session binding。
- 当前 Aether project / worktree。
- request_type，例如 `project_planning`、`file_update`、`learning`。
- subject classifier 的高置信结果。

因此不同请求应从不同入口进入：

| 场景 | 推荐入口 | 主要展开方向 |
|---|---|---|
| 更新某个文件 | path-index / artifact_contract | 向上找 task_scope、initiative_policy，横向找 partner_artifacts |
| 项目规划讨论 | trigger-index / request_type | 找 initiative_policy、task_scope、open-questions / decisions artifact |
| 学科问题 | subject-index | 找 subject_profile，再结合当前 task_scope |
| 长期任务继续推进 | session binding / task-scope-index | 找 task_scope，再补 initiative_policy、artifact_contract 和 project_guidance guidance |
| 无明确上下文的普通问答 | subject classifier / global fallback | 只读少量 confirmed global / subject records |

### 5.16 三种展开方向

map traversal 应允许三种方向，但都要限制宽度。

向下展开：

- 从 project 找 task_scope。
- 从 task_scope 找 artifact。
- 从 subject 找 subject policy 下的具体 habit surfaces。

向上展开：

- 从 artifact 找 task_scope。
- 从 task_scope 找 initiative_policy。
- 从 subject / initiative 找少量 global fallback。

横向展开：

- 从 artifact 找 partner_artifacts。
- 从 task_scope 找 linked task_scope。
- 从 workflow trigger 找同类 workflow habit。
- 从 conflict-index 找覆盖或排除关系。

默认不展开：

- 从 global 扫描全部 subject。
- 从 project 扫描全部 task_scope。
- 从 task_scope 扫描全部 evidence。
- 从一个 subject 扫描所有 project。

### 5.17 停止条件

为了控制复杂度，v1 traversal 应有明确停止条件：

- 候选 habit surfaces 达到 top K。
- token budget 已满。
- 命中高置信 artifact_contract 或 task_scope。
- 发现当前用户明确要求覆盖长期规则。
- conflict-index 已给出明确覆盖关系。
- matching confidence 低于阈值，转为询问用户。

推荐默认：

- task_scope primary 最多 1 个。
- task_scope secondary 最多 1-2 个。
- subject 最多 1-3 个。
- artifact_contract 最多 1-3 个。
- habit surfaces rerank 前最多 20-50 张。
- full records 默认展开 3-8 条。

这些数值不是最终拍板阈值，后续应通过使用体验和测试调整。

## 6. Scope Read

### 6.1 定义

`scope read` 是 query time 的读取机制。

它负责从 matching 得到的相关作用域中读取少量长期记录，并交给 context compiler 压缩成 `context_packet`。

`scope read` 不应把所有长期记忆无差别塞进 prompt。

### 6.2 触发时机

第一版推荐每次模型请求前都运行：

- 普通问答前。
- 总结、整理、写文件前。
- 工具或程序操作前。
- proposal review UI 需要展示影响范围时。
- 用户点击“当前区域正在使用哪些习惯记录”时。

对于纯 UI 查询，可以只做可视化 read，不必注入模型。

### 6.2a 会话中是否可以提示固定习惯

可以。

“长期更新要慢”不等于只能在会话结束后更新。更准确地说：

- 调用习惯要快，每次请求前轻量重算。
- 固定习惯要谨慎，必须有证据、影响说明和确认。

因此 v1 可以支持 `in_session_checkpoint`：

- 当用户在会话中明确说“以后都这样”“这个项目就按这个规则”“把这个记下来”时，立即生成 proposal 或确认卡片。
- 当 AI 在同一会话中发现高影响且非常明确的习惯候选时，可以给轻提示，询问是否放入 pending proposal 队列。
- 如果用户正在专注执行，不应频繁弹窗；默认更适合放入 proposal inbox，等待用户统一处理。

`in_session_checkpoint` 不应绕过 proposal：

- 高影响习惯仍要展示来源证据、目标 scope、写入对象和未来影响。
- 用户可以确认、拒绝、暂缓或改写。
- 如果用户不处理，候选留在 pending 队列，不应直接生效。

适合会话中提示：

- 用户显式使用“以后 / 默认 / 每次 / 这个项目都”。
- 即将执行的后续动作会受该习惯影响。
- 不确认会导致本轮继续做错。
- 该候选与现有规则冲突，需要用户立刻裁决。

不适合会话中提示：

- 低影响风格偏好。
- 证据不足的隐式推断。
- 可以安全等到会话后整理的趋势。
- 用户正在连续输入或执行高专注任务。

### 6.2b 动态刷新时机

“执行时怎样调用习惯”不是一次绑定后永远不变，而是 query time 的临时编译判断。

因此应区分两类更新：

- 运行时读取判断
  每次模型调用前轻量重算，用于决定本轮读取哪些习惯。它生成 `context_packet`，不改变长期真源。
- 长期绑定或长期习惯更新
  在证据更稳定、用户显式确认、summary window 或 proposal confirmation 后发生。它会更新 session binding、task_scope、initiative_policy、project_guidance、artifact_contract 等长期或半长期对象。

第一版推荐的动态刷新触发器：

- 用户本轮请求显式改变目标，例如“现在别管 IPK，先讨论用户自适应系统”。
- 当前 cwd、repo、worktree、Aether project 或打开文件变化。
- 用户引用、创建或修改了新的 artifact。
- 用户从问答转为写文件、总结并记录、运行工具等行动型请求。
- 当前 session 被用户手动绑定到新的 task_scope。
- 系统发现 matching 置信度下降，或多个候选 scope 接近。
- 用户确认、拒绝或暂缓 proposal。
- project_guidance、task_scope、artifact_contract、subject_profile 或 global_guidance 发生写入。
- summary window 生成新的 summary。
- on_session_end 提取了新的 signals。

这些触发器的处理方式不同：

- 只影响本轮回答的变化，应重新运行 `scope matching` 和 `scope read`，生成新的 `context_packet`。
- 影响当前 session 后续走向的变化，应更新 session db 中的 binding 引用。
- 影响未来多个 session / project 的变化，应进入 `scope promotion` 或 proposal 流程。

不建议：

- 每个 token 或每个 UI 微小动作都重算完整 context。
- 因一次低置信度 matching 就改写长期 task_scope。
- 用旧 `context_packet` 当作长期真源。

推荐实现：

- 每次模型请求前做一次轻量 matching + read。
- 对文件路径、project/worktree、proposal confirmation、长期记录写入设置 dirty flag。
- dirty flag 命中时，强制重新编译 `context_packet`。
- 没有 dirty flag 且请求连续性很强时，可以复用上一轮 matching 结果，但仍要检查当前用户请求是否覆盖旧规则。

### 6.3 输入

- `ScopeMatchResult`
- 当前用户请求
- 当前消息上下文
- 当前模型任务类型
- token 预算
- 权限状态
- 已确认长期记录
- pending proposal 摘要

pending proposal 默认不应直接作为强规则注入模型。它可以用于 UI 提醒，或在用户正在 review proposal 时展示。

### 6.4 读取路径

全局与 subject：

```text
MemoryPath.adaptationRoot()/global/
```

工作区引用层与独立真源：

```text
MemoryPath.adaptationRoot()/workspace/projects/<project_id>/
MemoryPath.adaptationRoot()/initiatives/<initiative_id>/
MemoryPath.adaptationRoot()/task-scopes/<scope_id>/
MemoryPath.adaptationRoot()/artifacts/<artifact_id>/
```

派生 context packet：

```text
MemoryPath.cacheRoot()/adaptation/context-packets/
```

具体目录树以存储契约为唯一完整权威来源。本文只列关键锚点，避免重复目录树导致漂移。

### 6.5 读取顺序和覆盖顺序

长期 policy 覆盖顺序已经拍板：

```text
artifact_contract
  > task_scope policy
  > initiative policy
  > subject policy
  > global policy
```

还必须遵守更高优先级：

```text
system / developer 指令
  > 当前用户本轮明确要求
  > repo AGENTS.md 等项目级 agent 指令
  > adaptation policy
```

发生冲突时：

- 更具体的长期规则优先。
- 更新、更明确、用户确认过的规则优先。
- 高层规则不能覆盖当前用户明确要求。
- adaptation policy 不能绕过权限、安全确认或危险操作判断。

### 6.6 读取内容

v1 推荐读取：

- `global_guidance` 的相关轻量背景条目，以及 `global_policy` 的少量确认条目。
- 当前 subject_profile / subject policy 的相关条目；如果 session 绑定多个 subject，subject policy 应合并读取，而不是只取第一个 subject。
- 当前 project_guidance 的项目背景条目与 refs。
- 当前 task_scope 的 goal、status_summary、workflow_habits、resource_preferences。
- 当前 artifact_contract 的 path、write_mode、update_triggers、partner_artifacts、protected_regions。
- 必要时读取 task_scope linked IPK piece 的 surface 或 summary。
- 当前 session 已确认的 `habit_ids` 对应 habit surfaces。
- 当前 session review gate 中“建议加入/建议移出/建议替换”的轻量摘要，用于 UI 和 explain，但不直接进入 prompt 主体。

v1 不推荐读取：

- 全量历史 signals。
- 全量 proposals。
- 全量 Markdown 镜像。
- 大段 IPK piece 正文。
- 与当前请求无关的 global_guidance 细节。

### 6.7 Context Packet 输出

推荐结构：

```json
{
  "request_id": "req_xxx",
  "session_id": "ses_xxx",
  "project_id": "proj_aether",
  "task_scope_id": "scope_user_adaptation_v1",
  "subject_ids": ["user-adaptation-system"],
  "artifact_ids": ["artifact_scope_mechanics_zh"],
  "sections": [
    {
      "kind": "operation_policy",
      "source": "initiative_policy",
      "text": "项目规划讨论中，已确认决策应写入 implementation-decisions，未决方向应写入 open-questions。"
    },
    {
      "kind": "task_scope",
      "source": "task_scope",
      "text": "当前任务是在完善用户自适应系统设计文档。"
    },
    {
      "kind": "artifact_contract",
      "source": "artifact_contract",
      "text": "新增核心机制说明时，应同步 README 和 open-questions。"
    }
  ],
  "audit": {
    "used_records": [
      "project-guidance.json",
      "task-scopes/scope_user_adaptation_v1/scope.json"
    ],
    "omitted_reason": [
      "global_guidance omitted because task/project rules are more specific."
    ]
  }
}
```

### 6.8 Scope Read Prompt Contract

exact prompt 可以后续调优，但 v1 应遵守：

```text
你是用户自适应系统的 context compiler。

任务：
根据当前请求和 ScopeMatchResult，选择少量最相关的长期记录，压缩成给模型使用的 context_packet。

规则：
- 不要原样塞入全部长期记忆。
- 优先使用更具体的作用域。
- 不要使用 rejected / deferred proposal 作为行为规则。
- pending proposal 只能作为 UI 提醒，不作为已确认规则。
- 当前用户本轮明确要求优先于 adaptation 记录。
- adaptation policy 不能覆盖系统 / developer 指令、权限确认或安全边界。
- 输出应短、小、可检查。

输出 JSON 字段：
- request_id
- session_id
- project_id
- task_scope_id
- subject_ids
- artifact_ids
- sections
- audit.used_records
- audit.omitted_reason
- conflicts
```

### 6.9 预算策略

具体 token 预算仍需调优。v1 建议采用保守默认：

- 只读取当前 primary task_scope。
- subject 最多 1-3 个。
- artifact 最多读取当前直接相关的 1-3 个。
- global 只读取已确认且高稳定度的少量条目。
- 每个 section 输出短句，不输出完整 JSON。

如果预算不足：

1. 保留当前用户要求。
2. 保留 artifact_contract。
3. 保留 task_scope policy。
4. 保留 initiative policy。
5. 保留 subject policy。
6. 最后才保留 global policy。

当前 session habit surface 是普通任务请求的必带上下文；普通请求可保持其余 profile / policy 的保守预算，但不能把已引入 session 的习惯裁掉。例外：当用户明确询问“当前 Session 习惯 / 当前习惯 / 习惯列表”时，本轮目标是解释当前 habit surface，而不是完成普通任务。此时应按本轮已选 section 动态放宽 section / character budget，优先完整列出当前 UI 可见习惯，不应依赖固定条数上限。

### 6.10 失败处理

如果 matching 失败：

- 使用 project / session 的最小上下文。
- 不注入可疑长期习惯。
- 可以给 UI 标记“本轮未使用长期习惯记录”。

如果读取失败：

- 不中断普通回答。
- 记录错误事件。
- 不用陈旧 cache 替代长期真源，除非明确标记为 snapshot。

如果记录冲突：

- 按覆盖顺序裁剪。
- 在 audit 中写明哪些规则被覆盖。
- 高影响冲突可生成 proposal 或提示用户检查。

### 6.11 Workflow habit 的 v1 / vNext 实现

“项目规划 / 系统设计 / 实现方案讨论时，已拍板写 decisions，未决写 open-questions”这类规则，本质上是 workflow habit。

v1 不需要先实现完整 `workflow_profile` 对象。推荐先把它保存为带触发条件的 `initiative_policy` 或 `task_scope policy`。

v1 记录形态可以是：

```json
{
  "id": "pol_op_planning_doc_sync",
  "kind": "operation_policy",
  "trigger": {
    "request_types": [
      "project_planning",
      "system_design",
      "implementation_planning",
      "documentation_design"
    ],
    "project_ids": ["proj_aether"],
    "task_scope_ids": ["scope_user_adaptation_v1"]
  },
  "actions": [
    {
      "when": "user_confirms_decision",
      "do": "write_to_decisions_or_schema_or_integration_or_guide"
    },
    {
      "when": "idea_is_unresolved_or_vnext",
      "do": "write_to_open_questions"
    },
    {
      "when": "open_questions_artifact_missing",
      "do": "ask_user_where_to_create_or_bind"
    }
  ],
  "impact": "high",
  "source": "proposal_confirmed"
}
```

query-time 实现流程：

```text
用户请求
  -> request classifier 判断 request_type
  -> scope matching 判断 initiative / task_scope / artifact
  -> scope read 读取 initiative_policy / task_scope policy
  -> trigger 匹配 workflow habit
  -> context compiler 把命中的 operation_policy 写入 context_packet
  -> 模型执行时自动维护 decisions / open-questions
```

其中 request classifier 可以是 scope matching 的一部分，也可以是 context compiler 前置步骤。v1 至少应识别：

- `project_planning`
- `system_design`
- `implementation_planning`
- `documentation_design`
- `coding`
- `learning`
- `research`
- `casual_chat`

命中后，`context_packet` 可以包含：

```json
{
  "kind": "operation_policy",
  "source": "initiative_policy",
  "id": "pol_op_planning_doc_sync",
  "text": "当本轮是项目规划 / 系统设计 / 实现方案讨论时，把用户确认的决策写入 implementation-decisions/schema/integration/guide，把未决或 vNext 方向写入 open-questions。若找不到 open-questions 文件，先询问用户放在哪里。"
}
```

执行层看到这条 policy 后，应把它当作本轮工作要求的一部分，但仍不能覆盖当前用户明确要求、系统 / developer 指令、权限边界或 repo `AGENTS.md`。

vNext 再考虑抽象为 `workflow_profile` / `pattern_profile`：

```json
{
  "id": "workflow_project_planning_doc_sync",
  "title": "项目规划讨论自动沉淀",
  "triggers": ["project_planning", "system_design", "implementation_planning"],
  "scope": "workflow",
  "applies_to": {
    "subjects": ["software-architecture", "ai-system-design"],
    "project_kinds": ["design_docs", "implementation_plan"]
  },
  "actions": [
    "confirmed_decisions_to_decisions_docs",
    "unresolved_items_to_open_questions"
  ],
  "requires_confirmation": true
}
```

vNext 的关键问题不是能不能写出这个 JSON，而是：

- 它存在哪里。
- 它怎样跨 project 匹配。
- 它和 initiative_policy / task_scope policy 冲突时谁优先。
- 用户怎样查看、启用、禁用某个 workflow habit。

这些仍保留在 open-questions。

## 7. Scope Promotion

### 7.1 定义

`scope promotion` 是习惯传递通道。

它处理的问题是：

- 用户习惯通常先在 session 中被观察到。
- 单次 signal 不应直接改写长期高层记录。
- 多次证据可能说明某个习惯适用于更大范围。
- 系统需要提出“是否提升作用域”，但不能静默扩大长期影响范围。

### 7.2 触发时机

第一版建议在这些时机运行：

- `on_session_end`
  一次 assistant 响应完成并更新 session summary 后。
- `on_summary_window`
  多次相关 session、时间窗口、signal 数量或变化幅度达到条件时。
- `on_high_impact_inference`
  系统发现可能改变未来默认行动方式的候选结论时。
- `on_user_confirm`
  用户确认 proposal 后写入目标长期对象。
- 用户显式命令
  例如“整理我的习惯”“以后都这样做”“把这个规则记下来”。

这里的“会话结束”不要求用户关闭窗口。v1 可以把一次 assistant 响应完成作为可运行后台提取的时机。

### 7.3 输入

- 原始 session evidence
- signals
- summaries
- 用户显式确认或纠正
- vNext 候选：工具调用和文件改动摘要
- 当前 scope matching 结果
- 已确认 profile / policy
- pending / rejected / deferred proposals
- 最近同类 promotion candidates

### 7.4 基本链路

```text
session user message
  -> session scratch capture
  -> active / pending
  -> current session active habits
  -> user confirms save-to-library
  -> choose scope / accept suggested scope
  -> write confirmed target object
  -> render Markdown mirror
```

这是当前认可的 session 快通道：它解决“用户刚说出来，这个 session 后面就该直接用起来”的需求。scratch 进入当前 session 不应等待 signal / summary / proposal 链路先跑完。

与之并行的慢维护通道才是：

```text
scratch repetition / multi-session active occurrences / confirmed habit trigger history
  -> signal
  -> summary
  -> promotion or maintenance candidate
  -> merge / deduplicate
  -> pending proposal queue
  -> user batch review
  -> confirmed / rejected / deferred
  -> update confirmed target object or relation
```

这条慢通道依赖 signals、summaries 和跨 session 趋势。它更适合两个场景：一是提醒用户把反复出现的 scratch 保存为正式习惯，二是根据正式习惯的长期命中情况建议提升、收窄或拆分作用域。

用户主导的快通道应并行存在：

```text
user confirms an active scratch
  -> user optionally states intended scope
  -> LLM suggests target scope when user leaves it blank
  -> user reviews or changes scope
  -> write confirmed target object
  -> link old scoped record via promotes_from / supersedes / derived_from
```

快通道不绕过确认。它只是不强制等待多次跨 session 证据；用户已经决定把某条 scratch 保存为正式习惯时，作用域选择应优先服从用户。

### 7.5 promotion candidate 判断

一条趋势可能需要 promotion 或 maintenance proposal，如果满足：

- 同类 scratch 在多个 session 中重复出现。
- 同类 scratch 在多个 session 中都曾进入 `active`。
- 某条正式习惯在更广范围内反复被命中。
- 某条正式习惯长期只在更窄范围内命中，说明当前层级可能过宽。
- 它不只是当前这次对话的临时要求。
- 它会影响未来回答或行动。
- 它明显适用于比当前 scope 更广的范围。
- 用户显式说“以后”“默认”“每次”“这个项目都这样”。
- 用户显式说“这是全局习惯”“只在当前任务”“所有代码任务都这样”等作用域意图。
- 当前 task_scope 中形成的规则可能适用于整个 initiative。
- 当前 initiative 中形成的规则可能适用于某个 subject 或 workflow。

不应 promotion：

- 只是一次临时偏好。
- 证据不足。
- 只是当前文件的局部格式要求。
- 用户明确说“只这次”。
- 会生成敏感或过度人格化推断。

### 7.6 目标作用域选择

推荐规则：

- `scratch/session-active -> task_scope`
  当当前已生效的 scratch 只服务当前长期任务。
- `task_scope -> initiative`
  当正式习惯已证明适用于当前长期事项内多个任务。
- `task_scope -> subject`
  当正式习惯更像某个主题/学科内的解释或规范偏好。
- `initiative -> workflow`
  vNext 候选。适用于可复用但不全局的工作流习惯。
- `initiative / subject -> global`
  最保守。只有正式习惯明确跨场景成立且用户确认时才允许。
- `scratch / task_scope / initiative -> artifact`
  当习惯实际是具体产物写法、路径或联动更新规则。

当用户明确选择自然语言作用域时，系统应把该选择作为最高优先级输入，再由 LLM 给出建议和风险提示：

| 用户选择 | 内部目标 |
|---|---|
| 只这次 | `session`，不写长期真源 |
| 当前任务 | `task_scope` |
| 当前项目 / 当前长期事项 | `initiative` |
| 这个主题 / 学科 / 类型任务 | `subject` 或 vNext `workflow_profile` |
| 所有场景 / 全局偏好 | `global` |

如果用户选择与模型建议冲突，应展示差异，而不是静默覆盖。例如用户选择“全局”，但模型判断它像当前项目工具链偏好，proposal 应提示“建议当前项目；用户选择全局；确认后会影响所有工作区”。

### 7.7 confirmation matrix

AI 可以自动做：

- 写入低影响 signal。
- 更新同一 scope 内的 summary。
- 生成 promotion candidate。
- 合并同类 promotion proposal。
- 给已确认习惯追加 evidence / confidence。
- 生成 context_packet cache。

AI 应询问用户：

- 把 active scratch 正式写入习惯库，并决定其作用域。
- 把较低层 confirmed habit 提升到更高层级，且会改变未来默认工作方式。
- 把较高层 confirmed habit 收窄、拆分或改写到更窄层级。
- 作用域不明确。
- 与已有记录冲突。
- 用户可能会被后续行为影响，但影响不是极高。

必须由用户确认：

- 写入 `global_guidance`。
- 写入高影响 `initiative_policy`。
- 写入跨 project / workflow 规则。
- 改变未来默认行动方式。
- 改变文件写入规则。
- 改变工具选择规则。
- 建立自动联动。
- 建立默认工作流或长期任务原则。

### 7.8 Proposal 结构

promotion proposal 应包含：

```json
{
  "id": "prop_20260412_scope_001",
  "scope": {
    "level": "task_scope",
    "target": "scope_user_adaptation_v1"
  },
  "kind": "workflow_principle",
  "impact": "high",
  "confidence": 0.84,
  "evidence_refs": ["sig_001", "sig_007"],
  "promotion": {
    "source_scope": {
      "level": "session",
      "target": "ses_xxx"
    },
    "target_scope": {
      "level": "initiative",
      "target": "ini_aether_main"
    },
    "kind": "scope_promotion",
    "reason": "用户多次确认项目规划讨论中应自动维护 decisions 与 open-questions。"
  },
  "scope_choice": {
    "suggested": {
      "level": "initiative",
      "target": "ini_aether_main"
    },
    "selected": {
      "level": "initiative",
      "target": "ini_aether_main"
    },
    "decided_by": "user",
    "reason": "用户在习惯审查中确认了建议作用域。"
  },
  "target_patch": {
    "object": "initiative_policy",
    "id": "ini_aether_main",
    "fields": ["operation_policy"]
  },
  "future_effect": "之后在 Aether 项目中进行系统设计讨论时，AI 会自动把已拍板内容写入决策文档，把未决方向写入 open-questions。",
  "status": "pending"
}
```

### 7.9 Promotion Prompt Contract

exact prompt 可以后续调优，但 v1 应遵守：

```text
你是用户自适应系统的 promotion analyzer。

任务：
从 signals、summaries、用户显式纠正和工具轨迹中，判断是否存在应该提升到更高作用域的习惯候选。

规则：
- 不要直接写入长期 profile 或 policy。
- 不要把单次临时要求当作长期习惯。
- 高影响候选必须输出为 proposal。
- 如果目标 scope 不确定，输出 needs_user_confirmation=true。
- 必须保留 evidence_refs。
- 必须说明 source_scope、target_scope 和 future_effect。
- 如果用户提供作用域选择，必须保留 `scope_choice.selected`，并说明它与 `scope_choice.suggested` 是否一致。
- 必须判断 impact。
- rejected proposal 的相似候选应进入冷却，不要反复打扰用户。

输出 JSON 字段：
- candidates
- merge_key
- source_scope
- target_scope
- impact
- confidence
- evidence_refs
- target_patch
- future_effect
- needs_user_confirmation
```

禁止：

- 直接写入 `global_guidance`。
- 静默建立默认工作流。
- 静默改变文件写入规则。
- 从语气中推断深层人格并提升到 global。

### 7.10 Merge / Deduplicate

同类 promotion proposal 不应重复弹出。

合并键至少考虑：

- `source_scope.level`
- `source_scope.target`
- `target_scope.level`
- `target_scope.target`
- `kind`
- `target_patch.object`
- `target_patch.fields`
- 语义相似度
- future_effect 是否相同

合并后必须保留：

- 所有关键 evidence refs。
- 被合并 proposal id。
- 最新 confidence。
- 用户拒绝或暂缓历史。

### 7.11 用户 review

proposal UI 至少应展示：

- 这条候选来自哪些证据。
- 它现在属于哪个 scope。
- 系统建议提升到哪个 scope。
- 确认后会写入哪个对象和字段。
- 以后会怎样影响回答或行动。
- 用户可以确认、拒绝、暂缓、改写。

用户界面不应要求用户理解底层英文层级。可以用自然语言选项：

- 只这次。
- 当前任务。
- 当前项目。
- 当前主题。
- 所有类似情况。
- 不要记录。

系统再把这些选择映射到内部 scope。

### 7.12 写入确认后的动作

确认后：

- 写入目标 JSON 真源。
- 重新渲染 Markdown 镜像。
- proposal 状态变为 `confirmed`。
- session db 保存 `proposal_id` 引用。
- 相关 indexes 标记需要更新。
- 相关 context cache 失效或重建。
- 后续同类 signal 只追加 evidence / confidence，不再频繁打扰用户。

拒绝后：

- proposal 状态变为 `rejected`。
- 保存拒绝记录。
- 相似候选进入冷却。

暂缓后：

- proposal 状态变为 `deferred`。
- 保留在 pending 队列。
- 降低提醒优先级。

## 8. 三个机制与 prompts 的调用时序

### 8.1 普通问答

```text
用户发送请求
  -> scope matching prompt / matcher
  -> scope read / context compiler prompt
  -> 生成 context_packet
  -> 模型回答
  -> 响应完成后可运行 on_session_end extraction
```

### 8.2 总结并记录

```text
用户选择消息并点击总结
  -> scope matching
  -> scope read
  -> 总结模型生成 draft
  -> review UI
  -> 用户入库 / 暂存 / 改进
  -> on_session_end extraction 可生成 signals
  -> 必要时 promotion analyzer 生成 proposal
```

### 8.3 写文件或更新 artifact

```text
用户要求更新文件
  -> scope matching 判断 initiative / task_scope / artifact
  -> scope read 读取 artifact_contract 和相关 policy
  -> 复用 Aether 文件写入权限与确认机制
  -> 执行写入
  -> 记录工具/文件操作 signal
  -> 必要时生成 artifact_contract proposal
```

### 8.4 会话后提取

```text
assistant 响应完成
  -> session summary 更新
  -> scope matching for evidence
  -> signal extraction prompt
  -> summary update
  -> promotion analyzer
  -> candidate proposal merge / deduplicate
  -> pending proposal queue
```

### 8.5 用户显式整理习惯

```text
用户点击或命令“整理当前对话习惯”
  -> scope matching
  -> 拉取当前 session / task evidence
  -> signal extraction
  -> promotion analyzer
  -> 生成可审阅 proposal 列表
  -> 用户批量确认 / 拒绝 / 暂缓
```

## 9. UI 入口

v1 UI 应优先提供：

- 当前区域正在使用哪些习惯记录。
- 当前 session 绑定了哪个 task_scope。
- 当前 project 记忆是什么。
- 当前 artifact 规则是什么。
- 待确认 proposal 队列。
- 建议提升作用域的 proposal 分组。
- 当前 context_packet 的可检查摘要。

UI 语言建议：

- “当前项目记忆”
- “当前任务习惯”
- “当前文件规则”
- “建议提升到项目级”
- “只在当前任务中使用”

避免让用户直接处理：

- `scope.level`
- `target_patch`
- `context_packet_id`
- `adaptation_project_id`

这些可以放在高级详情里。

## 10. 安全与权限边界

必须遵守：

- 不因 matching 自动扩大文件读写权限。
- 不因 scope read 绕过工具权限。
- 不因 promotion 静默改变未来默认行动方式。
- 不让通用 write/edit 工具直接维护长期记忆真源。
- 高影响 profile / policy 变更必须先进入 proposal。
- artifact 文件写入必须复用 Aether 现有权限机制。
- adaptation policy 不能覆盖系统 / developer 指令、当前用户明确要求或 repo `AGENTS.md`。

## 11. v1 推荐最小实现

如果要先实现可用版本，建议顺序：

1. `scope matching`
   先支持 session existing binding、project/worktree mapping、当前 artifact path、手动 task_scope 选择。
2. `scope read`
   先支持 project_guidance、initiative_policy、task_scope、artifact_contract、少量 subject/global confirmed records。
3. `context_packet`
   生成短 JSON，可保存 snapshot。
4. `signal extraction`
   只提取明确、低风险 signals。
5. `promotion proposal`
   只对高影响或跨层级候选生成 pending proposal，不自动确认。
6. `proposal inbox`
   支持合并、确认、拒绝、暂缓。

v1 可以暂不做：

- 完整 workflow_profile。
- 跨 worktree 聚合。
- 自动 demotion。
- 高级冲突可视化。
- 用户自定义所有阈值。
- 复杂 prompt 优化。

## 12. Open Questions

必须继续保留在 open-questions：

- matching 置信度阈值。
- promotion 触发阈值。
- 不同层级是否有不同自动化等级。
- v1 UI 是否只暴露三类自然语言区域。
- 用户如何检查“为什么这条习惯放在这里”。
- demotion / scope narrowing 如何做。
- `workflow_profile` / `pattern_profile` 是否进入 vNext。
- monorepo、多 worktree、fork、remote workspace 下 initiative target 如何映射。

## 13. 一句话总结

`scope matching` 决定“这件事属于哪里”。  
`scope read` 决定“这轮该读哪些习惯”。  
`scope promotion` 决定“这条习惯以后是否应该影响更大范围”。

三者合起来，才让用户自适应系统既能在当前请求中正确使用习惯，又能从长期工作中逐渐形成更稳定、更广范围、更可审阅的用户理解。
