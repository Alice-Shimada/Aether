# langgraph：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/langgraph`  
> 输出文件：`docs/IPK/reference_project_review/langgraph/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `线程级 checkpoint + 跨线程 store 的双层持久化系统`

一句话说明：

> LangGraph 不把 memory 做成单一数据库，而是把“当前 thread 的状态快照”与“跨 threads 的长期存储”明确分层；前者服务 durable execution，后者服务长期记忆与共享数据。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- graph/agent 在长时间运行中不能因为故障或人工暂停就丢状态。
- 同一用户可能有很多 threads，不能把所有状态混在一起。
- 长期记忆不该和当前执行快照混为一谈。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 把 durable execution、memory、human-in-the-loop 并列为核心卖点。 |
| 文档证据 | `libs/checkpoint/README.md` | checkpoint 会在每个 superstep 持久化，thread 是多条运行历史的主键。 |
| 代码证据 | `langgraph/types.py` | `StateSnapshot`、`Interrupt`、`Command` 都围绕 checkpoint 工作。 |
| 代码证据 | `runtime.py` | `Runtime.store` 明确作为 graph run 的持久 store。 |
| 代码证据 | `prebuilt/chat_agent_executor.py` | 注释直接区分 single thread chat memory 和 cross-thread store。 |
| 文档/代码证据 | `store/base/__init__.py`、`store/memory/__init__.py` | store 支持 namespace、KV、可选向量搜索。 |
| 代码证据 | `store/postgres/base.py` | Postgres store 还有 TTL 和向量索引。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 主要用途 | 真源特征 |
| --- | --- | --- | --- | --- |
| checkpoint | 某一步 graph state 快照 | thread 生命周期内长期存在 | 故障恢复、time travel、interrupt 恢复 | thread 内执行真源 |
| pending writes | 某一步成功节点的中间写入 | 临时到中期 | 出错后恢复时避免重跑 | checkpoint 辅助真源 |
| thread | 一串 checkpoint 的标识 | 长期 | 会话 / run 边界 | 不是内容本身，是隔离边界 |
| store item | 跨 thread 的结构化数据 | 长期 | 用户偏好、知识、共享状态 | 长期数据真源 |
| store vectors | 向量索引 | 中长期 | 语义搜索 | 派生索引，可重建 |
| runtime.context | 本次 run 的静态依赖 | 单次 run | user_id、db_conn 等 | 不是持久记忆 |

## 3. 读写流程

### 3.1 写入流程

```text
graph.invoke/stream 时传入 thread_id ->
graph 每个 superstep 写 checkpoint ->
若某步部分成功，保存 pending writes ->
如节点需要长期存储，再写 BaseStore / PostgresStore ->
若人工介入，interrupt 暂停，随后 Command(resume=...) 基于已有 checkpoint 恢复
```

### 3.2 读取流程

```text
当前 thread 先从 checkpointer 读取最近 checkpoint ->
graph 恢复 state 并继续执行 ->
节点如需长期信息，再从 Runtime.store 读取 ->
如需语义检索，可对 store 做 vector search ->
stream/debug 可把 checkpoints 和 tasks 发给外部观察层
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| 当前线程状态 | checkpoint saver | stream/debug 展示 | 理论上可从完整运行重放，但系统设计上应依赖 checkpoint | thread 内最关键真源 |
| 节点部分成功结果 | pending writes | 无 | 不应依赖重算 | 用于故障恢复 |
| 跨线程长期数据 | BaseStore / PostgresStore | vector index、TTL 清扫 | 内容不该只靠向量结果反推 | 长期记忆真源 |
| store 向量数据 | `store_vectors` 等 | ANN 索引 | 可由原 item 重建 | 索引层 |
| run 依赖 | runtime.context | 无 | 不需要重建，run 结束即失效 | 不是记忆真源 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| thread 恢复 | 直接读 checkpoint | 读取最近快照而非整条重放 | checkpoint_id / thread_id 精确定位 | `checkpoint/README.md` |
| 中断恢复 | `interrupt()` + `Command(resume=...)` | 只恢复当前节点所在线程 | interrupt id 精确匹配 | `types.py` |
| 长期数据读取 | `store.get/put/search` | namespace、limit、offset 控制 | 结构过滤 + 可选语义搜索 | `store/base/__init__.py` |
| 长期语义搜索 | store 向量检索 | ANN index / top-k | namespace + filter + embedding | `store/memory/__init__.py`、`store/postgres/base.py` |
| react agent 接入 | compile 时挂 `checkpointer` 与 `store` | 模板层复用 | 边界在接口注释里说得很清楚 | `prebuilt/chat_agent_executor.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有内建对话摘要机制
- memory consolidation：没有统一“自动巩固”产品层
- short-term to long-term promotion：可以由应用自己把 checkpoint/state 结果写进 store
- graph extraction：不是这里的重点
- duplicate merge：取决于上层 store key / namespace 设计
- stale memory cleanup：Postgres store 支持 TTL 和 sweeper

## 7. 优点

- thread checkpoint 和跨 thread store 分工非常清楚。
- interrupt / Command 让“暂停-确认-恢复”成为记忆系统的一部分。
- Postgres store 把 TTL、向量搜索、namespace 一起考虑进去了，落地性很强。
- pending writes 说明它考虑了真正的长时执行失败恢复，而不是只讲理想流程。

## 8. 顾虑

- 它不帮你定义“什么该记住”，只帮你保存和恢复。
- checkpoint 的反序列化安全是现实风险，官方自己也专门提醒。
- 如果应用不严谨，容易把临时执行状态误存成长期知识。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户自适应不是记忆系统的默认目标。
- 记忆系统首先服务执行恢复与状态持久化。
- 只有当应用自己把用户偏好写进 store 时，它才变成用户适配记忆。

结论：

> LangGraph 最重要的启发是：记忆系统不一定先从“记住用户什么”出发，也可以先从“系统怎么可靠地保住状态并分清层次”出发。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆系统主要围绕内容检索设计 | 挑战 | LangGraph 先解决 durable execution，再谈长期 store。 |
| 会话状态和长期记忆可以混存 | 挑战 | 它要求 checkpoint/store 明确分离。 |
| 人工确认只是外围流程 | 挑战 | 在这里，interrupt 恢复直接依赖 checkpoint。 |
| 安全与序列化问题可以后补 | 挑战 | 官方对 checkpoint 反序列化安全已有正式警告。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆架构分层

- Aether 也许应更明确地区分：
  - 当前执行状态；
  - 当前会话历史；
  - 跨会话长期记忆。

### 11.2 可靠性设计

- 如果 Aether 以后要支持长任务、人工审批、多阶段恢复，就不能只做普通记忆检索。

### 11.3 数据治理

- 长期记忆的 namespace、TTL、索引和安全策略应该在系统设计早期就考虑进去。

### 11.4 只适合保留为启发的点

- LangGraph 很强，但它提供的是基础设施，不会自动给出更好的用户产品判断。

## 12. 仍需继续读的文件

- `libs/checkpoint-postgres/langgraph/checkpoint/postgres/base.py`
- `libs/checkpoint-postgres/langgraph/checkpoint/postgres/shallow.py`
- `libs/checkpoint-sqlite/*`
- `examples/rag/*`
