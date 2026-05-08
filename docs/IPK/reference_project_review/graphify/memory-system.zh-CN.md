# graphify：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphify`  
> 输出文件：`docs/IPK/reference_project_review/graphify/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `面向项目/语料的持久化结构记忆`

一句话说明：

> graphify 把外部代码库和多模态语料压缩成一张可跨会话复用的结构图，这张图本身就承担了“外部长期记忆”的角色，但它不是对话式用户记忆。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 原始语料太大，不能每次都重读。
- 代码和文档的“关系结构”比全文更适合持续保留。
- assistant 需要一个可查询、可审计、低 token 的持久化中间层。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 明说 `graph.json` persistent graph，可 weeks later query without re-reading。 |
| 文档证据 | `README.md` | 强调 token reduction 和 graph query workflow。 |
| 文档证据 | `ARCHITECTURE.md` | pipeline 明确输出 `graph.json`、`GRAPH_REPORT.md`。 |
| 代码证据 | `graphify/serve.py` | 把图暴露成 `query_graph/get_node/get_neighbors/shortest_path` MCP tools。 |
| 代码证据 | `tests/test_benchmark.py` | 专门测 corpus tokens 与 subgraph tokens 的 reduction。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否知识内容 |
| --- | --- | --- | --- | --- |
| graph.json | 节点、边、community 等图真源 | 长期 | 否 | 是 |
| GRAPH_REPORT.md | 人类可读的结构摘要 | 长期，可重建 | 否 | 是 |
| graph.html / obsidian / graphml | 各类导出视图 | 长期，可重建 | 否 | 是 |
| cache | 文件级缓存与增量建图辅助 | 中长期 | 否 | 主要是派生索引 |
| assistant rules/hooks | 告诉 assistant 先读图再搜原文件 | 中长期 | 间接相关 | 否，更多是工作流元数据 |

## 3. 读写流程

### 3.1 写入流程

```text
detect 语料 ->
extract 结构与语义关系 ->
build graph ->
cluster ->
analyze ->
generate GRAPH_REPORT ->
export graph.json / html / obsidian / other formats
```

### 3.2 读取流程

```text
先读 GRAPH_REPORT.md 获取总览 ->
再用 query/path/explain 或 MCP tools 访问 graph.json ->
只把局部子图送进 assistant 上下文
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 删除方式 |
| --- | --- | --- | --- | --- |
| 图节点/边 | `graphify-out/graph.json` | community、HTML、MCP 查询 | 可从原语料重建，但代价高 | 删除输出目录或重跑 |
| 图摘要 | `graphify-out/GRAPH_REPORT.md` | 无 | 可由 graph 重建 | 删除或重跑 |
| 社区与 god nodes | graph + analysis | 报告与 HTML 展示 | 可重算 | 重跑 analyze/cluster |
| cache | `graphify-out/cache/` 等 | 增量更新 | 可重建 | 删除 cache |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 总览读取 | `GRAPH_REPORT.md` | 一页摘要降低首轮 token | god nodes / communities / ambiguity 展示 | `report.py` |
| 局部图查询 | BFS / DFS / shortest path | token budget 截断 | 节点匹配 + 图遍历 | `serve.py` |
| 证据标签 | EXTRACTED / INFERRED / AMBIGUOUS | 无需额外重排 | 明确区分发现 vs 猜测 | `ARCHITECTURE.md`、`report.py` |
| token 评估 | benchmark 对比全语料和子图 | 量化 reduction | 检查图是否真有价值 | `tests/test_benchmark.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有对话式 session summary
- memory consolidation：有，把多模态语料压成单图
- short-term to long-term promotion：不是对话提升，而是把原始语料转成长效图谱
- graph extraction：核心
- embedding refresh：README 明确说 clustering 不是 embedding 驱动
- duplicate merge：通过建图和缓存间接处理
- stale memory cleanup：靠 `--update`、重建、watch

## 7. 优点

- 非常明确地把“项目结构记忆”做成了一个可落地产物。
- `GRAPH_REPORT.md` 这种摘要层对人和 agent 都很友好。
- 证据标签机制让图谱比很多黑盒摘要更可信。

## 8. 顾虑

- 它保留的是项目/语料结构，不是用户或任务态。
- 如果用于高变化的会话记忆，更新模式可能不够细粒度。
- 依赖外部技能/平台规则才能让这层记忆真正被 assistant 一直用起来。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户画像几乎不存在。
- 用户偏好不会和知识内容混存。
- session history 不是核心来源。
- agent 经验体现在“如何使用这张图”，不是图里存了 agent 自己的偏好。

结论：

> graphify 非常适合当“外部语料长期记忆”，但不适合直接当“用户适配记忆”。这两类记忆在这里被清楚地区分开了。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆主要围绕对话与用户 | 挑战 | graphify 说明项目/语料结构也是重要长期记忆。 |
| 记忆只要向量检索就够 | 挑战 | 这里依赖图结构、社区、路径，而不是向量库。 |
| 摘要可以不显示证据等级 | 挑战 | graphify 的证据标记非常值得学。 |

## 11. 对 Aether 的可能改变

### 11.1 IPK / 知识库方向

- Aether 也许需要一种“图化的项目/知识导航层”，而不是只有片段检索。

### 11.2 session recall 方向

- session recall 和项目结构记忆应分开，不然容易把静态结构和临时状态混掉。

### 11.3 adaptation memory 方向

- adaptation memory 不应背负项目知识导航任务；那是另一层系统。

### 11.4 只适合保留为启发的点

- `graph.json + GRAPH_REPORT.md + MCP query` 这套组合很值得借鉴，但主要用于外部知识/工程语料。

## 12. 仍需继续读的文件

- `graphify/build.py`
- `graphify/export.py`
