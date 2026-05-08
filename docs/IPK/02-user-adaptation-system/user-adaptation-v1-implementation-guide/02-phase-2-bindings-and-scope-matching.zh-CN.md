# 阶段 2：绑定、路由分区与 scope matching

## 目标

让系统能判断当前 session / 请求 / 文件行动属于哪些长期作用域，**并且能在 proposal confirm 时把新习惯路由到习惯库五层里正确的 bucket**。

这一阶段完成后，后端应该能：

- 保存稳定的 Aether `project_id` 作为工作区引用层身份（**不再推导或绑定 `initiative_id`**）
- 保存 session 到 initiative / task_scope / subject / signal / proposal / context packet 的绑定引用（initiative_id 由路由 classifier 决定，不由 project 派生）
- 根据运行时线索生成 `ScopeMatchResult`
- 用渐进披露方式查候选，而不是平铺扫描所有长期习惯
- 在低置信或冲突时标记需要用户确认
- **提供分层路由 classifier 服务**，把 confirmed 习惯路由到 initiative / subject / task_scope / artifact 的合适 bucket

## 必做项

### 1. Aether project 身份（不再做 project ↔ initiative 绑定）

v1 已拍板（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../../decisions/project-initiative-decoupling-and-routing.md)）：

- 习惯库五层中的长期事项层叫 `initiative`，不是 Aether 工作区里的 project。
- Aether runtime project / worktree 仅作为工作区引用层身份，以及路由 classifier 的**上下文信号之一**。
- **v1 不建立任何默认的 project ↔ initiative 绑定**；不自动创建 initiative 记录；不使用 `iid(project_id)` 之类的硬推导。
- Aether 工作区分区继续用 `project_id`；initiative 归属由路由 classifier 每次独立决定。
- `ScopeLevel` 类型层必须只表示习惯库五层；运行时若需表达 session 级对象，应使用独立的 `RuntimeScopeLevel` 或等价 carrier type。
- `HabitScopeLevel`（global/subject/initiative/task_scope/artifact）与 `WorkspaceLayer`（global/project/session）必须保持两个独立枚举。

实现一个**仅用于工作区身份**的绑定服务：

```text
runtime project/worktree/cwd
  -> stable project_id
  -> MemoryPath.adaptationRoot()/workspace/projects/<project_id>/   # 工作区引用层，只存 habit_id 引用 / 排序 / 禁用 meta
```

禁止：

- 不得在此服务中创建 `initiative_id`。
- 不得把 `project_id` 当作 initiative target。
- 不得引入独立 `project_policy.json` 或 `project_suppression.json` 对象；project 层只保留 `project_guidance`。

v1 推荐 id 生成：

- 优先复用 Aether 已有稳定 project id。
- 如果没有稳定 id，用 repo root / worktree root 的规范化 hash。
- 不把绝对路径原文直接写进目录名。
- 保存一份 mapping 记录到 `bindings/projects/`。

mapping 记录建议包含（注意：无 `initiative_id` 字段）：

```json
{
  "project_id": "proj_xxx",
  "runtime": {
    "kind": "aether_project",
    "id": "existing_project_id",
    "cwd_hint": "redacted-or-relative"
  },
  "created_at": "2026-04-12T00:00:00+08:00",
  "updated_at": "2026-04-12T00:00:00+08:00"
}
```

### 1b. 分层路由 classifier（新增）

在 proposal confirm 阶段触发，负责把 scratch 候选习惯路由到习惯库五层里正确的 bucket。

classifier 输入：

- 候选习惯正文；
- 关联 evidence signals；
- 当前 session 上下文（session_id / subject tags / 当前 `project_id` 作为 hint 信号）；
- 目标层下所有已有 bucket 的轻量画像 `{id, display_name, aliases, summary, 最近 10 条 evidence 摘要}`（不读 policy 正文）。

输出必须是 JSON，其中之一：

```json
{"decision": "match", "bucket_id": "ini_xxx", "confidence": 0.91, "reasons": ["..."]}
{"decision": "new", "suggested_name": "...", "suggested_aliases": ["..."], "confidence": 0.88, "reasons": ["..."]}
{"decision": "unsure", "candidates": [{"bucket_id": "...", "confidence": 0.52}], "reasons": ["..."]}
```

处置规则：

- `confidence >= 0.85`（常量，可配置）且 `decision ∈ {match, new}` → **AI 自动处置**（直接归入或创建新 bucket），写入 audit log。
- 中等置信度 → 进入 proposal inbox review gate，用户可 accept / 改 bucket / 改层 / 编辑新 bucket 名 / 拒绝。
- 低置信度 / `unsure` → 必进 inbox，默认不写入。

所有由 AI 自动创建的新 bucket 必须：

- 生成独立 uuid / slug 派生 id，不得复用 `project_id`、`session_id` 等。
- 立即创建最小骨架文件（`<layer>/<bucket_id>/profile.json` 等）。
- 写入 audit log，标注 `created_by: ai`、classifier 置信度、触发证据 id。

路由支持 **merge**（v1 必做）：两个 bucket 发现同一件事时，被合并 bucket 打 tombstone + redirect 到目标 bucket id；evidence 一次性迁移。**split** 延后到 vNext。

路由允许**跨层多 tag**：同一条习惯可以同时挂多层 scope tag，classifier 对每层分别给出建议。

---

### 2. session binding

session db 允许保存：

```text
session_id -> project_id
session_id -> initiative_id
session_id -> task_scope_id
session_id -> subject_ids
session_id -> artifact_ids
session_id -> habit_ids
session_id -> signal_ids
session_id -> proposal_ids
session_id -> context_packet_id
session_id -> context_packet_snapshot
session_id -> match_snapshot
```

实现方式可二选一：

- 扩展现有 session 表或 session metadata。
- 新增 adaptation binding 表。

无论哪种方式，都必须遵守：

- session db 只保存引用和快照。
- 不把 profile / policy / task_scope / artifact_contract 真源塞进 session db。
- `context_packet_snapshot` 只是审计和 UI 检查用快照。
- `initiative_id / task_scope_id / subject_ids / artifact_ids` 表示当前 session 的实际挂载状态，而不是系统暂时猜到的所有候选范围。

同时写入 memory root 的 binding mirror：

```text
MemoryPath.adaptationRoot()/bindings/sessions/<session_id>.json
```

该 mirror 是便于重建和调试的绑定记录，不替代 session db。

### 3. task_scope 创建和绑定

实现：

- `GET /task-scope?project_id=...`
- `POST /task-scope`
- `GET /task-scope/:id`
- `PATCH /task-scope/:id`
- `POST /task-scope/:id/bind-session`

`POST /task-scope` 最小请求：

```json
{
  "project_id": "proj_xxx",
  "title": "用户自适应系统 v1 实现",
  "kind": "implementation",
  "goal": "按实施指南逐步实现用户自适应系统 v1。"
}
```

创建后写入：

```text
task-scopes/<scope_id>/scope.json
task-scopes/<scope_id>/scope.md
task-scopes/<scope_id>/policy.json
task-scopes/<scope_id>/policy.md
```

`PATCH /task-scope/:id` 只能用于低影响同 scope 字段：

- `status_summary`
- `done`
- `open_question_refs`
- `decision_refs`
- `linked_pieces`
- `artifacts`

高影响 workflow / operation policy 必须走 proposal。

### 4. artifact contract 创建和匹配

实现：

- `GET /artifact?project_id=...`
- `POST /artifact`
- `GET /artifact/:id`
- `PATCH /artifact/:id`
- `POST /artifact/match`

首次 artifact 绑定必须预览并确认。

artifact contract 最小字段：

```json
{
  "id": "artifact_xxx",
  "project_id": "proj_xxx",
  "task_scope_id": "scope_xxx",
  "role": "open_questions",
  "path": "docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md",
  "format": "markdown",
  "write_mode": "revise_in_place",
  "update_triggers": ["on_planning_question_added"],
  "partner_artifacts": []
}
```

artifact path 必须是用户项目文件路径或用户明确指定路径，不能被当作 memory root 内部路径。

### 5. scope matching 服务

实现 `POST /task-scope/match` 或内部 `match()`：

输入：

- `session_id`
- 当前 cwd / project / worktree / repo 摘要
- 当前打开文件或引用路径
- 用户本轮请求文本
- 当前消息选择范围
- v1 当前不接入最近工具调用和文件改动摘要
- session db 已有绑定
- 用户手动选择的 scope

输出：

```json
{
  "session_id": "ses_xxx",
  "project_id": "proj_aether",
  "task_scope": {
    "primary": "scope_user_adaptation_v1",
    "secondary": []
  },
  "subject_ids": ["user-adaptation-system"],
  "artifact_ids": ["artifact_open_questions"],
  "confidence": {
    "project": 0.94,
    "task_scope": 0.87,
    "subject": 0.82,
    "artifact": 0.76
  },
  "reasons": [
    "当前工作目录属于 Aether repo。",
    "打开文件位于 docs/IPK/02-user-adaptation-system/。"
  ],
  "needs_user_confirmation": false
}
```

### 6. 渐进披露检索

matching 必须按层过滤：

```text
L0 运行时线索
L1 session binding / project mapping / path index
L2 task_scope catalog / subject catalog / artifact catalog
L3 habit surfaces
L4 top K full records
L5 evidence only for review / audit
```

v1 可以先用确定性规则和轻量字符串匹配：

- 用户显式选择优先
- session binding 优先
- artifact path 精确命中优先
- `project_id` 工作区引用层（session ↔ project）优先，但**不把 project 当作 initiative 代理**
- subject alias / trigger tags 次之
- task_scope title / goal / recent session 连续性次之
- initiative 归属由路由 classifier 或已有 session binding 决定，不从 project 推导
- global 只兜底

不要把所有长期 JSON 读进模型 prompt 让模型自由判断。

### 7. Matching Prompt Contract

如果使用模型辅助 matching，prompt 必须遵守：

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
```

输出必须 JSON schema 校验。校验失败时，不更新 binding。

## 阶段完成标准

- `project_id` 能稳定生成和复用（**不再生成 `initiative_id`**）。
- session binding 能保存 initiative / task_scope / subject / artifact / habit 引用，其中 `initiative_id` 来自路由 classifier 或用户手选，**不来自 project 派生**。
- `POST /task-scope/match` 能返回可解释 `ScopeMatchResult`。
- 路由 classifier 服务对 initiative / subject / task_scope / artifact 四层都能工作，返回 match / new / unsure。
- Merge 操作（tombstone + redirect + evidence 迁移）可用。
- artifact path 命中能优先找到 artifact_contract。
- 低置信或冲突时能返回 `needs_user_confirmation=true`。
- matching 不平铺扫描所有 signals / evidence。
- `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不注入模型 prompt。
- 不做 signal extraction。
- 不做 proposal confirm UI（后端分类逻辑必做，UI 留到 Phase 5/6）。
- 不做 split 操作（v1 只做 merge）。
- 不做跨 worktree 自动聚合（路由 classifier 已能满足 initiative 归属，v1 不需要额外绑定 UI）。
- 不做 workflow_profile。
- 不做 vector search。
- 不保留任何 `project_policy` 路径 / 不允许 `project_policy` 作为 promotion 目标。
