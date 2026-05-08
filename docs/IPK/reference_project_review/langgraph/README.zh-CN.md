# langgraph：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/langgraph`  
> 阅读日期：`2026-04-18`  
> 主要关注：StateGraph、checkpoint、store、interrupt、prebuilt react agent

## 0. 一句话定位

`langgraph` 主要想解决的是：给开发者一套能持久化、能中断恢复、能跨线程管理状态的低层编排框架，用来搭建长时运行的 agent 和 workflow。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| StateGraph | 共享状态驱动的图式流程构建器 | 状态机 / 工作流编排骨架 |
| checkpointer | 每个 superstep 保存状态快照的持久层 | 线程级短期记忆 / 恢复点 |
| thread | 一条连续运行历史的标识 | 会话 / 线程边界 |
| checkpoint | 某一步状态快照 | 会话时刻切片 |
| store | 跨 thread 持久化数据存储 | 长期记忆 / 跨会话存储 |
| interrupt | 人类介入时的暂停点 | HITL 中断点 |
| Command | 用来 resume / goto / update state 的控制对象 | 恢复和跳转命令 |

## 2. 主要用户流程

```text
开发者定义状态 schema 和节点 ->
用 StateGraph 连接节点 ->
compile 时挂上 checkpointer 和可选 store ->
运行时传 thread_id ->
graph 每步保存 checkpoint ->
需要人工确认时 interrupt ->
客户端用 Command(resume=...) 恢复 ->
如需跨会话长期记忆，节点自己读写 store
```

## 3. 主要程序流程

```text
StateGraph(state_schema, context_schema) ->
add_node / add_edge / add_conditional_edges ->
compile(checkpointer=..., store=...) ->
invoke / stream / ainvoke ->
每个 superstep 写 checkpoint ->
失败时保留 pending writes ->
interrupt / Command 恢复执行 ->
prebuilt create_react_agent 只是其上的常见模板
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 对外定位：durable execution、memory、human-in-the-loop | read |
| `libs/checkpoint/README.md` | checkpoint、thread、pending writes 的正式定义 | read |
| `libs/prebuilt/README.md` | prebuilt agent 与 interrupt 的上层心智 | read |
| `libs/langgraph/langgraph/graph/state.py` | `StateGraph` 核心定义 | read |
| `libs/langgraph/langgraph/types.py` | `Interrupt`、`Command`、`StateSnapshot`、`Send` | read |
| `libs/langgraph/langgraph/runtime.py` | `Runtime.context/store/execution_info` 的运行时入口 | read |
| `libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py` | checkpointer 与 store 在 react agent 中的职责边界 | read |
| `libs/checkpoint/langgraph/store/base/__init__.py` | BaseStore 的长期存储抽象 | read |
| `libs/checkpoint/langgraph/store/memory/__init__.py` | in-memory store 与向量搜索能力 | read |
| `libs/checkpoint-postgres/README.md` | Postgres checkpointer 的使用、安全与落地方式 | read |
| `libs/checkpoint-postgres/langgraph/store/postgres/base.py` | store 的 TTL 和向量索引落地 | read |
| `libs/sdk-py/README.md` | `assistant/thread/run` 的部署态使用心智 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- thread / checkpoint / store 三层边界很清楚。
- interrupt + Command 把人工介入做成了一等机制。
- 既能做低层图编排，也给了 prebuilt react agent 作为常见起点。

## 7. 初步顾虑

- 它不替开发者设计用户适配逻辑，所以上层产品判断压力很大。
- checkpoint 和 store 容易被初学者混用。
- 一旦进入持久化、恢复、安全和多租户部署，工程复杂度会明显上升。

## 8. 待继续验证的问题

- `libs/checkpoint-sqlite/*` 还可在后续补读。
- `docs.langchain.com` 对 memory 的官方教程值得在跨项目综合时结合查看。
