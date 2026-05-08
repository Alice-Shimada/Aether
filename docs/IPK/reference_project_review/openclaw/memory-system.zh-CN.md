# openclaw：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/openclaw/openclaw`  
> 输出文件：`docs/IPK/reference_project_review/openclaw/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `工作区 Markdown 真源 + 插件化检索后端 + 主动 recall + dreaming 巩固的分层记忆系统`

一句话说明：

> OpenClaw 默认把记忆的真源放在工作区 Markdown 文件里，再用 `memory-core`、QMD、Honcho、active memory、dreaming 等层把“读、搜、提、晋升、压缩前保护”补齐。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 个人助手的长期记忆最好能让用户直接在磁盘上看到。
- 仅靠当前上下文远远不够，需要检索和主动 recall。
- 短期 daily notes 与长期 curated memory 不是同一类东西。
- 压缩和 session reset 之前，重要内容需要先被安全写入长期层。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `docs/concepts/memory.md` | 明确说记忆主要写在 plain Markdown files 中，没有 hidden state。 |
| 文档证据 | `docs/concepts/memory-builtin.md` | 默认 builtin backend 为 SQLite 索引层。 |
| 文档证据 | `docs/concepts/memory-search.md` | `memory_search` 走 hybrid retrieval。 |
| 文档证据 | `docs/concepts/active-memory.md` | 回复前先跑一次 recall，解决 memory“太被动”的问题。 |
| 代码证据 | `packages/memory-host-sdk/src/host/internal.ts` | 默认识别 `MEMORY.md`、`memory/`、`dreams.md`。 |
| 代码证据 | `extensions/memory-core/src/tools.ts` | `memory_search` 明确面向 `MEMORY.md + memory/*.md + indexed session transcripts`。 |
| 代码证据 | `extensions/memory-core/src/flush-plan.ts` | pre-compaction flush 强制把 durable memory 写到 `memory/YYYY-MM-DD.md`。 |
| 代码证据 | `src/auto-reply/reply/post-compaction-context.ts` | compaction 后还会重新注入 AGENTS 关键段，承认压缩会损失上下文。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 主要用途 | 真源特征 |
| --- | --- | --- | --- | --- |
| `MEMORY.md` | curated 长期事实 | 长期 | 稳定事实、长期偏好、重要决策 | 文件真源 |
| `memory/YYYY-MM-DD.md` | daily notes / 运行中观察 | 中长期 | 当日上下文、短期记忆 | 文件真源 |
| `DREAMS.md` | dreaming 与 backfill 审阅结果 | 中长期 | 人工审阅、巩固过程记录 | 文件真源 |
| session transcripts | 历史对话 JSONL | 中长期 | session recall、可选 session memory | transcript 真源 |
| SQLite memory index | chunk、FTS、向量索引 | 中长期 | `memory_search` | 派生索引，可重建 |
| active memory recall 结果 | 当前轮 recall 总结 | 单轮 | 让回复更自然地使用记忆 | 临时派生 |
| Honcho / QMD 等后端状态 | 外部或侧车中的长期记忆 | 中长期/长期 | 高级 recall / user model | backend 真源 |

## 3. 读写流程

### 3.1 写入流程

```text
用户/agent 在工作区维护 MEMORY.md / USER.md / daily notes ->
memory-core 监控并索引这些文件 ->
如果上下文将被 compaction，先执行 memory flush 把 durable facts 写入当天 daily note ->
dreaming 再从短期材料中筛选，晋升真正值得长期保留的内容 ->
如启用 Honcho 等插件，还会把对话同步到外部后端
```

### 3.2 读取流程

```text
session start 注入 bootstrap files ->
memory_search 在 MEMORY.md + memory/*.md + 可选 session transcripts 上做 recall ->
需要精读时再用 memory_get 读具体文件和行段 ->
若启用 active memory，主回复前先受限地跑一轮 recall ->
compaction 后重新注入 AGENTS 关键段，防止记忆和规则一起漂移
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| curated memory | 工作区 `MEMORY.md` | SQLite/向量索引 | 可以重建索引，但不该丢失源文件 | 长期高信号层 |
| short-term notes | 工作区 `memory/*.md` | SQLite/向量索引 | 可以重建索引 | 短期上下文主真源 |
| dreaming 审阅 | 工作区 `DREAMS.md` | 无 | 不应依赖重建 | 人类可审阅 |
| session history | `~/.openclaw/agents/<agentId>/sessions/*.jsonl` | session memory index | 可重建部分索引 | 历史会话真源 |
| builtin index | `~/.openclaw/memory/<agentId>.sqlite` | FTS/vector | 可由源文件重建 | 默认检索层 |
| 外部 plugin 状态 | Honcho/QMD 等 | 各自内部索引 | 取决于后端 | 可替换层 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| memory file discovery | 默认找 `MEMORY.md` + `memory/` + extra paths | 本地扫描 + 去重 | 限定 root file 与 `memory/` 范围 | `packages/memory-host-sdk/src/host/internal.ts` |
| builtin search | embeddings + BM25 混合检索 | top-k、provider 选择 | hybrid merge、MMR、temporal decay | `docs/concepts/memory-search.md` |
| QMD backend | 默认 memory collections + extra paths | sidecar 搜索 | scope、collections、limits | `backend-config.ts` |
| active memory | 回复前先做一轮 bounded recall | timeout、cache TTL、summary chars | 仅限会话类型和 agent 范围 | `extensions/active-memory/index.ts` |
| compaction 后上下文修补 | 重新注入 AGENTS 关键段 | 只读关键 sections | 避免摘要替代真实规则 | `post-compaction-context.ts` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：有，session transcripts 与 compaction 机制共同承担
- memory consolidation：有，dreaming 就是正式巩固流程
- short-term to long-term promotion：有，从 daily notes / short-term store 到 `MEMORY.md`
- graph extraction：不是主线
- duplicate merge：builtin 主要在索引层去重；更高级整理在 dreaming / wiki 侧
- stale memory cleanup：可通过 maintenance、reindex、rollbacks 等手段治理

## 7. 优点

- 明确承认“真源”和“检索索引”不是一回事。
- daily notes、curated memory、dreaming 各自职责很清楚。
- active memory 解决了“检索能力有了，但回复时不一定及时想起来”的问题。
- compaction 前 flush 与 compaction 后 AGENTS 重注入，工程意识很强。

## 8. 顾虑

- 系统层次多，用户要真正理解 memory 行为并不轻松。
- 如果工作区文件治理不好，长期 memory 很容易变成松散笔记堆。
- builtin、QMD、Honcho、active-memory、memory-wiki 叠加时，一致性治理会变难。

## 9. 与用户自适应系统的边界

这个项目中：

- 记忆系统不只服务用户画像。
- `USER.md` 只是工作区真源的一部分。
- `MEMORY.md`、daily notes、dreaming 更偏广义长期记忆。
- session routing 影响谁共享记忆，但不等于记忆本体。
- Honcho 把用户建模进一步自动化，但不是默认唯一路径。

结论：

> OpenClaw 最重要的启发之一，是把“用户适配真源”和“记忆检索基础设施”拆开讨论，但又允许它们在实际产品里协同工作。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆最好直接存成系统内部结构，不必让用户看到 | 挑战 | OpenClaw 强调本地可见 Markdown 真源。 |
| 长期记忆一层就够 | 挑战 | 它至少区分 curated、daily、dreaming、session recall。 |
| 记忆检索足够好就自然会被模型正确使用 | 挑战 | active memory 专门用来修补这件事。 |
| compaction 只需要保摘要 | 挑战 | OpenClaw 还要 flush durable memory 和重注入 AGENTS 关键规则。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆系统分层

- Aether 或许也应明确拆出：
  - 长期 curated memory；
  - 短期/每日工作记忆；
  - 历史会话 recall；
  - 主动 recall 层；
  - 巩固/晋升层。

### 11.2 真源治理

- 应更认真地区分：
  - 用户可编辑真源；
  - 用于搜索的派生索引；
  - 用于当前轮的临时 recall 总结。

### 11.3 压缩治理

- 若将来做 compaction，不能只关心 token，还要关心“丢掉前先写入”和“压缩后怎么恢复关键规则”。

### 11.4 只适合保留为启发的点

- OpenClaw 的个人助手与真实消息渠道语境非常强，不必把所有多渠道复杂度搬进 Aether。

## 12. 仍需继续读的文件

- `extensions/memory-wiki/*`
- `extensions/thread-ownership/*`
- `src/agents/workspace.ts`
