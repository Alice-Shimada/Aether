# 阶段 4：Signal Extraction 与 Summary Window

## 目标

让系统维护一条独立于 `session scratch` 即时生效链路之外的结构化分析链路：把明确证据、scratch 重复情况和正式习惯触发情况整理成 signals / summaries，为“提醒保存为正式习惯”与“正式习惯的层级维护建议”做准备。

先补一条边界：

- 当前 session 的主运行时路径是 `用户消息 -> session scratch capture -> active/pending -> 当前 session 生效集合`。
- 本阶段的 `signal / summary / proposal` 不应成为 scratch 进入当前 session 的前置门槛。
- 本阶段更适合作为后续分析与维护层：帮助系统发现“哪些 scratch 值得入库”“哪些正式习惯值得调整层级或收窄范围”。
- 慢链路后续一定要继续设计，但 v1 当前优先保证快链路准确：用户消息由 LLM 语义分类，分类结果直接驱动 scratch 捕获；不使用硬编码 regex 或关键词 gate 直接落盘。regex / 关键词线索层在 v1 中先不实现，继续只保留为后续 open question。

当前实现补充（2026-04-17）：

- `after_user_message` 现在先跑“单条用户消息 -> 多个 habit candidates”的 LLM 提取，再把这些 candidates 同步喂给 imported comparator、scratch comparator 与 signal append。
- comparator 任一环节的 LLM 不可用或结构化输出不可解析时，本轮不会写 scratch / signal，也不会把该消息标记为 processed。
- 用户消息提取器当前会先对整批消息做有限次数重跑；如果整批结构仍不稳定，会自动降到按单条消息重跑。重跑仍失败的消息保持未 processed，等待后续重试。
- 提取 prompt 当前进一步收紧为“严格输出合同”：每条输入消息都必须返回一个 `ref + candidates[]` 项；无候选时也必须返回空数组，不允许省略 ref、输出半截 candidate 或在 JSON 前后附加解释文字。
- signal 现在可以从单条用户消息的多个 candidates 派生，而不是继续受限于“单消息单分类”。

这一阶段完成后：

- 用户显式命令“整理当前对话习惯”可生成结构化分析记录
- 用户发言后可运行轻量后台提取，但它不阻塞 scratch capture
- signals 带 evidence refs，不直接改长期 profile / policy，也不直接决定 scratch 是否生效
- summary 可以压缩同类 scratch / signal / usage trend
- 高影响候选只生成 proposal candidate，不直接写长期对象

## 必做项

### 1. signal 存储

signals 统一写入：

```text
MemoryPath.adaptationRoot()/signals/<year>/<month>/signals.jsonl
```

每条 signal 必须包含：

```json
{
  "id": "sig_xxx",
  "session_id": "ses_xxx",
  "created_at": "2026-04-12T00:00:00+08:00",
  "scope": {
    "level": "task_scope",
    "target": "scope_xxx"
  },
  "kind": "workflow_preference",
  "polarity": "positive",
  "confidence": 0.78,
  "explicit": true,
  "temporary": false,
  "stability": "stable",
  "traits": ["workflow:planning_doc_sync"],
  "evidence": [
    {
      "source": "user_message",
      "ref": "msg_xxx",
      "quote": "以后项目规划时，把已拍板写 decisions，未决写 open-questions。"
    }
  ],
  "note": "用户明确确认项目规划讨论的文档沉淀规则。"
}
```

规则：

- signal 必须带 evidence。
- signal 不直接写 profile / policy。
- signal 可以低影响自动写入。
- 高影响 signal 只能触发 proposal candidate。
- 单次临时要求不应直接变长期习惯。
- v1 默认支持 `explicit / temporary / stability / traits`，用于区分“显式快通道”与“慢通道趋势累计”。
- `stability=mutable` 的能力类信号（例如“某主题熟悉度变化”）允许触发“收窄/更新”proposal，但不能直接改长期对象。
- signal 在这一阶段是分析记录，不是 session scratch 的前置替代物；当前 session 的即时生效仍以 scratch capture 为准。

### 2. signal extraction 入口

实现：

- `POST /adaptation/signals/extract`
- on user message committed 后的后台提取钩子
- 用户显式“整理当前对话习惯”的调用入口

`POST /adaptation/signals/extract` 请求：

```json
{
  "session_id": "ses_xxx",
  "mode": "manual_current_session",
  "message_ids": ["msg_a", "msg_b"]
}
```

`mode` v1 建议：

- `manual_current_session`
- `after_user_message`
- `after_summary`

第一版自动提取定义为：用户消息写入 session 后，后端异步对这条新用户消息做轻量分析提取，不要求用户关闭 session，也不要求等待 assistant 回答结束；该提取可以和 scratch capture 并行存在，但不阻塞 scratch capture。

### 3. Signal Extraction Prompt Contract

exact prompt 可以后续调优，但 v1 必须遵守：

```text
你是用户自适应系统的 signal extractor。

任务：
从当前 session 的用户消息中，提取可能代表用户习惯或工作偏好的结构化 signals，用于后续分析、提醒和维护。

规则：
- 只提取有明确证据的内容。
- 直接证据只来自用户消息。
- assistant 文本只能帮助理解“用户在同意或纠正什么”，不能自己作为 signal 证据落盘。
- 每条 signal 必须带 evidence refs。
- 不要直接写 profile、policy、task_scope 或 artifact_contract。
- 不要把一次临时要求当成长期习惯。
- 不要从语气推断深层人格。
- 高影响内容标记 impact=high，并建议进入 proposal candidate。
- 如果证据不足，宁可不输出。
- v1 当前不默认读取文件变更、工具操作或更广证据来源；这部分放到 open question。
- 不要把 signal 当作 scratch capture 的替代结果；如果一条用户消息已经进入 session scratch，signal 仍只是后续分析记录。
- 不得使用 regex fallback 或硬编码关键词作为用户习惯提取依据。
- 如果 LLM 不可用或输出无法解析，不要写 scratch / signal，也不要把该消息标记为 processed；等待后续重试或手动整理。当前允许对结构坏掉的提取结果做有限次数自动重跑，但不能无限循环重跑。

输出 JSON 字段：
- signals
- proposal_candidates
- skipped
```

输出必须 schema 校验。校验失败不写入 signals。

### 4. summary 存储

summary 根据 scope 写入：

```text
global / subject:
  MemoryPath.adaptationRoot()/summaries/

task_scope / artifact:
  MemoryPath.adaptationRoot()/task-scopes/<scope_id>/summaries/
  MemoryPath.adaptationRoot()/artifacts/<artifact_id>/summaries/
```

summary 最小结构：

```json
{
  "id": "sum_xxx",
  "window": {
    "start": "2026-04-12T00:00:00+08:00",
    "end": "2026-04-12T23:59:59+08:00"
  },
  "scope": {
    "level": "task_scope",
    "target": "scope_xxx"
  },
  "session_ids": ["ses_a"],
  "signal_ids": ["sig_a", "sig_b"],
  "highlights": ["用户多次要求规划讨论后同步维护 open-questions。"],
  "patterns": [
    {
      "kind": "planning_doc_sync",
      "strength": 0.84,
      "evidence_count": 3
    }
  ],
  "recommendations": ["生成 initiative_policy 或 task_scope_policy proposal。"]
}
```

### 5. summary window v1 策略

v1 先采用保守触发：

- 用户手动触发“整理当前对话习惯”
- 用户消息写入后异步运行轻量 signal extraction；该步骤只处理当前 session 中尚未 processed 的用户消息
- 用户消息提取完成后，仅当满足以下任一条件才运行 summary：
  - 当前 scope 新增 signals >= 3
  - 本轮存在 `impact=high` 且 `explicit=true` 的信号
- summary 只吸收未 absorbed 的信号；原始 JSONL 不改写
- signal extraction 维护 `indexes/signal-index.json` 中的 processed message refs；同一条 `message_id` 不应因为每轮后台提取而重复生成 signal
- 后续版本可把“同类 scratch 在多个 session 中反复 active”与“正式习惯被多次命中”也纳入 summary 输入；这部分属于当前已接受的方向，但具体对象和 schema 仍待后续设计。

以下作为 vNext / tuning：

- 每 7 天定期 summary
- 多 session 周期性 summary window
- 用户自定义阈值
- 更复杂的趋势评分

### 6. absorbed 标记

被 summary 引用过的 signal 应标记为 `absorbed` 或在索引中记录 absorbed 状态。

第一版可简单实现：

- signal 原始 JSONL 不改写
- 在 `indexes/signal-state.json` 中记录 absorbed signal ids

不要为了标记 absorbed 重写大型 JSONL 文件。

### 7. 生成 proposal candidate

signal extraction 和 summary 可以生成 proposal candidate，但不能确认。

候选必须交给阶段 5 的 proposal merge / deduplicate。

当前认可的候选方向：

- `scratch -> formal habit reminder`
  - 同类 scratch 在多个 session 中重复出现，或
  - 同类 scratch 在多个 session 中都曾进入 `active`
- `confirmed habit -> rescope / maintain proposal`
  - 同一正式习惯在更广范围内被反复命中，系统可建议提升层级
  - 同一正式习惯长期只在更窄上下文命中，系统可建议收窄层级或拆分
- 保留 message-derived signal 作为辅助证据，但它不再单独承担“从 session 直接晋升到长期作用域”的主要职责

其中具体阈值、计数口径和 event schema 仍需后续拍板；本阶段先确立“分析对象从单纯 raw chat signal 扩展到 scratch 与 confirmed habit 的后续使用情况”这一方向。

说明：

- “显式快通道”现在主要对应 scratch capture 与用户主动入库，不应再被描述成“先 signal 再决定当前 session 是否可用”。
- “慢通道”依赖 summary 聚合和跨会话证据，主要服务于入库提醒、层级维护和 rescope 建议。
- 具体阈值后续可调参。

### 7a. session scratch 的状态语义

`session scratch` 是当前 session 里的临时候选，不是长期真源。

- `active`
  表示这条 scratch 已经在当前 session 生效，会进入 context compiler 和 prompt 注入。
- `pending`
  表示系统捕获到了一个候选，但它还没有在当前 session 生效，只在 UI 审查区展示，等待用户激活。
- `capture_confidence`
  表示系统对“这像当前 session 习惯”的把握程度。它可以影响默认把 scratch 放进 `active` 还是 `pending`，但它本身不是状态。

实现约束：

- scratch 只从用户消息中提取。
- “高置信默认 active、低置信默认 pending”是运行时默认策略，不表示高置信就一定是长期习惯。
- scratch 的创建和状态选择不得依赖硬编码正则关键词触发。LLM 分类结果是唯一入口；低置信由 LLM 输出的 `impact / explicit / temporary` 等结构化字段决定。
- `impact / kind / explicit / temporary / traits / note` 这些字段可同时沉淀到 scratch 捕获结果或其派生 signal 中，方便做 UI 文案、去重、冲突处理、跨 session 聚合和后续维护分析；它们不只是“为了存档好看”。

v1 允许增加“LLM 语义归并旁路（shadow）”，但必须满足：

- 只做相似 signal 候选归并，不替代规则链路决策。
- 只增强 proposal candidate，不直接写 profile / policy。
- 默认关闭，只有配置 `semantic_merge` 模型时才启用。
- 归并失败或模型不可用时自动降级为纯规则路径。
- 高影响结论仍必须进入 pending proposal，并由用户 confirm / reject / defer。

高影响候选包括：

- 改变未来默认行动方式
- 文件写入规则
- 工具选择规则
- 自动联动
- 默认工作流
- 长期任务原则

## 阶段完成标准

- `POST /adaptation/signals/extract` 可从明确消息生成 signals。
- signals 写入 JSONL，带 evidence refs。
- 同一条用户消息重复触发 extraction 时返回 `no_new_evidence`，不会重复写 signal。
- 明确高影响内容不会直接写 profile / policy。
- summary 能按 scope 生成并引用 signals。
- absorbed 状态能记录。
- 生成 proposal candidate 但不确认。
- `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不做全局画像静默写入。
- 不做深层人格推断。
- 不做 prompt 极致优化。
- 不做复杂周期调度。
- 不做 proposal UI。
