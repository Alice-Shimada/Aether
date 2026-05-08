# 用户自适应系统 v1 实施总约束

这份文件是给“全新 AI 实现者”的总合同。

如果和较早讲解稿冲突，以这份文件和上游权威文档为准。

## 1. 文档优先级

实现时必须遵守下面顺序：

1. [user-adaptation-system-top-level-constraint.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md) — 最高架构约束，与本项任何其他文档冲突时以它为准
2. [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
3. [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
4. [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)
5. [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)
6. [user-adaptation-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-aether-integration-v1.md)
7. [user-adaptation-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md)

## 2. 必须实现的 v1 边界

### 2.1 产品边界

- 用户自适应系统是独立长期行为记忆系统，不是 IPK 内容库。
- IPK 负责内容、知识、灵感、piece、map、search、associate。
- 用户自适应系统负责用户偏好、工作习惯、行动策略、proposal、profile、policy、task_scope、artifact_contract。
- IPK 的低层索引和 AI 连接尽量由 AI 接管；用户自适应系统中，用户应对习惯的作用范围、确认、提升、降级、禁用和纠正拥有更强控制权。
- 用户自适应系统分为三个区域：Aether 工作区引用层、独立 confirmed 习惯库、session 暂存区。工作区只能引用习惯库中的 confirmed habits，不能复制习惯正文并成为第二真源；session 暂存区只保存当前 session 临时习惯，不写成 confirmed 真源。
- 习惯库五层 `global / subject / initiative / task_scope / artifact` 是平行 scope 标签，不是树状父子层级。
- 第一版可以轻量只读关联 IPK piece surface，但不能复制 IPK 正文。
- 第一版不自动把所有长期记忆塞进普通问答 prompt。
- 第一版在每次模型请求前轻量运行 `scope matching + scope read`，生成短小 `context_packet`。
- 第一版长期更新要慢，必须基于 evidence、summary、proposal 和用户确认。

### 2.2 存储边界

- 用户自适应真源只能通过 `MemoryPath.adaptationRoot()` 获取。
- global 级记录保存在 `MemoryPath.adaptationRoot()/global/`。
- subject 级记录保存在 `MemoryPath.adaptationRoot()/subjects/<subject_id>/`。
- initiative 级真源保存在 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`。
- task_scope 级真源保存在 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`。
- artifact 级真源保存在 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`。
- `MemoryPath.adaptationRoot()/workspace/projects/<project_id>/` 只保留工作区引用层记录（`project-guidance.*`），不再保存 session scratch / proposal、task_scope 或 artifact 真源。
- 派生 context packet 可以保存在 `MemoryPath.cacheRoot()/adaptation/context-packets/`。
- session db 只能保存绑定、引用、快照和过程数据。
- `session_id -> habit_ids` 表示当前 session 已引入并生效的习惯引用。
- session db 与 `bindings/sessions/<session_id>/` 运行时文件都不能成为 `workspace/global-guidance.json`、`global/global-policy.json`、`subject-profile.json`、`workspace/projects/<project_id>/project-guidance.json`、`initiative-policy.json`、`task-scope.json`、`artifact-contract.json` 或 IPK piece 的唯一长期真源。
- 第一版不默认写入 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`。
- 第一版不导出、不同步到项目目录。
- 未来项目目录接入顺序只能是 `pointer -> explicit export -> one-way sync -> two-way sync`。
- 旧路径导入只允许 copy，不 move、不 delete。
- 新旧 root 都有数据时，不自动合并。

### 2.3 权限边界

- 不要为了用户自适应系统申请或假设全盘读写权限。
- 不要扫描整个 home、根目录、C 盘或任意项目目录。
- 只读取 resolver、session、project、用户当前操作和已绑定 artifact 明确允许的路径。
- 长期记忆写入必须通过 `/adaptation/*`、`/task-scope/*`、`/artifact/*` 专门服务。
- 不允许模型通过通用 write/edit 工具直接维护 memory root 真源。
- 服务内部必须校验目标路径仍在 `MemoryPath.adaptationRoot()` 或 `MemoryPath.cacheRoot()/adaptation/` 允许子树内。
- 必须禁止 `..` 路径穿越。
- 必须禁止通过 symlink 写出 root。
- 写正式对象前应使用原子写入或锁。
- artifact 用户文件写入必须复用 Aether 现有权限和确认机制。

### 2.4 行为确认边界

- 高影响用户习惯不能直接写入长期 profile / policy。
- 高影响包括改变未来默认行动方式、文件写入规则、工具选择、自动联动、默认工作流或长期任务原则。
- 高影响或跨层级提升必须先进入 proposal。
- 同类 proposal 必须合并、去重、补证据，再进入 pending proposal queue。
- 用户确认后才写入长期对象。
- 用户拒绝后必须保留拒绝记录，避免短期反复生成。
- 用户暂缓后保留在队列中，但降低打扰优先级。
- 所有写入 `global_guidance` 的内容都必须由用户确认。

### 2.5 作用域边界

内部长期作用域必须保留五层：

```text
global
subject
initiative
task_scope
artifact
```

`session` 是过程层和证据来源，不是长期习惯真源。

UI 可以简化展示，不要求用户理解所有英文层级。

### 2.6 policy 覆盖顺序

长期 policy 覆盖顺序已经拍板：

```text
artifact_contract
  > task_scope policy
  > initiative policy
  > subject policy
  > global policy
```

更高优先级仍然是：

```text
system / developer 指令
  > 当前用户本轮明确要求
  > repo AGENTS.md 等项目级 agent 指令
  > adaptation policy
```

adaptation policy 不能覆盖权限、安全确认或危险操作判断。

## 3. 明确延期，不要提前做

- 不做完整 `workflow_profile` / `pattern_profile`。
- 不做完整的跨 worktree 显式 binding UI（路由 classifier 自身已能处理 initiative 归属；v1 不存在"project→initiative 默认 1:1 绑定"的概念，详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../../decisions/project-initiative-decoupling-and-routing.md)）。
- 不做 embedding / vector search。
- 不做完整图形化习惯地图。
- 不做自动 demotion / scope narrowing。
- 不做用户自定义所有阈值。
- 不做双向同步。
- 不做 memory root UI 设置入口。
- 不做全局画像后台静默自动写入。
- 不做从语气中推断深层人格并提升到 global。
- 不做普通 query-time 读取所有 signals / evidence。

## 4. 推荐后端模块落点

建议新增：

- [packages/opencode/src/adaptation/index.ts](/home/bzz/Aether/packages/opencode/src/adaptation/index.ts)
- [packages/opencode/src/adaptation/types.ts](/home/bzz/Aether/packages/opencode/src/adaptation/types.ts)
- [packages/opencode/src/adaptation/storage.ts](/home/bzz/Aether/packages/opencode/src/adaptation/storage.ts)
- [packages/opencode/src/adaptation/profile.ts](/home/bzz/Aether/packages/opencode/src/adaptation/profile.ts)
- [packages/opencode/src/adaptation/policy.ts](/home/bzz/Aether/packages/opencode/src/adaptation/policy.ts)
- [packages/opencode/src/adaptation/signal.ts](/home/bzz/Aether/packages/opencode/src/adaptation/signal.ts)
- [packages/opencode/src/adaptation/summary.ts](/home/bzz/Aether/packages/opencode/src/adaptation/summary.ts)
- [packages/opencode/src/adaptation/proposal.ts](/home/bzz/Aether/packages/opencode/src/adaptation/proposal.ts)
- [packages/opencode/src/adaptation/habit.ts](/home/bzz/Aether/packages/opencode/src/adaptation/habit.ts)
- [packages/opencode/src/adaptation/promotion.ts](/home/bzz/Aether/packages/opencode/src/adaptation/promotion.ts)
- [packages/opencode/src/adaptation/indexes.ts](/home/bzz/Aether/packages/opencode/src/adaptation/indexes.ts)
- [packages/opencode/src/task-scope/index.ts](/home/bzz/Aether/packages/opencode/src/task-scope/index.ts)
- [packages/opencode/src/task-scope/types.ts](/home/bzz/Aether/packages/opencode/src/task-scope/types.ts)
- [packages/opencode/src/task-scope/storage.ts](/home/bzz/Aether/packages/opencode/src/task-scope/storage.ts)
- [packages/opencode/src/task-scope/matcher.ts](/home/bzz/Aether/packages/opencode/src/task-scope/matcher.ts)
- [packages/opencode/src/artifact/index.ts](/home/bzz/Aether/packages/opencode/src/artifact/index.ts)
- [packages/opencode/src/artifact/types.ts](/home/bzz/Aether/packages/opencode/src/artifact/types.ts)
- [packages/opencode/src/artifact/storage.ts](/home/bzz/Aether/packages/opencode/src/artifact/storage.ts)
- [packages/opencode/src/artifact/contract.ts](/home/bzz/Aether/packages/opencode/src/artifact/contract.ts)
- [packages/opencode/src/context/compile.ts](/home/bzz/Aether/packages/opencode/src/context/compile.ts)
- [packages/opencode/src/context/packet.ts](/home/bzz/Aether/packages/opencode/src/context/packet.ts)
- [packages/opencode/src/context/priority.ts](/home/bzz/Aether/packages/opencode/src/context/priority.ts)
- [packages/opencode/src/server/routes/adaptation.ts](/home/bzz/Aether/packages/opencode/src/server/routes/adaptation.ts)
- [packages/opencode/src/server/routes/task-scope.ts](/home/bzz/Aether/packages/opencode/src/server/routes/task-scope.ts)
- [packages/opencode/src/server/routes/artifact.ts](/home/bzz/Aether/packages/opencode/src/server/routes/artifact.ts)

需要修改：

- [packages/opencode/src/server/server.ts](/home/bzz/Aether/packages/opencode/src/server/server.ts)
- [packages/opencode/src/id/id.ts](/home/bzz/Aether/packages/opencode/src/id/id.ts)
- [packages/opencode/src/session/prompt.ts](/home/bzz/Aether/packages/opencode/src/session/prompt.ts)
- 现有 session summary 或等价模块，用于会话后提取入口

## 5. 推荐前端落点

建议新增：

- [packages/app/src/context/adaptation.tsx](/home/bzz/Aether/packages/app/src/context/adaptation.tsx)
- [packages/app/src/components/adaptation-menu.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-menu.tsx)
- [packages/app/src/components/adaptation-current-context-dialog.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-current-context-dialog.tsx)
- [packages/app/src/components/adaptation-proposal-inbox-dialog.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-proposal-inbox-dialog.tsx)
- [packages/app/src/components/adaptation-organize-session-button.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-organize-session-button.tsx)

大概率需要修改：

- [packages/app/src/app.tsx](/home/bzz/Aether/packages/app/src/app.tsx)
- [packages/app/src/components/prompt-input.tsx](/home/bzz/Aether/packages/app/src/components/prompt-input.tsx)
- [packages/app/src/pages/session/message-timeline.tsx](/home/bzz/Aether/packages/app/src/pages/session/message-timeline.tsx)
- 现有 sidebar / menu 组件

## 6. 统一 API 合同

第一版建议稳定成下面这组接口。

### 6.1 当前状态与 context

- `GET /adaptation/status?session_id=...`
- `POST /adaptation/context/compile`
- `GET /adaptation/context/:id`

`GET /adaptation/status` 返回当前 session / project 正在使用的 adaptation 摘要，不直接返回大段长期 JSON。

`POST /adaptation/context/compile` 主要供内部、测试和 UI 检查使用；普通模型请求应由后端内部调用 context compiler，不要求前端每轮主动调用。

### 6.2 profile / policy

- `GET /adaptation/global/guidance`
- `GET /adaptation/global/policy`
- `GET /adaptation/subjects`
- `GET /adaptation/subjects/:id/profile`
- `GET /adaptation/subjects/:id/policy`
- `GET /adaptation/projects/:id/guidance`

第一版不需要公开任意 profile / policy 直接写接口。高影响写入应走 proposal confirm。

### 6.3 signal / summary

- `POST /adaptation/signals/extract`
- `GET /adaptation/signals?session_id=...`
- `POST /adaptation/summaries/run`
- `GET /adaptation/summaries?scope_level=...&scope_id=...`

`POST /adaptation/signals/extract` 可以用于用户显式整理当前对话，也可以由用户消息写入后的后台任务调用。

当前 v1 行为：

- 用户消息写入后会异步调用 `mode=after_user_message`，并传入当前用户消息 id。
- 手动“整理当前对话”调用 `mode=manual_current_session`。
- 后端按 `session_id + message_id` 去重，只处理尚未 processed 的用户消息；没有新消息时可返回 `no_new_evidence`，不得重复写入旧 signal。
- 自动提取是后端后台步骤，不应阻塞当前轮模型回答，也不要求前端为了当前轮回答先刷新或先整理习惯。
- 因此，当前轮模型回答读取到的 adaptation 上下文，只包含这条用户消息出现之前已经存在的 imported habits 与 scratch active habits。
- 当前用户消息里新出现的偏好 / 规则，由模型直接阅读当前消息本身来遵守；后台 `after_user_message` 提取生成的 scratch / signal / proposal 只影响后续轮次。

### 6.4 proposals / promotions

- `GET /adaptation/proposals?status=pending`
- `GET /adaptation/proposals/:id`
- `POST /adaptation/proposals/:id/confirm`
- `POST /adaptation/proposals/:id/reject`
- `POST /adaptation/proposals/:id/defer`
- `POST /adaptation/proposals/merge`
- `GET /adaptation/promotions?status=pending`

`/adaptation/promotions` 第一版可以是 proposal 的筛选视图，不必成为独立对象库。

### 6.5 confirmed habits 管理（v1 最小版）

- `GET /adaptation/habits?session_id=...`
- `POST /adaptation/habits/remove-source`

边界要求：

- `remove-source` 只表示“从长期真源移除”。
- project 不再承担“局部禁用正式习惯”的独立动作；重复候选降噪改由 guidance 维护和 proposal merge 承担。

### 6.6 task scope

- `GET /task-scope?project_id=...`
- `POST /task-scope`
- `GET /task-scope/:id`
- `PATCH /task-scope/:id`
- `POST /task-scope/:id/bind-session`
- `POST /task-scope/match`

`PATCH /task-scope/:id` 只允许低影响、同 scope 的状态字段更新。高影响 policy / workflow 规则写入仍要走 proposal。

### 6.7 artifact contract

- `GET /artifact?project_id=...`
- `POST /artifact`
- `GET /artifact/:id`
- `PATCH /artifact/:id`
- `POST /artifact/match`

首次 artifact 绑定必须预览和确认。

## 7. 统一读模型合同

第一版至少稳定这些读模型：

- `AdaptationStatusView`
- `ScopeMatchResult`
- `ContextPacketView`
- `SignalView`
- `SummaryView`
- `ProposalView`
- `TaskScopeView`
- `ArtifactContractView`
- `HabitSurfaceView`

这些读模型应该面向前端和测试，不应暴露完整 memory root 路径。

## 8. 最小请求示例

`POST /task-scope/match`

```json
{
  "session_id": "ses_xxx",
  "request": "请继续完善用户自适应系统的实现指南",
  "cwd": "/current/project",
  "open_paths": [
    "docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md"
  ]
}
```

`POST /adaptation/context/compile`

```json
{
  "session_id": "ses_xxx",
  "request_id": "req_xxx",
  "request": "请继续完善用户自适应系统的实现指南",
  "budget": {
    "max_sections": 8,
    "max_chars": 4000
  }
}
```

`POST /adaptation/signals/extract`

```json
{
  "session_id": "ses_xxx",
  "mode": "manual_current_session",
  "message_ids": ["msg_a", "msg_b"]
}
```

`POST /adaptation/proposals/:id/confirm`

```json
{
  "review_note": "同意，只用于当前 Aether 项目规划类讨论。",
  "apply": true
}
```

## 9. 每阶段验收命令

每个实现阶段至少运行：

```bash
cd /home/bzz/Aether/packages/opencode && bun typecheck
cd /home/bzz/Aether/packages/app && bun typecheck
python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
```

如果阶段只改后端，仍建议至少跑 `packages/opencode` typecheck。最终阶段必须三项都跑。

## 10. open-questions 规则

实现过程中如果发现：

- 已拍板内容仍在 open-questions
- 某个开放项已经被代码或 guide 解决
- 某个 vNext 项被误实现
- 新的不确定性出现

必须同步更新 [user-adaptation-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md)。

不要让 open-questions 只增不减。
