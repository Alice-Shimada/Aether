# 用户自适应系统：Aether 集成设计（更新版）

这份文档专门讨论：

- 这套系统怎样嵌入当前 Aether
- 当前 Aether 哪些部分适合复用
- 当前 Aether 哪些设计和这套系统有命名或职责冲突
- 如果要做这套功能，哪些重构是值得的

## 1. 当前最重要的工程结论

从 Aether 当前实现出发，这套系统是可嵌入的。  
但不能把它简单塞进：

- 当前 `knowledge`
- 当前 `workspace`

最稳妥的方向是：

- 复用现有 session、prompt、summary、event、project 基础设施
- 新增独立的 `task_scope`、`artifact`、`adaptation`、`context compiler` 模块
- 让这些模块同时服务回答策略与操作策略

## 2. 当前适合复用的现有结构

### 2.1 `SessionPrompt.prompt()` 是天然的上下文注入点

真正影响回答的层，应在进入模型前注入。  
当前最自然的位置仍然是：

- `packages/opencode/src/session/prompt.ts`

未来推荐在这里调用内部 `context compiler`，统一生成：

- global notes
- subject notes
- task scope notes
- artifact contract notes
- operation notes

而不是继续零散拼接。

### 2.2 `SessionSummary.summarize()` 是天然的会话后提取点

当前 Aether 已经有会话后 summary 流程。  
这非常适合承接：

- signal extraction
- summary generation
- proposal generation
- promotion candidate generation
- 工作习惯与工具选择证据提取

### 2.3 `GlobalBus / SSE / global-sync` 适合承接更新通知

这套系统后续会有很多更新事件，例如：

- proposal created
- proposal merged
- proposal confirmed
- proposal deferred
- proposal rejected
- promotion proposal created
- promotion proposal confirmed
- task scope updated
- artifact contract updated
- subject profile updated

当前事件流结构足够承接这一层。

### 2.4 project / directory / session 基础结构很有价值

当前 Aether 已经能稳定处理：

- project
- directory
- worktree
- session

这些都是这套系统的重要上下文边界。

## 3. 当前最需要避免的误用

## 3.1 不要把新对象继续叫 `workspace`

这是当前最需要明确说清的一点。

原因不是抽象，而是当前 Aether 里已经有两套和 `workspace` 非常接近的概念：

- UI / worktree 语义下的 workspace
- control-plane / remote workspace 语义

如果这次新加的“逻辑任务空间”继续叫 `workspace`，以后会极易混乱。

当前最推荐的代码命名是：

- `task_scope`

UI 可以继续用“工作区”“任务区”这类词，但代码和 schema 最好明确区分。

## 3.2 不要把这套系统塞进当前 knowledge

当前 knowledge 更像：

- 文档索引
- RAG 材料层

它不适合直接承担：

- 高影响 proposal
- task scope 状态
- artifact contract
- 用户 / 学科分层 profile
- 工作顺序与工具偏好策略

它仍然可以作为材料层复用，但不应成为这套系统的主对象容器。

## 4. 推荐的后端模块拆分

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

## 5. 推荐的职责划分

### `adaptation/`

负责：

- signals
- summaries
- proposals
- proposal merge / deduplicate
- scope promotion candidate
- pending proposal queue
- global / subject profiles
- policies

### `task-scope/`

负责：

- 逻辑任务对象
- session 到 scope 的绑定
- scope 状态汇总
- scope 级 open questions / decisions / done items
- 任务级工作流习惯与资源偏好

### `artifact/`

负责：

- artifact contract
- 文件写入策略
- 锚点定位
- 输出格式约束
- 成对 artifact 或成组 artifact 的更新关系

### `context/`

负责：

- query time 的上下文编译
- 各层记录的优先级与裁剪
- 回答策略与操作策略的最终拼装

## 6. 推荐的路由方向

第一版建议新增独立命名空间：

```text
/adaptation/global
/adaptation/subjects
/adaptation/proposals
/adaptation/promotions
/adaptation/habits
/task-scope
/artifact
```

`context compiler` 更适合作为内部服务，不必一开始公开成外部 API。

`/adaptation/promotions` 可以在第一版作为 proposal 的筛选视图或轻量子路由存在，不一定必须独立成完整对象库。关键要求是：跨层级提升必须可审阅、可合并、可追踪来源。

`/adaptation/habits` 在 v1 最小版承担“已确认习惯管理”的入口，至少支持：

- `GET /adaptation/habits?session_id=...`
- `POST /adaptation/habits/remove-source`

其中：

- `remove-source` 明确表示“从长期真源移除”。
- 当前 v1 不再提供 project-local suppression 动作；project 中重复候选的降噪与缩圈改由 `project_guidance / global_guidance` 维护和 proposal merge 承担。
- 当前代码里，任何“把习惯库中的正式习惯加入当前 session”或“把习惯库中的正式习惯从当前 session 移出”的动作，都必须经过用户确认；AI 只能生成 session review items，不能静默改写 `habit_ids`。
- v1 当前选择复用现有 proposal inbox 承载 session review gate：session review item 作为 `scope.level=session` 的 proposal 存储与展示，但确认动作只改 session binding，不改长期真源。
- 当前代码里，当前 session 中用户明确表达的新局部习惯可以自动进入 session scratch 区；高置信 scratch 立即在本 session 生效，低置信 scratch 先保持 pending，等待用户确认生效。这一步不属于“把正式习惯加入当前 session”，因此不要求先入库确认。

## 7. 推荐的数据落盘策略

当前最推荐的落盘策略是“独立 memory root + session 绑定索引”：

### 7.1 规范记录

规范记录保存在独立长期记忆根中，而不是默认写入每个项目目录：

- global 级真源放在 `MemoryPath.adaptationRoot()/global/`
- subject 级真源放在 `MemoryPath.adaptationRoot()/subjects/<subject_id>/`（**与 `global/` 平行，不得嵌套在其下**）
- initiative 级真源放在 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`
- task_scope 级真源放在 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`
- artifact 级真源放在 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`
- Aether 工作区 project 引用记录放在 `MemoryPath.adaptationRoot()/workspace/projects/<project_id>/`（工作区引用层，与上述五层平行 scope 身份独立）
- session scratch 只保存在当前 session 绑定的暂存区，不进入 confirmed 习惯库真源
- session db 只保存 session 到 initiative / task_scope / subject / habit / signal / proposal / context packet 的绑定、引用和快照
- 当前代码里，session db 中的 `habit_ids` 表示“当前 session 已确认生效的 imported 正式习惯集合”，不是“系统当前匹配到但尚未确认的候选集合”；scratch active habits 由独立 session scratch 存储补充，而不是塞进 `habit_ids`。
- session db 不能成为 global guidance、subject profile、project guidance、initiative policy、task_scope、artifact contract 或 IPK piece 的唯一长期真源
- 第一版不默认把长期 adaptation 真源写入 `<worktree>/.opencode/adaptation/`

当前进一步倾向：

- session 是证据来源和绑定对象，不是长期 adaptation 记录的主存储根。
- project / worktree 是逻辑边界与匹配依据，不等于物理真源必须在项目目录内。
- task / artifact 级记录第一版优先绑定到 project_id，但物理真源不保存在 `projects/<project_id>/` 下。
- 第一版不做导出或同步到 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`。
- `<worktree>/.opencode/adaptation/` 以后可以按 `pointer -> explicit export -> one-way sync -> two-way sync` 顺序逐步评估，但不作为第一版默认真源。
- 跨系统存储与权限约束以 [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md) 为准。

### 7.2 派生缓存

可保存在独立 memory root 的缓存分区，例如：

- `MemoryPath.cacheRoot()/adaptation/`

这里可以放：

- 编译缓存
- 派生索引
- 快速路由缓存
- 资源选择缓存

## 8. 与当前权限模型的关系

当前推荐分两类：

### 8.1 适配记录写入

尽量落在 Aether 自己能稳定管理的本地目录里，减少频繁权限打断。

### 8.2 artifact 文件写入

继续复用现有文件写入权限与安全流程。

因为这类行为会真正改用户文件。

## 9. 前端建议

前端不应把这套系统暴露成一堆底层 AI 参数设置页。

更合理的入口是：

- 当前任务是什么
- 最近系统对这个任务的理解是什么
- 有哪些待确认 proposal
- 有哪些 proposal 已被合并成同类候选
- 有哪些习惯建议从当前 session / task 提升到更高层级
- 当前绑定了哪些 artifact
- 当前任务形成了哪些工作流习惯
- 当前优先使用哪些工具、路径和程序
- 当前 session / project 正在使用哪些用户习惯记录
- 当前 context compiler 编译进运行时的习惯摘要

用户界面更适合问：

- “这条总结对不对”
- “以后这个任务是不是默认写到这个文件里”
- “这条工作原则要不要保留”
- “这条习惯是否只适用于当前任务，还是以后整个项目都应该这样”
- “这些相似 proposal 是否可以作为同一条习惯统一确认”
- “当前区域正在使用哪些习惯记录，要不要检查或修改”
- “这条习惯是从真源删除，还是只在当前项目禁用”
- “系统建议把哪条习惯加入当前 session”
- “系统建议把哪条当前 session 习惯移出或替换”

而不是问：

- “要不要把 chunk size 改成 768”

## 10. 推荐的第一阶段实现

如果要尽快做出高价值版本，当前最推荐的顺序是：

### 第一步

- `task_scope`
- session 到 task scope 的绑定

先解决：

- 同一件事跨多个对话框共享上下文

### 第二步

- `proposal`
- 用户确认流
- 同类 proposal 合并
- pending proposal 统一处理入口

先把高影响理解做稳。

### 第三步

- `artifact_contract`
- summarize-and-record 直写流程
- 成对记录文件更新规则

先打通：

- “总结并记录到固定 LaTeX 文件”
- “更新记录文件” 时知道该更新哪几份文件

### 第四步

- 小规模 `operation_policy`
- 工具 / 路径 / 程序偏好
- query time context compile

再解决：

- 操作更像用户自己在做

### 第五步

- `subject_profile`
- 学科知识坐标与规范对齐

再解决：

- 学科知识坐标与规范对齐

### 第六步

- 更慢更新的 `global_guidance`
- 更完整的 `policy`

## 11. 当前一句话总结

从当前 Aether 项目出发，这套系统最合理的落地方式不是“在现有 knowledge 或 workspace 上继续打补丁”，而是：

- 复用现有 session、prompt、summary、event 基础设施
- 新增 `task_scope`、`artifact_contract`、`proposal` 与 `context compiler`
- 用本地优先、分层作用域、关键项确认的方式，把长期理解真正接入未来回答与执行
- 让系统不仅知道“怎么讲”，也知道“怎么做”
