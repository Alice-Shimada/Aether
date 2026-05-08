# langgraph：代码阅读日志

> 状态：首轮主链路已阅读  
> 项目路径：`/home/bzz/Aether/reference_project/langgraph`

## 1. 本轮阅读目标

- 弄清它到底是不是一个“记忆系统”，还是一个更底层的 agent/workflow 编排框架。
- 拆开它的线程内状态、checkpoint、跨线程 store 三层。
- 判断它对用户自适应到底提供了什么，又刻意没有替开发者做什么。

## 2. 已阅读文件

### 2.1 项目定位

- `README.md`
- `libs/sdk-py/README.md`

### 2.2 checkpoint 与 store

- `libs/checkpoint/README.md`
- `libs/checkpoint/langgraph/store/base/__init__.py`
- `libs/checkpoint/langgraph/store/memory/__init__.py`
- `libs/checkpoint-postgres/README.md`
- `libs/checkpoint-postgres/langgraph/store/postgres/base.py`

### 2.3 graph 与运行时

- `libs/langgraph/langgraph/graph/state.py`
- `libs/langgraph/langgraph/types.py`
- `libs/langgraph/langgraph/runtime.py`

### 2.4 上层 agent 模板

- `libs/prebuilt/README.md`
- `libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py`

## 3. 当前确认的关键事实

| 类型 | 位置 | 结论 |
| --- | --- | --- |
| 文档证据 | `README.md` | 项目自我定位是 low-level orchestration framework，而不是成品记忆产品。 |
| 文档证据 | `libs/checkpoint/README.md` | checkpointer 会在每个 superstep 保存 checkpoint；thread 是多租户状态隔离的基础。 |
| 代码证据 | `langgraph/types.py` | `Interrupt`、`Command`、`StateSnapshot` 是正式控制原语。 |
| 代码证据 | `langgraph/runtime.py` | `Runtime` 明确把 `context`、`store`、`execution_info` 分开。 |
| 代码证据 | `prebuilt/chat_agent_executor.py` | `checkpointer` 用于单 thread chat memory，`store` 用于跨 multiple conversations/users。 |
| 文档证据 | `libs/checkpoint/langgraph/store/base/__init__.py` | BaseStore 是长期持久化层，支持层级 namespace 和可选向量搜索。 |
| 代码证据 | `libs/checkpoint-postgres/langgraph/store/postgres/base.py` | Postgres store 有 TTL、向量表和索引，不只是普通 KV。 |
| 文档证据 | `libs/checkpoint-postgres/README.md` | checkpoint 持久化还带反序列化安全要求。 |
| 推断 | 基于上述分层 | LangGraph 把“记忆”拆成 thread state persistence 和 cross-thread data store 两类，而不是单一 memory service。 |

## 4. 当前未深读区域

- `libs/langgraph/langgraph/pregel/*`
- `libs/checkpoint-postgres/langgraph/checkpoint/postgres/*`
- `libs/checkpoint-sqlite/*`
- `examples/*`
- 远端部署与 LangSmith 配套细节

这些区域会影响进一步判断：

- superstep 内更底层的执行模型；
- checkpoint 表结构和 pending writes 落盘细节；
- 官方教程里对 memory 的推荐实践；
- 部署态下 thread / assistant / run 的治理边界。

## 5. 目前最重要的判断

- 这是“状态化 agent 的执行内核”，不是“用户画像系统”。
- 它最有价值的地方是把 thread checkpoint 和 cross-thread store 正式分开。
- 对 Aether 来说，它更像底层架构启发，而不是直接可抄的产品流程。
