# openclaw：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/openclaw/openclaw`  
> 阅读日期：`2026-04-18`  
> 主要关注：personal assistant、workspace bootstrap、session routing、memory plugins、active memory

## 0. 一句话定位

`openclaw` 主要想解决的是：把一个个人 AI 助手长期安放在你真实使用的消息渠道和设备上，同时让它的身份、记忆和上下文都尽量落在你自己可控的本地工作区与网关里。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| workspace bootstrap files | `AGENTS.md`、`SOUL.md`、`USER.md` 等会话启动文件 | 用户/agent 长期上下文真源 |
| session routing | 不同渠道、账号、peer 如何映射到 session | 会话隔离策略 |
| memory plugin | `memory-core`、QMD、Honcho 等可替换记忆能力 | 记忆后端层 |
| active memory | 回复前先跑一次受限的记忆子代理 | 主动回忆层 |
| dreaming | 从短期信号晋升长期记忆的后台整理 | 记忆巩固 |
| local-first gateway | 所有渠道和设备都由一个本地网关统一接入 | 控制平面 |

## 2. 主要用户流程

```text
用户配置 gateway、workspace、channels ->
OpenClaw 在 workspace 中维护 AGENTS / SOUL / USER / MEMORY / daily notes ->
真实消息从 WhatsApp / Telegram / Slack 等渠道进入 ->
系统按 routing 规则落到某个 agent + session ->
回合开始前注入 bootstrap files，必要时 active memory 先做 recall ->
agent 回答后把 transcript、daily notes、dreaming 信号继续沉淀 ->
长期行为逐渐变得更贴近该用户和该渠道语境
```

## 3. 主要程序流程

```text
inbound message ->
resolve-route 决定 agentId + sessionKey ->
Agent Runtime 注入 workspace bootstrap files ->
memory-core / active-memory / Honcho 等插件提供 recall 能力 ->
tool loop 执行 ->
session transcript 落盘，memory index / dreaming / wiki 等后处理继续运行
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位、单用户 personal assistant 叙事最完整 | read |
| `docs/concepts/agent.md` | workspace、bootstrap files、session bootstrap 的正式设计 | read |
| `docs/concepts/agent-workspace.md` | 各个工作区文件的职责与真源心智 | read |
| `docs/concepts/session.md` | 会话隔离、DM scope、session 生命周期 | read |
| `docs/concepts/memory.md` | memory 总体产品流、daily notes、dreaming、backends | read |
| `docs/concepts/memory-builtin.md` | 默认 memory backend 的工作方式 | read |
| `docs/concepts/memory-search.md` | `memory_search` 的混合检索逻辑 | read |
| `docs/concepts/active-memory.md` | 主动回忆子代理的产品判断 | read |
| `docs/concepts/memory-honcho.md` | AI-native user modeling 的外接方案 | read |
| `packages/memory-host-sdk/src/host/internal.ts` | memory 文件发现与默认真源识别 | read |
| `packages/memory-host-sdk/src/host/backend-config.ts` | builtin / qmd backend 选择与 collection 组装 | read |
| `extensions/memory-core/index.ts` | memory-core 的 plugin 能力注册 | read |
| `extensions/memory-core/src/tools.ts` | `memory_search` / `memory_get` 的正式行为 | read |
| `extensions/memory-core/src/flush-plan.ts` | 压缩前 memory flush 的正式规则 | read |
| `extensions/active-memory/index.ts` | active memory 的 session 级 recall 逻辑 | read |
| `src/agents/pi-embedded-helpers/bootstrap.ts` | bootstrap file 截断与注入规则 | read |
| `src/auto-reply/reply/post-compaction-context.ts` | compaction 后重新注入 AGENTS.md 关键段落 | read |
| `src/routing/resolve-route.ts` | 路由与 sessionKey 边界 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 用户和 agent 的长期上下文大量保存在可见的 Markdown 文件中，真源感很强。
- session routing、memory plugin、active memory、dreaming 各司其职，概念虽多但边界清晰。
- 特别重视真实消息渠道、多设备节点和单用户长期使用的实际场景。

## 7. 初步顾虑

- 系统能力很强，也意味着概念层次多，新用户理解门槛较高。
- 默认单用户主会话连续性很顺手，但一旦多人可接触，就会暴露隔离风险。
- 用户适配信息分散在 `USER.md`、`AGENTS.md`、session、Honcho、active memory 等多层，需要较强治理。

## 8. 待继续验证的问题

- `memory-wiki` 适合在后续专题里继续看它如何把记忆编译成更结构化知识层。
- `thread-ownership`、`session` 相关扩展值得在多用户/多 agent 专题再补读。
