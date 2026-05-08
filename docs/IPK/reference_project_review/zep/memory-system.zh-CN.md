# zep：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/zep`  
> 输出文件：`docs/IPK/reference_project_review/zep/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `关系感知的上下文工程平台`

一句话说明：

> `zep` 不是只想“存点记忆再搜回来”，而是想把聊天、业务数据、文档和事件统筹成一种可低延迟组装的 context block，让 agent 在生产环境拿到更完整、更当前的世界状态。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- agent 需要的不只是相似文本，而是当前有效的关系与状态。
- 聊天历史、业务数据、文档、事件不能各自孤立。
- 生产环境需要稳定、低延迟、可模板化的上下文装配。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 直接写 chat history、business data、documents、app events 四类来源。 |
| 文档证据 | `README.md` | 强调 Graph RAG 和 `<200ms` context delivery。 |
| 代码证据 | `examples/go/user_graph.go` | 可以取 episodes、nodes、edges，并进行 graph search。 |
| 代码证据 | `examples/python/chat_history/memory.py` | `get_user_context()` 是现成的读取入口。 |
| 代码证据 | `legacy/src/store/sessionstore_ce.go` | 旧 CE 会在 session 创建后把 user 节点加入 graph。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否知识内容 |
| --- | --- | --- | --- | --- |
| thread messages | 会话中的消息 | 中短期 | 是 | 部分是 |
| user summary | 始终该知道的用户摘要 | 中长期 | 是 | 是 |
| graph episodes | 事件或新增数据片段 | 中长期 | 部分是 | 是 |
| graph nodes | 实体节点 | 中长期 | 可能是 | 是 |
| graph edges | 实体关系与状态变化 | 中长期 | 可能是 | 是 |
| business/doc/event context | 外部业务上下文 | 取决于来源 | 不一定 | 是 |

## 3. 读写流程

### 3.1 写入流程

```text
create user / create thread ->
add thread messages 或 graph.add(structured data) ->
平台抽取实体、关系、事件 ->
维护 temporal graph ->
按项目设置持续更新 user summary
```

### 3.2 读取流程

```text
thread.get_user_context(thread_id) ->
返回预格式化 context block

或

graph.search(query, user_id, optional center node/scope) ->
返回关系感知结果
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 删除方式 |
| --- | --- | --- | --- | --- |
| thread 消息 | 平台线程存储 | graph extraction | 理论上可重建部分 | thread 删除 |
| user summary | 平台摘要层 | 无 | 可由历史重新生成，但结果不一定完全相同 | 随 user / project 配置变化 |
| graph nodes/edges/episodes | 平台图谱层 | graph search 索引 | 部分可由原始数据重建 | 平台 API / user 删除 |
| business documents/events | 外部接入数据 | 图谱和上下文模板 | 取决于源系统 | 取决于源系统/平台 |

说明：

- 对当前 cloud 版真源细节，开源仓库没有完全展开。
- 上表里关于内部存储细节有一部分来自产品文档和 legacy 代码的推断，不应当当成已完全证实的后端实现说明。

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 上下文获取 | `thread.get_user_context()` | 官方强调 `<200ms` | 项目设置、summary、graph context | `README.md`、`examples/python/chat_history/memory.py` |
| 图谱检索 | `graph.search()` | 范围与中心节点控制 | nodes/edges scope、temporal graph | `examples/go/user_graph.go` |
| 稳定摘要 | user summary instructions | 避免每次都依赖检索命中 | 通过问题清单固定摘要目标 | `user-summary-instructions-example/README.md` |
| prompt 注入 | 应用把 context block 放进系统提示 | 预格式化减少应用层拼装 | context block 已做结构化整理 | `examples/python/user-summary-instructions-example/README.md` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：有 user summary / context summary 思路
- memory consolidation：有，体现在 user summary 与 graph assembly
- short-term to long-term promotion：有，thread 消息可进入 graph/user summary
- graph extraction：是核心能力
- embedding refresh：首轮未读到明确实现
- duplicate merge：首轮未读到底层细节
- stale memory cleanup：通过 temporal graph 的状态变化与删除接口处理

## 7. 优点

- 不是把记忆等同于“向量库检索几条句子”。
- 对状态变化和关系变化的建模明显更成熟。
- 预格式化 context block 对应用方很友好。

## 8. 顾虑

- 核心后端不开源部分较多，外部读者理解真源与治理细节会受限。
- 记忆系统能力强，但轻量接入时心智成本不低。
- 平台配置项对最终效果影响大，容易让“记忆质量”依赖产品运营而不是纯算法。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户画像基本被做成特殊的 memory summary。
- 用户偏好不只是 memory 文本，而是时间图谱中的一部分状态。
- session history 会通过 thread 进入 user summary 和 graph。
- agent 经验不是重点，重点是 user/world context。

结论：

> `zep` 不是把用户自适应和记忆完全分开，而是把“用户摘要”做成记忆系统中的特殊可注入层。边界比 `mem0` 清楚，但它们仍共享同一 context engineering 目标。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆系统主要是检索层 | 挑战 | `zep` 把它提升为 context engineering 层。 |
| 偏好变化可简单覆盖旧值 | 挑战 | temporal graph 说明变化本身值得保留。 |
| 所有长期信息都可以统一按 top K 检索 | 挑战 | user summary 明确是“永远在场”的另一层。 |
| 会话 recall 和长期记忆可以不特别区分 | 挑战 | thread 与 user/graph 的边界被清楚拆开。 |

## 11. 对 Aether 的可能改变

### 11.1 IPK / 知识库方向

- Aether 需要考虑“文档知识”和“用户/世界关系记忆”是否应走不同编排路径。

### 11.2 session recall 方向

- 会话 recall 也许应先变成 thread context layer，而不是直接混入长期池。

### 11.3 adaptation memory 方向

- 可以引入一种“总该带上的用户摘要层”，不把它完全交给检索命中。

### 11.4 只适合保留为启发的点

- 不一定要一开始就做图谱，但“关系和时间”应当成为后续设计评估维度。

## 12. 仍需继续读的文件

- `examples/python/context-templates-example/README.md`
- `mcp/zep-mcp-server/README.md`
