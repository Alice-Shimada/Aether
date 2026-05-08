# 阶段 3：Scope Read、Context Compiler 与模型注入

## 目标

让系统在每次模型请求前，基于当前请求和 `ScopeMatchResult` 读取少量相关长期记录，编译成短小 `context_packet`，并注入模型上下文。

这一阶段完成后：

- 每次模型请求前能轻量运行 `scope matching + scope read`
- `context_packet` 可生成、可缓存、可审计、可展示
- `SessionPrompt.prompt()` 或等价模型请求入口能接入 context compiler
- pending proposal 不会被当成已确认规则注入
- 读取失败时能安全降级

## 必做项

### 1. Context compiler 模块

新增或完善：

- [packages/opencode/src/context/compile.ts](/home/bzz/Aether/packages/opencode/src/context/compile.ts)
- [packages/opencode/src/context/packet.ts](/home/bzz/Aether/packages/opencode/src/context/packet.ts)
- [packages/opencode/src/context/priority.ts](/home/bzz/Aether/packages/opencode/src/context/priority.ts)

核心函数建议：

```ts
compile(input) -> ContextPacket
selectRecords(match, budget) -> SelectedRecords
mergePolicy(records) -> CompiledPolicy
renderPacket(packet) -> string
```

命名可按项目风格调整，但职责必须清楚。

### 2. 读取顺序

根据 `ScopeMatchResult` 读取：

- 当前 artifact_contract
- 当前 primary task_scope
- 当前 project_guidance / global_guidance（两者都已作为工作区 guidance 参与缩圈）
- 当前 subject_profile / subject policy
- 少量 confirmed global_guidance / global_policy
- 必要时读取 linked IPK piece surface 或 summary

当前实现补充：

- `project_guidance` 与 `global_guidance` 现在不仅作为 prompt 背景 section，也作为 query-time 的轻量 guidance。
- 当当前请求没有足够的显式 subject 线索时，可回退使用 `project_guidance.subject_ids` 与 `global_guidance.subject_ids` 的并集缩小候选范围。
- 当 `project_guidance.task_scope_refs` 与 `global_guidance.task_scope_refs` 合并后只有一个候选且当前没有显式 task_scope 时，可把它作为软提示参与 habit 检索。
- 这些 guidance 只影响候选检索，不直接写回 session binding。
- `session binding` 中的 `initiative_id / task_scope_id / subject_ids / artifact_ids` 表示当前 session 的实际挂载状态，不应把 guidance 候选直接当成已挂载结果写回去。

不要读取：

- 全量 signals
- 全量 proposals
- rejected / deferred proposal 作为规则
- pending proposal 作为已确认规则
- 大段 IPK piece 正文
- 全量 Markdown 镜像

### 3. policy 合并

必须遵守：

```text
artifact_contract
  > task_scope policy
  > initiative policy
  > subject policy
  > global policy
```

同时必须遵守更高优先级：

```text
system / developer 指令
  > 当前用户本轮明确要求
  > repo AGENTS.md 等项目级 agent 指令
  > adaptation policy
```

发生冲突时：

- 当前用户本轮明确要求优先。
- 更具体的长期规则优先。
- 更新、更明确、用户确认过的规则优先。
- adaptation policy 不能绕过权限或安全确认。
- audit 中记录被省略或覆盖的规则。

### 4. ContextPacket schema

输出最小结构：

```json
{
  "request_id": "req_xxx",
  "session_id": "ses_xxx",
  "project_id": "proj_aether",
  "initiative_id": "ini_aether_main",
  "task_scope_id": "scope_user_adaptation_v1",
  "subject_ids": ["user-adaptation-system"],
  "artifact_ids": ["artifact_scope_mechanics_zh"],
  "sections": [
    {
      "kind": "operation_policy",
      "source": "initiative_policy",
      "id": "pol_op_planning_doc_sync",
      "text": "项目规划讨论中，已确认决策写入 decisions，未决方向写入 open-questions。"
    }
  ],
  "audit": {
    "used_records": ["initiatives/ini_aether_main/initiative-policy.json"],
    "omitted_reason": [
      "global_guidance omitted because initiative policy is more specific.",
      "initiative policy omitted by project suppression"
    ]
  },
  "created_at": "2026-04-12T00:00:00+08:00"
}
```

### 5. cache 与 session snapshot

允许：

- 完整 context packet 文件写入 `MemoryPath.cacheRoot()/adaptation/context-packets/`
- session db 保存 `context_packet_id`
- session db 保存 `context_packet_snapshot`

必须标明：

- cache 可清理、可重建
- snapshot 仅用于审计、调试、UI 检查
- 二者都不是长期习惯真源

### 6. dirty flag

实现最小 dirty 机制。

下列事件应让下一轮模型请求强制重编译：

- cwd / repo / worktree / project 变化
- 打开文件或用户引用 artifact 变化
- 用户手动切换 task_scope
- proposal confirmed / rejected / deferred
- initiative_policy / task_scope / artifact_contract / subject_profile / global_guidance 写入
- summary window 生成新 summary
- on_session_end 产生新 signals

如果没有 dirty flag 且连续请求上下文很强，可以复用上一轮 matching 结果，但仍要检查当前用户请求是否显式覆盖旧规则。

### 7. 接入模型请求入口

在 [packages/opencode/src/session/prompt.ts](/home/bzz/Aether/packages/opencode/src/session/prompt.ts) 或当前实际模型 prompt 入口中接入：

```text
session + request
  -> scope matching
  -> scope read
  -> context_packet
  -> render adaptation notes
  -> append to model prompt
```

当前 Session 习惯应作为每轮模型请求的实时工作上下文：

- 使用和 UI “当前 Session 习惯”同源的 habit surface 列表。
- 当前代码里，habit surface 只来自 session habit record / session binding 中已引入且已确认的 `habit_ids`。
- global / subject / initiative / task_scope / artifact 习惯都只是候选；它们不能因为层级或绑定本身就强制进入当前 session。
- 当前 `project_guidance` refs、同 project session refs 和 `global_guidance` refs 可为 matching 提供强参考；matching 命中的新候选应进入 session review gate / proposal inbox，只有用户确认写入 `habit_ids` 后才作为 imported 当前 Session 习惯生效。当前代码里，当前 session 中用户明确表达的新局部习惯会进入 session scratch 区：高置信直接 active 并注入，低置信 pending 等待用户确认生效。
- 这里的“当前 Session 习惯”是按请求开始时刻求值的运行时集合，而不是把当前这条用户消息先做一次即时提取后再回灌进同一轮回答。换句话说，本轮回答只读取“本条用户消息之前”已经存在的 imported habits 和 scratch active habits；当前消息中新表达的偏好由模型直接阅读当前消息本身来遵守，后台 `after_user_message` 提取只服务后续轮次。
- 当前实现补充：
  - context packet 现在明确附带“当前用户消息和 repo/system 指令优先于 imported habits、scratch habits 与 adaptation policy”的规则行。
  - imported habits 若已被 active scratch 的 `shadow_ids` 覆盖，则只在 compile audit 中记录 omitted reason，不会继续进入 `habit_ids` / prompt 注入。
- 以 `source=current_session_habit` 的短 section 注入模型，标明 `scope / type / active`。
- 普通任务请求也应注入这些 section，并为其保留预算；不应只在用户询问习惯列表时才注入。

当用户请求本身是在询问“当前 Session 习惯 / 当前习惯 / 习惯列表”时，context compiler 应切换到可解释模式：

- 临时把本轮 context budget 动态放宽到足以容纳已选 section，保证模型能回答 UI 中可见的全量当前习惯，而不是依赖固定条数上限。

注入文本应短小，建议分段：

```text
User adaptation context:
- Current project memory: ...
- Current task habit: ...
- Current artifact rule: ...
- Operation policy: ...
```

如果编译失败：

- 不阻断普通回答
- 不注入可疑长期习惯
- 记录错误事件
- UI 可显示“本轮未使用长期习惯记录”

### 8. `POST /adaptation/context/compile`

实现可调试接口：

```json
{
  "session_id": "ses_xxx",
  "request_id": "req_xxx",
  "request": "请继续实现用户自适应系统",
  "budget": {
    "max_sections": 8,
    "max_chars": 4000
  }
}
```

返回 `ContextPacketView`，用于测试和 UI 检查。

## 阶段完成标准

- 每次模型请求前能生成 context packet。
- context packet 不包含全量长期记忆。
- pending / rejected / deferred proposal 不会作为已确认规则注入。
- policy 覆盖顺序正确。
- 当前用户本轮明确要求能覆盖长期 adaptation policy。
- 编译失败可以安全降级。
- `GET /adaptation/status?session_id=...` 能展示当前 used records 摘要。
- `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不提取新习惯。
- 不确认 proposal。
- 不做完整 UI。
- 不做 vector search。
- 不把 context_packet 当长期真源。
