# mem0：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/mem0`

## 0. 阅读目标

- 判断 `mem0` 眼里的真实用户需求是什么。
- 找到记忆写入、检索、删除、审计的主链路。
- 区分它把“用户自适应”做成了独立系统，还是 memory 的自然副产物。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | v3 add-only、multi-level memory、个性化定位 |
| 文档证据 | `docs/core-concepts/memory-types.mdx` | conversation / session / user / org 分层 |
| 文档证据 | `docs/core-concepts/memory-operations/add.mdx` | 官方 add 流程、`infer` 语义 |
| 文档证据 | `docs/core-concepts/memory-operations/search.mdx` | filters、top_k、rerank |
| 文档证据 | `docs/core-concepts/memory-operations/delete.mdx` | 删除与 bulk erase |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `mem0/memory/main.py` | `Memory.add/search/update/delete/delete_all/reset` |
| 代码证据 | `mem0/memory/storage.py` | `history`、`messages` sqlite 表 |
| 代码证据 | `mem0/client/main.py` | 托管 API 的 `update/delete/feedback` |
| 代码证据 | `tests/test_memory_integration.py` | 用户偏好写入和读取的最小集成样例 |
| 代码证据 | `tests/test_client_feedback.py` | feedback 请求实际 payload |

## 3. 当前已确认的主链路

### 3.1 写入

```text
应用传入 messages -> Memory.add() ->
按 user_id / agent_id / run_id 组装 scope ->
取最近 10 条消息 + 取现有相关 memory ->
LLM 单次抽取 memory ->
批量 embedding -> hash 去重 -> vector store 插入 ->
history sqlite 记审计 -> messages sqlite 保留最近消息
```

### 3.2 读取

```text
query -> Memory.search() ->
要求 filters 至少有 user_id / agent_id / run_id 之一 ->
vector search ->
可选 rerank ->
返回 results 给业务应用自己组 prompt
```

### 3.3 显式纠正

```text
client.update(memory_id, ...) / delete(memory_id) / delete_all(...) / feedback(...)
```

## 4. 第一轮最重要发现

1. README 与代码主线一致强调 v3 是 add-only，不再在抽取阶段自动 UPDATE/DELETE。
2. 但 add 文档仍写着“冲突解决、latest truth wins”，这里存在文档滞后。
3. `mem0` 的“用户自适应”主要不是单独 profile system，而是把偏好做成 user-scoped memories。
4. 本地 SQLite 只承担短期消息缓存和 history 审计，不是长期 memory 真源。

## 5. 仍可补读但不阻塞首轮结论的区域

- `openmemory/`
- `server/`
- `docs/platform/advanced-memory-operations`
- graph 相关可选存储实现

## 6. 当前推断

- 推断：`mem0` 更像“给任意 agent 补 memory substrate”，而不是想掌控完整对话产品。
- 推断：它把用户偏好、agent 经验和 session 信息装进同一检索框架，说明它并不强烈坚持这些必须先做成不同产品。
