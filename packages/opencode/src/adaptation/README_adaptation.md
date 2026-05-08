# Adaptation Code Navigation

日期：2026-04-17  
用途：给 Codex 的后端用户自适应系统代码导航。先读本文件，再按任务读取具体代码，避免一次性读完整目录。

## 0. 先读哪些设计文档

改本目录前，先按影响范围读取：

- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-navigation-map.zh-CN.md`
  后续 Codex 的总入口：告诉你要改某类行为时先读哪些文档和代码。
- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-module-contracts.zh-CN.md`
  模块契约：说明输入、输出、上下游和不能擅自改变的行为。
- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-change-impact-checklist.zh-CN.md`
  非局部改动前的影响分析表。
- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md`
  最高架构约束：任何 adaptation 改动前必读。

如果改动涉及 `new habit extraction`、`session scratch`、`imported conflict` 或 `scratch merge`，还必须读：

- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md`

## 1. 这个目录做什么

`packages/opencode/src/adaptation/` 是后端用户自适应系统的主实现目录。

它负责：

- 维护 confirmed 习惯库、工作区引用层和 session binding。
- 从用户消息中提取 signal / scratch habit / proposal。
- 管理 session scratch habits 和冲突审阅。
- 把 imported confirmed habits 和 active scratch habits 提供给运行时 context。
- 管理 proposal inbox、promotion、索引、模型设置和镜像渲染。

它不负责：

- 前端展示和用户点击交互。那在 `packages/app/src/context/adaptation.tsx` 与 `packages/app/src/components/adaptation-*.tsx`。
- 最终 prompt 注入文本的总装配。那主要在 `packages/opencode/src/context/compile.ts` 与 `packages/opencode/src/context/packet.ts`。
- IPK 内容库 piece / map / ingestion。那在 `packages/opencode/src/ipk/`。

## 2. 任务到文件的快速入口

| 你要做什么 | 先读 | 再读 | 必须一起检查 |
|---|---|---|---|
| 改数据结构、状态、scope | `types.ts` | `storage.ts`、routes、frontend context | schema 文档、SDK、UI 类型 |
| 改存储目录或文件落点 | `storage.ts` | `profile.ts`、`session.ts`、`scratch.ts` | storage access contract、top-level constraint |
| 改对外后端能力 | `index.ts` | routes、对应实现文件 | frontend context、SDK |
| 改 session binding | `session.ts` | `project.ts`、`packages/opencode/src/context/compile.ts` | current context UI、status API |
| 改 global/project/subject/initiative 记录 | `profile.ts` | `proposal.ts`、`packages/opencode/src/context/compile.ts` | 五层 scope 与工作区引用层边界 |
| 改 scratch habit 合并或冲突 | `scratch.ts` | `llm.ts`、`types.ts`、`index.ts` | scratch UI、new_habits_get plan |
| 改用户消息后提取 | `signal.ts`、`llm.ts` | `scratch.ts`、`summary.ts`、`proposal.ts` | evidence 规则、model routing |
| 改 proposal / promotion | `proposal.ts` | `profile.ts`、`session.ts`、`summary.ts` | proposal inbox UI、open questions |
| 改索引或召回 | `indexes.ts` | `habit.ts`、`habit-classify.ts`、`semantic.ts` | 索引是派生层，不能变成真源 |
| 改模型配置 | `model.ts` | `llm.ts`、`habit-classify.ts`、`semantic.ts` | `llm-model-routing-guard`、前端模型设置 |
| 改镜像 Markdown 输出 | `render.ts` | `storage.ts` | 不改变 JSON 真源语义 |

## 3. 文件职责

### `types.ts`

所有核心对象的 schema 和导出类型。这里是前后端和文档最容易漂移的地方。

不能擅自改变：

- `HabitScopeLevel` 只表示习惯库五层：`global / subject / initiative / task_scope / artifact`。
- `RuntimeScopeLevel` 可以包含 `session`，但这只是运行时承载，不是 confirmed 习惯库 scope。
- scratch evidence 当前只允许 `user_message` 和 `review_input`；扩大证据来源需要用户拍板。

### `storage.ts`

本地存储根和文件写入工具。

关键边界：

- `global / subjects / initiatives / task-scopes / artifacts` 是 confirmed 习惯库顶层平行空间。
- `workspace/projects` 是 Aether 工作区引用层。
- `bindings/sessions` 是 session binding。
- `cache/context-packets` 是运行时缓存。

### `index.ts`

`Adaptation` namespace 的服务入口。后端 routes 和前端能力通常通过这里间接使用具体模块。

改这里时要注意：它经常把多个模块串起来，比如 confirm proposal 后刷新 binding、重新 compile context。

### `session.ts`

维护 session binding。它回答：

- 当前 session 属于哪个 project。
- 当前 session 引用了哪些 habit ids。
- 当前 session 的 initiative / task_scope / subjects / artifacts 是什么。

它不保存 habit 正文。

### `profile.ts`

读写 global guidance、project guidance、subject profile/policy、initiative profile/policy。

注意：

- `project_guidance` 是工作区引用层，不是 `initiative_profile`。
- guidance 负责缩小候选范围，不直接让某条习惯自动生效。

### `scratch.ts`

session scratch habits 的核心文件。

主要流程：

1. 读取当前 session scratch store。
2. 找出当前 imported habits。
3. 新 candidate 先和 imported habits 对比。
4. overlap 记录 hit，不创建 scratch。
5. conflict 生成 review，不改 confirmed 真源。
6. 无 imported 阻塞时，再和 scratch habits 对比。
7. 处理 merge、supersede、pending、active、review。

改它时最容易影响：

- 当前用户消息是否会被旧习惯压过。
- active / pending 规则。
- imported conflict 是否误改长期真源。
- scratch UI 是否能正确展示。

### `llm.ts`

LLM 判断层，包括候选提取、candidate-vs-imported、candidate-vs-scratch。

规则：

- LLM 只判断关系和生成说明，不直接写入数据。
- 新 LLM 用途应优先映射到现有 `AdaptationModelKind`。

### `signal.ts` / `summary.ts`

慢链路证据和阶段压缩。它们用于 signal、summary、proposal candidate，不应抢过 session scratch 快链路的当前要求优先级。

### `proposal.ts`

proposal inbox、confirm / reject / defer、promotion 和 target patch 应用。

改它时必须检查：

- 高影响长期习惯是否仍需要用户确认。
- session review proposal 是否仍只改 session binding。
- confirm 后是否需要刷新 binding 和 context。

### `indexes.ts`

派生索引层。它帮助检索和解释，但不是长期习惯真源。

不能擅自改变：

- index / graph / classified surface 不能直接决定 habit 生效。
- 若索引生成逻辑使用 LLM 分类，必须保持模型路由可配置。

### `habit.ts`

把 policy/profile 等长期对象投影成可供 session 使用的 habit surface。改它时要检查 context compile 和 current context UI。

### `project.ts`

解析 session 到 project/worktree 的轻量映射。不要把 Aether project 直接当成 initiative。

### `policy.ts`

合并和渲染 response / operation policy。改排序、优先级或合并规则时要检查 context packet。

### `render.ts`

把 JSON 记录渲染成 Markdown mirror，便于人读。不要把 mirror 当成真源。

### `model.ts`

adaptation LLM 子任务的模型配置。新增模型 kind 是最后手段，需要同步后端、前端设置和文档。

## 4. 主要数据流

### 当前 session 上下文注入

```text
session id
  -> session binding
  -> project guidance / global guidance / confirmed habit surfaces
  -> active scratch habits
  -> context/compile.ts
  -> context packet
  -> context/packet.ts renders prompt text
```

### 用户消息后的新习惯快链路

```text
user message
  -> llm candidate extraction
  -> candidate vs imported habits
  -> imported overlap hit OR imported conflict review
  -> candidate vs scratch habits
  -> active/pending scratch OR scratch conflict review
  -> frontend refresh/review
```

### 慢链路

```text
signals
  -> summaries
  -> proposal candidates
  -> proposal inbox
  -> user confirm/reject/defer
  -> confirmed records / session binding
```

## 5. 改动前必须问的问题

- 这次改动会不会改变用户可见行为？
- 有没有用户还没拍板的逻辑？
- 会不会把 confirmed 真源、工作区引用层、session scratch 混在一起？
- 会不会让旧习惯压过用户当前消息？
- 是否要同步 `packages/app/src/context/adaptation.tsx` 或 `packages/app/src/components/adaptation-*.tsx`？
- 是否要重新生成 SDK？
- 是否要更新 IPK 文档和 open questions？

如果答案不清楚，先写改动影响分析，不要直接改代码。
