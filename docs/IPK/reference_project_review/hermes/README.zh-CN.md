# hermes：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/hermes/hermes-agent`  
> 阅读日期：`2026-04-18`  
> 主要关注：personal agent、persistent memory、session search、skills、memory providers

## 0. 一句话定位

`hermes` 主要想解决的是：让一个个人 AI agent 在长期使用中既能持续记住你、又能持续学会怎么更好地帮你做事，而不是每次会话都像第一次见面。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| persistent memory | 跨 session 保留的紧凑事实层 | 长期记忆 |
| user profile | 关于用户偏好、习惯、沟通方式的记忆 | 用户自适应核心区 |
| session search | 对历史对话做 FTS5 搜索再总结 | 跨会话召回 |
| external memory provider | Honcho、Mem0、Holographic 等外挂记忆后端 | 可替换记忆引擎 |
| skills | 从经验沉淀出来的可复用操作知识 | 程序性记忆 / workflow memory |
| closed learning loop | memory + skill + session recall 一起形成自我改进循环 | 用户长期协作闭环 |

## 2. 主要用户流程

```text
用户通过 CLI / Telegram / Discord 等入口与 Hermes 对话 ->
Hermes 在 system prompt 中带入 SOUL + MEMORY/USER 快照 + 技能/上下文文件 ->
必要时搜索 past sessions 或外部 memory provider ->
完成任务后同步本轮对话到 memory provider / session store ->
复杂经验沉淀成 skill，稳定偏好沉淀到 USER.md 或外部用户模型 ->
后续会话继续沿用这些积累
```

## 3. 主要程序流程

```text
用户消息 ->
run_agent.py 组 system prompt ->
MemoryManager 构建 memory prompt / prefetch recall ->
tool loop 执行 memory / session_search / skill_manage 等工具 ->
context engine 必要时做压缩 ->
turn 结束后 sync_all + queue_prefetch_all ->
后台 memory/skill review 继续整理
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位最完整，直接声明“deepening model of who you are” | read |
| `run_agent.py` | 主运行链路、system prompt、memory sync、compression hook | read |
| `agent/prompt_builder.py` | memory / session_search / skills 指导怎样进 prompt | read |
| `agent/memory_manager.py` | 内置 memory 与外部 provider 的统一调度 | read |
| `agent/memory_provider.py` | provider 生命周期和 hook 边界 | read |
| `tools/memory_tool.py` | `MEMORY.md` / `USER.md` 的真源与写入策略 | read |
| `tools/session_search_tool.py` | 历史会话召回流程 | read |
| `hermes_cli/config.py` | memory、user profile、provider、session search 配置 | read |
| `plugins/memory/honcho/README.md` | AI-native 用户建模的正式产品心智 | read |
| `plugins/memory/holographic/README.md` | 本地事实存储型 provider 的另一种方向 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 用户自适应、记忆和技能沉淀三条线绑得很紧，产品闭环很完整。
- 内置 `USER.md`/`MEMORY.md` 给了用户可见真源，同时又允许外挂更强后端。
- `session_search` 明确把“跨会话回忆过去做过什么”和“长期记住用户是谁”拆成两条路。

## 7. 初步顾虑

- 模型可以较主动地写用户相关记忆，治理压力不小。
- 内置文件记忆、session search、外部 provider、skills 一起上时，概念复杂度会明显升高。
- 它明显偏向长期个人 agent，未必适合轻量任务型或多人共享场景。

## 8. 待继续验证的问题

- `plugins/memory/honcho/__init__.py`、`session.py` 还能继续细看更具体的会话映射。
- `plugins/memory/holographic/*` 值得在专题阶段继续读其 SQLite/HRR 细节。
