# openclaw：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/openclaw/openclaw`

## 0. 阅读目标

- 判断它是如何把“个人助手”落到真实渠道和本地工作区中的。
- 找到用户自适应是主要靠工作区文件、session 路由，还是自动用户建模。
- 找到记忆的真源、检索、主动回忆和压缩前保护链路。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | personal assistant、multi-channel、single-user 心智 |
| 文档证据 | `docs/concepts/agent.md` | workspace bootstrap files 与 session bootstrap |
| 文档证据 | `docs/concepts/agent-workspace.md` | 各类文件职责和工作区真源 |
| 文档证据 | `docs/concepts/session.md` | DM scope、session 生命周期、隔离风险 |
| 文档证据 | `docs/concepts/memory.md` | `MEMORY.md`、daily notes、dreaming、active memory |
| 文档证据 | `docs/concepts/memory-builtin.md` | SQLite + hybrid search |
| 文档证据 | `docs/concepts/memory-search.md` | embeddings + BM25 + session memory |
| 文档证据 | `docs/concepts/active-memory.md` | 回复前的 bounded recall sub-agent |
| 文档证据 | `docs/concepts/memory-honcho.md` | 外接 AI-native user modeling |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `packages/memory-host-sdk/src/host/internal.ts` | 默认 memory 文件发现、`MEMORY.md` / `memory/` / `DREAMS.md` |
| 代码证据 | `packages/memory-host-sdk/src/host/backend-config.ts` | builtin / qmd backend 配置与默认 collections |
| 代码证据 | `extensions/memory-core/index.ts` | memory-core plugin 注册 recall/CLI/dreaming |
| 代码证据 | `extensions/memory-core/src/tools.ts` | `memory_search` / `memory_get` 的实际行为 |
| 代码证据 | `extensions/memory-core/src/flush-plan.ts` | pre-compaction memory flush |
| 代码证据 | `extensions/memory-core/src/prompt-section.ts` | memory recall 进 prompt 的规则 |
| 代码证据 | `extensions/active-memory/index.ts` | 主动回忆插件 |
| 代码证据 | `src/agents/pi-embedded-helpers/bootstrap.ts` | bootstrap files 注入与截断 |
| 代码证据 | `src/auto-reply/reply/post-compaction-context.ts` | compaction 后重新注入 AGENTS 关键段 |
| 代码证据 | `src/routing/resolve-route.ts` | sessionKey 与路由隔离 |

## 3. 当前已确认的主链路

### 3.1 用户上下文注入

```text
workspace 中的 AGENTS / SOUL / TOOLS / IDENTITY / USER ->
session start 时注入 ->
大文件会截断，但保留文件名与真源语义 ->
compaction 后还会重新注入 AGENTS 关键段
```

### 3.2 记忆读取

```text
memory-core 注册 memory_search / memory_get ->
默认搜索 MEMORY.md + memory/*.md + 可选 session transcripts ->
有 embeddings 时走 hybrid search ->
active-memory 可在主回复前先跑一次 recall
```

### 3.3 记忆写入与保护

```text
日常 durable memory 写入 memory/YYYY-MM-DD.md ->
长期 curated memory 保存在 MEMORY.md ->
compaction 前先运行 memory flush ->
dreaming 再把短期信号有选择地晋升到长期层
```

### 3.4 会话隔离

```text
inbound message ->
resolve-route 计算 agentId + sessionKey ->
默认 DM 共用 main session ->
多用户时需启用 per-peer / per-channel-peer 等隔离
```

## 4. 第一轮最重要发现

1. OpenClaw 很强调“显式文件真源”，而不是隐藏式 profile 数据库。
2. 用户自适应并不只是一份 `USER.md`，还分散在 `AGENTS.md`、路由、session scope、active memory 里。
3. memory 系统被清楚拆成文件真源、检索索引、主动回忆、dreaming 巩固几个层次。
4. 它对多人风险并不回避，文档明确提醒默认 DM 共用 session 只适合单用户。

## 5. 仍可补读但不阻塞首轮结论的区域

- `extensions/memory-wiki/*`
- `extensions/thread-ownership/*`
- `src/agents/workspace.ts`

## 6. 当前推断

- 推断：OpenClaw 真正追求的是“用户自己可控的长期个人助手”，所以把很多长期信息都放进本地工作区而不是平台黑箱。
- 推断：它认为用户自适应与记忆系统相关，但不应完全重叠，尤其 session 隔离与用户建模是不同问题。
