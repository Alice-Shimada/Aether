# openclaw：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/openclaw/openclaw`  
> 输出文件：`docs/IPK/reference_project_review/openclaw/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `有，但默认不是黑箱画像服务，而是“工作区真源 + 会话隔离 + 可选主动回忆/外接建模”的组合`

一句话说明：

> OpenClaw 默认先让用户把长期偏好、称呼、边界、身份关系写进工作区文件，并通过 session 路由保证“到底是谁在和谁说话”；在这个基础上，再叠加 active memory 或 Honcho 一类更自动化的适配能力。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- 助手应该像“我自己设备里的个人助手”，而不是平台里一个失控的黑箱代理。
- 用户和 agent 的长期关系需要明确写在自己可编辑的工作区文件里。
- 不同渠道、不同联系人是否共享上下文，是产品行为问题，必须显式治理。
- 更自然的长期适配可以加，但不能牺牲本地可控性和审计感。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 直接强调 personal AI assistant、single-user、本地设备与真实渠道。 |
| 文档证据 | `docs/concepts/agent.md` | `USER.md`、`SOUL.md`、`IDENTITY.md` 被当成正式 bootstrap files。 |
| 文档证据 | `docs/concepts/agent-workspace.md` | 工作区被明确描述成 agent 的 home 与 memory。 |
| 文档证据 | `docs/concepts/session.md` | 明确警告多人 DM 共享 session 会造成隐私泄漏。 |
| 文档证据 | `docs/concepts/active-memory.md` | 它认为很多 memory 系统“太被动”，所以增加主动 recall。 |
| 文档证据 | `docs/concepts/memory-honcho.md` | 外接 Honcho 时才引入更强的自动用户建模。 |
| 推断 | 基于工作区 + 路由 + active-memory 组合 | OpenClaw 认为“认清是谁在说话”和“知道这个人长期偏好”都属于用户适配，但来源不必只有一种。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| `USER.md` | 用户资料、偏好、称呼方式 | 很接近 |
| `AGENTS.md` | agent 操作规则，也常含如何对待当前用户 | 部分重叠 |
| session `dmScope` | 多个联系人是否共用上下文 | 不是画像，但决定适配边界 |
| `identityLinks` | 同一用户跨渠道是否视为同一人 | 用户身份解析层 |
| active memory | 回复前先做一次 bounded recall | 辅助适配层 |
| Honcho user model | 自动形成的跨 session 用户表示 | 动态画像层 |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| `USER.md` | 是 | 否 | 是，文件真源 | 维护成本在用户/运营侧 |
| `AGENTS.md` / `SOUL.md` / `IDENTITY.md` | 是 | 否 | 是，文件真源 | 用户信息可能和 agent 规则混放 |
| session 路由与 `identityLinks` | 是，配置驱动 | 否 | 是，配置真源 | 配错会导致串上下文 |
| active memory | 否 | 是 | 间接，有 session 与 memory 搜索支撑 | 召回判断可能偏 |
| Honcho | 否 | 是 | 是，外部服务 | 自动画像更强，但更黑箱 |

## 4. 用户信息怎样影响行为

```text
session 路由先决定这条消息属于哪个 sessionKey ->
会话启动时注入 USER.md / AGENTS.md / SOUL.md 等 bootstrap files ->
主回复前可选 active-memory 先做一轮 recall ->
模型据此调整称呼、边界、默认流程、回忆内容 ->
若启用 Honcho，还能在跨 session / 跨渠道上带入动态用户模型
```

说明：

- OpenClaw 的第一层适配不是搜索，而是 session 边界与 bootstrap files。
- 第二层适配才是 active memory 这种主动 recall。
- 第三层适配是外接 Honcho 这类自动用户建模能力。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 编辑 `USER.md` / `AGENTS.md` 等 | 用户/运营直接维护 | 是 | `docs/concepts/agent.md`、`agent-workspace.md` | 最可控 |
| 变更 `dmScope` / `identityLinks` | 配置修改 | 是 | `docs/concepts/session.md`、`src/routing/resolve-route.ts` | 决定隔离边界，影响很大 |
| active memory recall | session 级运行 | 否 | `docs/concepts/active-memory.md`、`extensions/active-memory/index.ts` | 主动而受限 |
| Honcho 自动建模 | 每轮后持久化 | 否 | `docs/concepts/memory-honcho.md` | 自动能力更强 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：有，主要在 `USER.md`
- agent 自身风格：有，在 `SOUL.md` 与 `IDENTITY.md`
- 用户与 agent 的行为规则：有，在 `AGENTS.md`
- 当前联系人是不是同一人：有，在 `dmScope` / `identityLinks`
- 历史相关回忆：有，主要在 active memory / memory search / session

结论：

> OpenClaw 明显把“用户自适应”拆成了两类问题：一类是谁、怎么称呼、默认怎么互动；另一类是当前这条消息应该跟哪段长期历史接上。

## 7. 优点

- 工作区文件真源非常适合单用户 personal assistant 场景。
- 会话隔离被当成一等公民，而不是后补安全细节。
- active memory 说明它意识到“会搜索 memory”不等于“会自然地在该回忆时回忆”。
- 允许从显式真源逐步升级到更自动的 Honcho 模型。

## 8. 顾虑

- 用户适配信息分布在多个文件和插件里，新用户不容易形成统一心智。
- 默认 DM 共用 main session 对单用户很好，但在半开放环境很危险。
- `AGENTS.md` 既可能写规则又可能写用户信息，职责有时会偏混。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户画像主要应由系统自动学习 | 挑战 | OpenClaw 先强调显式、可编辑真源。 |
| 多人隔离主要是权限问题，不算适配问题 | 挑战 | OpenClaw 说明 session 边界直接决定“适配给谁”。 |
| 回忆能力和用户适配是同一件事 | 补充 | 它们有关，但 active memory 和 `USER.md` 仍是不同层。 |
| 单一画像层足够 | 挑战 | OpenClaw 同时使用 bootstrap files、routing、active recall、Honcho。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 也许应更重视“用户可控的长期真源”，而不只追求自动画像能力。

### 10.2 产品流程的改变

- 也许需要显式回答：
  - 这条消息属于谁；
  - 这位用户的长期真源是什么；
  - 当前回复前是否要主动回忆。

### 10.3 程序架构的改变

- 用户适配层可以分为：
  - 身份/隔离解析；
  - 显式用户事实真源；
  - 主动 recall；
  - 可选自动用户建模。

### 10.4 只适合保留为启发的点

- OpenClaw 的多渠道、多节点、单用户 personal assistant 语境很强，不必照搬全部产品假设。

## 11. 仍需继续读的文件

- `src/agents/workspace.ts`
- `extensions/memory-wiki/*`
- `extensions/thread-ownership/*`
