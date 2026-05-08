# 用户自适应系统能力对比：Hermes / OpenClaw / Aether

> 状态：研究对比稿，非最终架构决策。
>
> 目的：只围绕“用户自适应系统 / 用户画像系统 / 用户习惯系统”做对比，不再把重点放在通用记忆系统或 IPK 内容系统上。
>
> 使用方式：如果要给导师汇报，优先看第 2、3、4、5 节。第 2 节解释三个系统各自是什么；第 3 节是核心对比表；第 4 节对应最开始提出的五个打磨点；第 5 节是推荐判断。

---

## 0. 先说结论

Hermes、OpenClaw、Aether 都和“让 agent 更了解用户”有关，但它们的目标不一样。

| 系统 | 是否是专门的用户自适应系统 | 更准确的定位 | 对 Aether 最有价值的部分 |
| --- | --- | --- | --- |
| Hermes | 不是专门的用户自适应系统 | 轻量用户画像 + agent 个人记忆 + provider 生命周期 | `USER.md` / `MEMORY.md` 分离、静态 prompt block、turn 前 prefetch、turn 后 sync |
| OpenClaw | 不是专门的用户自适应系统 | 可检索长期记忆 + 主动召回 + 短期到长期巩固 | hybrid search、active memory、short-term promotion、timeout / cache / top K |
| Aether | 是，目标就是用户自适应系统 | 多作用域习惯库 + session scratch + proposal review + context packet | 已经有真源、作用域、review、生效集合；需要加强提取、入库、检索、解释和运行时使用 |
| Graphify | 不是用户自适应系统 | 图谱 / 地图 / 解释层 | 只适合作为 Aether habit map / relation / explain 层的参考，不应当作用户画像系统 |

一句话判断：

> Hermes 适合学习“用户画像怎样进入 agent 生命周期”，OpenClaw 适合学习“习惯越来越多时怎样快速找出来”，Aether 应继续走“明确习惯真源 + 作用域 + 用户确认 + 当前 session 生效集合”的路线。

---

## 1. 术语速查：只保留和用户自适应有关的词

| 术语 | 白话解释 | 在 Aether 里对应什么 |
| --- | --- | --- |
| 用户自适应 | 系统根据用户的偏好、习惯、知识状态和工作方式，调整后续回复与行动。 | Aether adaptation 的核心目标。 |
| 用户画像 | 关于用户本人的长期描述，例如偏好、能力状态、沟通方式。 | `subject_profile`、global preference、用户能力/偏好记录。 |
| 习惯 | 用户希望系统以后遵守的规则、偏好或工作方式。 | confirmed habit / policy / artifact contract。 |
| 真源 | 系统正式信任、以后可以依赖的记录。 | confirmed habit library。 |
| 候选习惯 | 系统刚从用户话里提取出来，但还没确认长期有效的习惯。 | signal、scratch、proposal candidate。 |
| session scratch | 当前 session 的暂存习惯区。 | `scratch-habits.json`，可 active / pending / superseded / promoted。 |
| proposal | 候选写入请求。用户或系统确认后才正式进入长期习惯库。 | `ProposalRecord`。 |
| scope | 习惯适用范围。 | `global / subject / initiative / task_scope / artifact`。 |
| bucket routing | 决定一条 confirmed habit 具体放进哪个 scope bucket。 | 例如放进某个 subject、某个 task_scope、某个 artifact contract。 |
| static prompt block | session 开始时放进 prompt 的小型稳定信息块。 | 当前 session 可导入少量 confirmed habits，但不能塞全库。 |
| turn 前 prefetch | 回答前先快速找相关用户习惯。 | context compile 前的 habit retrieval。 |
| turn 后 sync | 回答后把本轮暴露出的用户习惯写回候选区或 review 队列。 | signal extraction / scratch capture / proposal merge。 |
| consolidation | 把多次出现的短期习惯整理成长期候选。 | 多个 signals / scratch 形成 promotion proposal。 |
| active memory | 回答前主动跑一次记忆召回。 | Aether 可借鉴为 adaptation preflight，但要限时、限量、可关闭。 |
| hybrid search | 关键词检索和语义检索一起用。 | habit retrieval 可用 scope / trigger / path index + optional semantic rerank。 |
| map / relation / explain | 用关系图解释习惯之间的连接和命中原因。 | habit graph、why matched、conflict explanation。 |
| active set | 当前 session 真正生效的习惯集合。 | imported confirmed habits + active scratch habits。 |

---

## 2. 三个系统各自的“类用户自适应”简介

### 2.1 Hermes：轻量用户画像 + agent 经验

Hermes 的相关机制可以这样理解：

```text
session 开始
  -> 读取 USER.md 和 MEMORY.md
  -> 放进 prompt 作为稳定背景

用户对话中
  -> agent 可以调用 memory tool 写入/替换/删除记忆
  -> provider 可以在每轮前预取相关上下文

每轮结束后
  -> provider 可以同步这一轮内容
  -> 长期有用的信息留给以后 session
```

Hermes 中最接近用户自适应的是 `USER.md`：

| Hermes 文件 | 保存什么 | 对 Aether 的启发 |
| --- | --- | --- |
| `USER.md` | 用户偏好、沟通方式、工作习惯、期待 | 这是用户画像层，类似 Aether 的长期用户偏好和 subject/profile 记录。 |
| `MEMORY.md` | agent 自己学到的环境、工具、项目经验 | 不应混入 Aether 用户习惯真源，否则会污染“用户画像”。 |

Hermes 的优势：

- 简单，用户和 agent 都容易理解。
- 小型 prompt block 很快，适合一直带着。
- 有 provider 生命周期，能支持 turn 前读、turn 后写。

Hermes 的不足：

- 用户画像较扁平，没有 Aether 的五层 scope。
- 缺少严格 proposal review。
- 不擅长表达“这条习惯只适用于某个主题 / 任务 / 文件”。
- `USER.md` 和 `MEMORY.md` 虽然分离，但仍然不是结构化习惯库。

### 2.2 OpenClaw：可检索、可主动召回、可巩固的长期记忆

OpenClaw 的相关机制可以这样理解：

```text
记忆写到文件
  -> 系统切成小块
  -> 建关键词索引和语义索引
  -> 用户提到相关内容时快速搜索
  -> 只把少数相关片段给主 agent

短期内容反复被用到
  -> 记录召回次数、分数、查询多样性
  -> 达到阈值后成为长期记忆候选
```

OpenClaw 和用户自适应的关系：

| OpenClaw 能力 | 用户自适应意义 | 对 Aether 的启发 |
| --- | --- | --- |
| `memory_search` | 用户习惯多了以后，不能每次全量扫描。 | Aether 需要 habit index / trigger index / semantic rerank。 |
| Active Memory | 回答前主动找可能相关的用户记忆。 | Aether 可做 adaptation preflight，但必须有 timeout / top K。 |
| short-term promotion | 多次出现、反复有用的内容才晋升。 | Aether 的 scratch / signal 可用类似证据分数生成 proposal。 |
| memory_get | 搜索后只读需要的行。 | Aether 检索应先看 habit surface，再读 top K full record。 |

OpenClaw 的优势：

- 检索工程比 Hermes 强。
- 能处理较大的长期记忆集合。
- 有主动召回，但有超时、模型、缓存、开关。
- 有短期到长期的巩固思路。

OpenClaw 的不足：

- 它是通用记忆系统，不是严格用户习惯系统。
- 召回频率不能直接等于“用户确认”。
- 不天然区分 confirmed habit、scratch、proposal、active set。
- scope routing 不是核心抽象。

### 2.3 Aether：明确以用户自适应为目标的习惯库系统

Aether 当前设计更像：

```text
用户发言
  -> 提取候选习惯 signal
  -> 当前 session 先进入 scratch
  -> 高影响或跨 session 进入 proposal
  -> 用户确认后进入 confirmed habit library
  -> 每轮 context compile 只选当前 session 应生效的习惯
```

Aether 已经有的关键结构：

| Aether 结构 | 做什么 |
| --- | --- |
| `SignalRecord` | 记录从用户话语里提取到的习惯信号和证据。 |
| `ScratchHabit` | 管理当前 session 暂存习惯，支持 active / pending / superseded / promoted。 |
| `ProposalRecord` | 管理长期写入候选，支持用户 review、合并、确认、拒绝。 |
| `HabitSurface` | 把正式习惯编译成用于检索的小卡片。 |
| `ContextPacket` | 每轮决定实际注入哪些用户画像、习惯、规则和 scratch。 |
| 五层 scope | `global / subject / initiative / task_scope / artifact`，表达习惯适用范围。 |

Aether 的优势：

- 比 Hermes 和 OpenClaw 更明确地区分“用户习惯真源”和“临时候选”。
- 有 session scratch，能处理当前对话中刚出现的局部要求。
- 有 proposal review，适合高影响用户习惯。
- 有 scope，适合表达“不是所有场景都适用”的习惯。

Aether 还需要加强：

- 从用户发言中提取习惯的 guard 和置信度组件。
- 入库前候选习惯的查重、合并、删除和跨 session hint 边界。
- confirmed habit 的 bucket routing。
- 大规模习惯库的快速检索和 explain。
- 当前 session active set 的 UI、审计和冲突解释。

### 2.4 Graphify 在本文中的位置

Graphify 不是用户自适应系统，所以不作为主对比对象。

但 Graphify 对 Aether 有一个非常明确的参考价值：

> 当 Aether 的 confirmed habits 越来越多时，可以借 Graphify 的思路，把习惯库编译成 habit map / relation graph / explain layer。这个图谱只帮助检索和解释，不是真源。

Graphify 适合借鉴的点：

| Graphify 能力 | Aether 可借鉴到哪里 |
| --- | --- |
| `graph.json` | habit relation graph。 |
| `GRAPH_REPORT.md` | habit report / scope report。 |
| `get_neighbors` | 查看某条习惯的冲突、共用、来源、替代关系。 |
| `shortest_path` | 解释当前请求为什么命中某条习惯。 |
| `EXTRACTED / INFERRED / AMBIGUOUS` | 区分 confirmed relation、推断关系、待审查关系。 |
| cache / dirty rebuild | 习惯索引和关系图增量重建。 |

Graphify 不适合照搬的点：

- 不应用 graph community 代替用户确认的 scope。
- 不应把 inferred edge 当作 confirmed habit。
- 不应每轮用户发言都跑全图 LLM 分析。

---

## 3. 用户自适应系统关键能力对比表

这一节是本文核心。每一行都是实现用户自适应系统时需要考虑的关键能力。

### 3.1 总表

| 关键能力 / 技术 | 它是做什么的 | Hermes | OpenClaw | Aether 当前设计 | 判断 |
| --- | --- | --- | --- | --- | --- |
| 用户画像存储 | 保存用户偏好、沟通方式、长期习惯。 | 有，主要是 `USER.md`，轻量扁平。 | 有长期 memory，但不是专门用户画像。 | 有 profile / policy / habit，且有多 scope。 | Aether 结构最适合用户自适应；Hermes 简洁可借鉴。 |
| 用户习惯和 agent 经验分离 | 防止把工具经验、环境事实误写成用户偏好。 | 有 `USER.md` / `MEMORY.md` 分离。 | 主要是 memory 文件分层，不严格区分用户习惯和 agent 经验。 | 设计上应分离，但仍需在提取和 UI 中强化。 | Hermes 的分离意识应明确借鉴。 |
| 用户发言习惯提取 | 从用户消息中识别“以后应该怎样适应用户”。 | 主要靠 agent 自觉调用 memory tool。 | 可写入 memory，但不是专门习惯 classifier。 | 有 `classifyBatch` 提取 signal。 | Aether 已有基础，但需要 guard 和更细置信度。 |
| 一次性指令过滤 | 排除“只这次做 X”，避免误当长期习惯。 | 靠提示词约束，不够结构化。 | 靠记忆写入判断，不是核心机制。 | 有 `temporary` 字段，但 guard 还可加强。 | Aether 应补强两段式提取。 |
| 引用 / assistant 话语排除 | 避免把引用内容或 assistant 自己说的话当用户偏好。 | 主要靠 agent 判断。 | 主要靠写入流程判断。 | 当前可从 user message 取文本，但仍需更严格来源 guard。 | 这是 Aether v1 打磨重点。 |
| 置信度组件 | 解释为什么认为这是习惯，以及可信程度。 | 简单，主要靠人工可读 memory。 | promotion 分数包含频次、相关性、多样性、时间等。 | signal 有 confidence / impact / explicit / temporary。 | Aether 应吸收 OpenClaw 的组件化 scoring。 |
| session scratch | 当前 session 内先临时应用新习惯。 | 没有严格 scratch 概念。 | 有短期 memory，但不是 session habit scratch。 | 有 `ScratchHabit`。 | Aether 明显更贴近用户自适应。 |
| pending / active 状态 | 区分“可立即生效”和“需要确认”。 | memory 写入后就是记忆，没有严格状态机。 | 有短期与长期区别，但不是 habit 状态机。 | 有 pending / active / superseded / promoted / discarded。 | Aether 更强，应继续完善 UI 和规则。 |
| 查重与合并 | 避免同一习惯重复入库。 | exact duplicate 和 replace/remove。 | search / promotion 可辅助发现重复。 | scratch、proposal 有 merge_key 和相似度逻辑。 | Aether 已有基础，可加强跨 session 合并。 |
| 冲突处理 | 新旧习惯矛盾时决定谁覆盖谁。 | 主要靠人工编辑 memory。 | 检索层可发现，但不是专门冲突模型。 | scratch 可 shadow imported habit，有 conflict 记录。 | Aether 更强，但 explain 和 UI 还需加强。 |
| 用户确认入口 | 高影响习惯入库前让用户审查。 | 不强调；agent 可直接写 memory。 | promotion 可阈值化，但不等于用户确认。 | 有 proposal inbox。 | Aether 的 human-in-the-loop 是正确主线。 |
| 长期真源 | 哪些记录能被系统以后正式依赖。 | `USER.md` / `MEMORY.md` 是轻量真源。 | memory files 是长期记录，但边界较粗。 | confirmed habit library / policies / contracts。 | Aether 最清楚。 |
| scope tags | 记录习惯适用范围。 | 主要靠文字描述或 profile 隔离。 | 主要靠路径/source，不是用户习惯 scope。 | 有五层 scope。 | Aether 明显更强。 |
| bucket routing | 决定 confirmed habit 具体落到哪个对象或分区。 | 粗略：USER 或 MEMORY。 | 粗略：memory 文件、daily notes、backend/source。 | 有 scope 和 target_patch，但 routing 还需更明确。 | Aether 应拆清 scope tagging 与 bucket routing。 |
| 检索索引 | 习惯多了以后快速找相关规则。 | 小 memory 常驻，大历史 session_search。 | 强，hybrid search / FTS / vector。 | 有 habit-index、trigger/path/subject/task index 初形。 | Aether 应重点借鉴 OpenClaw。 |
| 主动召回 | 用户没明确要求时，系统主动找可能相关的习惯。 | prefetch provider 可做。 | Active Memory 很明确。 | context compile 会做匹配，但还不是完整主动召回体系。 | 可借 OpenClaw，但要低延迟。 |
| 渐进披露 | 先看摘要/索引，再读少数完整记录。 | 小 memory 直接 prompt，大历史按需 search。 | search 后 memory_get。 | habit surface + context packet 已有雏形。 | Aether 应把它作为正式 retrieval pipeline。 |
| 关系图 / explain | 解释为什么命中某条习惯，以及它和其他习惯的关系。 | 弱。 | memory wiki 可有知识层，但不是 habit graph。 | 有 relation 设计方向，还需落地。 | 可借 Graphify，但只作为导航层。 |
| 当前 session active set | 明确本轮哪些习惯真的生效。 | prompt 中 memory 可见，但没有严格 active set。 | 检索片段是背景，不是严格规则集。 | imported confirmed + active scratch。 | Aether 最清楚，应继续坚持。 |
| pending 不生效 | 未确认候选不能当规则用。 | 不明显。 | 检索结果可被模型参考，边界依赖提示。 | pending proposal 排除出 active context。 | Aether 已有正确边界。 |
| 覆盖优先级 | 当前用户要求、scratch、confirmed habit、系统规则之间怎么排序。 | 主要靠系统提示词。 | 主要靠 untrusted context 和工具规则。 | 已有 shadow / omitted_reason / context packet，但仍需更可解释。 | Aether 应补优先级审计。 |
| 后台巩固 | 把多次出现的短期习惯整理成长期候选。 | provider sync 可做，但内建不重。 | 强，short-term promotion / dreaming。 | signals / summary / proposal 有基础。 | Aether 可借 OpenClaw 的 scoring，但保留 review。 |
| 性能控制 | 不让用户每句话都等慢模型。 | static prompt block + cached prompt。 | index、cache、timeout、top K、fast model。 | index 初形，但 retrieval pipeline 可继续优化。 | Aether 应优先做“索引优先，LLM 少量介入”。 |
| 用户可管理性 | 用户能看、改、删、拒绝习惯。 | markdown 文件容易直接编辑。 | memory files / tools 可管理。 | UI 有 proposal / scratch / current context 方向。 | Aether 需要更好的 habit management UX。 |
| 审计和来源 | 能看到习惯从哪句话来、为什么生效。 | memory 文本可读，但证据链弱。 | search 可给 source lines。 | evidence_refs、audit、omitted_reason 已有。 | Aether 应强化 provenance UI。 |

### 3.2 按“谁有什么、谁缺什么”总结

| 能力组 | Hermes | OpenClaw | Aether 当前 |
| --- | --- | --- | --- |
| 用户画像 | 有轻量 `USER.md`。 | 有长期 memory，但不是专用用户画像。 | 有 profile / policy / habit 多层结构。 |
| 习惯提取 | 靠 agent 自觉写 memory。 | 靠 memory 写入和后续巩固。 | 有 LLM signal classifier。 |
| 入库前暂存 | 弱。 | 有短期记忆和 promotion store。 | 有 session scratch。 |
| 用户确认 | 弱。 | 部分 review / dreaming 输出可审查，但不是核心 habit gate。 | 有 proposal inbox。 |
| 多作用域 | 弱。 | 弱。 | 强，五层 scope。 |
| 快速检索 | 中，适合小 memory。 | 强，hybrid search。 | 中，有索引雏形，需要加强。 |
| 当前生效集合 | 弱。 | 中，召回片段可注入但不是严格规则集。 | 强，有 imported confirmed + active scratch。 |
| 解释和关系 | 弱。 | 中，memory wiki 可辅助。 | 设计方向明确，但 habit graph/explain 仍需落地。 |
| 性能控制 | 强在小 prompt 和缓存。 | 强在索引、缓存、超时、top K。 | 需要把这些正式化到 habit retrieval。 |

---

## 4. 对应最开始提出的五个打磨点

### 4.1 从用户发言提取习惯，并判断置信度

| 系统 | 现有做法 | 值得借鉴 | Aether 应补什么 |
| --- | --- | --- | --- |
| Hermes | agent 根据提示主动把用户偏好写入 `USER.md`。 | 简单直接，适合显式偏好。 | 不应只靠 agent 自觉，要有 guard + classifier。 |
| OpenClaw | 不是专门提取习惯，但 promotion 会看重复、相关性、多样性。 | 置信度不只来自一次判断，还来自后续反复使用。 | 把 confidence 拆成显式性、重复性、影响范围、反证、来源可靠性。 |
| Aether | `classifyBatch` 已输出 impact / explicit / temporary / traits / note。 | 已经比两者更接近习惯提取器。 | 加强引用排除、assistant 话语排除、一次性指令排除、矛盾检测。 |

建议方向：

- 第一段做 guard：先判断这句话有没有资格进入习惯提取。
- 第二段做 classifier：只对通过 guard 的文本提取候选。
- 置信度不要只给一个数字，要能解释“为什么认为它是习惯”。

### 4.2 入库前管理候选习惯

| 系统 | 现有做法 | 值得借鉴 | Aether 应补什么 |
| --- | --- | --- | --- |
| Hermes | memory tool 支持 add / replace / remove。 | 用户可读、可改、可删除。 | 对复杂习惯不能只靠 substring replace。 |
| OpenClaw | short-term store 记录短期候选的召回、分数、查询来源。 | 候选先在短期区积累证据，而不是立刻长期化。 | 跨 session hint 可以有，但不能直接变真源。 |
| Aether | session scratch 有状态、合并、shadow、promotion 标记。 | 已经有最贴近目标的暂存层。 | 需要更清楚的查重、合并、删除、跨 session 聚合和 UI 审查。 |

建议方向：

- 同 session 内：允许 active / pending / merge / supersede / dismiss。
- 跨 session：只做 evidence aggregation 或 hint，不自动污染 confirmed habit。
- 用户确认前：候选必须保留来源和状态。

### 4.3 confirmed habit 结构化入库和 bucket routing

| 系统 | 现有做法 | 值得借鉴 | Aether 应补什么 |
| --- | --- | --- | --- |
| Hermes | 大致分成 `USER.md` 和 `MEMORY.md`。 | 粗 bucket 很容易理解。 | 不够表达多作用域用户习惯。 |
| OpenClaw | 记忆按文件、source、backend、索引组织。 | storage source 和 retrieval source 分离。 | 不应把 bucket routing 变成普通文件路径问题。 |
| Aether | 有五层 scope、target_patch、HabitSurface。 | 结构最接近目标。 | 将 scope tagging 和 bucket routing 拆成两个明确步骤。 |

建议方向：

```text
candidate habit
  -> decide scope tags
  -> decide concrete bucket
  -> match existing / create new / unsure
  -> proposal review if needed
  -> write confirmed truth source
  -> rebuild surfaces / indexes / relation hints
```

### 4.4 快速准确找到当前 session 合适习惯

| 系统 | 现有做法 | 值得借鉴 | Aether 应补什么 |
| --- | --- | --- | --- |
| Hermes | 小型用户画像直接常驻 prompt；更大历史按需 search。 | 常驻层必须小。 | 不要把完整习惯库塞 prompt。 |
| OpenClaw | hybrid search，top K，再 memory_get 精读。 | 索引优先，精读少数片段。 | habit retrieval 要正式走 index -> surface -> rerank -> full record。 |
| Aether | `listProjectHabits` 按 scope affinity 和 triggers 初步过滤。 | 已有雏形。 | 增加更系统的渐进披露、关系扩展和性能预算。 |

建议方向：

```text
request
  -> activation seeds
  -> scope / path / trigger / subject indexes
  -> habit surfaces
  -> optional semantic rerank
  -> graph neighbors only as candidates
  -> top K full records
  -> context packet
```

性能原则：

- 大模型不做全库扫描。
- 大模型只处理小候选集。
- graph / relation 只做导航，不做真源。

### 4.5 正确使用当前 session 已生效习惯

| 系统 | 现有做法 | 值得借鉴 | Aether 应坚持什么 |
| --- | --- | --- | --- |
| Hermes | `USER.md` 和 memory prompt block 常驻上下文。 | 背景信息要小而稳定。 | 不能让旧 memory 覆盖当前用户明确要求。 |
| OpenClaw | Active Memory 注入 untrusted context。 | 召回内容要标成背景，不是新命令。 | 检索候选不能直接变 active habit。 |
| Aether | context packet 注入 current_session_habit 和 current_session_scratch。 | 已有更清楚的 active set。 | 只有 imported confirmed habits + active scratch 生效。 |

建议方向：

- 当前用户本轮明确要求优先。
- active scratch 可以临时覆盖 confirmed habit，但要记录 shadow / conflict。
- pending proposal 不生效。
- graph neighbor 不生效。
- inferred relation 不生效。
- rerank candidate 不生效。

---

## 5. Aether 应该怎么取舍

### 5.1 应该从 Hermes 借什么

| 借鉴点 | 用途 | Aether 落点 |
| --- | --- | --- |
| `USER.md` / `MEMORY.md` 分离 | 明确用户画像不等于 agent 环境经验。 | 提取习惯时先判断“这是用户偏好，还是工具/项目经验”。 |
| static prompt block | 把最重要、最稳定的小型用户自适应信息常驻。 | 当前 session imported habits summary。 |
| turn 前 prefetch | 回答前找少量相关习惯。 | context compile 前的 habit retrieval。 |
| turn 后 sync | 回答后沉淀候选习惯。 | signal extraction / scratch / proposal pipeline。 |
| provider lifecycle | 让不同用户模型后端可以接入同一生命周期。 | 未来 adaptation provider 接口。 |

### 5.2 应该从 OpenClaw 借什么

| 借鉴点 | 用途 | Aether 落点 |
| --- | --- | --- |
| hybrid search | 习惯库变大后快速找相关习惯。 | trigger/path/scope index + optional semantic vector。 |
| Active Memory 的限制设计 | 主动召回不能拖慢每轮回复。 | adaptation preflight 要有 timeout、top K、cache、开关。 |
| short-term promotion | 反复出现的短期习惯形成长期候选。 | scratch / signal -> promotion proposal。 |
| memory_get 精读 | 先找候选，再读少数完整记录。 | habit surface -> full habit record。 |
| temporal decay / MMR | 降低过时和重复结果。 | mutable subject profile、重复 habit rerank。 |

### 5.3 Aether 自己必须坚持什么

| Aether 原则 | 为什么不能放弃 |
| --- | --- |
| confirmed habit library 是真源 | 否则用户习惯会和临时聊天、模型推断、环境经验混在一起。 |
| session scratch 是运行时暂存 | 用户当前刚说的新要求需要马上影响本 session，但不能直接污染长期库。 |
| proposal review 是高影响写入门 | 全局或跨 session 习惯误写成本很高。 |
| 五层 scope 是主结构 | 用户习惯经常不是全局适用，必须能表达适用范围。 |
| active set 必须明确 | 主模型必须知道哪些是真正生效规则，哪些只是候选。 |
| graph / map / relation 只能当导航层 | 推断关系不能直接扩大习惯生效范围。 |

### 5.4 不应该照搬什么

| 来源 | 不应照搬 | 原因 |
| --- | --- | --- |
| Hermes | 用单个 markdown 用户画像承载所有习惯 | Aether 需要作用域、证据、状态、审查、索引。 |
| Hermes | 把 agent 环境经验和用户习惯放得太近 | 会污染用户画像。 |
| OpenClaw | 召回次数高就自动长期化 | 用户习惯需要确认，尤其是高影响和全局规则。 |
| OpenClaw | 每轮都跑主动记忆小模型 | Web UI 可能变慢，且很多轮不需要。 |
| Graphify | 用 community 代替 scope | 图聚类不是用户确认的适用范围。 |
| Graphify | inferred edge 直接变规则 | 推断关系只能是候选或解释材料。 |

---

## 6. 推荐给导师看的版本

可以这样汇报：

> 我们对比后认为，Hermes、OpenClaw、Aether 代表了三种不同层次。Hermes 提供轻量用户画像和 agent 记忆生命周期，OpenClaw 提供大规模记忆检索和短期到长期巩固，Aether 则是更专门的用户自适应系统，强调 confirmed habit library、session scratch、proposal review、scope routing 和 current active set。
>
> 因此我们不应该把 Aether 做成普通 memory 系统。Aether 应该继续保留“习惯真源 + 暂存区 + 审核门 + 作用域 + 当前生效集合”的核心结构，同时吸收 Hermes 的 prompt 生命周期和 OpenClaw 的检索 / 巩固工程。Graphify 只作为 habit map / relation / explain 层的参考，而不是用户画像真源。

进一步压缩成一句话：

> Hermes 教我们怎样让用户画像进入 agent 生命周期，OpenClaw 教我们怎样在记忆变多后快速召回和巩固，Aether 要做的是把这些能力放进一个更严格的用户习惯真源和作用域系统里。

---

## 7. 后续讨论清单

这些不是本文已经拍板的决策，而是下一轮设计讨论入口：

1. `signal_extract` 是否拆成 guard + classifier 两段。
2. confidence 是否拆成 explicitness / repeatability / impact / corroboration / contradiction。
3. scratch 是否需要跨 session 的 hint-only 聚合层，但不注入 active context。
4. confirmed habit 入库是否拆成 scope tagging 和 bucket routing 两个步骤。
5. bucket routing 输出是否固定为 `match / new / unsure`。
6. habit retrieval 是否先实现确定性 index pipeline，再加 embedding / LLM rerank。
7. context packet 是否展示每条 active habit 的来源、状态和覆盖关系。
8. habit graph 第一版是否只做 conflict / derived_from / used_with / specializes / generalizes。
9. Active Memory 类似机制是否只在请求明显涉及历史偏好时触发。
10. UI 是否提供“当前 session 真正生效习惯”和“候选/待确认习惯”的明显分区。
