# 用户自适应系统：当前实现决策

这份文档用于记录已经比较明确、会影响工程实现的决策。

它不是分步实施指南本身。  
正式分步实施指南已经生成在：

- [user-adaptation-v1-implementation-guide/README.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/README.zh-CN.md)
- [user-adaptation-session-scratch-habits-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md)

## 0. 文档定位

当前第二项目已经补齐第一项目那种正式执行包。

当前文档层级是：

- `implementation-decisions`
  记录已经拍板、实现时不能随意漂移的约束。
- `open-questions`
  记录未拍板问题、可延后优化项和下一版本方向。
- `implementation-guide`
  已经拆成可交给全新 AI 分阶段实现的执行包。

如果未来这些文档和较早总览稿冲突，实现应优先遵守：

1. `user-adaptation-system-top-level-constraint`（最高架构约束，本文档 §0.5 的单列独立版）
2. `ipk-and-adaptation-storage-access-contract`
3. `user-adaptation-v1-implementation-guide`
4. `implementation-decisions`（§0.5 以外的章节）
5. `schema-v1`
6. `scope-mechanics-v1`
7. `aether-integration-v1`
8. `open-questions`
9. `details / overview / vision / profile-and-adaptation`
10. 英文稿

补充：

- `user-adaptation-session-scratch-habits-execution-plan`
  用于描述并继续扩展当前已经落地的 session scratch habits 机制；当它和较早的“所有新 habit 都必须先确认才能进入当前 session”表述冲突时，以这份 scratch design 为准。

## 0.5 三块架构 —— 最高约束（用户 2026-04-14 拍板）

本节是用户自适应系统的**最顶层架构约束**。以下所有其他章节、文档、代码实现，凡与本节冲突，一律以本节为准。后续 AI 在新增功能、重构、修 bug、写新文档前，必须先和本节对齐。

用户自适应系统由**三块相互独立、职责清晰**的区域组成：**独立习惯库（真源）**、**Aether 工作区引用层**、**Session 暂存区**。这三块不得被混成同一层对象，也不得在命名、目录、类型、运行时装配上彼此渗透。

### 第一块：独立习惯库（长期真源）

- 这是全系统**唯一**的习惯正文真源。一切关于"某个习惯写什么、在哪些 scope 成立、置信度多少、证据来自哪里"的权威答案只能从这里读。
- 习惯库内部有 `global / subject / initiative / task_scope / artifact` **五层平行 scope 标签**。它们是**平行**的，不是树状归属关系；subject 不是 global 的子目录，initiative 不挂在 project 下面，artifact 不是 task_scope 的孩子。每一层是一个独立 scope 维度，描述这条习惯"适合在哪些范围被引用"。
- 工作区、repo、project、session、scratch **只能向习惯库提交证据、proposal 和引用请求**，不得在其它位置保存习惯正文真源。
- 物理落点虽然共享 `MemoryPath.adaptationRoot()` 一个根，但五层 scope 必须各自独立为顶层子目录（或等价的平行命名空间），不得互相嵌套。

### 第二块：Aether 工作区引用层

- 工作区引用层有自己独立的 **`global_guidance` / `project_guidance` / `session binding` 三类工作区对象**。它们是 Aether 侧的组织单位，**不是**习惯库五层的别名，也不得与之一对一混同（尤其：`project_guidance` ≠ `initiative`，工作区 `global_guidance` ≠ 习惯库 `global`）。
- 工作区引用层记录只保存**轻量背景 + refs**，**不存习惯正文真源**。这里的 refs 可以包含 habit id、关联理由、分块、禁用/排序和解释路径；背景部分只允许极短摘要与稳定上下文，供 session 缩小候选范围。
- `global_guidance` 与 `project_guidance` 可按 subject 分块，为 session matching 提供强参考，告诉 session 应该去习惯库哪些 scope 取回引用。
- 工作区通过 `scope matching / scope read / scope promotion` 三个机制与习惯库交互；不得绕过这三个机制直接改写真源。
- 当前 v1 允许 `project_guidance` / `global_guidance` 作为 query-time 的轻量 guidance：先用这些小 profile 缩小候选范围，再去习惯库和 IPK 做更窄的检索；它们负责“先缩范围”，不负责直接让某条习惯自动生效。

### 第三块：Session 暂存区

- session habit record（工作区 session 层）是**运行时真正生效的小集合**。这个集合**同时容纳两种来源**：
  1. 从习惯库 5 层真源通过 scope matching 取回的**引用**；
  2. 本 session 新产生、尚未 confirm 的**暂存候选**（scratch habits）。
- 这两支**并列共存**于 session 运行时生效集合里。运行时的 policy 装配、prompt 注入、context packet 输出都必须同时考虑这两支，不能只看一支。
- 暂存候选的生命周期：入 = session 里新被捕获；出 = 要么随 session 消散、要么经 proposal → confirmed 升入习惯库某一 scope，之后下一次 session 以"引用"而非"暂存"方式生效。
- 暂存区**不是**习惯库的前置关卡，也**不是**必须先经过才能运行的通道；它是 session 运行时生效集合里和"库引用"并列的另一支来源。

### 硬性约束总结

1. 习惯库五层（global/subject/initiative/task_scope/artifact）必须平行，不得形成任何树状归属。
2. 工作区三类对象（`global_guidance` / `project_guidance` / `session binding`）只存轻量背景 + refs，不存正文真源。
3. 工作区三层与习惯库五层**必须保持命名、身份、生命周期的独立**；不得在代码中用同一个枚举、同一个 id、同一个目录混指两边。实现上，`ScopeLevel` 应只表示习惯库五层；若运行时需要表示 `session`，必须用单独的 runtime carrier type。
4. Session 运行时生效习惯 = 库引用 + 暂存候选，两者并列。
5. 任何实现、文档、提示词、UI 描述若违反以上四条，必须先改回本节，再做其他工作。

## 0.6 与 Hermes / wiki-llm 对照后的补充约束（用户 2026-04-14 讨论结论）

本节补充本轮对照 Hermes 与 wiki-llm 后已经基本明确、应纳入后续实现判断的结构结论。

### 0.6.1 当前用户自适应系统的主覆盖面

当前 Aether 用户自适应系统第一优先覆盖的是：

- 用户画像 / 偏好
- 分层长期习惯与策略

它**不是**以“个性化程序性技能层”作为第一版主轴。后者可以作为后续独立结构继续设计，但不得为了补 skill layer 而打乱已明确的三块架构与五层 scope。

### 0.6.2 human in the loop 仍然是主结构，不因 Hermes 的自动闭环而削弱

Hermes 的后台 memory / skill review 闭环值得借鉴，但 Aether 当前问题域中，用户对自身习惯、熟悉度和高影响默认行为的判断权仍应强于通用 agent。

因此：

- AI 可以更积极地异步提取 signal、summary、proposal 候选。
- AI 可以更积极地做 merge、去重、作用域建议和 future-effect 解释。
- 但 global / subject / initiative 等更广 scope 的高影响默认习惯，仍以用户确认作为主结构。

换句话说，Aether 可以借 Hermes 的“后台 review 闭环”，但**不**把它解释成“可以明显减少 human review”。

### 0.6.3 subject 是横切激活入口，不是 Hermes 式整体 profile 分区

当前系统继续坚持：

- 一个 session 可以同时激活多个 subject
- subject 是横切入口，不是互斥人格
- physics、coding、writing 等 subject-compatible habits 可在同一 session 共同进入候选或生效集合

因此不得把未来的多 subject 协同错误实现为 Hermes 式“先选一个整体 profile，再继承一个隔离世界”。

### 0.6.4 会话回忆层有价值，但晚于当前 IPK 优化

Hermes 的 `state.db + session recall` 证明“过去对话回忆层”是一块独立且有价值的结构。

当前拍板：

- Aether 后续应把 `session recall` 作为 adaptation / IPK 之外的独立回忆层继续设计。
- 该层不应把 session history 与 IPK piece 真源混成同一库。
- 但在实现优先级上，当前先继续优化已在建的 IPK 与 adaptation 主闭环；`session recall` 放在其后。

## 1. 当前核心目标

用户自适应系统的核心目标是：

- 当前 v1 的自动提取快链路先只看当前 session 的用户消息，自动发现其中的用户习惯、思维模式、行动模式与任务偏好；assistant 文本最多只作为理解用户在同意或纠正什么的对话上下文，不作为 habit evidence。
- 文件改动、工具操作和更广证据来源留到后续版本继续评估，不在 v1 中默认接入自动提取。
- AI 能把这些观察沉淀到分层长期记录中。
- 未来每个新的对话框或行动框，都能从合适层级读取相关记录，并把它们编译进回答与执行。

当前总架构可以理解成：

```text
对话框 / 行动框
  -> 提取局部证据
  -> 写入对应作用域的记录
  -> 周期性压缩与确认
  -> 未来对话框 / 行动框读取相关记录
  -> context compiler 编译成运行时上下文
  -> 影响回答与行动
```

### 1.1 用户自适应系统不同于 IPK 内容库

IPK 内容库的产品原则是：用户主要关心物理内容、文件、知识片段和可见材料；AI 架构、索引、路由、AI 连接和多层 map 的维护尽量由 AI 自动处理。

用户自适应系统的原则不同。用户最了解自己的习惯、偏好、工作方式和哪些规则应该在什么范围内生效，因此用户应拥有更强的审核、选择、提升、降级、禁用和纠正权。AI 的职责是：

- 从聊天和行动中理解候选习惯。
- 维护结构化习惯库、索引、关系边和 session 引用。
- 在用户没有意识到某个稳定偏好值得固定时提出建议。
- 在低风险、高置信度的匹配中自动引用，但在低置信度、跨范围、高影响或冲突时把决定权交给用户。

### 1.2 根架构：工作区引用层、confirmed 习惯库、session 暂存区

当前拍板：用户自适应系统在实现上必须分清三个区域。

第一区域是 Aether 工作区引用层：

```text
Aether 全局工作区
  -> project 工作区
     -> session
```

第二区域是用户自适应系统的 confirmed 习惯库。习惯库保存所有已经被确认的习惯真源，工作区只通过引用、binding、索引和关系边去使用这些习惯。

第三区域是 session 暂存区：

```text
session scratch / session-local temporary habits
```

这里保存“本 session 新出现、尚未正式入库、但可能已经在本 session 生效”的临时习惯。它们不属于 confirmed 习惯库真源，只与当前 session 绑定。

关键约束：

- 习惯真源在习惯库中，不在 Aether 工作区记录文档中。
- session 暂存区不是 confirmed 习惯库，也不是工作区引用层；它只保存当前 session 的临时习惯。
- Aether 全局 / project / session 的习惯记录文档保存的是对习惯库条目的引用、排序、分组、使用状态、禁用关系和解释信息，不复制习惯正文作为真源。
- 习惯库中的习惯被修改、合并、重定向或 tombstone 后，所有工作区引用都应能跟随同一个 habit id / relation 解析到新状态。
- 工作区记录文档像从习惯库拉出的线；线可以连到 Aether 全局、project 或 session，但根仍在习惯库。

### 1.3 习惯库五层是平行存储层，不是树

习惯库内部仍保留五个层级：

```text
global / subject / initiative / task_scope / artifact
```

但这五层不是树状所属关系。它们表示“习惯适合被使用的范围”，不是严格父子包含。一个较底层习惯可能被多个 subject / initiative 使用，一个 initiative 习惯也可能和多个 task / artifact 发生关系；五层之间和同层内部都可以通过关系边、索引和 map 互相连接。

同时要区分两条正交维度：

- `scope` 维度：`global / subject / initiative / task_scope / artifact` 这五层平行 scope。
- 对象职责维度：同一 scope 内部的 `profile / policy / contract` 等文件分工。

后者只是同一 scope 内部的对象职责拆分，不构成新的层级，也不挑战“五层平行”约束。

因此实现不能假设：

- `global` 一定无条件进入每个 session。
- `subject` 一定覆盖所有同 subject session。
- `initiative -> task_scope -> artifact` 是唯一查找路径。
- 较高层级一定比低层级更重要。

层级只影响 matching 时的候选入口、默认权重、用户审核风险和可解释文案。当前 session 的运行时生效集合不再只等于 `habit_ids`；它应理解为已经通过 `habit_ids` 引入的 `imported active habits`，再叠加当前 session scratch 区中的 `scratch active habits`。

### 1.4 工作区三层习惯记录文档

Aether 工作区侧有三层习惯记录文档：

- Aether 全局习惯记录文档。
- 当前 project 工作区习惯记录文档。
- 当前 session 习惯记录文档。

这些文档都可以从习惯库寻找、引用、更新或删除习惯引用；但真正起作用的是 session 对应的习惯记录文档。Aether 全局和 project 工作区文档主要为 session 文档提供强参考，而不是直接成为 prompt 中强制执行的长期真源。

规则：

- 某个 session 匹配习惯时，v1 不重点参考其他 project 的 project / session 习惯记录。
- 同一个 project 的 project 工作区习惯记录，以及同 project 内其他 session 积累出的引用，可作为强参考。
- Aether 全局和 project 工作区习惯记录预计会较大，应按 subject 分块；v1 可以先做一层 subject block。
- 这里的 subject 应与 IPK 内容库中的 subject 粒度保持一致，是领域级别的区分，不应膨胀成大量细碎标签。
- session 习惯记录通常不再分块，因为它只保存当前 session 已引入的小集合。

session 习惯记录主要通过两条路径形成：

1. 从 Aether 全局 / 当前 project 工作区记录中，按当前 session 的 subject、任务、请求类型和上下文筛选合适引用。
2. 在对话过程中，通过 scope matching 直接从习惯库五层候选中引入新的 habit 引用。

## 2. 已同意的第一批实现原则

### 2.0 `task_scope` 是任务习惯与状态层，不是内容正文库

`task_scope` 不应承担具体内容正文的主存储职责。

例如：

- 它可以记录“这个任务里 open-questions 要集中维护，并且每次拍板后要从 open-questions 收敛到 implementation-decisions”。
- 它不应该把 open-questions 里的所有具体问题正文复制一份。
- 它可以记录“这个任务维护 overview / details / open-questions / implementation-decisions 这组 artifact”。
- 它不应该成为这些 artifact 的正文替代品。

因此，`task_scope` 第一版应主要保存：

- 当前长期任务的目标和轻量状态摘要。
- 任务内已经确认的原则。
- 任务内形成的工作习惯、记录习惯和资源偏好。
- 对 artifact、IPK piece、project file 的引用。
- 哪些记录文件应一起检查、按什么顺序维护。

具体内容正文应优先保存在：

- project 内真实 artifact 文件。
- IPK 内容系统的 piece。
- 用户明确指定的笔记、计划、论文或文档文件。

`task_scope` 可以保存很短的 `status_summary`、`open_question_refs` 或 `decision_refs`，但不应把自己变成第二个内容库。

### 2.1 高影响推断才需要用户确认

不是所有用户习惯都需要弹出来让用户确认。

需要进入 `proposal` 确认流的，应是会明显改变未来默认行为的内容，例如：

- 以后完成某类代码修改后，默认同步更新计划文件。
- 以后某类总结默认写入某个固定 artifact。
- 以后某类任务默认采用某个工作顺序或资源选择方式。
- 以后某类操作默认跳过、合并或延后某些步骤。
- 以后某个长期任务默认遵守某条高影响原则。

通常不需要立即确认、可先作为低影响 `signal` 或普通趋势累积的内容，例如：

- 回答长短偏好的一次性表达。
- 解释风格中的轻微偏好。
- 某次会话里的临时要求。
- 只影响当前回答、不改变后续默认行动的偏好。

通用判断标准：

- 如果错误记录会让未来 AI 持续“做错事”，应走 `proposal`。
- 如果错误记录只会让未来 AI “说得略不合适”，可先走慢更新。
- 如果涉及文件写入、工具选择、自动联动、默认工作流或长期任务原则，应倾向确认。

### 2.2 确认 proposal 时必须展示将要改变什么

用户确认 proposal 时，系统不能只展示一句抽象总结。

应尽量展示：

- 这条 proposal 来自哪些证据。
- 它将写入哪个对象，例如 `task_scope`、`artifact_contract`、`policy`。
- 它会改变哪些字段。
- 以后会怎样影响回答或行动。
- 用户可以确认、拒绝、暂缓或要求改写。

这样做的目标，是让用户确认的是“可理解的行为变化”，而不是确认一段黑盒记忆。

### 2.2a 同类 proposal 必须合并，并统一处理

当前明确：proposal 不应一出现就立刻弹出、立刻要求用户判断，更不能一出现就直接写入长期层。

原因是：

- 单个 proposal 可能来自局部证据，用户当下也可能误判。
- 高频弹窗会打断用户工作。
- 多条相似 proposal 分散出现，会让用户重复确认同一类习惯。
- 系统需要先把同类候选结论合并、去重、补证据，再交给用户统一审阅。

因此第一版 proposal 流程应采用：

```text
signal
  -> candidate proposal
  -> merge / deduplicate
  -> pending proposal queue
  -> user batch review
  -> confirmed / rejected / deferred
  -> confirmed record
```

实现原则：

- 同类 proposal 应按 `scope`、`kind`、目标对象和语义相似度合并。
- 合并后的 proposal 应保留所有关键 evidence refs，而不是丢掉来源。
- 默认进入待处理队列，不即时写入长期记录。
- 用户可以统一处理 pending proposals。
- 用户确认后才写入 `task_scope`、`artifact_contract`、`policy` 或 `global_guidance` 等稳定层。
- 用户拒绝后应保留拒绝记录，避免短期内反复生成同一条。
- 用户暂缓后应留在队列中，但降低打扰优先级。

UI 上应优先支持“proposal inbox / 待确认队列”这一类统一处理入口，而不是每出现一条就弹窗。

### 2.3 `signal` 来源边界先保守

第一版不追求极致行为提取效果。

当前暂定第一版优先记录三类证据：

- 用户明确说出的偏好、原则、纠正或要求。
- 用户对 AI 行动方式的反馈。
- 用户对 AI 提议的行为标准、回复方式或工作规则的明确同意；这种情况的证据仍然是“用户的确认消息”，不是 assistant 自己的复述。

进一步拍板：

- 自动提取用户习惯时，直接证据只认当前 session 的用户消息。
- assistant 消息可以作为对话上下文帮助理解“用户在回应什么”，但 assistant 文本本身不应直接落成 habit signal、scratch 或长期习惯证据。
- 如果 assistant 说出一个候选规则，而用户后续明确说“对，以后就这样”“按这个来”“记住这个规则”，真正可写入的证据是用户这条确认消息。
- 文件改动、工具调用、路径轨迹和更广操作证据先不进入 v1 自动习惯提取主链路；后续若要接入，应作为单独证据源重新设计，而不是混入当前用户消息提取逻辑。

更激进的来源，例如从所有对话语气中推断性格、从长时间隐式行为中自动猜测深层偏好，先放入 `open-questions`，不作为第一版硬要求。

### 2.4 `operation_policy` 第一版只做指导，不做危险自动化

第一版的 `operation_policy` 可以影响：

- 工作顺序提示。
- 资源优先级。
- 记录文件更新顺序。
- 工具、路径和程序的推荐。
- context compiler 给模型的操作提醒。

但第一版不应让 `operation_policy` 静默绕过现有权限、安全确认或危险操作判断。

真正会改用户文件、执行高风险命令、改变项目状态的行为，仍应复用 Aether 现有权限与确认机制。

### 2.5 路由和客户端可先仿照 IPK

在更完整调研 Codex、OpenCode 等系统如何保存行动指南、全局资料库与用户习惯记录之前，路由和客户端可以暂按保守方案推进：

- 后端用独立 Hono route。
- 前端先直接 `fetch("/adaptation/*")` 或同类命名空间。
- 暂不要求第一版先接 typed SDK。

存储根的最新结论记录在：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)

第一版不把 adaptation 真源塞进 session db，也不默认写入项目目录；应通过独立 `MemoryRootResolver` 落盘。

当前关于存储根与调用边界的拍板：

- 第一版 `MemoryRootResolver` 采用默认平台路径 + 环境变量覆盖。
- 第一版不做 memory root UI 设置入口。
- 环境变量名由 `AppIdentity.envPrefix` 集中生成，业务代码不得直接读取具体变量名。
- `productName`、`envPrefix`、`memoryNamespace`、`legacyStorageNames` 通过 `AppIdentity` / build identity 集中管理。
- 用户自适应业务代码只能通过 `MemoryPath.adaptationRoot()` 获取真源根。
- global 级记录第一版保存到 `MemoryPath.adaptationRoot()/global/`。
- subject 级记录第一版保存到 `MemoryPath.adaptationRoot()/subjects/<subject_id>/`。
- initiative 级记录第一版保存到 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`。
- task_scope 级真源第一版保存到 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`。
- artifact 级真源第一版保存到 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`。
- session db 只能保存绑定、引用、快照和过程数据，例如 `session_id -> project_id`、`initiative_id`、`task_scope_id`、`subject_ids`、`artifact_ids`、`habit_ids`、`signal_ids`、`proposal_ids`、`context_packet_id`、`context_packet_snapshot` 和 `match_snapshot`。
- 其中 `initiative_id / task_scope_id / subject_ids / artifact_ids` 在 v1 中表示“当前 session 的实际挂载状态”，不是候选池，也不是历史累计袋子。
- session db 不能成为 `global-guidance.json`、`subject-profile.json`、`initiative-policy.json`、`task-scope.json`、`artifact-contract.json` 或 `IPK piece` 的唯一长期真源。
- 旧路径导入只允许 copy，不 move、不 delete。
- 新旧 root 都有数据时，不自动合并。
- 第一版不导出、不同步到 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`。
- 未来项目目录接入顺序应是 `pointer -> explicit export -> one-way sync -> two-way sync`，第一版最多只为后续指针层预留概念，不实现同步。

### 2.6 adaptation 记录第一版优先绑定到 project / worktree 逻辑边界

用户倾向认为 adaptation 记录跟 project / worktree 绑定，比跟单个 session 绑定更合适。

当前暂定：

- session 是证据来源，不是长期 adaptation 记录的主存储根。
- Aether 工作区里的 `project` 必须保留原名，表示 UI / session / worktree 层的工作区 project。
- 习惯库五层之一原先写作 `project` 的 scope 改名为 `initiative`，表示一个可跨多个 Aether project / worktree 的真实长期事项、研究项目或工作目标。
- Aether 现有 project、worktree、repo 和 session 是 `initiative` 的绑定来源和匹配依据之一，但不是同一个概念。
- **v1 不建立任何默认的 Aether project ↔ initiative 绑定**。创建 / 打开 Aether project 时禁止自动创建对应 initiative；`initiative_id` 不得由 `project_id` 派生；`ScopeLevel` 类型层禁止出现 `project → initiative` preprocess。详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)。
- `project_id` 是工作区引用层身份；`initiative_id` 是习惯库长期事项层身份。二者是**完全独立的对象**，既不是 mapping 也不是 binding 的默认关系；显式 binding 只作为路由 classifier 的上下文信号。
- 新 confirmed 习惯如何归入 initiative（以及 subject / task_scope / artifact 的相应 bucket），由 v1 的**分层路由/分区机制**（classifier + review gate + merge）决定，而非靠 project-initiative 绑定推导。
- project / worktree 是第一版任务级、产物级 adaptation 记录的主要逻辑绑定边界。
- 工作区引用层物理记录默认放在 `MemoryPath.adaptationRoot()/workspace/global-guidance.json` 与 `MemoryPath.adaptationRoot()/workspace/projects/<project_id>/`。
- initiative 真源默认放在 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`。
- task_scope 真源默认放在 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`。
- artifact 真源默认放在 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`。
- global 和 subject 这类跨项目记录放在同一个独立 memory root 下，但 `global/` 与 `subjects/` 必须保持并列顶层分区。
- 第一版不默认写入 `<worktree>/.opencode/adaptation/`；该路径未来只作为显式导出、同步或指针层。
- 不同层级可以都有自己的记录文件；需要讨论的是“物理真源放在哪里、如何互相引用”，而不是只能选一种层级。

命名建议：

- Aether 工作区侧继续使用 `project_id`。
- 习惯库长期事项层统一使用 `initiative_id`。
- 实现代码和 schema 中不得再把 `project_id` 直接当成 initiative target。
- UI 面向用户时可以说“当前项目记忆”“当前长期事项”或“项目级习惯”，但底层对象必须保持分离。

不同 worktree 中做相似任务时如何互相引用习惯，先放入 `open-questions` 和后续版本。

### 2.7 行为提取采用四种模式共存的方向

当前认可四种行为提取模式都可能有价值：

- 实时轻量记录。
- 会话后集中提取。
- 周期性 summary window。
- 用户显式命令整理。

第一版不追求提取 prompt 的极致效果，优先搭好框架。

建议第一版：

- 实时模式只记录明确、低风险的 signal。
- 用户发言后自动提取作为主要自动提取方式。
- 用户显式整理作为可控入口。
- 自动提取应在用户消息写入后、assistant 开始回答前的后台链路中异步执行；它不应阻塞当前回答，也不要求等 assistant 回复结束。
- 提取器必须按 `session_id + message_id` 记录已处理消息；自动提取和手动“整理当前对话”都只处理尚未处理过的对话消息，避免同一条聊天内容在每轮响应后重复生成 signal。
- 自动提取必须由后端异步执行；前端不应为了“先提取习惯”而插入额外阻塞步骤，也不应打断用户与 AI 的当前交流。
- 当前这次模型回答能看到的用户自适应上下文，应只包含“这条用户消息到来之前”已经进入当前 session 的 imported habits，以及更早对话中已经落入当前 session scratch 区并处于生效状态的 scratch habits。
- 用户在当前消息里新说出的“以后都这样”“默认用 Python”之类内容，本轮回答可以直接遵守，因为模型本来就能看到当前用户消息；但它们不应先被写成新 habit 再反过来指导同一轮回答。自动提取生成的 scratch / signal / proposal 只影响后续轮次。
- 会话中如果用户明确说“以后都这样”“把这个记下来”，可以生成 `in_session_checkpoint` / proposal 轻提示；但不能绕过 proposal 确认，也不应频繁打断用户。
- summary window 可以先做简单版本，或作为 v1 后半段 / vNext 增强。
- 需要明确区分两条链路：`用户消息 -> session scratch capture -> active/pending -> 当前 session 生效集合` 是运行时主链路；`signal -> summary -> proposal` 是后续分析、提醒和长期维护链路，不应成为 scratch 进入当前 session 的前置门槛。
- 也就是说，当前 session 里“刚说出来就先用起来”的需求，应由 scratch 机制承担；signal / summary / proposal 更适合服务两个后续目标：一是提醒用户把反复出现或跨 session 生效的 scratch 保存为正式习惯，二是根据正式习惯的触发频次与适用范围，给出 rescope / 提升层级 / 收窄层级的建议。
- 因此，作用域提升机制的主要对象不应再表述成“从 raw chat signal 直接一路晋升”，而应表述为“围绕 session scratch 或已确认正式习惯做后续的入库、升层、降层与维护建议”。用户在把 scratch 确认入库时自己选择作用域；未选择时系统才给推荐作用域。
- 慢链路很重要，但不是当前最优先事项。v1 当前先把快链路做准：用户消息经 LLM 语义分类后进入 session scratch；后续再专门讨论慢链路的 event schema、summary 输入、触发阈值和 proposal 分组。

说明：

- 自动提取已对齐为用户消息写入后触发 `after_user_message`，不再等 assistant 正常结束后跑 `after_response`。
- 从用户发言中提取习惯时，必须完全依赖 LLM 语义分类结果；不得再用硬编码 regex、关键词列表或二次 gate 决定是否捕获 scratch。
- 如果 LLM 链路不可用、模型未配置或输出无法解析，本轮不做硬编码兜底，也不把消息标记为已处理；应返回跳过状态，等待后续重试或用户手动整理。当前进一步收敛：提取器可对同一批消息做有限次数的结构化重跑；若整批持续失败，可自动降到按单条消息重跑。只有在结构化结果稳定可解析后，才允许继续写 scratch / signal 并标 processed。

关于 session scratch，再补一条明确语义：

- `active` 和 `pending` 是“当前 session 里是否已经生效”的运行时状态，不等于置信度字段本身。
- `capture_confidence` 表示系统对“这像一条当前 session 习惯”的把握程度；它可以影响默认进入 `active` 还是 `pending`，但二者不是同一个概念。
- `active` 表示这条 scratch 已经进入当前 session 生效集合，会参与 context compiler 与 prompt 注入。
- `pending` 表示系统先捕获到一个候选习惯，但它还没有进入当前 session 生效集合，只在 UI 审查区可见，等待用户激活或后续确认。
- scratch 的创建与 `active/pending` 判定不得依赖硬编码正则触发。v1 中，LLM 输出的 `impact / explicit / temporary / kind / note` 是唯一的用户发言习惯提取依据。
- `impact / kind / explicit / temporary / traits / note` 这类字段，优先应理解为“给当前捕获到的 scratch 候选及其后续分析记录打标签”的结构化元数据，而不是为了把用户消息先强行塞进一条慢晋升流水线。它们的主要价值是：帮助 UI 解释捕获原因、支持 session 内去重与冲突处理、支持跨 session 相似项聚合、支持后续的入库提醒与正式习惯维护分析。

运行时应用原则：

- context compiler 应在 query time 读取、筛选、排序和压缩长期记录。
- “执行时调用哪些习惯”应在每次模型请求前轻量重算，而不是只在 session 创建时判断一次。
- 每次轻量重算只生成本轮 `context_packet`，不应直接改写长期真源。
- 当 cwd / worktree / 打开文件 / artifact / task_scope binding / proposal 状态 / 长期记录发生变化时，应标记 context dirty，并在下一次模型请求前重新匹配和读取。
- AI 在每次轻量重算时应同时做“新增候选扫描”和“当前 session habits 复核”，也就是一边找可能加入当前 session 的习惯，一边检查当前 `habit_ids` 中哪些习惯可能需要提醒用户复核。
- 用户在当前 session 中确认 proposal 后，应立即把对应作用域绑定回该 session，并重编译一个新的 `context_packet` 快照；这样“当前习惯”入口能立刻看到新习惯，下一次模型调用也能引用它。
- “当前习惯”的可见索引不应只覆盖 initiative / task_scope；v1 至少应把 `global_policy` 和当前绑定 subject 的 `subject_policy` 纳入可匹配 habit index，避免用户把习惯确认到更高层级后完全无法进入 session。
- 但高层级不等于无条件进入每个 session：global / initiative 级习惯应先经过请求、task_scope、subject、Aether project 语境等 matching，再进入 session review gate；只有用户确认后才能写入 session binding 的 `habit_ids`。
- 同理，subject 习惯也不是“只要识别到 subject 就强制引入”；subject 只提供候选入口和权重，是否进入 session 仍取决于 matching、已有 session 引用、置信度和用户确认策略。
- 当前实现采用一版保守的“小 profile 缩小范围”规则：显式 session binding / matcher 结果优先；如果当前请求没有给出足够的 subject 线索，则允许回退读取 `project_guidance.subject_ids` 与 `global_guidance.subject_ids` 的并集作为候选缩圈；如果 `project_guidance.task_scope_refs` 与 `global_guidance.task_scope_refs` 合并后只有 1 条候选且当前没有显式 task_scope，则允许把它作为软提示参与候选检索，但**不直接写回 binding**。
- `project_guidance` / `global_guidance` 在 v1 只能作为 guidance / refs 使用：它们可以帮助系统缩小候选范围、解释 routing、辅助找到目标 bucket，但**不能直接充当 imported active habit 的真源**。任何真正进入当前 session 生效区的 imported habit，仍必须回到习惯库正式真源中解析并写入 `habit_ids`。
- 已经进入当前 session 的 habit surface 应在该 session 的每次模型请求中作为 `current_session_habit` 注入；普通任务请求也应注意这些习惯，不应只在用户询问习惯列表时才注入。
- 当用户在聊天里询问“当前 Session 习惯 / 当前习惯 / 习惯列表”时，context compiler 应使用同源 habit surface，并把本轮 context budget 动态放宽到足以容纳已选 section；这样模型能回答 UI 中“当前 Session 习惯”可见的全量习惯，不应受固定条数上限截断。
- 但 UI 主视图不应把 `context_packet.sections` 或 `audit.used_records / omitted_reason` 原样暴露成习惯列表。对用户来说，主视图应先展示“当前已生效的 imported habits + active scratch habits”条目，每条条目只保留用户可读字段，例如概括、层级和置信度。命中情况先保留结构化接口，后续用于习惯作用范围、置信度提升或下降、命中次数统计；在 UI 设计成熟前，不要求主视图展示完整命中记录。底层 id、文件路径、artifact 序列号和编译器审计字符串只允许出现在高级调试详情里。
- 不应把所有长期记忆无差别塞进 prompt。
- 至少在 v1 中，AI 根据当前 session 聊天新匹配到的任何层级 habit，都必须先让用户确认，不能自动加入当前 session。
- 至少在 v1 中，AI 也不能自动删除或移出当前 session 已有 habit；它只能生成“建议移出 / 建议替换 / 建议降级”的提醒，等待用户确认。
- `context_packet` 是一次请求的编译结果和快照，不是长期 profile / policy / task_scope 的替代真源。
- 第一版允许 session db 保存 `context_packet_snapshot` 作为审计、调试和 UI 检查用快照。
- 如果需要保存完整 `context_packet` 文件，只能作为派生缓存写入 `MemoryPath.cacheRoot()/adaptation/context-packets/`，session db 保存引用 ID；它仍然不是长期真源。

### 2.7a JSON 与 Markdown 双视图规则

当前拍板：

- 第一版长期 adaptation 记录以 JSON 为结构化真源。
- 同名 Markdown 文件是从 JSON 渲染出来的人类可读审阅镜像。
- 用户可以查看 Markdown，但第一版不把手工编辑 Markdown 作为写回 JSON 的入口。
- 每次写入或确认长期 JSON 记录后，应同步重新生成对应 Markdown。
- 如果 JSON 与 Markdown 内容冲突，以 JSON 为准，并重新渲染 Markdown。

仍需后续补充的是各类 Markdown 的具体模板，而不是双视图的真源关系。

### 2.7b project-guidance 与 initiative-policy 的分工

当前拍板：

- `project-guidance.json` 进入 v1，但只保存项目级稳定背景、引用关系和轻量上下文，不保存项目正文。
- `project-guidance.json` 进入 v1，用于保存 Aether 工作区 project 引用层的稳定背景、引用关系和轻量上下文。
- `initiative-policy.json` 进入 v1，用于保存习惯库里 initiative 层的已确认长期规则；高影响条目必须由 proposal 确认后写入。
- `initiative-profile.json` / `initiative-policy.json` 保存在 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`。
- `project-policy.json` 作为历史遗留对象已删除；project 层不再存在独立 policy 对象，也不再保留独立 `project-suppression` 对象。
- `project-guidance.json` 保存在 `MemoryPath.adaptationRoot()/workspace/projects/<project_id>/`。
- `task-scopes/<scope_id>/scope.json` / `policy.json` 保存在 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`。
- `artifacts/<artifact_id>/contract.json` 保存在 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`。

`project-guidance` 第一版适合记录：

- project 的稳定一句话摘要。
- project 中跨 task_scope 成立的背景约束。
- 相关 subject、task_scope、artifact、IPK piece 的引用。
- 不适合放进某个单独 task_scope、但又不应成为 global_guidance 的项目级事实。
- 它是“轻量项目背景 + 引用关系”的混合对象，不是纯索引表。
- 它允许为当前 project 下的新 session 提供一个很短的语境入口，但这些字段不能膨胀成习惯正文真源或项目正文真源。
- 一旦某段内容已经变成长期规则正文、任务正文或可复用知识，应分别进入习惯库、task_scope / artifact 真源或 IPK。
- 当前 project 中重复出现的高置信线索，应优先沉淀到 `project-guidance` 的 refs / 稳定背景，而不是再通过 project-local suppression 维护一层负向过滤器。

`initiative-policy` 第一版适合记录：

- 一个真实长期事项中跨 task_scope 成立的默认文档维护顺序。
- 该长期事项里修改代码后需要检查哪些文档、运行哪些检查。
- 该长期事项里的安全边界和禁止事项。
- 该长期事项中已经由用户确认的高影响工作流规则。

### 2.7c policy 覆盖顺序

当前拍板的长期 policy 覆盖顺序：

```text
artifact_contract
  > task_scope policy
  > initiative policy
  > subject policy
  > global policy
```

解释：

- 越具体的长期规则优先级越高。
- `artifact_contract` 最具体，优先保护单个产物的写法、路径和更新约束。
- `task_scope policy` 控制当前长期任务的工作流。
- `initiative policy` 控制当前长期事项内跨任务成立的工作流。
- `subject policy` 控制某个主题/学科下的回应和方法习惯。
- `global policy` 只提供跨项目默认倾向。

安全边界：

- adaptation policy 不能覆盖系统 / developer 指令。
- adaptation policy 不能绕过权限、安全确认或危险操作判断。
- adaptation policy 不能覆盖当前用户在本轮中的明确要求。
- 在 Codex / opencode 兼容期内，adaptation policy 不能覆盖 repo 内 `AGENTS.md` 这类项目级 agent 指令；如果冲突，应提示用户确认。

context compiler 应在 query time 按这个顺序裁剪和合并 policy。发生冲突时，优先保留更具体、更近期确认、影响更明确的规则，并尽量在可检查摘要中说明覆盖关系。

### 2.8 写入 `global_guidance` 必须非常保守

`global_guidance` 是 Aether 工作区全局侧的**轻量背景 + refs** 文件，用来在 query time 给 session 提供跨项目、跨任务的缩圈参考。它不是习惯正文真源；全局 confirmed habits 的正文仍应进入习惯库 global 层真源。

当前倾向：

- 所有写入 `global_guidance` 的内容都必须由用户确认。
- 第一版可以允许 `global_guidance` 存在，但更新策略应最保守。
- 用户显式触发整理全局画像，比后台频繁自动修改更安全。

### 2.9 UI 应提供方便检查当前区域习惯记录的入口

当前认可类似 IPK 库的管理入口是可行方向。

但还需要额外满足：

- 每个 session 或 project 应有一个方便入口，检查当前区域对应的用户习惯记录。
- 用户应能查看当前 task_scope、artifact、subject、global 中哪些记录正在影响本区域。
- 用户应能检查 proposal、已确认习惯、关联 artifact 和当前 context 摘要。
- 确认一个适用于当前 session / task 的习惯后，入口应立即刷新最近一次 context 摘要，而不是等待下一轮自然请求。
- “当前习惯”入口中的已确认习惯应以当前 session 的作用域绑定为准：展示项目级规则和当前 task_scope 规则，不应默认列出同一 project 下所有历史 task_scope 的规则。
- `习惯审查` 入口除了长期 promotion proposal，还应承担 session review gate：显示“建议加入当前 session”的 habit 候选，以及“建议从当前 session 移出/替换”的复核项。

UI 具体形态仍允许后续根据使用体验调整。

### 2.10 `subject_profile` 和记录文档应有模板，但用户只需检查

当前认可：

- `subject_id` 第一版可以使用自由字符串加 slug 规范化。
- 各层记录文档应有稳定模板，方便 AI 写入和读取。
- 用户不应手工维护底层 JSON。
- 用户应能查看 Markdown 摘要、proposal 和关键字段解释。

### 2.11 Artifact 写入安全和 IPK 联动方向

当前认可：

- 私有 adaptation 记录可以相对安静地写入。
- 真正修改用户文件时，必须复用 Aether 现有权限与确认机制。
- 第一版 IPK 联动只做轻量只读，不复制 IPK 正文，不自动回写 IPK。

职责边界：

- `IPK` 负责内容、知识、灵感、piece、map、search、associate。
- 用户自适应系统负责用户偏好、工作习惯、行动策略、proposal、profile、policy、task_scope、artifact_contract。
- 两者可以通过 ID、摘要和检索结果轻量关联，但不互相复制长期正文，也不互相替代真源。

### 2.12 项目规划讨论的自动沉淀规则

当前拍板一条适用于“项目规划 / 系统设计 / 实现方案讨论”场景的工作流规则：

- 当用户在讨论中做出明确选择，AI 应自动把已确认内容收敛到对应的 `implementation-decisions`、schema、integration 或 implementation guide 文档中。
- 当讨论中出现 AI 或用户提出的可能改进方向、未决问题、v1 暂不实现项或 vNext 方向，AI 应自动写入对应 `open-questions` 文档。
- 用户不需要每次单独提醒“把这个写进文档”。
- 该规则不适用于所有对话，不应进入无条件 `global_guidance`；它应被视为“项目规划类 workflow habit”。

第一版实现建议：

- 在当前 Aether 项目内，先作为带触发条件的 `initiative_policy` 或 `task_scope policy` 生效。
- 该 policy 应包含触发条件，例如“项目规划 / 系统设计 / 实现方案讨论 / 文档设计讨论”，而不是对所有请求无条件注入。
- context compiler 在 query time 识别当前请求类型；只有命中触发条件时，才把这条工作流规则编译进 `context_packet`。
- 执行时，模型根据 `context_packet` 中的 operation policy 自动维护对应文档：已确认内容写入 decisions / schema / integration / guide，未决方向写入 open-questions。
- 如果当前项目没有可识别的 open-questions 文件，v1 应先询问用户放在哪里，再新建或绑定，而不是静默新建到错误位置。
- 在未来用户自适应系统中，应抽象为可复用但不全局的 `workflow_profile` / `pattern_profile` 候选层；vNext 的 `workflow_profile` / `pattern_profile` 应用于跨 project / task 复用同类工作流习惯，但不作为 v1 硬要求。

### 2.12a open-questions 必须随设计变化主动清理

当前拍板：`open-questions` 不是无限堆积的想法垃圾桶，而是仍然有用的未决问题、vNext 方向和调优清单。

因此，在项目规划、架构讨论、系统设计或 implementation guide 更新过程中，AI 不仅要把新问题加入 `open-questions`，还要在每次相关文档或代码变化后主动检查：

- 哪些 open question 已经被新的决策、代码或文档解决。
- 哪些 open question 只剩一部分未解决，需要拆分和改写。
- 哪些条目已经过时，应删除或改写成明确的 vNext / 调优项。
- 哪些已拍板内容还停留在 open-questions 中，需要搬到 `implementation-decisions`、schema、integration 或 guide。

具体执行规则：

- 已解决的内容应从 `open-questions` 删除，或改写为“剩余未决部分”。
- 部分解决的条目应把已定部分写入权威设计文档，只保留未定部分。
- v1 暂不实现但未来可能有价值的方向，应明确标记为 vNext / tuning，而不是写成 v1 阻塞项。
- 每次 IPK / adaptation 文档同步报告中，都应包含 open-questions 清理结果。

这条规则已经同步写入：

- repo `AGENTS.md`
- repo 内 `.opencode/skills/ipk-doc-sync/SKILL.md`
- 用户级 `/home/bzz/.codex/skills/ipk-doc-sync/SKILL.md`

### 2.13 低层到高层的习惯传递机制

当前拍板：用户自适应系统必须显式支持“习惯传递通道”，也可以称为 `scope promotion`。

三个核心机制的集中说明见：

- [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)

原因是：

- 绝大多数原始证据最初来自单个 session。
- session 只能保存过程数据，不能成为长期习惯真源。
- 有些习惯起初只在当前 session / task_scope 中可见，但经过多次证据后，应提升到 initiative、subject 或 global 层；如果未来引入 `workflow_profile`，那属于 vNext，而不是当前正式 scope。
- 高层记录的本质，是能指导更多 session / project，并能从更多 session / project 中吸收证据。

第一版传递链路应采用：

```text
session evidence
  -> signal
  -> session / task summary
  -> promotion candidate
  -> merged proposal
  -> user batch review
  -> confirmed higher-scope profile / policy
```

其中：

- `signal` 记录局部证据，不直接改变高层默认行为。
- `summary` 把同一 scope 内的一组 signal 压缩成趋势。
- `promotion candidate` 表示“这条趋势可能应该提升到更高层级”。
- 高影响或更广作用域的提升必须进入 proposal 队列。
- 用户确认后，系统才把它写入更高层级的 `profile` 或 `policy`。

第一版三种决策方式的分配规则：

- AI 可自决：低影响、局部、可逆的证据记录，例如写入 session signal、更新 task summary、给已确认习惯追加 evidence / confidence、生成 context_packet 缓存。
- AI 应询问用户：中高置信度、可能需要跨层级提升、作用域不明确、或与已有习惯存在冲突的候选结论。
- 必须由用户决定：写入 `global_guidance` / `global_policy`、提升为更广作用域的工作流类规则、改变未来默认行动方式、文件写入规则、工具选择、自动联动、默认工作流或长期任务原则。

因此，第一版不应让 AI 静默把 session 习惯提升成 initiative / subject / global 习惯。AI 可以自动发现和合并候选，但跨层级提升必须通过 proposal 让用户确认。

补充拍板：自动趋势提升是辅助的“慢晋升通道”，不是唯一入口。

- 当用户在自然语言或 proposal 审核中明确表达作用域时，应优先尊重用户选择，允许直接生成目标作用域的 proposal。
- 例如用户说“这是我的全局习惯：我喜欢 Python，不喜欢 C”，系统可以直接生成写入 `global_policy` 的 proposal；如果用户表达的是工作区 global 侧的稳定背景或 refs，再考虑写入 `global_guidance`。不必强制先经历 task_scope -> initiative -> global 的证据阶梯。
- AI 的职责是理解习惯内容、建议合适作用域、合并证据并提示潜在影响；扩大或缩小长期影响范围应主要由用户决定。
- 当前进一步收敛：在长期 proposal / active scratch 入库确认时，用户主交互只需要决定目标 `scope level`，不应被迫直接选择具体 bucket / target id。具体落到该层中的哪个 bucket，应由系统依据 routing / classifier / refs / matching 自行决定，并在需要时向用户解释理由；workspace guidance 只可作为内部参考，不应替代习惯库真源或成为用户必须操作的主 UI。
- proposal UI 应支持用户在确认时选择自然语言作用域，例如“只这次 / 当前任务 / 当前文件规则 / 当前长期事项 / 这个主题 / 所有场景”，内部再映射到 `session / task_scope / artifact / initiative / subject / global`。当前 v1 已拍板的确认器行为是“把习惯库五层都展示出来，并明确哪些当前可选”；`session` 的“只这次”语义和撤销流程仍留给后续完善；`artifact` 的 direct promote 在部分路径尚未完全打通时，可先显示为禁用候选并说明原因。

需要特别区分三件事：

- scope matching
  判断当前请求、signal 或 context_packet 可能关联哪些层级。这可以由 AI 自动做，并在置信度低时让用户确认。
- scope read
  运行时从相关层级读取少量习惯记录。这应由 context compiler 自动做，但需要可检查摘要。
- scope promotion
  把低层习惯写入更高层级并扩大未来影响范围。只有这一步在高影响、跨 initiative / subject / global 或改变默认行动方式时必须用户确认。

所以第一版不是“五个层级的所有传递都需要人决定”。用户不应被迫为每条 signal 选择层级；用户真正需要决定的是会扩大长期影响范围、改变后续默认行为、或系统置信度不足的关键提升。

用户显式命令整理或提升时，系统可以跳过部分自动阈值，但仍应展示：

- 来源证据。
- 原始 scope。
- 目标 scope。
- 写入对象和字段。
- 未来会影响哪些场景。

这个机制与已有 proposal inbox 结合：同类 promotion proposal 应合并后统一处理，而不是一条一条即时打断用户。

#### 2.13a v1 默认阈值（已落地）

第一版默认采用“手动 + 自动”混合机制：

- 快通道（显式）：
  - 用户明确说“以后/默认/都这样/记住”等时，允许快速生成 pending proposal。
  - 但仍不能绕过用户确认。
- 慢通道（趋势）：
  - `session -> task_scope/initiative`：`explicit_count >= 1` 或（`strong_count >= 2` 且 `session_count >= 2`）
  - `task_scope -> initiative`：跨 `>= 2` 个 session 且 `explicit_count >= 1`
  - `initiative -> subject/global`：跨 `>= 3` 个 session 且 `explicit_count >= 1`
- summary window：
  - 自动模式下，默认要满足“新增 signals >= 3”或“存在高影响显式信号”才生成 summary。
  - 手动“整理当前对话”可强制触发。

触发去重规则：

- `impact=high` 仍用于强度与置信权重，但不应作为“单条快通道直接晋升”的充分条件。
- 显式表达负责快通道；非显式高置信信号需要跨会话重复后走慢通道。

#### 2.13b 语义归并双通道（已落地）

第一版在“快链路 LLM 提取 + 慢链路维护分析”之外，允许一个可选的 LLM 语义归并旁路：

- 用户新习惯提取主链路仍是“只读用户消息 -> LLM 结构化提取 -> comparator -> scratch / review / signal”。
- 语义旁路只负责产出“相似 signal 归并候选”，不参与用户新习惯是否捕获的主判定。
- regex / 关键词线索在 v1 中先不实现；如果未来要接入，也只可作为参考层或兜底触发层存在，例如把某条消息放入“必须触发 LLM 复核 / 等待重试”的队列。无论如何，它们都不能直接生成 scratch、signal 或 processed 标记。
- 语义旁路默认关闭，仅在配置 `semantic_merge` 模型后启用。
- 语义候选必须进入 proposal merge / pending inbox。
- 语义候选不能直接写长期 profile / policy，不能绕过 confirm。
- 模型不可用或输出无效时，不能回退为基于 regex / 关键词的直接 habit capture；最多只保留复核提示或重试兜底。

#### 2.13c 独立习惯库与工作区引用映射

当前拍板：用户自适应系统应维护一个独立的习惯库，而不是把习惯真源和工作区混在一起。

- 习惯库真源属于 `MemoryPath.adaptationRoot()` 下的长期结构化存储。
- Aether 工作区、repo、project、session 是习惯库的使用方和证据来源，不是长期习惯对象本身。
- 工作区可以向习惯库写入 evidence / proposal / scoped record，也可以通过 scope matching / index / graph traversal 从习惯库取回相关习惯。
- 工作区运行态与长期习惯库是两个概念区域；二者之间通过映射连接，例如 `workspace project/session -> initiative/task/subject/artifact`。
- 当前五层 `global / subject / initiative / task_scope / artifact` 首先是检索、引用和权重控制结构：帮助当前 session 找到更相关的习惯，而不是要求用户理解或手动维护完整内部树。
- 习惯库内部可以保留树 / 图结构，因为习惯多起来后不能全量遍历；task 级习惯和 initiative 级习惯、subject 习惯、artifact 规则之间的邻接关系应帮助检索。

管理习惯库时，用户可以改变习惯作用范围，但不应通过直接删除旧记录来完成晋升或降级。

- 习惯应有稳定 `habit_id`、版本信息和关系边。
- 晋升到更高层级时，优先创建或更新目标层级的新记录，并标记 `promotes_from` / `supersedes` / `derived_from` 指向原记录。
- 原记录可以保留为 scoped override、历史证据节点或被新记录覆盖的旧版本；只有用户明确选择“从真源删除”时才物理删除。
- 如果旧记录被废弃，应留下 tombstone / redirect，避免其他习惯、proposal、evidence、artifact contract 的引用断裂。
- 降级或收窄作用域时同理：生成新的更窄作用域记录，并让旧记录进入 superseded / disabled / redirected 状态，而不是无条件删除。

#### 2.13c.1 习惯图谱是派生导航层，不是真源

结合 `llm-wiki.md` 与本地 Graphify 项目的调研，当前进一步明确：

- 已确认习惯的长期真源仍是习惯库中的结构化记录，例如 profile / policy / task_scope / artifact_contract 及其后续独立 habit records。
- `habit-index.jsonl`、`scope-map.json`、未来的 `habit-graph.json`、`habit-report.md`、`habit-wiki/index.md` 都是派生导航层；它们可以帮助检索、解释、审计和管理，但坏了应能从真源重建。
- 图谱节点不应只按五层 scope 建树。五层仍是平行 scope 标签；图谱边负责表达 `used_with`、`specializes`、`generalizes`、`conflicts_with`、`suppressed_in`、`redirects_to` 等真实关系。
- 图谱边必须保留来源、置信度和状态。模型推断边应标记为 `inferred` / `ambiguous`，不能在高影响场景里绕过 proposal 和用户确认。
- Workflow habit 应支持“组关系”。多个 habit 共同构成一个项目规划流程、写作流程或文件维护流程时，应允许用 hyperedge / bundle 表达，而不是强行拆成多条等价的两两边。
- context compiler 不应把整个 habit graph 塞进 prompt。推荐顺序是：先读当前 session habit ids，再读 reference / trigger / subject / path 索引，必要时展开少量邻近 habit surfaces，最后才读取 top candidates 的完整真源。
- 面向用户和调试时，应提供类似 Graphify `query / path / explain` 的解释能力：回答“为什么这个 session 引入了这条习惯”“这条习惯从哪些证据或作用域上升而来”“它和哪条规则冲突或覆盖”。
- 索引和图谱应支持增量重建。每条 habit surface / relation / evidence reference 都应有稳定 id 或 hash，confirmed record 改动后标记 dirty，再重建受影响索引。

不采纳 Graphify 的地方也要明确：

- 不把 topology clustering 当作唯一匹配依据；习惯匹配还必须考虑用户确认、作用域风险、冲突、禁用、当前 session 目标和高影响门槛。
- 不把 LLM 生成的关系边直接等同于用户习惯真源。
- 不把可视化图谱或 Neo4j 作为 v1 必需依赖；v1 先保留本地 JSON/JSONL 派生层即可。

#### 2.13c.2 五层 scope 是查询主先验，relation graph 是候选扩展层

当前进一步拍板：

- `relation graph` 是习惯库需要具备的结构。它用于表达习惯之间的 `used_with`、`specializes`、`generalizes`、`conflicts_with`、`suppressed_in`、`redirects_to`、workflow bundle 等关系。
- 图谱邻居只能作为候选，不等于当前 session 生效习惯。任何 graph expansion 找到的 habit 都必须经过 scope matching、冲突审计、suppression、impact gate 和 session binding 写入流程。
- 五层 scope 标签仍然是查询的主先验。Graph topology 只能辅助扩展和排序，不能替代 scope、用户确认、当前 Aether project / task / subject / artifact 上下文。
- 习惯库不同于 Graphify 的知识库。知识节点大体同质，而习惯有适用范围、风险、影响面和用户确认成本。查询时必须先判断习惯“适合在哪里用”，再判断图上“和谁相关”。
- 冲突审计需要优先实现。完整的 `explain/path` 用户解释能力可以后置，因为 evidence 和 proposal 已经提供了第一层可审计来源；但系统内部至少要能识别冲突、覆盖、禁用和 dangling relation。
- 对这个系统来说，Graphify 借鉴的重点不应放在“只让习惯库内部复利”，而应放在“如何让 query-time retrieval 更快更准”。graph / report / query / path / explain 都应服务于高频调用，而不是反过来让运行时依赖整张图。
- v1 必须引入 `session review gate`：matching 和 graph expansion 可以持续产生候选，但“加入当前 session”与“移出当前 session”都只能由用户确认。

五层 scope 在查询中的意义不是父子树，也不是存储所有权，而是五类查询先验：

- `global`
  跨场景成立的低特异性先验。只有当请求无更具体约束，或该习惯已被当前 session / reference 明确引入时，才进入 active context。
- `subject`
  领域先验。识别到物理、编程、写作、用户自适应系统等 subject 后，该 subject 相关习惯在所有 scope 中获得加权入口，但仍不自动生效。
- `initiative`
  真实长期事项 / 研究项目 / 工作目标的环境先验。v1 可由当前 Aether project 映射得到；同 initiative 的 reference 和历史 session 引用是强参考，其他 initiative 的 reference v1 不作为强参考。
- `task_scope`
  当前长期任务先验。session 已绑定 task_scope 时，同 task habit 精度最高，适合作为当前任务默认工作方式；但仍可被当前用户请求或 artifact 规则覆盖。
- `artifact`
  具体产物 / 文件 / 输出目标先验。用户正在写某个文件、维护某组文档或执行某个 artifact contract 时，artifact habit 精度最高，通常优先级高于 task/initiative policy。

执行习惯不是第六层 scope。执行习惯应作为 `kind`、`request_type`、`action_type`、`trigger` 或 workflow bundle 存在，并且可以出现在任意 scope 上。例如“项目规划后清理 open-questions”可以是 initiative scope 的 operation habit，也可以是 task_scope scope 的 workflow habit。

#### 2.13c.3 v1 的 session review gate 与 habit audit loop

当前进一步拍板：

- AI 在当前 session 中做的是“持续审查”和“持续建议”，不是“持续静默改写”。
- 每次新增聊天到来后，系统应运行一个轻量 audit loop：
  1. 扫描新增消息，提取 query-time 特征与长期 signal。
  2. 用 scope / trigger / path / subject / task / initiative reference 找新 habit 候选。
  3. 同时复核当前 session `habit_ids` 中的每条已生效 habit，看它是否仍然匹配、是否出现冲突、是否被用户反证削弱。
  4. 生成 review items：`suggest_add`、`suggest_keep_attention`、`suggest_remove`、`suggest_replace`、`suggest_rescope`。
  5. 只有用户确认后，`suggest_add` 才进入 `habit_ids`；只有用户确认后，`suggest_remove` / `suggest_replace` / `suggest_rescope` 才改变 `habit_ids`。
- 因此，session binding 中的 `habit_ids` 在 v1 表示“当前 session 已确认生效的习惯集合”，而不是“系统当前猜到可能相关的所有习惯”。
- 同时，session binding 中的 `initiative_id / task_scope_id / subject_ids / artifact_ids` 在 v1 表示“当前 session 的实际挂载状态”，而不是系统暂时猜到的所有候选范围。
- review queue 可以与现有 proposal inbox 复用 UI 入口，但语义上要区分：
  - proposal inbox：面向长期真源或更大作用域的确认。
  - session review gate：面向“当前 session 要不要使用/移出这条已存在于习惯库中的 habit”。
- v1 进一步拍板：session review gate 先复用现有 proposal inbox，不单独新建第二套队列对象。实现上允许在 `ProposalRecord` 中增加 `session_review` 子结构，并把这类 review item 作为 `scope.level=session` 的 proposal 存到 `bindings/sessions/<session_id>/proposals/<status>/` 下。
- v1 当前已落地的 review item 先覆盖 `suggest_add` 与 `suggest_remove` 两种动作；`suggest_keep_attention`、`suggest_replace`、`suggest_rescope` 先保留为 schema 与后续扩展位。

#### 2.13c.4 session scratch habits（Level 1 已落地）

当前已落地并继续采用的设计：

- 当前 session 可见习惯不再只有一类，而是分成两类：
  1. `imported habits`
     从独立习惯库中引用进来的正式习惯。
  2. `scratch habits`
     当前 session 中刚刚形成、只绑定该 session 的暂存习惯。
- scratch habits 不是习惯库真源，不进入独立习惯库；它们属于 session 运行时层。
- 当前 session 中用户明确表达的局部工作习惯会自动进入 scratch 区，但进入后分两类：
  - `high confidence scratch`
    直接在当前 session 生效，并可进入“审查暂存习惯”入库列表。
  - `low confidence scratch`
    只保存在当前 session 暂存区，先不注入上下文；用户确认“生效”后才变成 active scratch。
- 只有 active scratch habit 要写入独立习惯库真源时，才进入正式确认流程；pending / low confidence scratch 不进入入库审查列表。
- 因此，下一阶段 `current session habits` 的运行时组成应为：

```text
imported active habits
  + scratch active habits
```

- imported habits 与新提取候选冲突时，当前轮默认遵守用户最新明确要求；这是 prompt 优先级，不等待后台习惯提取和冲突对比完成。后台记录 conflict review item，并通过批量弹窗让用户选择是否暂停 imported、是否把新要求写入 active scratch，或是否输入一条覆盖当前冲突组的 active scratch。
- scratch habits 内部发生冲突时，默认由最新明确要求覆盖旧 scratch；旧 scratch 标记为 `superseded / invalidated`，不要求直接物理删除。
- session 内 scratch habits 要查重并合并；不同 session 之间只检测重复候选，不自动合并。用户确认某条 active scratch habit 入库时，审查界面会显示相似暂存习惯在所有记录中的出现次数，并可选择把其他 session 中相似 scratch 标记为已处理。
- 当前 session 的 scratch 区应提供单独 UI 入口；当前实现为顶部 `暂存习惯` 按钮。
- 左侧原“待确认习惯”入口当前已改成以 scratch 为默认入口的 `习惯审查` 对话框，并提供三分区：
  - `审查暂存习惯`
  - `正式习惯审查`
  - `当前 session 建议`

说明：

- 当前运行时代码已经落地：
  - `bindings/sessions/<session_id>/scratch-habits.json` / `scratch-conflicts.json` 真源
  - `after_user_message` 在用户消息写入后异步触发；assistant 当前轮回答不等待提取、对比或冲突审阅完成
  - 当前轮 prompt 只注入“本条用户消息之前已经生效”的 imported habits 与 active scratch habits，并明确写入“当前用户消息优先于 imported/scratch/adaptation policy”
  - 单条用户消息现在会由 LLM 输出多个原子化 habit candidates；每条 candidate 保留独立 evidence 数组
  - scratch capture 只读取用户消息，不再使用 regex fallback / 关键词 gate 决定是否写 scratch
  - imported overlap 现在只静默记录结构化 hit event，不创建 scratch
  - imported conflict 现在只写 batch review item；不会立即暂停 imported，也不会立即写 active scratch
  - scratch 查重 / overlap / conflict 已改为 LLM comparator 驱动；程序按 active/pending 矩阵执行 merge、promote、supersede 或 review
  - `superseded` scratch 会继续显示在暂存区，但不会进入 prompt 或后续匹配
  - scratch evidence 已按条保存 `message_id + quote + reason`，并在 UI 中支持消息级跳转；`start_offset / end_offset` 作为可选字段预留
  - 冲突审阅已按 candidate 分组；用户可保留现有要求、采用 candidate，或输入一条覆盖当前冲突组的新局部要求
  - 覆盖 imported 的 session 行为不再通过静默改 `habit_ids` 实现，而是由 active scratch 记录其 `shadow_ids` 并在 context compile 时过滤
  - 入库审查只列出 active scratch，并显示跨 session 相似出现次数
  - 顶部 `暂存习惯` 按钮
  - `当前 Session 习惯` 视图拆成 imported + scratch
  - 审查对话框三分区
- 仍可继续按 [user-adaptation-session-scratch-habits-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md) 做更完整的 vNext 扩展，例如高影响冲突强提醒和更细的 explain。

#### 2.13d 可变能力画像与反证收窄（已落地）

第一版明确区分：

- 稳定偏好（stable），例如解释风格偏好、工作流偏好。
- 可变能力（mutable），例如某主题熟悉度会随时间变化。

当新证据与历史能力画像方向相反时：

- 系统可以自动生成“收窄/更新”proposal（recalibration）。
- proposal 仍进入 pending inbox，由用户 confirm / reject / defer。
- 不允许静默改写 `subject_profile` 或 `global_guidance`。

### 2.14 已确认习惯的管理动作（已落地）

当前拍板：v1 只保留“删除真源”这一条显式管理动作；project 不再承担“局部禁用正式习惯”的独立职责。

- 通道 A：`remove-source`
  - 语义：从长期真源删除该条已确认习惯。
  - 影响：后续所有读取都不再能命中该条习惯（除非未来重新生成并确认）。
  - 边界：只能修改被明确选中的目标对象（如 `initiative_policy` 或 `task_scope.principles`），不能隐式扩散到其他 scope。

v1 最小版实现要求：

- `remove-source` 应保留审计信息，并在 UI 中清晰表达“删除长期真源”的后果。
- project 中重复候选的降噪与沉淀，应交由 `project_guidance / global_guidance` 维护策略、proposal merge 和后续 routing 机制承担，而不是继续引入 project-local suppression。

## 3. 需要继续深入思考的核心问题

### 3.1 可复用但不全局的习惯如何记录和调用

当前暴露出的一个根本问题是：

- 有些习惯不适合放进全局记录。
- 但它们又不只适用于单个 session。
- 它们可能在多个相似 project、worktree 或 task_scope 中反复复用。

例如：

- 某类设计项目都要维护 open-questions，并把已拍板内容收敛到 implementation-decisions。
- 某类代码实现任务都要同步更新计划文件。
- 某类文档项目都要同时检查 overview / details / schema。

这类习惯可能需要一种介于 `global` 和单个 `task_scope` 之间的调用机制。

当前候选方向：

- 在 `subject_profile` 中记录某类主题或任务类型的习惯。
- 引入 `pattern` / `workflow_profile` 之类的可复用工作流层。
- 让 task_scope 之间通过相似性检索互相引用。
- 用 IPK 保存工作流经验，再由 context compiler 只读调用。

此问题必须保留在 `open-questions` 中。

## 4. 当前不应提前锁死的内容

下面内容已经明确还需要继续讨论或调研：

- `project_id`、worktree、repo、远端 workspace 之间的稳定映射。
- 是否需要跨 worktree 聚合或相似任务复用机制。
- 可复用但不全局的习惯如何从 v1 的 project/task_scope policy 演化为 `workflow_profile` / `pattern_profile`。
- 习惯传递通道的阈值默认值已经拍板并落地；后续主要是调参、可配置自动化等级和提示频率优化。
- 各类 Markdown 审阅镜像的具体模板格式与渲染细节。
- scope 匹配、绑定和多 scope 精简策略。
- summary window 的 v1 触发策略已定（自动阈值 + 手动触发），后续可扩展周期调度与个性化阈值。
- signal 重复出现后如何避免频繁确认。
- artifact contract 的绑定粒度和写入确认 UI。
- context compiler 的 token 预算和优先级裁剪。
- Web UI 是先做侧栏 tab、右侧 rail 菜单，还是其他形态。
- `subject_profile` 的命名规范和层级文档写法。
- IPK 联动需要读取哪些 piece 信息。
- `global_guidance` 在 v1 中做到什么 UI / 写入入口 / 审阅粒度。
- `AppIdentity` 的具体注入来源、旧路径导入 UX、manifest schema 和未来项目目录 pointer / export 格式。

这些内容必须在 `open-questions` 中保留可追踪条目。
