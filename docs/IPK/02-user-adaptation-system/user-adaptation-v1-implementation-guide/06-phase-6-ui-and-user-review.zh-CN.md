# 阶段 6：Web UI、当前区域习惯检查与用户审阅

## 目标

把用户自适应系统的最小可检查能力接到 Aether Web UI 上。

这一阶段完成后，用户应该能：

- 打开 adaptation 管理入口
- 查看当前 session / project 正在使用哪些习惯记录
- 查看当前 context packet 摘要
- 统一处理 pending proposals
- 手动触发“整理当前对话习惯”
- 查看 task_scope、artifact_contract、profile / policy 的 Markdown 镜像摘要

## 必做项

### 1. 前端 context

新增：

- [packages/app/src/context/adaptation.tsx](/home/bzz/Aether/packages/app/src/context/adaptation.tsx)

职责：

- 拉取 `GET /adaptation/status?session_id=...`
- 拉取 pending proposals
- 拉取 `GET /adaptation/habits?session_id=...`
- 触发 proposal confirm / reject / defer
- 触发 `POST /adaptation/signals/extract`
- 触发 `POST /adaptation/habits/remove-source`
- 暴露 loading / error / refresh

前端第一版可直接 `fetch("/adaptation/*")`，不要求先接 typed SDK。

### 2. adaptation 管理入口

新增：

- [packages/app/src/components/adaptation-menu.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-menu.tsx)

入口可以放在现有右侧菜单、session 工具区或与 IPK 库同级位置。

第一版菜单至少包含：

- `当前 Session 习惯`
- `审查暂存习惯`
- `整理当前对话`
- `模型设置`（可选，包含 `semantic_merge` 语义归并候选模型；未配置则保持关闭）

不要第一版就做完整五层浏览器。

- session 顶部应新增 `暂存习惯` 按钮，只查看当前 session scratch habits，包括已生效的 active scratch 和等待用户确认生效的 pending scratch。
- 左侧审查入口当前实现为 `习惯审查` 对话框，默认以 `审查暂存习惯` 分区展示 active scratch items，并同时提供 `正式习惯审查` 与 `当前 session 建议` 两个分区。
- pending scratch 不进入左侧入库审查；用户需要先在当前 session 暂存习惯视图里确认它生效。
- active scratch 入库审查卡片应显示相似暂存习惯在所有记录中出现了几次，并提供“入库后把其他 session 中相似暂存习惯标记为已处理”的用户可选动作。

### 3. 当前区域习惯摘要

新增：

- [packages/app/src/components/adaptation-current-context-dialog.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-current-context-dialog.tsx)

展示：

- 当前 `adaptation_project_id` 的用户可读名称
- 当前 primary task_scope
- 命中的 subject
- 命中的 artifact_contract
- 本轮 context_packet sections
- `audit.used_records`
- `audit.omitted_reason`
- pending proposal 提醒，但不把 pending 当规则展示
- 当前项目可管理的已确认习惯列表
- 每条习惯的两个分离动作：`从真源移除` 与 `仅本项目禁用`

用户可见文案建议：

- “当前项目记忆”
- “当前任务习惯”
- “当前文件规则”
- “本轮使用的习惯”
- “为什么命中”

当前 Session 习惯视图的语义：

- 对用户主视图来说，不应直接把 `context_packet.sections` 原样摊开；它们可以作为内部调试和高级详情来源，但主列表应以用户可读习惯条目为核心。
- habit surface 使用和后端 `/adaptation/habits?session_id=...` 一致的过滤：已经引入当前 session 的 `habit_ids` 可见；global / subject / initiative / task_scope / artifact 习惯都只有匹配并进入 session 后才显示为当前习惯。
- 模型请求入口应让 context compiler 每轮注入同源当前习惯；用户询问“当前 Session 习惯 / 当前习惯 / 习惯列表”时，聊天回答应能覆盖 UI 中可见的完整当前习惯。
- 高层级 global / subject 习惯第一版只展示，不直接提供“从真源移除 / 仅本项目禁用”按钮；这些危险操作先保留给 initiative / task_scope 级可管理习惯。

- 当前 Session 习惯视图已拆成 `已引用正式习惯` 与 `当前 session 暂存习惯` 两组；暂存习惯要显示 `active / pending / superseded / promoted` 等用户可读状态。
- imported confirmed habits 与 session-local scratch habits 必须在 UI 上明确区分，避免用户误把 scratch 当作已入库真源。
- 捕获分级、入库建议和重复提示都必须用用户能理解的话说明，不应把长串底层 id 当作主要解释文本。
- 当前 Session 习惯的默认主视图只展示“当前已生效”的条目；每条条目至少要显示：习惯概括、所属层级、置信度。
- 命中情况先保留结构化接口，后续用于习惯作用范围、置信度提升或下降、命中次数统计。原先 `audit.used_records / omitted_reason` 那类“命中记录”属于编译器审计信息，不等于“某条习惯是否被触发”。如果未来要暴露命中情况，应放进对应习惯条目里，用用户可读文案表达，例如“本轮已注入当前上下文”，而不是单独列原始调试字符串。
- 当前实现补充：
  - `暂存习惯` 对话框已经增加 pending conflict review 区，按 candidate 分组展示 imported/scratch 冲突、AI comparison summary、evidence quote 与 message jump。
  - 用户可直接选择“保留现有要求 / 采用候选 / 输入新的局部解决要求”；自由输入会直接生成覆盖当前冲突组的 active scratch。
  - scratch evidence 现在逐条展示 `quote + reason`，并支持跳到同一 session 的原始消息。

避免把底层字段直接暴露为主要 UI：

- `scope.level`
- `target_patch`
- `context_packet_id`
- `adaptation_project_id`

这些可以放在高级详情。

习惯管理 UI 的边界要求：

- “从真源移除”必须是明确操作，不得默认触发。
- “仅本项目禁用”不得写入或删除长期真源。
- 已被项目禁用的习惯应有清晰状态提示，避免用户误判为已删除。

### 4. Proposal Inbox

新增：

- [packages/app/src/components/adaptation-proposal-inbox-dialog.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-proposal-inbox-dialog.tsx)

最小功能：

- 列出 pending proposals
- 列出 deferred proposals
- 按 impact 排序
- 按 scope 分组
- 显示 evidence refs 摘要
- 对长期 proposal 显示写入目标
- 显示 future_effect
- 对长期 proposal 显示系统建议作用域
- 对长期 proposal 支持用户在确认前查看五层作用域候选：`当前任务 / 当前文件规则 / 当前长期事项 / 该主题 / 全局`
- v1 UI 要求：五层都显示；没有具体 target 的层级置灰；`artifact` 如果后端 direct promote 尚未完成，可先显示为不可选说明项，而不是直接缺席
- 对 session review item 复用同一入口，但不要求 `target_patch` 或作用域选择；它们应显示 `suggest_add / suggest_remove` 动作、原始 habit scope 与 review reason
- 支持 confirm
- 支持 reject
- 支持 defer

每条 proposal 至少展示：

- 系统建议记住什么
- 来自哪些证据
- 建议应用到哪里
- 确认后会改变什么
- 以后会怎样影响回答或行动

按钮文案建议：

- `确认并应用`
- `拒绝`
- `暂缓`
- `查看详情`

不要每条 proposal 出现时立刻弹窗打断用户。

### 5. 整理当前对话入口

新增：

- [packages/app/src/components/adaptation-organize-session-button.tsx](/home/bzz/Aether/packages/app/src/components/adaptation-organize-session-button.tsx)

按钮行为：

```text
用户点击
  -> POST /adaptation/signals/extract
  -> 后端生成 signals / summaries / proposal candidates
  -> merge / deduplicate
  -> 刷新 proposal inbox
```

完成后提示：

- 提取到几条 signal
- 生成或合并了几条 proposal
- 是否有新的暂存习惯或正式审查项
- 如果没有新消息可处理，允许返回 `no_new_evidence`，不要重复生成旧 signal

不要直接告诉用户“已修改全局画像”，除非用户确认了 proposal。

### 6. Markdown 镜像查看

UI 中可以提供只读查看：

- global guidance 镜像
- subject profile 镜像
- project guidance 镜像
- task_scope mirror
- artifact_contract mirror

第一版不做 Markdown 编辑回写 JSON。

如果用户想修改习惯，应通过 proposal 或后续专门编辑入口，而不是手改镜像。

### 7. in-session checkpoint UI

当后端返回明确高影响候选时，可显示轻提示：

```text
我发现这可能是一条以后也要遵守的工作规则。它已经写入当前 session 的暂存习惯，你可以现在去审查是否入库。
```

默认按钮：

- `放入待确认`
- `这次不用`
- `暂时别提醒`

即使用户点“放入待确认”，也只是进入 pending proposal，不直接写长期对象。

## 阶段完成标准

- Web UI 有 adaptation 管理入口。
- 用户能查看当前区域正在使用哪些习惯。
- 用户能看到 context packet 可检查摘要。
- 用户能打开 proposal inbox。
- 用户能 confirm / reject / defer proposal。
- 用户能手动整理当前对话习惯。
- 用户能在 UI 中对已确认习惯执行两种分离动作（删真源 / 仅项目禁用）。
- pending proposal 不会被 UI 描述成“已生效规则”。
- `packages/app` 和 `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不做完整五层可视化地图。
- 不做高级设置页。
- 不做 memory root 设置 UI。
- 不做 Markdown 编辑回写。
- 不做复杂批量编辑器。
- 不做 workflow_profile UI。
