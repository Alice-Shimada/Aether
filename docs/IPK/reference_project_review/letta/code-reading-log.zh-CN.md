# letta：代码阅读日志

> 状态：首轮主链路已阅读  
> 项目路径：`/home/bzz/Aether/reference_project/letta`

## 1. 本轮阅读目标

- 弄清它是不是把“用户自适应”直接做成 memory 的一部分。
- 弄清它的短期记忆、长期记忆、摘要压缩和后台整理之间怎么分工。
- 找到用户信息进入行为链路的具体位置，而不是只看 README 口号。

## 2. 已阅读文件

### 2.1 项目定位与对外心智

- `README.md`

### 2.2 数据结构与状态对象

- `letta/constants.py`
- `letta/schemas/block.py`
- `letta/schemas/memory.py`
- `letta/schemas/agent.py`

### 2.3 运行时主链路

- `letta/agents/agent_loop.py`
- `letta/functions/function_sets/base.py`

### 2.4 存储与记忆管理

- `letta/services/archive_manager.py`
- `letta/server/server.py`

### 2.5 压缩与总结

- `letta/services/summarizer/compact.py`
- `letta/templates/summary_request_text.j2`

## 3. 当前确认的关键事实

| 类型 | 位置 | 结论 |
| --- | --- | --- |
| 文档证据 | `README.md` | 创建 agent 时显式传入 `memory_blocks`，且示例默认就是 `human` 与 `persona`。 |
| 代码证据 | `letta/schemas/block.py` | `Human` 和 `Persona` 是正式 block 类型，不是示例里的临时约定。 |
| 代码证据 | `letta/constants.py` | `conversation_search`、`archival_memory_*`、`core_memory_*`、`memory_*` 是基础工具集。 |
| 代码证据 | `letta/functions/function_sets/base.py` | conversation search 是 hybrid search；archival memory 面向长期语义检索；core memory 允许 agent 直接 append/replace。 |
| 代码证据 | `letta/schemas/agent.py` | `message_buffer_autoclear` 不会清掉 core/archival/recall；`enable_sleeptime` 把记忆管理移到后台线程。 |
| 代码证据 | `letta/services/summarizer/compact.py` | compact 是正式运行时路径，不是附属脚本。 |
| 文档/模板证据 | `letta/templates/summary_request_text.j2` | 摘要 prompt 明确要求保住“关于 human 的重要事实”。 |
| 代码证据 | `letta/server/server.py` | 开启 git-backed memory 时，`human/persona` 被转成 `system/human`、`system/persona` 这样的路径块。 |
| 推断 | 基于以上主链路 | Letta 把用户自适应看成“可编辑核心记忆 + 可搜索长期记忆”组合出来的运行效果，而不是独立 policy engine。 |

## 4. 当前未深读区域

- `letta/agents/letta_agent_v2.py`
- `letta/agents/letta_agent_v3.py`
- `letta/groups/sleeptime_multi_agent_v3.py`
- `letta/groups/sleeptime_multi_agent_v4.py`
- `letta/services/block_manager_git.py`
- `letta/services/memory_repo/*`
- `letta/services/message_manager.py`

这些区域会影响进一步判断：

- sleeptime 具体怎样整理长期记忆；
- git-backed memory 的审计与冲突处理是否真够强；
- recall / archive 底层存储和检索是否还有更细的治理规则。

## 5. 目前最重要的判断

- 这是一个“完整 agent 产品”，不是单纯记忆库。
- 它把用户适配做得很靠前，但核心载体不是 profile 表，而是 block memory。
- 它的记忆系统是多层的，而且每层职责都不太一样，后续和 Aether 对照时必须拆开分析。
