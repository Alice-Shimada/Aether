# graphify：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/graphify`  
> 阅读日期：`2026-04-18`  
> 主要关注：多模态语料图谱、代码库导航、persistent graph

## 0. 一句话定位

`graphify` 主要想解决的是：把代码、文档、论文、图像、音视频等外部语料快速压成一张可查询的知识图，让 AI coding assistant 不用每次都从原始文件重新读起。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| graphify skill | 给 AI coding assistant 用的图谱构建技能 | 外部知识建图工具 |
| graph.json | 持久化图结构真源 | 可检索中间记忆 |
| GRAPH_REPORT.md | 面向人和 agent 的一页审计摘要 | 图谱导航摘要 |
| EXTRACTED / INFERRED / AMBIGUOUS | 边的证据等级 | 证据标签 |
| community / god nodes | 图谱中的社区和高连接核心节点 | 结构摘要 |
| graphify-out | 输出目录 | 持久化缓存/索引产物 |

## 2. 主要用户流程

```text
对一个代码库或原始语料运行 /graphify ->
deterministic AST + 转录 + subagents 抽取概念和关系 ->
生成 graph.json / GRAPH_REPORT.md / graph.html ->
之后 agent 先读图谱摘要，再按 query/path/explain 走局部图查询
```

## 3. 主要程序流程

```text
detect -> extract -> build_graph -> cluster -> analyze -> report -> export ->
graph.json 持久化 ->
serve.py 可把图暴露成 MCP tools
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位、三阶段抽取、persistent graph 心智 | read |
| `ARCHITECTURE.md` | pipeline 和模块职责最清楚 | read |
| `graphify/__main__.py` | CLI、平台安装、always-on 规则 | read |
| `graphify/detect.py` | 语料发现、分类和 corpus 体量判断 | read |
| `graphify/extract.py` | 结构抽取与 deterministic AST 主体 | read |
| `graphify/analyze.py` | god nodes / surprising connections / gaps | read |
| `graphify/report.py` | `GRAPH_REPORT.md` 的生成逻辑 | read |
| `graphify/serve.py` | MCP 图查询接口 | read |
| `tests/test_pipeline.py` | 端到端 pipeline 验证 | read |
| `tests/test_serve.py` | 图查询辅助函数 | read |
| `tests/test_benchmark.py` | token reduction 的评估心智 | read |
| `tests/test_claude_md.py` | always-on 安装行为 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 把“理解大型语料/代码库”做成非常具体的产品闭环。
- EXTRACTED/INFERRED/AMBIGUOUS 证据标签很实用。
- `graph.json + GRAPH_REPORT.md + MCP server` 形成了很强的持久化导航层。

## 7. 初步顾虑

- 这里的“记忆”更像项目语料记忆，不是用户自适应记忆。
- 对对话级个性化或用户长期状态几乎没有直接支持。
- 依赖多种平台规则和技能注入，生态适配很多，但也带来维护复杂度。

## 8. 待继续验证的问题

- `worked/*` 样例可在后续横向比较时补看。
- 若要研究“assistant 如何被强制先读结构摘要再搜原始文件”，它值得再深挖。
