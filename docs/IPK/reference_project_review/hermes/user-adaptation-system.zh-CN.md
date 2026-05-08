# hermes：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/hermes/hermes-agent`  
> 输出文件：`docs/IPK/reference_project_review/hermes/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `有，而且它把这件事当成长期个人 agent 的核心竞争力`

一句话说明：

> Hermes 把用户自适应做成“USER.md 等显式可编辑用户记忆 + 外部用户建模 provider + session search 辅助回忆”的组合系统，不靠单一 profile 表。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- agent 不只是会做事，还要在长期互动里逐渐“更懂我”。
- 用户不想一遍遍重复偏好、工作习惯、环境约束、常见纠正。
- 一部分用户事实要被稳定带入每轮回答，另一部分则应该从历史会话里按需回忆。
- 如果 agent 在长期使用中学到了稳定 workflow，还应该沉淀为 skills，而不只是记住结果。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 首页直接写 “builds a deepening model of who you are across sessions”。 |
| 代码证据 | `agent/prompt_builder.py` | `MEMORY_GUIDANCE` 明确要求保存用户偏好、环境细节、稳定约定。 |
| 代码证据 | `tools/memory_tool.py` | 明确区分 `USER.md` 与 `MEMORY.md`，前者专门放用户相关事实。 |
| 代码证据 | `hermes_cli/config.py` | `memory.user_profile_enabled` 是正式配置项。 |
| 文档证据 | `plugins/memory/honcho/README.md` | 把 peer card、persistent conclusions、dialectic Q&A 明确当成 user modeling。 |
| 推断 | 基于 README + system prompt 设计 | Hermes 认为“长期关系感”本身就是个人 agent 体验的重要组成部分。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| `USER.md` | 对用户的持久事实、偏好、沟通方式 | 很接近 |
| persistent memory | 跨 session 的紧凑事实层 | 包含用户画像，也包含环境/约定 |
| Honcho peer card / profile | 外部服务维护的用户表示 | 更像动态用户模型 |
| session search | 对历史对话的回忆 | 不是画像本身，但会支撑适配 |
| skills | 从经验中提炼的工作方法 | 不是用户画像，但会让对用户更“懂行” |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| `USER.md` 手工编辑 | 是 | 否 | 是，文件真源 | 维护成本在用户/开发者侧 |
| memory 工具写入 `USER.md` | 可显式提出，也可模型主动调用 | 是 | 是，立即写盘 | 容易把临时说法升格为长期偏好 |
| Honcho 等 provider 同步每轮消息 | 否 | 是 | 是，外部后端 | 自动建模更强，但审计更难 |
| session transcripts | 是 | 否 | 是，session store | 历史对话和长期习惯可能混淆 |
| session_search 总结 | 否 | 是 | 间接，是搜索 + 总结结果 | 总结层有抽象偏差 |

## 4. 用户信息怎样影响行为

```text
会话开始时读取 SOUL + USER.md / MEMORY.md snapshot ->
system prompt 注入 memory guidance 与用户相关快照 ->
本轮开始前可由外部 provider prefetch 相关用户信息 ->
模型回答时根据这些信息改变措辞、工作默认值、工具选择 ->
若用户提到过去事情，可再用 session_search 回忆具体历史 ->
turn 结束后再把新的用户事实同步回 USER.md 或外部 provider
```

说明：

- Hermes 的第一层适配是“每轮都在场的用户事实”。
- 第二层适配是外部 provider 的预取 recall。
- 第三层适配是 session search 对历史互动的补充回忆。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 手工编辑 `USER.md` | 用户/开发者直接维护 | 是 | `tools/memory_tool.py` | 最可审计 |
| memory 工具 `add/replace/remove` | 模型或用户指令调用 | 默认不强制确认 | `tools/memory_tool.py` | 灵活，但治理压力较大 |
| provider 持续观察并建模 | turn 结束后 sync | 否 | `agent/memory_manager.py`、`plugins/memory/honcho/README.md` | 自动化强 |
| 通过 session_search 间接回忆 | 用户提到旧事或模型主动搜 | 否 | `tools/session_search_tool.py` | 回忆力强，但不等于长期画像 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：有，主要在 `USER.md` 或 Honcho profile
- 当前会话事项：有，主要靠 session history / session search
- 环境/项目约定：有，更多放 `MEMORY.md`
- agent 自身风格：有，主要放 `SOUL.md`
- 工作方法沉淀：有，主要放 skills

结论：

> Hermes 实际上把“用户是谁”“我们之前做过什么”“以后怎么更高效做这类事”拆成了三条线：用户记忆、会话回忆、技能沉淀。

## 7. 优点

- `USER.md` 让用户相关事实有显式真源，不必完全黑箱化。
- 外部 provider 让它能支持更强的自动用户建模。
- session search 避免把所有历史都硬塞进长期用户画像。
- 产品语言很明确，长期关系感是核心，不是附加。

## 8. 顾虑

- 模型能主动写 `USER.md`，默认确认门槛偏低。
- `USER.md`、provider profile、session summary 之间可能出现冲突。
- 当系统同时启用 skills 和记忆时，用户很难一眼看清“为什么它现在这样回答我”。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户自适应应该主要靠隐式推断 | 挑战 | Hermes 很重视显式可编辑真源。 |
| 用户画像和历史回忆可以混成一层 | 挑战 | Hermes 明显把 `USER.md` 与 session_search 分开。 |
| 技能沉淀和用户适配关系不大 | 挑战 | Hermes 认为两者共同构成长期体验。 |
| 只做静态 profile 就够 | 挑战 | 外部 provider 表明它还想要动态、持续演化的用户模型。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 也许要把“长期协作关系感”当成真实需求，而不只是答对当前问题。

### 10.2 产品流程的改变

- 可能需要明确拆成：
  - 可编辑用户事实真源；
  - 历史会话回忆；
  - 工作方法沉淀。

### 10.3 程序架构的改变

- 用户自适应不一定是一张 profile 表，可能是“显式文件/记录 + 动态 recall + 技能沉淀”的组合。

### 10.4 只适合保留为启发的点

- Hermes 的完整闭环对轻量产品可能过重，尤其是多 provider + skills + session search 同时启用时。

## 11. 仍需继续读的文件

- `plugins/memory/honcho/__init__.py`
- `plugins/memory/honcho/session.py`
- `tools/skill_manager_tool.py`
