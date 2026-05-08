# 阶段 5：Proposal Inbox、合并去重与 Scope Promotion

## 目标

让高影响习惯和跨层级提升进入可审阅、可合并、可确认的 proposal 流程。

这一阶段完成后：

- proposal candidate 能合并为 pending proposal
- 用户能 confirm / reject / defer
- confirm 后写入目标 JSON 真源并渲染 Markdown
- reject 后保留拒绝记录和冷却
- deferred 留在队列但降低提醒优先级
- scope promotion 必须可追踪 evidence、source scope、target scope 和 future effect

## 必做项

### 1. proposal 存储

proposal 真源位置必须遵守存储契约，按 `scope.level` 决定：

```text
global / subject:
  MemoryPath.adaptationRoot()/proposals/<status>/

session:
  MemoryPath.adaptationRoot()/bindings/sessions/<session_id>/proposals/<status>/

task_scope / artifact:
  MemoryPath.adaptationRoot()/task-scopes/<scope_id>/proposals/<status>/
  MemoryPath.adaptationRoot()/artifacts/<artifact_id>/proposals/<status>/
```

其中 `<status>` 至少包括：

```text
pending
confirmed
rejected
deferred
```

全局 proposal inbox 是聚合视图，不要求所有 proposal 真源都搬到 root `proposals/` 下。

为了快速列出 inbox，可以维护派生索引：

```text
MemoryPath.adaptationRoot()/indexes/proposal-inbox.json
```

该索引只保存 proposal id、scope、status、impact、updated_at 和 canonical path。索引坏了应能从各 scope proposal 真源重建。

### 2. ProposalRecord schema

最小结构：

```json
{
  "id": "prop_xxx",
  "created_at": "2026-04-12T00:00:00+08:00",
  "updated_at": "2026-04-12T00:00:00+08:00",
  "scope": {
    "level": "task_scope",
    "target": "scope_xxx"
  },
  "kind": "workflow_principle",
  "merge_key": "project:proj_aether:operation_policy:planning_doc_sync",
  "summary": "项目规划讨论中，已拍板内容写 decisions，未决方向写 open-questions。",
  "impact": "high",
  "confidence": 0.84,
  "evidence_refs": ["sig_xxx"],
  "merged_from": [],
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
    "reason": "该规则会影响当前项目内后续规划讨论。"
  },
  "target_patch": {
    "object": "initiative_policy",
    "id": "ini_aether_main",
    "fields": ["operation_policy"]
  },
  "future_effect": "之后在 Aether 项目中进行系统设计讨论时，AI 会自动维护 decisions 与 open-questions。",
  "status": "pending"
}
```

### 3. merge / deduplicate

实现 proposal 合并服务：

- `POST /adaptation/proposals/merge`

合并键至少考虑：

- `scope.level`
- `scope.target`
- `kind`
- `target_patch.object`
- `target_patch.fields`
- `promotion.source_scope`
- `promotion.target_scope`
- `future_effect`
- 语义相似度

合并后必须保留：

- 所有关键 evidence refs
- 被合并 proposal id
- 最新 confidence
- 用户拒绝或暂缓历史

默认行为：

```text
candidate proposal
  -> merge / deduplicate
  -> pending proposal queue
```

如果候选来自 LLM 语义归并旁路，也必须先进入 merge / deduplicate 与 pending inbox，不得跳过人工确认直接写长期对象。

不要一出现就弹窗，不要一出现就写入长期对象。

### 3.1 重复候选降噪（v1 最小版）

`mergeProposals` 仍需要负责 proposal 级去重与冷却，但当前 v1 不再维护独立 `project_suppression` 门禁。

当前口径：

- 当前 project 中重复候选的降噪，优先通过 proposal merge、cooldown、`project_guidance / global_guidance` 的 refs 沉淀来解决。
- 这类去重与降噪不能替代 proposal confirm：高影响候选仍需进入 pending 并等待用户确认。
- 更完整的 classifier / new-bucket / guidance 维护阈值，继续由后续 routing 设计承担。

### 4. confirmation matrix

AI 可以自动做：

- 写入低影响 signal
- 更新同 scope summary
- 生成 promotion candidate
- 合并同类 proposal
- 给已确认习惯追加 evidence / confidence
- 生成 context_packet cache

AI 应询问用户：

- session -> task_scope 且改变任务默认工作方式
- task_scope -> initiative
- task_scope / initiative -> subject
- 作用域不明确
- 与已有记录冲突
- 用户可能会被后续行为影响

必须由用户确认：

- 写入 `global_guidance` / `global_policy`
- 写入高影响 `initiative_policy`
- 写入更广作用域的工作流类规则
- 改变未来默认行动方式
- 改变文件写入规则
- 改变工具选择规则
- 建立自动联动
- 建立默认工作流或长期任务原则

### 4.1 v1 默认 promotion 阈值（与阶段 4 联动）

这些阈值定义的是“慢晋升通道”，用于 AI 根据 signals / summaries 自动发现趋势。

- `session -> task_scope/initiative`
  - 同类信号 `explicit_count >= 1`，或 `strong_count >= 2` 且 `session_count >= 2`
- `task_scope -> initiative`
  - 同类信号跨 `>= 2` 个 session，且 `explicit_count >= 1`
- `initiative -> subject/global`
  - 同类信号跨 `>= 3` 个 session，且 `explicit_count >= 1`

`strong_count` 在 v1 中用于“慢通道趋势阈值”，单条 `impact=high` 不应直接触发快通道。

这些阈值只决定“何时生成 pending proposal”，不改变“必须用户确认后才写长期对象”的规则。

用户主导的快通道不受这些阈值限制：

- 用户在 proposal 审核中直接选择作用域时，以用户选择为准生成目标层级 proposal。
- LLM 必须给出 suggested scope、reason 和 future effect，帮助用户理解影响范围。
- 如果用户选择 `global` 或更广作用域的工作流类范围，仍然必须确认，不能后台静默写入。
- 快通道写入目标层级时，不应物理删除旧 scoped record；应记录 `promotes_from` / `supersedes` / `derived_from` 或 tombstone / redirect，保持引用完整。

### 4.2 反证收窄（scope narrowing / recalibration）

v1 允许自动发现“历史画像与新证据方向相反”的情况，并生成 pending proposal：

- 例如：历史记录“某主题熟悉度较低”，新信号明确显示“现在已熟悉”。
- 系统可以自动生成 `subject_profile` 更新 proposal。
- 仍然必须走 confirm / reject / defer，不能静默改写长期画像。

### 5. confirm / reject / defer

实现：

- `GET /adaptation/proposals?status=pending`
- `GET /adaptation/proposals/:id`
- `POST /adaptation/proposals/:id/confirm`
- `POST /adaptation/proposals/:id/reject`
- `POST /adaptation/proposals/:id/defer`
- `GET /adaptation/habits?session_id=...`
- `POST /adaptation/habits/remove-source`

confirm 后：

- 校验 proposal status 是 pending 或 deferred。
- 校验 target_patch 指向允许对象。
- 展示或返回人类可读变更摘要。
- 写入目标 JSON 真源。
- 渲染目标 Markdown 镜像。
- proposal 移动到 confirmed。
- session db 保存 proposal id 引用。
- 相关 indexes 标记 dirty。
- 相关 context cache 失效。

reject 后：

- proposal 移动到 rejected。
- 保存 `review_note`。
- 写入冷却记录，短期不重复生成相似 proposal。

defer 后：

- proposal 移动或标记为 deferred。
- 保留在 inbox 的 deferred 分组。
- 降低提醒优先级。

习惯管理动作边界（必须遵守）：

- `remove-source`：删除长期真源中的已确认习惯。
- 当前 v1 不再提供 project-local suppression 动作；重复候选降噪改由 guidance 沉淀与 proposal merge 承担。

### 6. target patch 白名单

v1 只允许 proposal confirm 写入以下对象：

- `global_guidance`
- `global_policy`
- `subject_profile`
- `subject_policy`
- `initiative_profile`
- `initiative_policy`
- `task_scope`
- `task_scope_policy`
- `artifact_contract`

**不存在 `project_policy` 升级目标**（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../../decisions/project-initiative-decoupling-and-routing.md)）：policy 正文真源只在习惯库五层。长期事项级规则必须升级到 `initiative_policy`；升级到 initiative 具体哪个 bucket 由路由 classifier 决定（高置信度可自动处置，中低置信度进 review gate）。

`project_guidance` 作为工作区引用层 meta，可以在 proposal confirm 阶段接受**非正文 meta 的 patch**（例如更新 `subject_ids` / `task_scope_refs` 引用）；重复候选的缩圈与降噪也应优先沉淀到 guidance，而不是写入新的 policy 对象。

不要允许 proposal 任意 patch 任意路径。

### 7. scope promotion analyzer

实现 promotion analyzer：

```text
signals / summaries / explicit user instruction
  -> promotion candidate
  -> merged proposal
```

Promotion Prompt Contract：

```text
你是用户自适应系统的 promotion analyzer。

任务：
从 signals、summaries、用户显式纠正和工具轨迹中，判断是否存在应该提升到更高作用域的习惯候选。

规则：
- 不要直接写入长期 profile 或 policy。
- 不要把单次临时要求当作长期习惯。
- 高影响候选必须输出为 proposal。
- 必须保留 evidence_refs。
- 必须说明 source_scope、target_scope 和 future_effect。
- rejected proposal 的相似候选应进入冷却，不要反复打扰用户。
```

### 8. in_session_checkpoint

v1 可以支持会话中轻提示，但不能绕过 proposal。

适合提示：

- 用户明确说“以后都这样”“这个项目就按这个规则”“把这个记下来”
- 不确认会导致本轮继续做错
- 该候选与现有规则冲突

默认仍进入 proposal inbox，用户统一处理。

## 阶段完成标准

- proposal candidate 能合并成 pending proposal。
- pending proposal 能 confirm / reject / defer。
- confirm 后能写入目标 JSON 真源并渲染 Markdown。
- reject 后能冷却。
- deferred 不会作为已确认规则注入 context。
- 高影响或跨层级 promotion 不能绕过 proposal。
- `GET /adaptation/proposals?status=pending` 可供 UI 使用。
- `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不做复杂 UI 视觉设计。
- 不做 workflow_profile。
- 不做 global_guidance 后台静默写入。
- 不做任意 JSON patch。
- 不做静默 demotion（只允许生成可审阅 proposal）。
