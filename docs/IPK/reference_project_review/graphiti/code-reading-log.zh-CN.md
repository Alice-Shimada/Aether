# graphiti：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphiti`

## 0. 阅读目标

- 判断 Graphiti 自己认为“记忆”是什么。
- 找到 episode 写入、失效旧事实、混合检索的主链路。
- 判断它是否内建用户自适应，还是只是给上层提供构件。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | context graph、validity window、episodes、GraphRAG 对比 |
| 文档证据 | `examples/quickstart/README.md` | 最小集成、node/edge search、center node rerank |
| 文档证据 | `server/README.md` | 服务化部署方式 |
| 文档证据 | `mcp_server/README.md` | MCP 能力与 entity type 配置 |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `graphiti_core/graphiti.py` | `Graphiti` 核心类、`add_episode`、`search`、`summarize_saga` |
| 代码证据 | `examples/quickstart/quickstart_neo4j.py` | 真实写入/检索调用 |
| 代码证据 | `tests/test_graphiti_mock.py` | episodic/entity/community 对象关系 |
| 代码证据 | `mcp_server/src/services/queue_service.py` | 按 group_id 串行处理 episode |
| 代码证据 | `mcp_server/config/config.yaml` | 默认 group、偏好实体类型、MCP 默认策略 |

## 3. 当前已确认的主链路

### 3.1 写入

```text
业务传入 episode ->
Graphiti.add_episode() ->
取 previous episodes ->
extract nodes/edges ->
resolve duplicates / invalidated edges ->
写入 episodic node + entity nodes + entity edges ->
可选 saga / community 更新
```

### 3.2 读取

```text
search(query, group_ids, optional center_node_uuid) ->
按 recipe 做 hybrid retrieval ->
返回 EntityEdge 列表

或

search_(...) ->
返回 nodes + edges 的 SearchResults
```

### 3.3 服务化

```text
server/FastAPI -> 对 Graphiti 做 HTTP 封装
mcp_server -> 把 episode 管理、搜索、清图、group 管理暴露成 MCP tools
queue_service -> 同一 group_id 内顺序处理 episode
```

## 4. 第一轮最重要发现

1. `episode` 在 Graphiti 里不是辅助日志，而是真源；边和节点都要回溯到 episode。
2. 它对旧事实不是简单删除，而是通过 `invalid_at` 等时间窗口保留历史。
3. `group_id` 是很核心的作用域边界，几乎所有读写都围绕它转。
4. 用户自适应不是内建产品层；更像是“如果你把用户和偏好也当实体喂进图谱，就能做出个性化”。

## 5. 仍可补读但不阻塞首轮结论的区域

- `graphiti_core/search/*`
- `examples/langgraph-agent/agent.ipynb`
- `server/graph_service/*`

## 6. 当前推断

- 推断：Graphiti 首先是时间记忆图谱引擎，不是现成的 user adaptation 产品。
- 推断：它把“历史变化”当一等公民，这一点对 Aether 影响会很大，因为很多当前假设仍偏静态。
