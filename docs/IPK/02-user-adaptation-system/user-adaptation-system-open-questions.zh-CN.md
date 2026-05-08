# 用户自适应系统：开放问题与后续方向

这份文档记录当前还没有完全拍板的问题。

它有两个用途：

- 防止未定问题被新的 AI 误当成最终实现要求。
- 作为后续版本路线图和调研清单。

## 1. 作用域、任务和存储边界

### Q1. `task_scope` 到底应该怎样和 `worktree` / Aether project 绑定？

最新存储契约已经决定：第一版不默认把长期真源写入项目目录，而是把工作区引用层和 confirmed 真源拆开：

```text
MemoryPath.adaptationRoot()/workspace/projects/<project_id>/
MemoryPath.adaptationRoot()/initiatives/<initiative_id>/
MemoryPath.adaptationRoot()/task-scopes/<scope_id>/
MemoryPath.adaptationRoot()/artifacts/<artifact_id>/
```

`Aether project / worktree` 仍是 v1 逻辑绑定和匹配边界。还需要继续判断：

- 同一逻辑任务是否可能跨多个 worktree。
- 同一个 project 的不同 worktree 是否应共享同一套任务习惯。
- 如果缺少跨 worktree 聚合，是否会导致用户自适应质量下降。
- `project_id` 与 worktree、repo、远端 workspace 的稳定映射怎样设计。

已拍板的 v1：

- Aether 工作区里的 `project` 保留原名；习惯库五层里原先叫 project 的 scope 已改名为 `initiative`。
- `initiative` 是长期事项 / 研究项目 / 工作目标作用域，不完全等同于 Aether 现有 project / session / worktree 对象。
- **v1 不建立任何默认的 Aether project ↔ initiative 绑定**；`initiative_id` 不得由 `project_id` 派生。详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)。
- 新 confirmed 习惯归入哪个 initiative（以及 subject / task_scope / artifact 的哪个 bucket），由 v1 的分层路由 classifier 决定（高置信度可 AI 自动处置，否则进 proposal inbox review）。
- 多个 Aether project / worktree 天然可引用同一个 initiative（通过 classifier 路由，而非硬绑定）；单个 Aether project 也可关联多个 initiative。
- session 只作为证据来源和绑定对象，不作为长期 adaptation 记录主存储根。
- task / artifact 级记录第一版优先绑定到 project / worktree 逻辑边界，但物理真源保存在 `MemoryPath.adaptationRoot()` 下。

仍需继续判断：

- UI 中已经尽量使用“当前项目记忆”“项目级习惯”等用户可读文案；仍需继续清理少量高级视图和调试视图中的底层 id 暴露。
- remote workspace、monorepo、临时目录和 fork 场景下，路由 classifier 的上下文信号（project / worktree / repo）应如何采样与加权。
- 路由 classifier 的自动处置置信度阈值如何校准，AI 自动新建 bucket 过于激进时如何回滚。

### Q1a. 可复用但不全局的习惯应该放在哪里？

这是当前最重要的开放问题之一。

问题描述：

- 有些习惯不适合放进 `global_guidance`，因为它们不是用户所有场景都适用。
- 它们也不适合只放在某一个 session，因为未来还要反复复用。
- 它们甚至可能不只属于一个 task_scope，而是适用于一类相似任务。

例子：

- 设计类项目中维护 `open-questions`，并把已拍板内容收敛到 `implementation-decisions`。
- 文档类项目中同时维护 overview / details / schema。
- 代码实现任务中在改完程序后同步更新计划或说明文档。

候选方案：

- 放在 `subject_profile`
  如果这个习惯明显属于某个学科、主题或项目类型。
- 放在 `task_scope`
  如果这个习惯只在当前长期任务里成立。
- 新增 `workflow_profile` 或 `pattern_profile`
  专门保存跨 project / task 可复用但不全局的工作流习惯。
- 放入 IPK 作为工作流经验 piece
  由 context compiler 在相似任务中只读调用。
- 通过 task_scope 相似性检索复用
  当前 task_scope 找到历史相似 task_scope，再引用其习惯摘要。

当前倾向：

- 第一版先不新增完整 `workflow_profile` 层级。
- 已确认的项目规划工作流规则由路由 classifier 归入 `initiative_policy` / `task_scope policy` 等习惯库真源；是否继续保留 project-local suppression，还是完全改由 `project_guidance / global_guidance` 的维护与 proposal 降噪承担，现已重新成为待确认项。
- `workflow_profile` / 相似 task_scope 复用作为 vNext 重点调研。

已拍板的 v1 例子：

- 在项目规划 / 系统设计 / 实现方案讨论中，用户确认的决策应自动收敛到 `implementation-decisions`、schema、integration 或 implementation guide。
- 讨论中出现的可能改进方向、未决问题、v1 暂不实现项或 vNext 方向，应自动记录到 `open-questions`。

vNext 需要继续设计：

- 是否新增 `workflow_profile` / `pattern_profile`，专门保存跨 project / task 可复用但不全局的工作流习惯。
- `workflow_profile` 的触发条件怎样判断，例如“项目规划”“学习任务”“论文阅读”“代码实现”“调研比较”。
- `workflow_profile` 与 `initiative_policy`、`task_scope policy` 冲突时怎样合并。
- 当前已拍板：在“所有显式引用都以 session 为基础”的前提下，v1 删除 `suppress-project` / `project_suppression`。未来是否需要跨项目 / 主题 / 全局层级的统一负向开关模型，作为 vNext 单独问题保留。

### Q1a-2. “程序性技能层”要不要独立于当前习惯库？

这是本轮和 Hermes 对照后重新变得更重要的问题。

问题背景：

- 当前 adaptation 系统已经较好覆盖“用户画像/偏好”和“长期习惯/策略”。
- Hermes 额外强调了一层 `skills`，用来保存“这类任务通常怎样做”的程序性做法。
- 但在你的使用场景里，执行层面的习惯和用户思维习惯往往是连在一起的，例如“喜欢先搭框架再填细节”“研究讨论后要同步收敛 open-questions”“物理问题偏好先给直觉再给推导”。

因此还没有拍板的问题是：

- 是否需要把“个性化程序性技能”做成独立层，而不是继续放在 `policy / habit` 里。
- 如果独立，它和 `subject_policy / initiative_policy / task_scope policy` 的边界是什么。
- 如果不独立，如何避免把“用户是谁”和“任务怎么做”长期混写进同一类记录。
- 如果未来做独立 skill layer，它是只读工作流模板，还是也允许承载个性化参数。

当前倾向：

- v1 仍以现有 `profile / policy / session scratch` 为主结构，不因 Hermes 而临时新增一整层 skill 真源。
- 但 vNext 值得专门评估“个性化程序性技能层”的最小可行设计，尤其是它与用户思维习惯之间的耦合关系。

### Q1b. `task_scope` 是否只记录习惯，不记录具体内容？

当前倾向：

- `task_scope` 不应记录具体内容正文。
- 它可以记录轻量状态、任务习惯、维护规则、资源偏好和引用。
- open-questions 的具体正文应留在真实 open-questions artifact、IPK piece 或项目文件中。
- `task_scope` 可以记录“本任务有 open-questions 文件、它应该怎样维护、何时检查、如何收敛”，但不复制 open-questions 里的所有具体问题。

已落地的 v1：

- `task_scope` 中已保留极短的 `status_summary`。
- `task_scope` 中已保留 `open_question_refs` / `decision_refs`。

仍需决定：

- 引用对象缺失或文件移动时怎样修复。

### Q1c. 低层习惯提升到高层的阈值和自动化程度怎样设定？

已拍板：

- 用户自适应系统需要显式的习惯传递通道，也就是 `scope promotion`。
- 三个核心机制的集中说明见 [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)。
- 第一版可以自动记录低影响局部 signals 和 summaries。
- 第一版可以自动生成、合并 promotion proposal。
- 第一版不能静默把 session 习惯提升为 initiative / subject / global 习惯。
- 更广作用域或高影响提升必须进入 proposal，让用户统一审阅。
- 自动趋势提升是辅助的慢晋升通道；用户在审核或自然语言中明确指定作用域时，应优先走用户主导快通道。
- proposal UI 应允许用户用自然语言范围选择作用域，例如“只这次 / 当前任务 / 当前项目 / 这个主题 / 所有场景”，系统再映射到内部 scope。
- 习惯库应独立于工作区；工作区通过 mapping/binding 引用习惯库，而不是和长期习惯真源混在一起。
- 晋升 / 降级不应默认物理删除旧记录，应通过新版本、关系边、redirect 或 tombstone 维护引用完整性。

仍需继续调优：

- 慢链路仍然重要，但当前不是最优先事项；后续需要重新讨论“重复 scratch / 多 session active / confirmed habit trigger history”如何进入 summary 与 promotion proposal。
- 后续如何按真实使用数据设置慢链路阈值，尤其是跨 session 频次、confirmed habit 命中次数、recency 与用户显式纠正之间的权重。
- confidence、recency、evidence_count、用户显式纠正等因素在阈值中的权重如何持续优化。
- 会话中出现高影响且明确的习惯候选时，`in_session_checkpoint` 的提示频率和 UI 形态怎样设计。
- 被拒绝的 promotion candidate 冷却多久后才允许重新出现。
- 已确认习惯继续出现时，是否只追加 evidence / confidence，不再打扰用户。
- promotion proposal 是否需要单独的 UI 分组，例如“建议提升作用域”。
- 用户是否可以为不同层级设置自动化等级，例如“局部自动、项目询问、全局必须确认”。
- 用户主导快通道已经有 v1 UI 和字段：当前长期 proposal 和 active scratch 入库时应展示 `task_scope / artifact / initiative / subject / global` 五层候选，proposal 使用 `scope_choice.selected` 记录用户最终选择；后续仍需补充风险提示、自然语言“只这次”映射、可撤销操作，以及把 `artifact` direct promote 的后端落库与索引链路补齐。
- v1 已支持“反证触发收窄/更新 proposal”；后续是否需要更完整的自动 demotion 策略与回滚策略。
- v1 在 proposal 上保留 `relations[]` 来源边；habit graph 的独立关系表、版本模型、redirect / tombstone schema 仍需最小实现。
- 是否需要完整 promotion audit log，让用户看到一条高层习惯是从哪些 session 和 task 中逐步上卷来的。
- `scope matching`、`scope read`、`scope promotion` 三类 prompt 的 exact wording 是否需要单独版本化、测试和评估。
- 已拍板并落地：当前 session 中用户明确表达的新局部习惯先进入 session scratch 区；高置信直接 active，低置信 pending 等待用户确认生效；用户后续决定是否把 active scratch 写入独立习惯库。后续仍需调优具体捕获阈值和 conflict UI 节奏。

### Q1d. 五层作用域是否需要用户说明文件和 v1 简化显示？

问题描述：

- `global / subject / initiative / task_scope / artifact` 五层长期记录对实现很有价值，但普通用户可能不清楚每层的作用范围。
- 如果 UI 直接要求用户理解每个层级，可能会造成困惑。
- 如果 v1 为了简单只暴露少数层级，未来再迁移到完整五层时，可能需要重新扫描和重分配已有习惯。

已明确的方向：

- 内部 schema 可以保留完整五层，避免未来迁移时丢失结构信息。
- UI 不一定要把五个英文层级全部暴露给用户。
- 用户不应被迫为每条 signal 手动选择层级。
- `scope matching` 和 `scope read` 应尽量由系统自动完成，只在低置信度或冲突时询问。
- `scope promotion` 在扩大长期影响范围或改变默认行动方式时才需要用户确认。

仍需继续判断：

- 是否新增一份面向用户的简明说明文件，解释五层分别是什么、什么时候生效、用户需要关心什么。
- 是否进一步把用户主 UI 压缩成三类自然语言区域，例如“全局习惯 / 当前项目或任务 / 当前文件规则”，内部仍保留五层。
- proposal 中是否应避免让用户选择 `global / subject / initiative / task_scope / artifact`，改成让用户选择“只这次 / 当前任务 / 当前项目 / 这个主题 / 所有类似情况”。
- 是否需要一个“为什么这条习惯放在这里”的可解释卡片。
- 如果未来发现层级分配错误，是否通过 demotion / promotion proposal 修正，而不是全量重新扫描。

### Q1e. Scope matching 怎样避免长期习惯平铺扫描？

问题描述：

- 长期使用后，习惯数量会越来越多。
- 每次 query-time matching 不可能浏览所有习惯。
- 五层作用域提供了主结构，但单靠树结构不够，因为同层习惯、跨层 policy、artifact_contract 和 workflow habit 会互相影响。

已经明确：

- 习惯库五层不是树状父子结构，而是 `global / subject / initiative / task_scope / artifact` 五个平行 scope 标签。
- Aether 工作区和习惯库是两个概念上不连通的区域；Aether 全局 / project / session 的习惯记录文档只保存对习惯库的引用。
- 当前 session 的 `habit_ids` / session habit record 在当前代码中表示 imported confirmed 集合；当前运行时已经进一步扩展为 `imported habits + scratch active habits` 两部分。
- global / subject / initiative / task_scope / artifact 习惯都不能仅因层级或绑定而强制进入当前 session，必须经过 matching / 引用。
- v1 不重点参考其他 Aether project / initiative 的习惯记录；同 initiative 的 reference 和同 initiative session refs 可以作为强参考（initiative 归属由路由 classifier 决定，不由 project 绑定推导）。
- `relation graph` 是需要的习惯库结构，但它是候选扩展和审计层，不是真源。
- graph 邻居只是候选，不能直接作为 active habit 注入当前 session。
- 五层 scope 是查询主先验，graph topology 是辅助；习惯匹配不能只看图上距离。
- 冲突审计需要优先实现；完整 explain/path 用户解释能力可以后置。

当前建议：

- 引入渐进披露检索机制。
- 引入派生的 `scope map / habit index / reference index`，类似 IPK map 的思想，但面向习惯和策略路由。
- 参考 `llm-wiki.md` 的经验：不要每次 query 都回到原始材料重做检索，而是维护持久结构层、index 和 summary，query 时先找入口再 drill down。
- 参考 Graphify 的经验：把 `habit-graph.json`、`habit-report.md`、habit wiki、query/path/explain 工具都视为可重建的导航和解释层，而不是长期习惯真源。
- Graphify 的 `EXTRACTED / INFERRED / AMBIGUOUS` 思路可迁移为习惯关系的确认状态；推断边只能帮助匹配或生成 proposal，不能静默扩大高影响习惯的生效范围。
- Workflow habit 应允许 hyperedge / bundle 表达多条习惯共同构成的流程，而不是只靠两两边。
- map traversal 不应固定从 `global` 根节点全量深搜，而应从当前 session、当前 project、subject block、request type 或 artifact path 等最强入口进入，再按需横向展开少量邻近节点。
- query-time matching 先查绑定、path index、trigger index、scope map 和 habit surface，再按需读取 top K full records。
- 原始 evidence 只在审计、解释、proposal review 或冲突处理时读取。
- query-time 应先生成 scope activation，再用 relation graph 扩展候选；扩展出的候选必须重新经过 scope fit、conflict、suppression 和 impact gate。

v1 已实现：

- `scope-map.json`
- `habit-index.jsonl`
- `trigger-index.json`
- `path-index.json`
- `subject-index.json`
- `task-scope-index.json`
- `conflict-index.json`
- 每条习惯的 `habit surface`

这些索引都是派生层，不是长期习惯真源。

v1 尚未实现但可作为后续最小增强：

- `reference-index.json`
  用于更完整地记录 session / project / artifact / habit 之间的引用关系。

vNext 可考虑：

- `habit-graph.json`
  保存 confirmed habits、reference nodes、relations、confidence、source refs 和 community id。
- `habit-report.md`
  生成一页式结构摘要，列出高中心性习惯、workflow bundle、冲突、薄弱连接和待审计关系。
- `habit-wiki/index.md`
  面向人管理的 community / god habit 页面，方便用户浏览和调整习惯库。
- `habit-query / habit-path / habit-explain`
  用于调试和用户解释，不把整张图塞进 prompt。

仍需继续决定：

- relation edge、`reference-index.json` 和 Aether reference docs 的精确 schema。
- `habit surface` v1 已作为 `habit-index.jsonl` 派生记录落地；后续仍需决定是否再生成独立 surface 文件或人类可读 mirror。
- 是否使用 embedding / vector search，还是 v1 只用结构化标签和轻量语义 rerank。
- top K 默认值。
- traversal 停止条件、横向展开宽度、向上/向下展开优先级。
- trigger taxonomy 如何设计。
- relation graph 已确认为需要的结构；仍需决定它在 v1 / v1.1 的最小落地范围，以及是否先以 `conflict-index.json + habit-relations.jsonl` 起步，再生成完整 `habit-graph.json`。
- community detection / topology clustering 是否只作为离线建议，而不参与实时匹配排序。
- 使用记录和用户纠正如何影响排序。
- 是否需要类似 IPK 的可视化习惯地图，还是先只做机器可用地图。

### Q2. `scope` 的概念是否需要在 UI 中更清楚地解释？

`scope` 表示一条习惯、原则、任务状态或产物规则“适用于哪里”。

当前至少包括：

- `global`
  适用于用户整体。
- `subject`
  适用于某个学科或主题。
- `task_scope`
  适用于某个长期任务。
- `artifact`
  适用于某个具体输出产物。
- `session`
  只适用于当前对话。

已落地的 v1：

- UI 已经在主要审查入口中使用“全局 / 该主题 / 当前长期事项 / 当前任务 / 当前文件规则 / 仅本次对话”等中文标签。
- 底层实现仍需要一个 runtime carrier 来表达 `session` 级对象，但它不属于习惯库五层。面向习惯库的正式 scope schema 仍应只保留 `global / subject / initiative / task_scope / artifact`。

需要继续判断：

- 高级调试视图是否还允许显示英文层级名。
- 是否新增一份面向用户的简明说明文件，解释这些层级什么时候生效、用户需要关心什么。
- 新 AI 实现指南中是否应强制解释这些层级。

### Q3. session 或行动框与 `task_scope` 的绑定应该怎样发生？

这里的“绑定”是指：

- 当前对话框或行动框属于哪个长期任务。
- 当前产生的 signals 应写入哪个任务层。
- 当前回答前应读取哪个任务层记录。

仍需决定：

- 是否由用户手动选择当前任务。
- 是否由 AI 推荐候选任务后让用户确认。
- 是否允许 AI 静默自动绑定。
- 是否允许一个 session 同时绑定多个 scope。

当前倾向：

- 第一版运行时可以在 context compiler 中进行轻量 task_scope matching，但长期绑定仍应通过确认或已存在 binding 处理。
- 当系统不确定时，展示候选，让用户确认。
- binding 是复杂核心问题，应继续深入解释和设计。
- v1 已先做轻量推荐 / 匹配，不急着做高度自动化绑定。

### Q4. 多个 scope 命中时怎样精简？

用户倾向认为这里需要精简，但尚未最终确定。

需要继续判断：

- v1 已采用一个 primary `task_scope`，schema 预留 secondary scopes；后续是否真正启用 secondary scope。
- v1 已允许附带 subject / artifact 集合；后续是否允许多个 task_scope 同时参与运行时。
- context compiler v1 已只读取和裁剪最相关的少数记录；后续继续调优每层读取数量和预算。
- UI 已展示本轮使用的 context sections；后续是否单独展示“命中 scope 图”或更完整解释。

## 2. 行为提取时机与更新机制

### Q5. AI 应该什么时候提取用户习惯？

当前可能有四种方式：

- 实时轻量记录
  在对话或行动发生时，记录很明确的信号。
- 会话后集中提取
  在一个对话框或行动框结束后，读取本轮用户要求、AI 操作、文件变化和工具轨迹，提取 signals、task 状态和 proposal。
- 周期性窗口总结
  在一段时间或多次相关会话后，对 signals 做 summary window 压缩，形成更稳定趋势。
- 用户显式命令整理
  用户说“整理一下我的习惯”或“更新用户画像”时，系统主动汇总并给出可审阅结果。

已拍板的 v1 方向：

- 第一版先搭框架，不追求行为提取 prompt 的极致质量。
- 第一版至少支持用户消息后自动提取和用户显式整理。
- Web UI 已提供“整理当前对话”入口。
- 当前 v1 的自动提取直接证据只读取当前 session 的用户消息；assistant 文本不作为 habit 证据落盘。
- 提取器维护 `session_id + message_id` 级 processed 索引；自动提取和手动整理只处理尚未处理过的对话消息，避免同一条消息被每轮响应重复提取。
- 当前 session 的主即时链路已经重新明确为：`用户消息 -> session scratch capture -> active/pending -> 当前 session 生效集合`。`signal / summary / proposal` 不应再被当作 scratch 进入当前 session 的前置门槛。
- session scratch 捕获已经接入自动提取链路和手动整理链路；高置信默认 active，低置信默认 pending。这里的 `active/pending` 指运行时是否生效，不等于置信度字段本身。
- signal / summary / proposal 这条慢链路的当前定位，已调整为后续分析与维护：提醒用户把高频或跨 session 生效的 scratch 保存为正式习惯，以及根据正式习惯的命中情况给出 rescope / 提升 / 收窄建议。
- 周期性窗口总结可作为第一版后半段或 vNext。
- 从用户发言中提取习惯必须完全依赖 LLM 语义分类结果；不得再使用硬编码 regex、关键词列表或二次 gate。LLM 不可用时跳过并等待后续重试。

仍需继续判断：

- 在直接证据只认用户消息的前提下，如何把“用户同意 assistant 提议”稳定识别成用户确认，而不是错误依赖 assistant 复述文本。
- 已进一步收敛：v1 先不实现 regex / 关键词线索层，继续保持用户习惯提取为 LLM-only。后续如果要接入，regex / 关键词线索也只能作为参考层或兜底触发层，例如把消息放入“必须触发 LLM 复核 / 等待模型恢复后优先重试”的队列；但它们不能直接产出 scratch、signal 或 processed 标记，也不能绕过 LLM 结构化输出。
- signal 到底应保持为独立对象，还是主要作为 scratch / confirmed habit 的派生分析记录；以及二者各自需要哪些字段和索引。
- “重复 scratch / 多 session active / confirmed habit trigger history”分别应记录成什么 event，对 summary 和 proposal 的输入边界怎么定。
- 慢链路整体设计之后必须继续专题讨论；当前先以快链路为工程基础，不急于把 signal / summary / proposal 的最终职责一次定死。
- session 内 scratch 合并系统的最新设计草案已放入 [new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md)。其中已落地部分包括：多 candidate 提取、imported overlap hit event、imported conflict batch review、scratch comparator 与 merge matrix、`superseded` 展示但不注入、evidence message jump、prompt 中“当前用户要求优先”规则。当前仍保留为开放问题的，只剩 active/pending 判定细则、全量 imported 比较的成本反馈，以及 hit event 如何继续服务作用范围与置信度升降。
- 用户是否可以选择偏好的更新方式。
- 用户消息后自动提取和 summary window 的长期分工如何继续调优。

### Q5a. 什么时候接入文件改动、工具操作和更广证据来源？

当前 v1 已经拍板：

- 自动提取先只看当前 session 的用户消息；assistant 文本不作为 habit 证据。
- 文件改动、工具操作、目录/路径轨迹和更广证据来源不在 v1 默认接入范围内。

后续仍需继续判断：

- 文件改动应进入哪条证据链：signal、summary、proposal 还是单独的 artifact / operation audit。
- 工具调用与命令轨迹怎样避免把“AI 自己的临时操作”误当成用户长期习惯。
- 更广证据来源接入后，如何保持证据可解释、可回滚、可让用户确认。
- 不同证据来源的权重是否应区分，例如“用户明确说的话”高于“AI 执行过一次的动作”。

### Q6. `summary window` 的窗口策略是什么？

`summary window` 是把一段时间内的多个 signals 进行阶段性压缩的机制。

它的作用是：

- 避免每条 signal 都直接改写长期记录。
- 把零散证据合成趋势。
- 判断哪些趋势值得进入 profile、policy 或 proposal。
- 降低长期记录噪音。

已拍板的 v1 默认：

- 自动模式下，满足以下任一条件触发：
  - 同 scope 新增 signals 达到 3 条
  - 存在高影响且显式的信号
- 支持用户手动触发“整理当前对话”。
- summary 结果用于 proposal candidate 与审计，不直接改长期真源。

仍需决定：

- 是否增加按天/按周的周期性窗口。
- 是否允许用户自定义窗口阈值。
- summary 结果在 UI 中的最佳审阅粒度。

后续候选：

- 已落地：同 scope 新增 signals 达到 3 条，或存在高影响且显式的信号。
- 已落地：用户手动触发。
- vNext 候选：每 7 天或每若干相关 session 的周期性窗口。
- vNext 候选：用户自定义窗口阈值。

### Q6a. 重复 signal、用户确认和打扰频率如何平衡？

问题描述：

- 多次提取到相同 signal，说明它可能是稳定习惯。
- 但如果每次都让用户确认，会很烦。
- 如果用户明确确认一次，即使只有一次 signal，也可能应进入长期习惯。
- 如果没有确认，单次 signal 不应轻易变成高影响长期默认行为。

需要继续判断：

- 已确认习惯之后，再出现相同 signal 的加权上限与衰减规则。
- 是否提供用户可配置的“静默累积 / 批量确认”模式。
- 不同层级（task_scope/initiative/subject/global）的提醒频率是否应区分。

已落地的 v1 去重边界：

- 同一条 `message_id` 不会被自动提取和手动整理重复处理。
- 这只解决“同一聊天消息被多轮扫描造成重复 signal”的问题；用户未来在新消息中再次表达同一习惯，仍会作为新证据进入慢通道或 proposal merge。
- 同一 session 内 scratch habit 会查重合并；不同 session 间相似 scratch 只提示出现次数，不自动合并。
- active scratch 入库时，用户可选择把其他 session 中相似 scratch 标记为已处理。

当前 v1 建议：

- 高影响内容第一次出现时可以生成 proposal，但不强制立刻弹窗。
- 同类 proposal 可以合并。
- 用户确认后进入 confirmed record，后续同类 signal 只更新 evidence / confidence。
- 未确认时，重复信号达到阈值后再集中提示。
- 打扰频率需要在 v1 使用后根据体验调整。

当前已确认方向：

- 同类 proposal 合并非常重要。
- proposal 应进入待处理队列，让用户统一处理。
- proposal 不应一出现就立刻写入长期记录。
- proposal 不应默认一出现就打断用户。

仍需在 v1 体验后调整：

- proposal 合并的语义阈值。
- pending proposal 的提醒频率。
- 用户统一处理 proposal 的 UI 形态。
- 被拒绝 proposal 的冷却时间。
- 暂缓 proposal 何时再次出现。
- scratch 相似判断阈值和提示文案。

## 3. Proposal、确认和高影响行为

### Q7. 哪些内容必须走 proposal？

当前已同意的大原则是：

- 会改变未来默认行动方式的内容，应走 proposal。
- 只影响轻微交流风格的内容，不一定立即确认。

仍需继续完善一个普适判断标准：

- 文件写入、工具选择、自动联动、工作流默认值是否一律高影响。
- 学科解释方式的大幅变化是否高影响。
- 用户长期价值判断或思维模式推断是否高影响。
- 什么情况可以静默进入低影响 profile。

### Q8. 确认 proposal 时展示到什么粒度？

当前倾向是确认时展示：

- 证据。
- 写入目标。
- 字段变化。
- 未来影响。

已落地的 v1：

- proposal inbox 已展示证据、建议作用域 / 写入目标、未来影响。
- 确认时可以选择或覆盖作用域，系统记录 `scope_choice.selected`。
- session review proposal 可以确认加入或移出当前 session habit。

仍需决定：

- 是否展示 JSON patch。
- 是否展示人类可读 diff。
- 是否允许用户编辑 proposal 文本。
- 是否允许“一次确认多条 proposal”。

当前倾向：

- 应允许一次处理多条 proposal。
- 应提供 pending proposal 队列或 inbox。
- 每条 proposal 在确认前都要展示证据、写入目标和未来影响。
- 同类 proposal 应先合并再进入用户审阅。

### Q8a. Proposal inbox 应该怎样设计？

当前已确认需要统一处理 proposal，但 UI 细节仍需在 v1 体验后调整。

已落地的 v1：

- Web UI 已有统一 `习惯审查` 入口。
- 入口分为 `审查暂存习惯`、`正式习惯审查`、`当前 session 建议` 三个分区。
- 正式 proposal 按影响级别和更新时间排序。
- session review gate 已复用 proposal inbox，不直接静默改 `habit_ids`。

需要继续判断：

- 是否还需要把 proposal inbox 复制到 session 侧栏或右侧 rail，还是保留当前菜单入口即可。
- 是否进一步按 scope 分组展示。
- 是否支持批量确认、批量拒绝、批量暂缓。
- 是否在确认前展示人类可读 diff 或 JSON patch。
- 是否允许用户把多条 proposal 手动合并或拆开。

当前倾向：

- 第一版统一 pending proposal 列表已落地。
- 不建议每条 proposal 都即时弹窗。
- 高影响 proposal 可以在当前 session 中给轻提示，但最终仍进入统一处理队列。

## 4. Artifact 与写入安全

### Q9. `artifact_contract`、`bundle`、`partner_artifacts` 应怎样解释和实现？

`artifact_contract` 表示某个产物应该怎么写、写到哪里、怎样更新。

例子：

- 某份总结文档应写到哪个 markdown 文件。
- 某个 LaTeX 文件不能改哪些区域。
- 更新 overview 时是否也要检查 details。

`bundle` 表示一组需要一起维护的产物。

`partner_artifacts` 表示和当前产物成对或成组联动的其他产物。

仍需决定：

- 第一版是否需要 bundle。
- 是否只支持 markdown。
- 是否支持 LaTeX。
- 是否允许自动识别 protected regions。
- artifact contract 是用户手动绑定，还是 AI 从文件操作中提议绑定。

### Q10. 产物写入确认应该怎样做？

需要继续判断：

- 首次写入是否必须预览。
- 已确认 artifact contract 后，是否可减少确认次数。
- 修改用户文件和修改私有 adaptation 记录是否走不同权限。
- 如果 artifact path 被重命名或删除，系统如何发现。

当前倾向：

- 私有 adaptation 记录可静默更新。
- 用户文件写入必须复用 Aether 现有权限与确认机制。
- 首次 artifact 绑定必须预览和确认。

## 5. Context Compiler 与运行时应用

### Q11. `context compiler` 应该怎样裁剪和注入长期记录？

`context compiler` 是运行时模块。

它负责：

- 判断当前请求属于什么类型。
- 判断当前最相关的 subject、task_scope 和 artifact。
- 读取少量长期记录。
- 按优先级裁剪。
- 编译成短小的 `context_packet`。
- 放进模型上下文，影响回答和行动。

已落地的 v1：

- v1 已在每次模型请求前运行 context compiler；后续只需调优节流和复用策略。
- v1 默认预算为 `max_sections=8`、`max_chars=4000`；后续仍需根据真实使用调参。
- v1 已采用裁剪优先级和 scratch/imported/current scope 规则；后续仍需调优各层级排序。
- v1 已在 UI 中显示“本次使用了哪些习惯记录”；`context_packet sections` 保留给高级调试细节，不应继续作为普通用户主视图的主要内容。
- v1 编译失败时不会阻塞主聊天；后续是否需要更明显的错误提示仍可调优。
- v1 同时生成给模型看的摘要和给用户检查的 current context 视图；后续可继续优化解释格式。

用户关切：

- context compiler 可能读取太多内容。
- 它应像一个轻量总结助手，只在当前请求相关时，把之前相关的习惯和记录整理出来。

当前倾向：

- 第一版已经严格限制读取数量和 token 预算。
- 每次模型请求前已经轻量运行 `scope matching` + `scope read`，但不必每次都更新长期真源。
- project / worktree / artifact / task_scope binding / proposal confirmation / 长期记录写入等事件应触发 context dirty，并在下一轮请求前重新编译。
- 优先读取当前 task_scope、当前 artifact、明确相关 subject。
- global_guidance 只在非常稳定且确认过时读取。
- 可在 UI 中提供“本次使用的习惯记录摘要”，方便用户检查。

机制说明：

- `scope matching`、`scope read`、`scope promotion` 的 v1 prompt contract、触发时机、路径和失败处理集中记录在 [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)。

仍需调优：

- prompt exact wording。
- 默认 token budget。
- 每层最多读取多少条记录。
- context_packet 的 UI 可解释格式。
- context dirty flag 的精确触发集合和节流策略。
- 哪些连续请求可以复用上一轮 matching 结果，哪些必须强制重新 matching。

## 6. UI 与用户审阅

### Q12. Web UI 入口应该怎样设计？

当前候选设计包括：

- session 侧栏 tab
  展示当前任务、当前理解、待确认 proposal、artifact 绑定。
- 右侧 rail 菜单
  展示全局 proposal 列表、历史 task scopes、设置入口。
- 当前对话内 inline card
  当高影响 proposal 出现时，直接在会话中提示确认。

已落地：

- 第一版已有一个用户自适应入口。
- 用户可以看到当前 context packet 摘要、整理当前对话习惯，并检查当前区域对应的用户习惯记录。
- 在当前 session 中确认 proposal 后，系统会立即刷新 session binding 和 context packet 快照，使新习惯立刻出现在当前习惯视图中。
- 当前习惯视图按 session binding、matching 和 scratch active 集合过滤：已经引入当前 session 的 imported habits 与当前 session scratch active habits 可见；global / subject / initiative / task_scope / artifact 习惯都不因层级或绑定本身自动进入所有 session。
- 顶部已有 `暂存习惯` 按钮，左侧入口已改为 `习惯审查`。
- `习惯审查` 已分成 `审查暂存习惯`、`正式习惯审查`、`当前 session 建议`。
- `当前 Session 习惯` 视图已拆分为 imported confirmed habits 与 session-local scratch habits。
- pending scratch 会在当前 session 暂存区可见，但不会注入上下文，也不会进入入库审查。

仍需判断：

- proposal 后续是否还需要 inline card 形态，或继续保留弹窗/菜单为主。
- 是否需要另做“项目习惯管理”视图，用于浏览同一 project 下所有历史 task_scope 的规则。
- 当前习惯入口是否需要进一步拆分为“本轮已注入 / 当前范围已确认 / 跨层可用”三个高级视图；v1 当前先提供 imported/scratch 两组，必要时再补充高级调试详情。
- session review gate 的触发节奏：每条用户消息都静默入队、按若干新消息批量提醒，还是在用户消息后的短窗口里合并提醒。
- 对“建议移出当前 session habit”的文案、风险提示和撤销机制如何设计，避免用户误删。
- `suggest_keep_attention`、`suggest_replace`、`suggest_rescope` 何时从 schema 预留升级为真正启用的运行时动作。
- scratch 自动捕获边界的 v1 决策已经落地：高置信直接 active 并生效，低置信进入 pending scratch，不注入上下文、不进入入库审查；后续仍可继续调优具体 classifier 和阈值。
- imported habit 被 scratch 覆盖后，当前已采用“顶部提醒 + 审查入口异步处理”的方案；高影响冲突是否升级为更强提示留到 vNext。
- scratch 入库后的跨 session 重复项处理已经落地为用户可选动作：审查界面显示相似出现次数，用户可一键把其他 session 中相似 scratch 标记为已处理；后续仍可调优相似度阈值和说明文案。
- `整理当前对话` 按钮在默认 `after_user_message` 自动提取已经存在后的定位是否需要收窄：它现在仍有价值，因为可用于一次性补跑当前 session 中尚未 processed 的多条旧消息；但它是否继续作为用户主入口、还是逐步退成“手动补跑 / 调试入口”，仍待决定。
- 某条消息在结构化提取中重跑耗尽后，当前不会自动进入后台恢复队列；它会保持未 processed，并等待后续显式提取机会。后续需要决定：是继续只依赖手动“整理当前对话”补跑，还是增加自动恢复队列 / 定时重试 / 用户提醒。
- `signal` 当前仍保留，但已退到慢链路维护层，不再作为 scratch 进入当前 session 生效集合的前置门槛。后续仍需继续讨论它在 v1 之后的角色边界：是继续服务 summary / proposal / promotion，还是进一步收缩成纯维护事件。

当前倾向：

- 类似 IPK 库的管理入口可以先确定为大方向。
- 每个 session / project 应有便捷入口查看当前生效的 adaptation 记录。
- UI 具体形态已经有 v1 闭环，后续根据使用体验继续调整。

## 7. Subject、全局画像和文档写法

### Q13. `subject_profile` 的 ID 和写法是否需要限制？

`subject_profile` 是某个学科或主题内的用户知识坐标。

已落地的 v1：

- v1 已使用自由字符串加 slug 规范化；vNext 是否改为受控词表或半受控词表。

仍需决定：

- 是否需要每个 subject 都有固定 markdown 写法。
- 是否限制每层用户习惯记录文档的结构。
- 是否允许 AI 自动新增 subject。

当前倾向：

- 第一版已使用自由字符串加 slug 规范化。
- 记录文档应有稳定模板，但不要让用户手工维护 JSON。

### Q14. `global_guidance` 在 v1 中做到什么程度？

`global_guidance` 是 Aether 工作区 global 侧的轻量背景 + refs 文件，用来在 query time 给 session 提供跨项目、跨任务的候选缩圈参考；它不是习惯正文真源。

已拍板：

- 第一版可以实现 `global_guidance` 的最小存储对象。
- 所有写入 `global_guidance` 的内容都必须经过用户确认。
- `global_guidance` 更新策略应是全系统最保守的一层。
- v1 中 proposal / active scratch 入库时，如果用户明确选择 `global` 作用域，可以在这一次确认后写入 global 层；不再额外要求第二次确认。

仍需继续判断：

- v1 UI 是否只允许查看，不提供主动编辑入口。
- v1 是否提供“用户显式整理全局画像”的命令或按钮。
- global 级习惯是否需要更强风险提示和撤销入口。
- `global_guidance` 的 Markdown 审阅镜像应展示到什么粒度。
- task_scope / initiative / subject 习惯何时才有资格进入 global proposal。

## 8. 与 IPK 内容系统的联动

### Q15. 用户自适应系统需要从 IPK 获得什么信息？

可能需要的信息包括：

- 与当前 task_scope 相关的 `piece` 摘要。
- 某个 subject 下用户已经积累的知识内容。
- 某个任务过去沉淀过的计划、反思或讨论。
- 可作为解释起点的已知 anchor。

仍需决定：

- 第一版是否只保存 `linked_pieces`。
- context compiler 是否读取 piece surface。
- 是否允许 adaptation 自动搜索 IPK。
- 是否避免把 piece 正文复制进 adaptation 记录。

当前倾向：

- 第一版只做轻量只读联动。
- adaptation 不重复存 IPK 正文。

## 9. 存储方式调研

### Q16. 存储根已经拍板后，还有哪些实现细节需要讨论？

核心真源位置已经拍板：

- `IPK` 真源通过 `MemoryPath.ipkRoot()` 获取。
- 用户自适应真源通过 `MemoryPath.adaptationRoot()` 获取。
- session db 只保存绑定、引用、快照和过程数据。
- 第一版不默认把长期 adaptation 真源写入项目目录。
- 第一版 `MemoryRootResolver` 采用默认平台路径 + 环境变量覆盖。
- 第一版不做 memory root UI 设置入口。
- 环境变量名、memory namespace、产品名通过 `AppIdentity` / resolver 集中管理；当前实现使用 `<ENV_PREFIX>_MEMORY_HOME` 作为 memory root 覆盖变量。
- 旧路径导入只能 copy，不 move、不 delete。
- 新旧 root 都有数据时不自动合并。
- 第一版不导出、不同步到 `.opencode/adaptation/` 或 `.aether/adaptation/`。

仍需调研：

- Codex 怎样保存 AGENTS、skills、长期行为指南。
- OpenCode 怎样保存项目配置、session、全局数据和本地资料。
- 其他 agent 工具怎样区分全局用户偏好、项目规则和会话状态。

仍需进一步讨论：

- `AppIdentity` 的准确来源：build define、运行时 manifest、package metadata，还是几者组合。
- 最终环境变量命名规则，以及是否兼容旧环境变量名；当前 `<ENV_PREFIX>_MEMORY_HOME` 是否应长期固定也要确认。
- 默认平台 namespace 怎样命名，才能避免与现有 opencode 数据目录冲突。
- `global-guidance.json` / `project-guidance.json` / `initiative-profile.json` / `initiative-policy.json` 的 v1 最小结构已经拍板；其中 `global_guidance` / `project_guidance` 现在统一按“轻量背景 + refs”理解；后续需要评估是否扩展字段、加入继承解释和冲突可视化。
- 当前 v1 已采用保守的“小 profile 缩小范围”规则：先读显式 binding / matcher，再把 `project_guidance + global_guidance` 作为 guidance 缩小候选范围。后续仍需评估是否增加更显式的轻量 map 层，以及它与现有 profile/index 的职责边界。
- 如果未来确实需要 project 级执行 guidance，是否应新增独立 project-local guide 对象，还是继续只依赖 `project_guidance + 轻量 map/index`。
- 长期 proposal / active scratch 入库时，系统虽然已倾向于让用户只选 `scope level`，再由 routing/classifier 决定具体 bucket，但“系统如何选择 bucket、何时允许自动新建 bucket、低置信度时如何解释或回退”仍需专门设计。
- `artifact` 当前在实现上更像 target contract / 文件规则对象，而不像其他四层那样已经成为完全同构的普通 habit scope。是否保留它为五层之一、是否只让它承载 `artifact_contract`、以及它与 profile/policy/workflow skill 的边界，仍需单独拍板。
- policy 覆盖顺序已经拍板为 `artifact > task_scope > initiative_policy > subject > global`；后续需要评估 UI 是否展示覆盖原因和被覆盖规则。
- 各类 Markdown 审阅镜像的最终模板格式。
- 当前 Codex 中，项目规划沉淀规则应放在 repo `AGENTS.md`、单独 skill，还是两者配合；未来 Aether 是否需要把这类规则提升为 `workflow_profile`。
- 通用项目规划沉淀规则是否应支持“如果当前项目没有 open-questions 文件，就先询问用户放在哪里，再新建并维护”的标准流程。
- 如果在 Codex 中实现这种规则，是放在 repo `AGENTS.md`、用户级 skill、项目级 skill，还是三者分工；如果在 Aether 中实现，是否应作为 `workflow_profile` 的默认能力。
- 旧路径导入 UX：首次启动弹窗、CLI 命令、设置页入口，还是手动导入命令。
- `manifest.json` 的 schema、版本号、导入记录字段和校验规则。
- 当新旧两个库都有数据时，是否需要单独的冲突导入工具。
- 未来 pointer 文件的最小字段，例如 root id、project id、scope id、只读/可写标记。
- 未来显式导出格式：JSON、Markdown，还是两者都要。
- 双向同步是否应永久禁止，还是在很晚的版本重新评估。
- 如果 `/docs/IPK` 继续作为交接真源，是否应移出 `.git/info/exclude` 并进入 git 跟踪；如果不进入 git，需要什么等价备份和交付机制。

## 10. vNext 路线图

### Q17. `open-questions` 是否作为下版本指南？

当前倾向是：

- 是。

这份文件不仅记录问题，也应记录：

- 为什么现在不做。
- 做它需要先满足什么前置条件。
- 它适合进入哪个阶段或哪个版本。
- 后续调研完成后的推荐结论。

因此，后续每次拍板后都应该：

- 从本文件移除或收敛对应 open question。
- 把已定事项写入 `implementation-decisions`。
- 如果已经进入执行阶段，再同步更新 implementation guide。

### Q18. implementation guide 生成后，哪些事项仍需在实现中验证？

正式分步实施指南已经生成：

- [user-adaptation-v1-implementation-guide/README.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/README.zh-CN.md)

原先“生成正式 implementation guide 前还需要钉牢哪些工程细节”已经收敛进 guide，不再作为开放问题保留。

仍需在实现过程中验证和可能调优的是：

- guide 中推荐的 endpoint 已和 Aether 现有 route / session 数据结构完成 v1 对接；后续只需根据 UI 体验继续整理命名。
- `adaptation_project_id` v1 已采用混合策略：优先使用现有 Aether project id，缺失时回退 worktree hash；后续继续观察跨 worktree / remote workspace 稳定性。
- session db 绑定字段 v1 已采用独立 adaptation binding 记录，并镜像到 adaptation binding 文件；不直接塞进长期真源。
- prompt contract 放在代码常量、模板文件或配置中，哪种更适合当前 Aether 工程结构。
- guidance 维护阈值、proposal merge 去重与重复候选降噪之间如何配合，是否需要后续测试调参与 A/B 验证。
- proposal inbox 的第一版 UI 是否足够好用，是否需要增加批量确认和分组。
- index rebuild 是否在实际数据规模下足够快。
- Markdown 镜像模板是否足够清楚，是否需要更好的用户说明。
- baseline fixtures 是否覆盖足够多的真实使用场景。
