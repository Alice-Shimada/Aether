# 用户适配层：guidance、profile、policy 与分层作用域

这份文档聚焦的是“对象职责怎么分”，不是重新定义 scope。

当前正式架构以这三份权威文档为准：

- `user-adaptation-system-top-level-constraint.zh-CN.md`
- `user-adaptation-system-implementation-decisions.zh-CN.md`
- `user-adaptation-system-schema-v1.md`

## 1. 当前正式理解

用户自适应系统已经不是“单张用户画像”。

它由三块并列结构组成：

- 独立习惯库
  - `global / subject / initiative / task_scope / artifact` 五层平行 scope
- Aether 工作区引用层
  - `global_guidance`
  - `project_guidance`
  - `session binding`
- session 运行时层
  - `imported active habits`
  - `scratch active habits`

其中：

- 习惯正文真源只在独立习惯库里。
- `global_guidance` / `project_guidance` 只保存轻量背景 + refs。
- 当前 session 真正生效的集合是：

```text
imported active habits
  + scratch active habits
```

## 2. 证据链与写入链

系统先从对话里形成证据，再慢慢进入长期层：

```text
session dialogue
  -> signals
  -> summaries
  -> proposal candidates
  -> merged proposals
  -> user review
  -> confirmed records
  -> runtime context
```

`scope promotion` 仍然是正式设计的一部分：某条习惯可以先在 session 中被观察到，后续再被提议提升到 `task_scope`、`initiative`、`subject` 或 `global`。

## 3. 不要再把对象职责混成一类

当前最容易混淆的是把 `guidance`、`profile`、`policy`、`contract` 当成同一层对象。

它们其实是两条正交维度：

- `scope` 维度
  - `global / subject / initiative / task_scope / artifact`
- `object role` 维度
  - `guidance / profile / policy / contract`

后者只是同一系统内部的对象职责分工，不是新增层级。

## 4. `guidance`

`guidance` 只属于 Aether 工作区引用层。

当前正式对象只有两类：

- `global_guidance`
- `project_guidance`

它们共同的边界是：

- 只保存轻量背景 + refs
- 只用于 query-time 缩圈、解释 routing、帮助找到候选 bucket
- 不能保存习惯正文真源
- 不能直接让某条正式习惯进入 session 生效区

### 4.1 `global_guidance`

适合保存：

- 工作区 global 侧的极短背景摘要
- 跨项目稳定成立的上下文提示
- 用于 session 缩圈的 `subject_ids`、`task_scope_refs`、`artifact_refs`、`ipk_piece_refs`
- 其他只用于 query-time guidance 的轻量 refs

不适合保存：

- 正式全局习惯正文
- 默认回答规则正文
- 默认操作规则正文

这些正式正文应进入习惯库 global 层真源。

### 4.2 `project_guidance`

适合保存：

- 项目稳定背景
- 跨 task_scope 成立的极短上下文
- `subject_ids`、`task_scope_refs`、`artifact_refs`、`ipk_piece_refs`
- 高频重复线索的轻量沉淀、排序和解释辅助信息

不适合保存：

- 项目正文
- 可复用的长期规则正文
- task_scope / artifact / IPK 的正文副本

这里的 `project_guidance` 属于工作区引用层，不是习惯库五层里的 `initiative`。  
`project_guidance` 可以引用多个 initiative 候选，但不等于任何一个 initiative 真源。

## 5. `profile`

`profile` 属于习惯库内部对象职责，不是工作区 guidance 的别名。

当前不能再把 `global_guidance / subject_profile / project_guidance` 当成“三类并列 profile”。

更准确的理解是：

- `global_guidance` / `project_guidance`
  - 是工作区 guidance 对象
- `subject_profile` / `initiative_profile`
  - 是习惯库 scope 内部的 profile 对象

### 5.1 `subject_profile`

`subject_profile` 是习惯库 `subject` 层的正式真源对象之一。

它适合保存：

- 已有 anchor
- 惯用理论语言
- 记号对齐偏好
- 脆弱区
- 这个 subject 内部的知识坐标

需要特别注意：

- `subject` 可以同时作为工作区 guidance 里的分类/refs 入口出现
- 但 guidance 里的 `subject_ids` 只是“帮助查找”的引用
- 它们不等于 `subject_profile` 真源本身

### 5.2 `initiative_profile`

`initiative_profile` 是习惯库 `initiative` 层的正式对象。

它负责记录：

- 某个真实长期事项下跨多个 task 的背景
- initiative 内部共享的状态摘要
- 与 initiative 绑定的长期上下文

它与 Aether 工作区 `project` 完全解绑；initiative 归属由路由 classifier 与用户确认共同决定。

## 6. `policy`

`policy` 负责“系统接下来怎么做”。

它属于习惯库真源，不属于工作区 guidance。

典型例子包括：

- `global_policy`
- `subject_policy`
- `initiative_policy`
- `task_scope policy`

它们负责保存：

- `response_policy`
- `operation_policy`
- 已确认的默认行动规则

这些内容不能继续堆进 `global_guidance` / `project_guidance`。

## 7. `task_scope` 与 `artifact`

`task_scope` 和 `artifact` 不再应被描述成“与 adaptation 相邻但独立的外部对象”。

在当前正式架构里：

- `task_scope` 是习惯库五层之一
- `artifact` 也是习惯库五层之一

它们当然各自承担不同职责：

- `task_scope`
  - 长期逻辑任务的状态、习惯、局部规则与引用
- `artifact`
  - 具体输出目标的 contract、格式与更新约束

但它们都属于当前用户自适应系统正式结构的一部分。

### 7.1 `task_scope`

`task_scope` 适合保存：

- 当前任务边界
- 任务局部工作流习惯
- 任务状态摘要
- 相关 artifact / IPK refs

它不适合保存：

- 正文内容库
- open-questions / 决策文件的完整正文副本

### 7.2 `artifact_contract`

`artifact_contract` 适合保存：

- 具体路径
- 锚点
- 写入模式
- 成对更新关系
- 更新触发条件

它是 `artifact` 层的正式真源对象，不是附属说明。

## 8. 当前运行时解释

当前 session 里可见且已生效的习惯，必须分成两类理解：

1. `imported active habits`
   - 来自习惯库正式真源，并已通过 `habit_ids` 引用进当前 session
2. `scratch active habits`
   - 当前 session 中新形成、只绑定该 session 的暂存习惯

因此：

- `habit_ids` 只表示 imported confirmed 集合
- 它不是当前全部生效集合
- 当前运行时生效集合必须写成：

```text
imported active habits
  + scratch active habits
```

## 9. 一句话总结

当前最准确的理解是：

- 五层平行 scope 决定正式习惯真源放在哪里
- `guidance / profile / policy / contract` 决定对象在各层里承担什么职责
- 工作区 guidance 只负责轻量背景 + refs
- 当前 session 真正生效的是 imported + scratch 两支并列运行时集合
