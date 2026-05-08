# graphiti：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/graphiti`  
> 阅读日期：`2026-04-18`  
> 主要关注：temporal context graph、episodes、hybrid retrieval、MCP/server

## 0. 一句话定位

`graphiti` 主要想解决的是：把动态世界中的事实、关系和时间变化持续沉淀成“上下文图谱”，让 agent 在之后能查询“现在什么为真”“以前什么为真”“这些事实从哪来”。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| context graph | 面向 agent 的时间知识图谱 | 记忆图谱 / 上下文真源 |
| episode | 原始输入流中的一条事件/消息/JSON | 原始事件真源 |
| entity node | 由 episode 抽出的实体节点 | 结构化记忆节点 |
| entity edge | 带有效时间的事实关系 | 关系记忆 |
| validity window | 事实何时生效、何时失效 | 时间边界 |
| group_id | 图谱分区 / 分组 | 作用域 / 租户边界 |
| saga | 连续 episode 链的更高层叙事 | 长流程事件串 |

## 2. 主要用户流程

```text
业务系统持续写入消息、文本、JSON episode ->
Graphiti 抽取实体、关系、属性并写入时间图谱 ->
历史 episode 保留为 provenance ->
查询时按 query + group_id + center node 做 hybrid search ->
返回节点、边、时间信息或事实结果给 agent
```

## 3. 主要程序流程

```text
episode -> add_episode() ->
retrieve previous episodes ->
extract nodes/edges ->
resolve duplicates / invalidations ->
写回 episodic nodes + entity nodes + entity edges + saga/community ->
search()/search_() hybrid retrieval ->
返回 edges 或 graph objects
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位、context graph 概念、Zep/Graphiti 边界 | read |
| `examples/quickstart/README.md` | 最小使用路径与搜索方式 | read |
| `examples/quickstart/quickstart_neo4j.py` | `add_episode()` 与 `search()` 的主链路样例 | read |
| `graphiti_core/graphiti.py` | 核心 `Graphiti` 类、episode 写入、search、saga、communities | read |
| `tests/test_graphiti_mock.py` | 结构单元与 bulk 流程的真实对象关系 | read |
| `server/README.md` | FastAPI 服务包装层 | read |
| `mcp_server/README.md` | MCP 服务心智、entity types、队列处理 | read |
| `mcp_server/src/services/queue_service.py` | group_id 级顺序写入队列 | read |
| `mcp_server/config/config.yaml` | 默认 group_id、Preference/Requirement 等实体类型 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 对“事实会变化”这件事非常认真，不是简单覆盖旧值。
- 把 episode/provenance 放进核心模型里，方便溯源。
- `group_id`、`saga`、`search recipe` 这些边界都挺实用，不是只会说抽象愿景。

## 7. 初步顾虑

- 需要图数据库、LLM、embedding、可选 reranker，接入和运维成本不低。
- 用户管理、线程管理并不内建，应用层还得自己补。
- “用户自适应”能力更多是可构建出来，不是产品已经替你设计好了。

## 8. 待继续验证的问题

- `graphiti_core/search/*` 可以在后续跨项目阶段继续深读。
- `examples/langgraph-agent/agent.ipynb` 值得在做用户自适应专题复审时补看。
