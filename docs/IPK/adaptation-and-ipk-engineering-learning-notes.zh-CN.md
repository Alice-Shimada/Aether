# 用户自适应系统与 IPK：值得向 Hermes 和 wiki-llm 学的工程问题

这份文档不再做高层路线比较，而是集中整理“工程上最值得学什么”。

重点围绕两块：

- 用户自适应系统
- IPK 内容系统

---

## 1. 用户自适应系统：工程学习清单

### 1.1 从对话中提取习惯，应该怎么提取

我建议把“习惯提取”分成四个阶段，而不是只做一次 prompt：

```text
raw chat
  -> candidate signal
  -> merged signal buckets
  -> summary / proposal
  -> confirmed habit or session scratch
```

#### 阶段 A：先提取 signal，不直接提取 confirmed habit

这一层应该尽量保守，优先提取：

- 用户显式说出的偏好
- 用户对 AI 行为的纠正
- 用户对工具、路径、顺序、输出格式的明确要求
- 用户在当前 subject 中对熟悉度、解释深度的明确表述

不建议第一步就试图输出：

- 最终 habit 正文
- 最终作用域
- 最终长期规则

原因是：

- 第一跳的目标是保留证据，而不是直接拍板
- 先把证据抽准，比先把长期规则写漂亮更重要

#### 阶段 B：做 merge，而不是一条条直接进入 proposal

这一步非常关键。

你已经有 `merge_key / merged_from / evidence_refs` 这套结构，这是对的。工程上还值得继续加强：

- 语义归一
- 相近 phrasing 合并
- 显式表达优先于隐式表达
- 最近证据与高置信证据加权
- 临时要求与长期要求分离

这一层本质上是在回答：

- “这些聊天里其实是在反复说同一件事吗？”

#### 阶段 C：先决定去向，再决定正文

很多系统喜欢先生成一段“习惯描述”，再去猜放哪。

更稳的工程顺序通常是：

1. 这更像 `profile fact`、`policy habit`、`session scratch`，还是未来的 `procedural skill`
2. 如果是 habit，它更适合哪个 scope
3. 再生成最终 summary / proposal 文案

这样能减少“正文写得很好，但对象放错层”的问题。

#### 阶段 D：把作用域判断和确认层分开

Hermes 很强的一点是会自动复盘，但它没有你现在这样重的 scope 设计。

对你来说，更合理的工程结构是：

- AI 负责给出 `scope candidates`
- AI 负责解释为什么建议放这里
- 用户负责决定高影响 / 高层级条目最终是否确认

### 1.2 习惯应该怎样存入你当前的习惯库

当前最合理的最小结构仍然是：

- `profile`
  偏声明性、偏“你是谁/你在这个 subject 里处于什么位置”
- `policy / habit`
  偏“以后默认怎么做”
- `session scratch`
  偏“这轮先临时生效、后面再决定是否入库”

从工程角度，最值得注意的是不要把下面几类东西混写成一种对象：

1. 用户事实
2. 工作原则
3. 当前 session 临时要求
4. 程序性工作流

我建议后面继续往下面这个方向收敛：

| 类型 | 典型内容 | 更适合的落点 |
| --- | --- | --- |
| profile fact | 用户在统计物理熟悉度较低 | `subject_profile` |
| response preference | 偏好物理直觉解释 | `global/subject policy` |
| operation habit | 规划讨论后同步维护 open-questions | `initiative/task_scope policy` |
| session scratch | 这轮先按这种格式回答 | session scratch |
| procedural skill | 研究综述型任务如何组织查找、归纳、沉淀 | 未来独立 skill layer |

### 1.3 一个 session 的习惯有两个来源，怎么管理

你已经指出了一个非常关键的事实：

- 当前 session 的有效习惯，不只来自 confirmed library
- 还来自 session 暂存区

工程上最好把它明确成：

```text
runtime habits
  = imported confirmed habits
  + active session scratch habits
```

这意味着需要至少三种状态：

- `imported`
- `scratch_active`
- `scratch_pending`

并且在 runtime compiler 里分开处理：

- `imported`
  默认更稳定、证据更强
- `scratch_active`
  优先级很高，但生命周期短
- `scratch_pending`
  不直接进入 prompt，只进入 UI / review 提示

### 1.4 怎么从确认库里寻找合适习惯

这是你现在最值得继续打磨的部分之一。

我建议把“confirmed habit 搜索”拆成四层，而不是一次性全库召回：

#### 第一层：binding / local anchors

先看：

- 当前 session 已绑定的 habit ids
- 当前 initiative / task_scope / artifact
- 当前 subject ids

这一层是最高精度入口。

#### 第二层：scope maps / trigger indexes

再看：

- `scope-map`
- `trigger-index`
- `path-index`
- `subject-index`
- `task-scope-index`

这一层解决的是：

- “从哪里开始找”

#### 第三层：habit surface / compact read model

不要一上来读完整 confirmed record。

先读：

- 轻量 summary
- scope
- trigger
- conflict
- suppression
- evidence count

这一层解决的是：

- “值不值得进入当前 session 候选集”

#### 第四层：LLM rerank / conflict check

候选少量进入后，再让 LLM 或规则层做：

- 当前请求 fit 吗
- 会不会与当前 scratch/confirmed habits 冲突
- 如果注入，会不会改变行为太大

这样结构上就会变成：

```text
binding
  -> indexes
  -> compact surfaces
  -> rerank + conflict gate
  -> current session habit set
```

这比“全库 embedding search -> prompt”更适合你的架构。

### 1.5 需要向 Hermes 学的工程点

#### 点 A：后台 review job

可以借 Hermes 的思路，加一个异步工作流：

```text
assistant response finished
  -> enqueue adaptation review
  -> extract new signals
  -> merge proposals
  -> update inbox
```

重点不是自动确认，而是：

- 不阻塞主响应
- 持续把“下一轮值得确认的东西”准备好

#### 点 B：provider interface

未来可预留：

- local provider
- external modeling provider
- recall provider

这样你的 adaptation 真源仍在本地，但检索或用户建模可以替换。

#### 点 C：focused session recall

未来补 `session recall` 时，不要原样把长会话塞回 prompt。

更适合：

- 先 FTS / 结构检索
- 再围绕命中窗口截断
- 再总结成 focused recap

---

## 2. IPK：工程学习清单

### 2.1 IPK 应该怎样存

你现在的方向我认为已经是对的：

- `piece.md`
- `meta`
- `surface`
- `links`

工程上最重要的是坚持以下原则：

#### 原则 A：正文和工作面分开

- `piece.md` 负责人类最终要保留的内容
- `surface` 负责 AI 快速判断是否值得继续读

如果这两层混在一起，后面搜索和联想都会很难稳定。

#### 原则 B：关系单独存

- `links` 不只是附注
- 它是关系层

单独存的好处是：

- 可重建
- 可版本化
- 可独立调试
- 不污染正文

#### 原则 C：派生层不做真源

map、index、graph views、search cache 都应该是派生层。

这和 Hermes 的经验一致：

- `state.db` 不是 memory
- `memory` 不是 skill
- 派生导航层不应成为长期真源

### 2.2 IPK 应该怎么找

现在最适合你的检索链仍然是：

```text
query
  -> taxonomy / alias expansion
  -> candidate maps or compact candidates
  -> catalog/retrieve/associate surfaces
  -> top-k drill-down
  -> optional full body read
```

这里最值得继续加强的是：

#### 点 A：search 与 associate 必须继续分开

`search` 适合回答：

- 找之前说过/写过的某个内容
- 找某个概念、问题、结论

`associate` 适合回答：

- 还有什么相关但没直接问到的东西
- 哪些 piece 值得一起看

这两者的结构目标不同：

- `search` 先准
- `associate` 先有启发

#### 点 B：compact read model

你现在的 `SearchHit / AssociateHit` 很对，但后面还可以再补：

- 更明确的 `why matched`
- surface-level snippet
- confidence decomposition
- conflict / contradiction hints

#### 点 C：map entry 不能太重

map 更适合做：

- 起始导航
- 区域缩小
- 候选组织

不要让 map 自己承担过多正文或长摘要，否则就会替代 surface。

### 2.3 IPK 应该怎么搭 map

我建议继续把 map 理解成：

- 对 `catalog surface + links + taxonomy` 的重编译结果
- 给 AI 的起始导航层
- 给人类的浏览辅助层

而不是：

- 知识正文
- 事实真源
- 自己再长一套半独立 wiki

工程上很值得做的 map 种类：

1. `by_domain`
2. `by_method`
3. `by_project`
4. `open_questions`
5. `graph_links`
6. 主题 cluster / concept route

### 2.4 IPK 应该暴露什么信息

这件事最好按对象来拆：

#### 给用户看的

- title
- body_summary
- body
- status
- origin / source 简述

#### 给 search 用的

- retrieve summary
- questions / claims / keywords / role
- why matched

#### 给 associate 用的

- associate summary
- concepts / methods / bridge hints
- link glimpse

#### 给运行时路由用的

- type
- domains
- methods
- contexts
- projects
- status

核心原则是：

- 不同消费方读不同 view
- 不要把磁盘结构原样暴露给所有调用方

### 2.5 怎么利用这些信息

最实用的方式不是“所有字段都喂给模型”，而是分层利用：

#### 层 1：粗筛

利用：

- domains
- methods
- contexts
- keywords

做便宜收缩。

#### 层 2：中筛

利用：

- retrieve summary
- claims
- questions
- role

做相关性判断。

#### 层 3：扩展

利用：

- links
- associate hints
- bridge targets

做联想和延展。

#### 层 4：确认

只有这时才读：

- `piece.md`

### 2.6 需要向 Hermes 学的工程点

#### 点 A：session recall 层

未来最值得补的一层不是“把 IPK 做得像更大的 wiki”，而是：

- 增加一层 session recall

它可以专门处理：

- 以前聊过
- 但没入库
- 仍值得回忆

#### 点 B：state db + FTS + summary

这套结构对 IPK 外围的“历史回忆”很适合：

```text
session db
  -> FTS
  -> hit windows
  -> focused summary
  -> return recap
```

#### 点 C：工具化 recall，而不是全量自动注入

Hermes 的经验提示我们：

- recall 层是有价值的
- 但它最好是受控的，不是每轮全量无条件注入

### 2.7 需要向 wiki-llm 学的工程点

#### 点 A：source registry

虽然 IPK 已经有 source refs，但未来仍然很值得正式化：

- source manifest
- source ingest log
- source-to-piece lineage

#### 点 B：lint / health check

建议未来补一条独立工作流：

```text
ipk lint
  -> stale piece check
  -> orphan check
  -> contradiction check
  -> missing bridge check
  -> open-question growth check
```

#### 点 C：让高价值问答回写成 piece

这件事对研究型 IPK 非常重要。

你未来可以明确支持：

- 从一次问答 synthesize 出 `review`
- 从一次讨论沉淀出 `knowledge`
- 从一次规划沉淀出 `plan`

---

## 3. 近期最值得做的工程动作

### 3.1 用户自适应系统

1. 把 `response after-review` 做成后台 job，而不是主流程同步。
2. 补一层更稳定的 compact habit surface，避免 query-time 读太多完整记录。
3. 明确 `runtime habits = imported + scratch active` 的编译规则。
4. 继续把“profile fact / policy habit / procedural skill”这三类对象分清。

### 3.2 IPK

1. 先继续优化现有 `piece / surface / search / associate / map` 闭环。
2. 不急着把 session recall 混进 IPK 真源。
3. 补 ingest/reindex/lint 日志视图。
4. 准备 future source registry 和 quality-check 工作流。

---

## 4. 一句话版

如果只说工程抓手：

- 用户自适应系统最该继续做的是：`提取分层化 + runtime matching 分层化 + 后台 review 闭环`
- IPK 最该继续做的是：`surface 质量 + map 导航 + 分用途读模型 + 未来独立 session recall`
