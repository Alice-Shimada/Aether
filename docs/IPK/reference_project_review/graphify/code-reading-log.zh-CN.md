# graphify：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphify`

## 0. 阅读目标

- 判断 graphify 的“图谱”到底服务什么用户问题。
- 找它如何把原始语料变成持久化结构记忆。
- 确认它是否真的做用户自适应，还是主要做代码库/语料导航。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | 产品定位、persistent graph、honest found vs guessed |
| 文档证据 | `ARCHITECTURE.md` | pipeline 拆解 |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `graphify/__main__.py` | 安装到 Claude/Codex/OpenCode 等平台的入口 |
| 代码证据 | `graphify/detect.py` | 文件分类、体量阈值、敏感文件跳过 |
| 代码证据 | `graphify/extract.py` | deterministic AST 抽取主链 |
| 代码证据 | `graphify/analyze.py` | god nodes / surprising connections / knowledge gaps |
| 代码证据 | `graphify/report.py` | GRAPH_REPORT 生成规则 |
| 代码证据 | `graphify/serve.py` | MCP 图查询工具 |
| 代码证据 | `tests/test_pipeline.py` | detect→extract→build→cluster→report→export 端到端 |
| 代码证据 | `tests/test_serve.py` | query_graph / shortest_path 的图查询思路 |
| 代码证据 | `tests/test_benchmark.py` | token reduction 的评估 |
| 代码证据 | `tests/test_claude_md.py` | always-on graph reminder 的写入行为 |

## 3. 当前已确认的主链路

### 3.1 建图

```text
detect(root) ->
extract(files) ->
build graph ->
cluster ->
analyze ->
generate GRAPH_REPORT.md ->
export graph.json / html / obsidian
```

### 3.2 使用图谱

```text
assistant 先读 GRAPH_REPORT.md ->
需要更深问题时 query/path/explain ->
或 serve.py 暴露 MCP graph tools ->
避免每次重新读原始语料
```

## 4. 第一轮最重要发现

1. `graphify` 的主要目标不是记住“用户”，而是记住“项目/语料结构”。
2. `graph.json` 明显承担跨会话持久化中间记忆的角色。
3. 它非常重视“证据等级”和“不要假装自己知道”。
4. always-on 安装逻辑说明它要改变 assistant 的默认导航行为：先看结构图，再搜原文件。

## 5. 仍可补读但不阻塞首轮结论的区域

- `worked/*`
- `graphify/skill*.md`
- `graphify/build.py` / `export.py`

## 6. 当前推断

- 推断：graphify 最值得 Aether 参考的不是用户适配，而是“如何把大语料压成低 token 的可持续结构上下文”。
