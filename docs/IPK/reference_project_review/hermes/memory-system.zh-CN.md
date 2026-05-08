# hermes：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/hermes/hermes-agent`  
> 输出文件：`docs/IPK/reference_project_review/hermes/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `文件真源 + 会话检索 + 可插拔外部 provider 的混合记忆系统`

一句话说明：

> Hermes 不把 memory 限定成单一数据库，而是让 `MEMORY.md` / `USER.md`、session transcript、外部 provider 和压缩前 flush 一起构成跨 session 记忆层。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 长期使用时，稳定事实不能靠上下文窗口硬撑。
- 过去做过什么与长期该记住什么不是同一类数据。
- 不同用户和不同部署对 memory 后端偏好不同，因此记忆能力要可插拔。
- 上下文压缩前必须有“抢救重要记忆”的机制，不能等丢了再后悔。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 直接把 persistent memory、session search、learning loop 并列为核心能力。 |
| 代码证据 | `tools/memory_tool.py` | `MEMORY.md` / `USER.md` 的文件记忆、frozen snapshot、bounded store。 |
| 代码证据 | `tools/session_search_tool.py` | 过去对话通过 SQLite FTS5 + LLM summary 召回。 |
| 代码证据 | `agent/memory_manager.py` | built-in memory 与一个 external provider 统一调度。 |
| 代码证据 | `agent/memory_provider.py` | provider lifecycle 允许 prefetch、sync_turn、on_pre_compress、on_session_end。 |
| 代码证据 | `run_agent.py` | 对话前 `prefetch_all`，对话后 `sync_all`，压缩前 `flush_memories`。 |
| 文档证据 | `plugins/memory/honcho/README.md`、`plugins/memory/holographic/README.md` | 外部 provider 分别代表 AI-native 用户建模与本地 fact store 两类方向。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 主要用途 | 真源特征 |
| --- | --- | --- | --- | --- |
| `MEMORY.md` | 环境事实、项目约定、工具 quirks | 长期 | 给 agent 提供稳定背景 | 文件真源 |
| `USER.md` | 用户偏好、沟通方式、长期习惯 | 长期 | 用户自适应 | 文件真源 |
| session transcripts | 每次会话的完整消息记录 | 中长期 | session_search、审计、回顾 | transcript 真源 |
| session search summary | 匹配历史会话的压缩回忆 | 临时 | 给当前轮补历史背景 | 派生结果 |
| external provider state | Honcho/Mem0/Holographic 等后端中的事实或画像 | 中长期/长期 | 更强 recall 或自动建模 | provider 真源 |
| prefetch cache | 本轮开始前预取的 recall 结果 | 单轮 | 降低重复 recall 成本 | 临时缓存 |

## 3. 读写流程

### 3.1 写入流程

```text
用户与 agent 完成一轮对话 ->
若模型调用 memory 工具，则立即写 USER.md / MEMORY.md ->
turn 结束后 MemoryManager.sync_all(user, assistant) ->
外部 provider 异步或同步持久化 ->
背景 memory review / skill review 可能继续整理 ->
真正 session 结束时 provider.on_session_end 再做收尾
```

### 3.2 读取流程

```text
session start 时加载 USER.md / MEMORY.md frozen snapshot ->
build_system_prompt 注入 snapshot ->
每轮开始前 MemoryManager.prefetch_all(query) ->
如需要再调用 session_search 搜 past sessions ->
外部 provider recall 与内置快照一起影响当前回答
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| 稳定长期事实 | `~/.hermes/memories/MEMORY.md` | 无 | 不应依赖重建 | 内置记忆主真源之一 |
| 用户相关事实 | `~/.hermes/memories/USER.md` | 无 | 不应依赖重建 | 用户适配真源之一 |
| past sessions | session DB + transcript | FTS5 搜索结果 | 可以从 transcript 重建索引 | 支撑 session_search |
| provider recall | provider 后端 | provider 内部索引/向量 | 取决于 provider | 外接能力差异很大 |
| 本轮 recall cache | 内存 | 无 | 不需要 | 只为减少重复 recall 调用 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 静态长期记忆注入 | session 开始时冻结快照 | 避免每轮重建 prompt | 稳定但可能陈旧到下个 session 才刷新 | `tools/memory_tool.py` |
| 外部 recall | `prefetch_all(query)` | 每轮只预取一次并缓存 | 由 provider 决定 recall 质量 | `agent/memory_manager.py`、`run_agent.py` |
| 历史会话搜索 | FTS5 搜索 + 按 session 聚合 + LLM 总结 | limit 最多 5 个 session | 通过 query 聚焦与 per-session summary 控制噪声 | `tools/session_search_tool.py` |
| 压缩前保护 | `flush_memories` + `on_pre_compress` | 在丢上下文前执行 | 把重要事实先写入长期记忆 | `run_agent.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：有，`session_search` 会对匹配 session 做 focused summary
- memory consolidation：有，压缩前 flush 和记忆 review 是一种轻量巩固
- short-term to long-term promotion：有，会把本轮稳定事实写进 `MEMORY.md` / `USER.md` 或外部 provider
- duplicate merge：内置 memory 主要做 bounded curated store，不是高级知识图谱 merge
- stale memory cleanup：内置文件层主要靠人工替换/删除；外部 provider 视实现而定

## 7. 优点

- 文件真源很清楚，用户/开发者能直接审计。
- session_search 把“历史回忆”独立成专门能力，没有硬塞进长期 memory。
- provider 插件让系统既能走本地朴素路线，也能接更强后端。
- 压缩前 flush 是很成熟的工程判断，承认记忆丢失是现实问题。

## 8. 顾虑

- 真源很多：文件、session、provider 同时存在时容易让用户搞不清来源。
- frozen snapshot 提高稳定性，但 session 中途写入后不会立刻影响系统 prompt。
- 外部 provider 质量和治理差异很大，平台一致性会被拉低。

## 9. 与用户自适应系统的边界

这个项目中：

- 记忆系统比用户自适应更宽。
- `USER.md` 明显是用户适配记忆。
- `MEMORY.md` 偏环境和工作事实。
- session_search 偏历史回忆，不等于长期画像。
- skills 又是另一种程序性长期记忆。

结论：

> Hermes 的重要启发不是“把所有长期信息都叫 memory”，而是把不同长期信息放进不同载体，再用 agent loop 把它们编织起来。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 长期记忆可以只有一种存储形式 | 挑战 | Hermes 同时使用文件、session store、外挂 provider。 |
| session recall 与长期记忆差不多 | 挑战 | Hermes 明确把 `session_search` 独立出来。 |
| 压缩是纯上下文工程问题 | 挑战 | 在这里压缩前还要先做 memory flush。 |
| 用户可审计性会妨碍记忆能力 | 挑战 | Hermes 说明显式文件真源和强记忆能力可以共存。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆系统分层

- Aether 可能需要显式区分：
  - 可编辑长期事实；
  - 历史会话检索；
  - 可插拔高级 recall 引擎；
  - 程序性 workflow memory。

### 11.2 压缩策略

- 若未来有上下文压缩，应该考虑“压缩前先保关键记忆”的流程，而不是只做总结。

### 11.3 真源治理

- 若允许多种记忆后端并存，必须明确哪层是可审计真源、哪层只是检索索引或派生总结。

### 11.4 只适合保留为启发的点

- Hermes 的全套 learning loop 很强，但对较简单的产品可能明显过重。

## 12. 仍需继续读的文件

- `plugins/memory/honcho/__init__.py`
- `plugins/memory/holographic/store.py`
- `tools/skill_manager_tool.py`
