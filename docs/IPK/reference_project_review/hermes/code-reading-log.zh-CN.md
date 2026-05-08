# hermes：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/hermes/hermes-agent`

## 0. 阅读目标

- 判断它眼里的真实用户需求是不是“长期个人 agent”而不是通用工具壳。
- 找到用户自适应在哪里发生，是内置文件、外部 provider，还是 session search 的结果。
- 找到记忆写入、检索、压缩、后台整理的主链路。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | 产品定位、闭环学习、memory/session search/skills 一体化叙事 |
| 文档证据 | `plugins/memory/honcho/README.md` | AI-native 用户建模、peer card、dialectic recall |
| 文档证据 | `plugins/memory/holographic/README.md` | 本地 fact store、FTS5、trust score |
| 文档证据 | `plugins/memory/mem0/README.md` | 外挂 semantic memory provider 的最小契约 |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `run_agent.py` | system prompt 组装、memory prefetch、sync、压缩前 flush |
| 代码证据 | `agent/prompt_builder.py` | memory / session_search / skills 的 prompt 规则 |
| 代码证据 | `agent/context_engine.py` | context 压缩引擎的生命周期 |
| 代码证据 | `agent/memory_manager.py` | 内置 memory 与外部 provider 的统一接入点 |
| 代码证据 | `agent/memory_provider.py` | provider 生命周期、hook 和边界 |
| 代码证据 | `tools/memory_tool.py` | `MEMORY.md`、`USER.md` 的文件真源与 frozen snapshot |
| 代码证据 | `tools/session_search_tool.py` | FTS5 + summarization 的跨会话回忆 |
| 代码证据 | `hermes_cli/config.py` | memory、user profile、provider、session search 配置项 |

## 3. 当前已确认的主链路

### 3.1 system prompt

```text
SOUL.md 或默认 identity ->
memory / session_search / skill_manage guidance ->
内置 MEMORY.md / USER.md frozen snapshot ->
外部 provider system prompt block ->
skills prompt ->
上下文文件
```

### 3.2 recall

```text
用户消息 ->
MemoryManager.prefetch_all(query) 预取外部 recall ->
tool loop 中如需要可进一步用 session_search ->
session_search 先 FTS5 查历史，再用辅助模型总结匹配 session
```

### 3.3 写回

```text
turn 完成 ->
MemoryManager.sync_all(user, assistant) ->
queue_prefetch_all(user) 为下一轮准备 ->
必要时背景 memory/skill review 继续整理
```

### 3.4 压缩前保护

```text
上下文接近上限 ->
flush_memories(messages) 先提醒模型保存 durable facts ->
MemoryManager.on_pre_compress(messages) 给外部 provider 最后观察机会 ->
context engine 压缩 messages
```

## 4. 第一轮最重要发现

1. `hermes` 把“用户自适应”当成产品核心，而不是附属功能。
2. 内置 `USER.md` / `MEMORY.md` 是明确真源，但外部 provider 可以额外叠加且只有一个外部 provider 同时生效。
3. `session_search` 和持久 memory 被明确分工，前者偏“过去做过什么”，后者偏“长期该知道什么”。
4. 它把 memory、session recall、skills 当成同一个长期学习闭环的不同部件。

## 5. 仍可补读但不阻塞首轮结论的区域

- `plugins/memory/honcho/__init__.py`
- `plugins/memory/honcho/session.py`
- `plugins/memory/holographic/store.py`
- `tools/skill_manager_tool.py`

## 6. 当前推断

- 推断：Hermes 真正服务的是“长期关系型个人 agent”，因此它愿意承受较高系统复杂度来换记忆连续性。
- 推断：它默认相信“用户自适应”应嵌在记忆系统里，而不是独立出一套完全分离的画像子系统。
