# letta：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/letta`  
> 输出文件：`docs/IPK/reference_project_review/letta/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `面向 agent 的分层持久化记忆系统`

一句话说明：

> Letta 把记忆拆成 core memory、recall memory、archival memory、summary memory，以及可选的 git-backed memory 与 sleeptime 整理层，目标不是单次检索，而是让 agent 长期连续地工作。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 上下文窗口一定会不够，所以不能只靠 message list。
- 有些事实必须永远在场，有些只需按需检索，有些要在后台整理。
- agent 不是只读记忆消费者，也要是记忆编辑者。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 把 advanced memory 直接当产品定位。 |
| 代码证据 | `schemas/memory.py` | `Memory` 负责渲染 in-context core memory。 |
| 代码证据 | `schemas/agent.py` | `message_buffer_autoclear` 的说明明确区分 core / archival / recall。 |
| 代码证据 | `functions/function_sets/base.py` | recall、archival、core edit 是不同工具。 |
| 代码证据 | `services/summarizer/compact.py` | compact 是正式记忆保活机制。 |
| 代码证据 | `server/server.py` | git-backed memory 说明它在探索更可审计的长期记忆表示。 |
| 推断 | 基于这些层次 | Letta 并不相信“一层向量检索”足以覆盖 agent memory。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否始终进 prompt | 真源特征 |
| --- | --- | --- | --- | --- |
| core memory blocks | `human`、`persona`、其它关键块 | 长期 | 是 | 真源性强，直接定义 agent 当前关键记忆 |
| recall memory | 历史消息 | 中长期 | 否，按需搜 | 对话历史真源 |
| archival memory | 长期语义记忆条目 / archive | 长期 | 否，按需搜 | 长期记忆真源 |
| summary memory | 对被压缩消息的摘要 | 中长期 | 通常会进 prompt | 派生层，可重建 |
| git-backed memory | 文件化、路径化 blocks | 长期 | 是 | 更可审计的 block 真源表达 |
| sleeptime memory work | 后台整理结果 | 中长期到长期 | 间接 | 更像巩固过程，不是单独真源 |

## 3. 读写流程

### 3.1 写入流程

```text
创建 agent 时写入初始 memory blocks ->
运行中模型调用 core_memory_* / memory_* 修改核心块 ->
需要长期保存时调用 archival_memory_insert ->
消息持续进入 recall memory ->
上下文压力增大时 compact 生成 summary ->
可选地用 git-backed memory 或 sleeptime 做更结构化整理
```

### 3.2 读取流程

```text
系统 prompt 渲染 core memory ->
当前 message buffer 一起进入模型 ->
模型需要历史时调 conversation_search ->
需要长期知识时调 archival_memory_search ->
若 compact 过，summary 也一起参与后续上下文
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| core blocks | `Block` / `Memory` 持久化对象 | prompt 渲染文本 | 不能简单从对话完全重建 | 最关键的 agent 当前记忆 |
| recall history | 消息历史 | hybrid search 结果 | 不应依赖摘要完全重建 | 仍是对话真源 |
| archival memory | archive / passage 层 | embedding / semantic search 结果 | 内容不应只靠检索结果反推 | 长期知识区 |
| summary memory | compact 产物 | 无 | 可以从原消息重新生成 | 主要为上下文节流 |
| git-backed memory files | 路径化 block 文件与提交历史 | prompt 渲染 | 可以从 DB 同步，但 git 版本记录本身不可由普通摘要替代 | 审计价值高 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| core 注入 | 直接渲染到系统上下文 | 无需检索 | 由 block 人工/模型编辑保证 | `schemas/memory.py` |
| recall 检索 | `conversation_search` hybrid search | `limit` 控制结果量 | 角色过滤、查询语义 | `functions/function_sets/base.py` |
| archival 检索 | `archival_memory_search` 语义搜索 | `top_k` 控制 | tags、时间范围、语义相似度 | `functions/function_sets/base.py` |
| compact | 自动压缩消息 | 缩减 message tokens | 专门 prompt 保重要事实 | `services/summarizer/compact.py` |
| git memory 注入 | 将路径块渲染成结构化 prompt | 常驻，无二次查询 | 文件路径和标签帮助治理 | `schemas/memory.py`、`server/server.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：有，compact 会生成 summary message
- memory consolidation：有，但不是单一 pipeline，而是 compact + archival + optional sleeptime
- short-term to long-term promotion：有，模型可把对话信息写入 archival memory
- graph extraction：不是核心
- duplicate merge：部分存在于 memory edit / archive 管理逻辑里，但本轮未深读完
- stale memory cleanup：支持覆盖/替换 core block，但默认更依赖继续编辑而不是强规则淘汰

## 7. 优点

- 记忆分层非常清楚，不同层职责不一样。
- core memory 让最关键事实不受召回失败影响。
- compact 不是简单截断，而是有意保留人和关系信息。
- git-backed memory 提供了比普通向量记忆更强的可审计性方向。

## 8. 顾虑

- 记忆层越多，冲突治理越难，尤其是 core/summary/archival 三层可能不一致。
- agent 既是记忆消费者又是编辑者，错误写入会直接进入长期层。
- 这套系统更像“重量级长期 agent”内核，对轻量任务助手可能过度设计。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户自适应不是记忆系统外面的独立模块。
- `human block` 是最显性的适配入口。
- 但记忆系统远不止用户画像，还包括 persona、history、archives、summary、git memory。

结论：

> Letta 说明“用户自适应记忆”可以是记忆系统里最核心的一层，但仍然要和 recall、archive、summary 这些其它记忆职责分开，不然会混成一团。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆主要是检索服务 | 挑战 | Letta 让记忆同时承担常驻上下文、长期存档和后台整理。 |
| 压缩只是 token 优化问题 | 挑战 | 它把 compact 视为保住关系与用户事实的核心机制。 |
| 所有长期记忆都应同质存储 | 挑战 | core block、archive、git memory 明显不是一类东西。 |
| 可审计性可以后补 | 挑战 | git-backed memory 已经把可审计性往核心流程里推。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆分层

- 可以明确区分：
  - 始终在场的核心记忆；
  - 对话历史召回；
  - 长期知识/用户记忆；
  - 压缩摘要层。

### 11.2 记忆治理

- 如果让模型写记忆，就需要更强的审计、纠错和晋升规则。

### 11.3 可审计持久化

- Aether 值得继续考虑“可版本化的结构记忆”而不只是一堆向量条目。

### 11.4 只适合保留为启发的点

- 不一定要照搬 Letta 的人格化包装，但它对“记忆层不是单层数据库”的理解很值得借鉴。

## 12. 仍需继续读的文件

- `letta/services/block_manager_git.py`
- `letta/services/memory_repo/memfs_client_base.py`
- `letta/agents/letta_agent_v3.py`
- `letta/groups/sleeptime_multi_agent_v4.py`
