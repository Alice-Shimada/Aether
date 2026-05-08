# Decision: 用户自适应系统顶层约束单列 + Guidance 命名与三分目录

- **日期**：2026-04-15
- **拍板人**：用户
- **状态**：v1 必须遵守
- **优先级**：与用户自适应系统顶层约束一致；冲突时以顶层约束文档和本决策为准
- **关联**：
  - [user-adaptation-system-top-level-constraint.zh-CN.md](../IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md)
  - [user-adaptation-system-implementation-decisions.zh-CN.md §0.5](../IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)

## 1. 决策

用户自适应系统在 v1 必须采用三块架构：

1. 独立习惯库（长期真源）
2. Aether 工作区引用层
3. Session 运行时层（binding + scratch + session review proposal）

三块在命名、目录、类型和运行时装配上都必须保持独立。

## 2. 工作区对象改名

工作区引用层统一改名为：

- `global_profile -> global_guidance`
- `project_profile -> project_guidance`

原因：

- `profile` 这个后缀在习惯库内部已经用于 `subject_profile / initiative_profile` 等正式对象
- 如果继续让工作区对象也叫 `profile`，很容易把“工作区 guidance”误解成“习惯库真源”

因此 v1 统一要求：

- 工作区对象使用 `guidance`
- 习惯库内部保留 `profile / policy / contract`

## 3. `profile / policy / contract` 的含义

`profile / policy / contract` 不是 scope 层级，它们是**同一 scope 内部的对象职责分工**：

- `profile`：描述、背景、状态、坐标
- `policy`：响应与操作规则
- `contract`：artifact 这类对象上难以拆开的规则与约束

习惯库 scope 仍只有五层：

```text
global / subject / initiative / task_scope / artifact
```

## 4. 目录三分

v1 默认目录结构必须满足：

### 4.1 习惯库真源

```text
adaptation/global/
adaptation/subjects/<subject_id>/
adaptation/initiatives/<initiative_id>/
adaptation/task-scopes/<scope_id>/
adaptation/artifacts/<artifact_id>/
```

### 4.2 工作区 guidance

```text
adaptation/workspace/global-guidance.json
adaptation/workspace/projects/<project_id>/project-guidance.json
```

### 4.3 Session 运行时层

```text
adaptation/bindings/sessions/<session_id>.json
adaptation/bindings/sessions/<session_id>/scratch-habits.json
adaptation/bindings/sessions/<session_id>/scratch-conflicts.json
adaptation/bindings/sessions/<session_id>/proposals/<status>/
```

## 5. 约束

- 工作区 guidance 只存轻量背景 + refs，不存习惯正文真源
- imported active habits 必须来自习惯库正式真源 + session binding 引用，不得直接来自 guidance 文件
- `session` 不是习惯库第六层 scope；它只是运行时层
- 如果内部实现需要 runtime carrier type，可以单独定义，但不得再把 `session` 混进习惯库 scope 枚举
