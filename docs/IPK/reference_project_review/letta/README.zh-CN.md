# letta：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/letta`  
> 阅读日期：`2026-04-18`  
> 主要关注：stateful agents、core/recall/archival memory、sleeptime、git-backed memory

## 0. 一句话定位

`letta` 主要想解决的是：让 agent 在长时间协作里真正“记住人、记住事、记住工作关系”，不要每次对话都从零开始，也不要因为上下文窗口不够就把重要关系丢掉。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| core memory | 永远进 prompt 的核心块记忆 | 始终在场的用户/agent关键上下文 |
| human block | 关于当前用户的重要事实 | 用户长期画像 |
| persona block | agent 自我定位与行为风格 | agent 身份/行为约束 |
| recall memory | 可搜索的历史消息 | 会话历史召回 |
| archival memory | 可长期语义检索的存档记忆 | 长期记忆库 |
| sleeptime | 后台记忆整理线程/子 agent | 后处理记忆巩固 |
| git-backed memory | 用文件系统/提交历史来管理记忆块 | 可审计、可版本化的结构记忆 |

## 2. 主要用户流程

```text
创建 agent，并初始化 human/persona 等 memory blocks ->
用户持续发消息 ->
agent 在回答过程中可查询对话历史、查询 archival memory、修改 core memory ->
上下文压力变大时自动 compact ->
需要时由 sleeptime / git-backed memory 把记忆进一步整理成更稳定形态
```

## 3. 主要程序流程

```text
CreateAgent(memory_blocks, tools, model, tags) ->
AgentLoop.load() 选择标准 loop 或 sleeptime loop ->
系统 prompt + core memory + summary memory + messages + tools 一起送模型 ->
模型可调用 conversation_search / archival_memory_search / core_memory_* / memory_* ->
必要时触发 compact_messages() ->
消息、块记忆、archive 分别持久化
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位、agent 创建方式、memory blocks 对外心智 | read |
| `letta/constants.py` | base tools、memory tools、persona/human 默认定义 | read |
| `letta/schemas/block.py` | human/persona/block 的正式数据结构 | read |
| `letta/schemas/memory.py` | core memory 渲染方式、git memory 表达形式 | read |
| `letta/schemas/agent.py` | agent 状态、message buffer、sleeptime、blocks/archives 关系 | read |
| `letta/agents/agent_loop.py` | 运行时 loop 选择逻辑 | read |
| `letta/functions/function_sets/base.py` | conversation / archival / core memory 工具定义 | read |
| `letta/services/archive_manager.py` | archival memory 作为 archive 的管理入口 | read |
| `letta/services/summarizer/compact.py` | 对话 compact 和摘要链路 | read |
| `letta/templates/summary_request_text.j2` | compact 时保留用户事实的 prompt 心智 | read |
| `letta/server/server.py` | git-backed memory 创建与标签转换逻辑 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 直接把“用户是谁、agent 是谁、过去发生过什么”做成一套清楚的产品语义。
- 记忆层次分得比较实：core、recall、archival、summary、optional git memory。
- 允许 agent 在运行时主动整理记忆，而不是只做被动检索。

## 7. 初步顾虑

- 用户自适应高度依赖模型自己写记忆，误写和过度泛化风险不小。
- core memory、summary、archival、git memory、sleeptime 叠加后，系统复杂度明显上升。
- `human` 和 `persona` 这种强人格化框架，并不适合所有任务型产品。

## 8. 待继续验证的问题

- `letta/agents/letta_agent_v2.py` 与 `letta_agent_v3.py` 的真实差异还可在跨项目阶段补读。
- `letta/services/block_manager_git.py` 和 `memory_repo/*` 值得在“可审计记忆”专题里继续深读。
