# graphiti：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphiti`  
> 输出文件：`docs/IPK/reference_project_review/graphiti/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `时间上下文图谱引擎`

一句话说明：

> Graphiti 把记忆定义成一张会持续演化的上下文图：原始事件是 episode，节点和关系是派生结构，旧事实不会被悄悄抹掉，而是进入失效时间窗口。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 动态世界里事实会变，不能只存当前快照。
- 检索不能只靠向量，还要同时用关键词、图遍历和时间条件。
- agent 需要的不只是文本片段，还要知道这些事实从哪来。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | validity windows、episodes & provenance、hybrid retrieval 是核心卖点。 |
| 文档证据 | `README.md` | 明确对比 GraphRAG：Graphiti 面向动态、增量更新而非静态批处理。 |
| 代码证据 | `graphiti_core/graphiti.py` | `add_episode()`、`search()`、`summarize_saga()` 是主链路。 |
| 代码证据 | `examples/quickstart/quickstart_neo4j.py` | 真实展示了 add episode、fact search、center node rerank、node search。 |
| 代码证据 | `mcp_server/src/services/queue_service.py` | 说明 episode 摄入还考虑到了按 group 顺序处理。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否知识内容 |
| --- | --- | --- | --- | --- |
| episode | 原始消息、文本、JSON | 长期真源 | 可能是 | 是 |
| entity node | 抽出的实体与摘要 | 长期 | 可能是 | 是 |
| entity edge | 带 `valid_at/invalid_at` 的事实关系 | 长期 | 可能是 | 是 |
| episodic edge | episode 到实体的联系 | 长期 | 间接相关 | 主要是 provenance |
| saga | 连续事件链与摘要 | 长期 | 可能是 | 是 |
| community | 图聚类出的群组 | 派生长期 | 间接相关 | 是 |

## 3. 读写流程

### 3.1 写入流程

```text
episode 输入 ->
retrieve previous episodes ->
extract nodes ->
resolve duplicate nodes ->
extract attributes ->
extract edges ->
resolve extracted edges 并失效旧事实 ->
写入 episode/node/edge/saga/community
```

### 3.2 读取流程

```text
query ->
search() 使用 edge hybrid recipe
或 search_() 使用更高级 config ->
semantic + BM25 + graph traversal / rerank ->
返回 edges 或 SearchResults(nodes + edges)
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 删除方式 |
| --- | --- | --- | --- | --- |
| episode | 图数据库中的 `EpisodicNode` | embedding / mention / relationship links | 不应只靠派生重建 | 清图或删 episode |
| entity node | 图数据库实体节点 | embeddings、community | 可从 episode 再抽取，但不完全等价 | 图操作删除 |
| entity edge | 图数据库关系边 | embeddings、keyword、graph topology | 可部分重建 | 失效或删除 |
| saga summary | `SagaNode` 与 summary | 无 | 可重算 | 覆盖或删除 |
| community | 聚类结果 | 无 | 可重建 | `remove_communities` / rebuild |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 基础事实检索 | `search()` | 默认 limit | hybrid recipe + center node rerank | `graphiti_core/graphiti.py` |
| 高级检索 | `search_()` | recipe 控制 | nodes/edges、filters、cross encoder | `graphiti_core/graphiti.py` |
| 中心节点重排 | `center_node_uuid` | 只对候选做 rerank | 图距离更重视局部相关性 | `examples/quickstart/quickstart_neo4j.py` |
| 作用域过滤 | `group_ids` | 限制检索范围 | 分区隔离 | `graphiti_core/graphiti.py` |
| 摄入顺序控制 | `QueueService` 按 group 串行 | 避免同组并发冲突 | 保持事件顺序 | `queue_service.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有显式 session summary 概念
- memory consolidation：有，通过去重、失效旧事实、saga/community 更新
- short-term to long-term promotion：episode 进入长期图谱，本质上就是自动提升
- graph extraction：是核心
- embedding refresh：图中节点/边会生成 embedding
- duplicate merge：有，`resolve_extracted_nodes/edges`
- stale memory cleanup：不是简单清理，而是 invalidation 保留历史

## 7. 优点

- 记忆真源和派生结构边界很清楚。
- “保留历史但标记失效”比简单覆盖更适合动态场景。
- provenance 强，后续审计和解释空间更大。

## 8. 顾虑

- 整体复杂度高，接入和运维都不轻。
- 图数据库与 LLM 抽取质量会共同影响结果稳定性。
- 如果场景只是轻量个性化，可能有点重炮打蚊子。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户画像不是单独表，而是图谱中的实体/关系类型。
- 用户偏好可以是 memory 的一种，但不是唯一主角。
- session 历史就是 episode 流的一部分，会自然影响长期图谱。
- agent 经验和业务知识也可以共用同一图谱框架。

结论：

> Graphiti 基本不把“用户记忆”和“世界记忆”分成两套系统，而是认为它们都应服从同一套时间图谱和 provenance 规则。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆系统可以主要存当前态 | 挑战 | Graphiti 认为过去态也很关键。 |
| 原始消息可以只当过渡材料 | 挑战 | episode 在这里是真源。 |
| 检索主要靠向量和关键词 | 挑战 | 图遍历和中心节点重排是核心部分。 |
| scope 可以后加 | 挑战 | `group_id` 从一开始就是骨架。 |

## 11. 对 Aether 的可能改变

### 11.1 IPK / 知识库方向

- Aether 应认真区分“文档块检索”与“带时间关系的事实图”。

### 11.2 session recall 方向

- 会话事件可以考虑先保留为真源，再决定提炼成什么结构，而不是只留摘要。

### 11.3 adaptation memory 方向

- 如果用户偏好要长期可信，也许需要显式保留变更轨迹和失效时间。

### 11.4 只适合保留为启发的点

- 不必立刻全面图谱化，但“episode 是真源、旧事实失效而非消失”很值得吸收。

## 12. 仍需继续读的文件

- `graphiti_core/search/*`
- `server/graph_service/*`
