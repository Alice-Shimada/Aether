# Aether、Hermes 与 wiki-llm：结构对比与可借鉴点

这份文档用于回答一个更具体的问题：

- 当前 Aether 的用户自适应系统和 IPK，和 Hermes、wiki-llm 这两种路线相比，结构上分别处于什么位置
- 哪些地方已经比它们更清楚
- 哪些地方还值得继续学习

本文只讨论**结构层**，不评价 UI 完成度或项目成熟度。

---

## 1. 总结先行

### 1.1 用户自适应系统

当前 Aether 已经明显强于 `wiki-llm`，也在若干关键结构点上强于 Hermes：

- 已经把 `用户画像/偏好`、`作用域`、`证据`、`summary`、`proposal`、`confirmed truth source` 拆成正式对象
- 已经明确了 `独立习惯库真源 / 工作区引用层 / session 暂存区` 三块架构
- 已经把 `global / subject / initiative / task_scope / artifact` 做成**平行 scope 标签**，不是树

但它仍然弱于 Hermes 的地方在于：

- “后台 review 闭环”还没有形成完整运行时机制
- “程序性技能的个性化层”还没有成为独立的一层
- “跨 session 会话回忆层”还没有正式进入架构

### 1.2 IPK 内容系统

当前 Aether 的 IPK 在结构上已经比 `wiki-llm` 更工程化：

- `piece.md / meta / surface / links / maps / indexes` 的分层远比 markdown wiki 更清楚
- “内容层 / AI 工作面 / 关系层 / 导航层”边界更明确
- 检索、联想、review、stash、commit、reindex 已经是独立流程

但它仍然值得向 Hermes 和 wiki-llm 学的地方在于：

- Hermes 的 `session recall` 和 `state.db + FTS + summarize` 这一层
- wiki-llm 的 `raw sources / compiled wiki / schema` 三层思想
- wiki-llm 强调的 `lint / log / health check` 维护工作流

---

## 2. 用户自适应系统对比

### 2.1 三者分别在做什么

| 系统 | 主要目标 | 主要真源 | 运行时入口 |
| --- | --- | --- | --- |
| Aether adaptation | 让 AI 逐步学会“这个用户在不同主题、任务、产物中的偏好与工作方式” | 结构化 JSON 真源 + 工作区引用 + session scratch | `scope matching -> current session habits -> context packet` |
| Hermes | 让 agent 在长期运行中形成“对用户的认知 + 可复用做法 + 过去会话回忆” | memory files + plugin memory + skills + session db | prompt memory + tool use + background review |
| wiki-llm | 让 LLM 持续维护一个可累积的个人/研究 wiki | raw sources + markdown wiki + schema instructions | wiki search / read / synthesize |

### 2.2 Aether 现在已经覆盖了什么

你现在的判断是对的：

- Aether 当前已经较好覆盖了 `用户画像/偏好`
- 也已经开始覆盖 `长期可检索知识`
- 对 `程序性技能的个性化` 涉及较少

具体来说：

- `GlobalGuidance / SubjectProfile / ProjectGuidance / InitiativeProfile` 负责“你是谁、你在某个 subject 里的知识坐标怎样、当前长期事项稳定背景是什么”
- `SignalRecord / SummaryRecord / ProposalRecord` 负责“从聊天里提取什么、何时沉淀、是否需要人确认”
- `PieceMeta / PieceSurface / PieceLinks` 负责“长期内容怎么存、怎么找、怎么连”

也就是说，你已经有：

1. `people model`
2. `knowledge artifact model`

但还缺一块相对独立的：

3. `personalized procedural skill model`

### 2.3 Aether 相比 Hermes 的结构优势

#### 优势 A：分层习惯库比 Hermes 更清楚

Hermes 的 memory 很强，但它更偏：

- 用户事实
- 偏好
- agent notes
- procedural skill

四者长期并存，但边界主要靠工具和约定区分。

Aether 在结构上已经更进一步：

- `profile` 负责画像
- `policy / habit` 负责可作用规则
- `proposal` 负责高影响确认
- `session scratch` 负责临时运行时集合

这个结构对“可解释性”和“回滚能力”更友好。

#### 优势 B：human in the loop 更适合你的问题域

Hermes 强在“让 agent 自己记、自己长技能、自己后台复盘”。

但你的问题域不是通用 agent，而是：

- 用户最了解自己的学习状态
- 全局习惯的误写成本高
- 主题内的理解程度和工作风格很难只靠行为外推

因此 Aether 这里比 Hermes 更合理的结构不是“尽量少让人参与”，而是：

- 让 AI 负责发现候选
- 让 AI 负责合并、提炼、分作用域建议
- 让用户负责高影响确认和纠偏

这不是因为 Hermes 做错了，而是因为 Hermes 没有把“多层作用域习惯 + 用户主导确认”作为一等结构目标。

#### 优势 C：subject 是横切入口，不是人格分区

Hermes profile 隔离适合：

- `default`
- `coder`
- `assistant`
- `agent A / agent B`

这种相对独立的 agent identity。

你现在的方向更适合科研/混合工作流：

- 同一 session 里可以同时激活 physics、coding、writing 等 subject
- 它们不是互斥人格
- 它们是横切的候选入口

这比 Hermes 的 profile 隔离更适合你的使用场景。结构上更像：

```text
request
  -> detect subjects
  -> read current initiative/task/artifact compatible habits
  -> merge a small runtime set
```

而不是：

```text
pick one profile
  -> inherit one isolated world
```

### 2.4 Hermes 仍然值得学的结构点

#### 点 A：后台 review 闭环

Hermes 在用户正常对话结束后，能异步做两件事：

- 看这轮有没有值得写入 memory 的用户信息
- 看这轮有没有值得沉淀为 skill 的做法

这个结构非常值得借。

Aether 可以借的不是“完全自动确认”，而是：

- 在 response 后台异步跑 `extract -> summary -> merge proposal`
- 不阻塞主回复
- 让 inbox 慢慢积累更成熟的候选

#### 点 B：会话回忆层

Hermes 不是只靠 memory/skills，它还有 session db 和 session search。

这意味着它的长期认知不是二选一：

- 要么写进用户画像
- 要么写进技能

它还有第三层：

- “以前聊过，但未必该进画像或技能”的历史回忆

这正是 Aether 后面很值得补的一层。

#### 点 C：memory provider 接口

Hermes 允许：

- 保留一个内建简单记忆层
- 再外挂一个更强 provider

这个结构对 Aether 的启发是：

- 当前 adaptation 可以继续用本地 typed storage 做真源
- 但可以预留 provider 接口，允许未来接更强的 user model / recall service

### 2.5 wiki-llm 对用户自适应系统的启发

wiki-llm 对 adaptation 的直接帮助不如 Hermes 大，但它有两点仍然很有价值：

#### 点 A：持续编译中间层，而不是每次重算

wiki-llm 的核心思想是：

- 不要每次问都重新从 raw materials 拼装
- 而是维护一个持续更新的 compiled layer

这对 adaptation 的映射是：

- 不要每次从完整聊天历史重新“猜用户是谁”
- 而是持续维护 `profile / policy / summary / proposal inbox`

#### 点 B：lint/health-check 工作流

用户习惯库同样需要 lint：

- 有没有互相冲突的 confirmed habits
- 有没有旧习惯应该缩小作用域
- 有没有 proposal 长期堆积
- 有没有 subject 长期没有被更新

这个思路更像 wiki-llm，而不是 Hermes。

### 2.6 用户自适应系统的结构判断

如果只看结构层，我会给出下面这个结论：

- Aether adaptation 的**分层与作用域设计**比 Hermes 更适合你
- Hermes 的**运行时闭环与 recall 分层**比 Aether 当前更成熟
- wiki-llm 对 adaptation 的帮助主要在“compiled layer”与“lint 思维”，不是具体对象设计

---

## 3. IPK 内容系统对比

### 3.1 三者分别在做什么

| 系统 | 内容单位 | 主要结构 | 查询对象 |
| --- | --- | --- | --- |
| Aether IPK | `piece` | `piece.md + meta + surface + links + maps` | piece、surface、map、association |
| Hermes | 会话、memory、skills、可接外部 KB | `state.db + memory providers + tools` | past sessions、memory provider、tools |
| wiki-llm | markdown wiki page | `raw sources + wiki pages + schema` | wiki pages |

### 3.2 Aether 相比 wiki-llm 的结构优势

#### 优势 A：typed schema 明显更稳

wiki-llm 的 wiki page 很灵活，但天然会有几个问题：

- 字段漂移
- 页面之间格式不一致
- 同一信息可能重复写在多个位置
- AI 更新时更容易把“可读结构”与“机器结构”混在一起

IPK 现在用：

- `piece.md` 管内容
- `meta` 管稳定身份
- `surface` 管 AI 工作面
- `links` 管关系

这是更强的结构分层。

#### 优势 B：检索与联想已经被拆开

wiki-llm 主要强调：

- 先查 wiki page
- 再综合

但它没有把“精确找”与“扩散联想”拆成两条明确的结构链。

IPK 这里已经做得更清楚：

- `search`
- `associate`
- `retrieve surface`
- `associate surface`

这对大模型使用非常关键，因为：

- 精确查找和开放联想不是同一个任务
- 它们应该读不同的字段、走不同的排序逻辑

#### 优势 C：运行时入口比 wiki-llm 更可控

wiki-llm 更像“让 LLM 直接维护和查询 wiki 仓库”。

IPK 则更像“有自己后端域模型和受控 route 的内容系统”。

这使得你后面可以继续做：

- typed client
- controlled read model
- route-specific model settings
- separate search / associate / compile / review workflows

### 3.3 Hermes 对 IPK 的结构启发

Hermes 并没有一个和 IPK 完全同构的内容库，但它在以下结构点上非常值得学：

#### 点 A：session recall layer

Hermes 的 `state.db + FTS5 + session_search summarization` 提供的是：

- 不是知识对象
- 不是用户画像
- 而是“过去聊过什么”的第三层

这对 IPK 的意义很大，因为很多内容：

- 值得回忆
- 但未必值得沉淀成 piece

所以 Aether 长期更合理的结构不是“把所有值得记住的东西都塞进 IPK”，而是：

1. `adaptation` 记用户/习惯
2. `IPK` 记值得长期保留和继续发展的内容对象
3. `session recall` 记历史对话回忆

#### 点 B：session db 是过程层，不是知识真源

Hermes 很清楚地区分：

- `state.db` 保存会话过程
- memory 保存稳定偏好和结论
- skills 保存程序性做法

这个分层刚好能反过来证明你当前 IPK 的一个重要判断是对的：

- session 不能直接等于长期知识库

#### 点 C：异步 summarize past sessions

Hermes 对 past sessions 的读取不是把整段历史原样塞回 prompt，而是：

- search
- truncate around matches
- summarize into focused recall

这个模式以后也很适合给 IPK 做外围 recall。

### 3.4 wiki-llm 仍然值得 IPK 学什么

#### 点 A：raw sources / compiled layer 的意识

wiki-llm 非常强调：

- raw source 不改
- wiki 是编译产物

IPK 虽然已经有 `sources` 字段，但长期仍然值得把这层再显式化：

- source registry
- ingest log
- source-to-piece lineage

#### 点 B：log 与 lint

wiki-llm 把两类维护对象写得很清楚：

- `index.md`
- `log.md`

对应到 IPK，不一定要真的做成 markdown，但很值得有：

- ingest log
- reindex log
- quality/lint report
- orphan / contradiction / stale piece report

#### 点 C：把高价值问答回写为长期内容

wiki-llm 很强调“好的回答本身也该回写到 wiki”。

IPK 其实特别适合吸收这一点，因为 piece 类型里已经有：

- `idea`
- `knowledge`
- `thread`
- `review`
- `plan`

这意味着未来完全可以把：

- 高价值对比
- 关键研究判断
- 多 source synthesis

编译成新的 piece，而不是让它们消失在聊天里。

### 3.5 IPK 的结构判断

如果只看结构层，我会给出下面这个结论：

- Aether IPK 比 wiki-llm 更像“正式系统”
- wiki-llm 比 Aether IPK 更强调“长期维护工作流”
- Hermes 对 IPK 的直接内容结构帮助不大，但对“外围 recall 层”帮助很大

---

## 4. 三跳 recall 是什么意思

我前面说的“三跳 recall”，不是一次查询走三套完全独立的大检索，而是一个**由近到远、由结构化到宽松**的分层回忆链：

### 第一跳：adaptation context

先问：

- 当前用户是谁
- 当前 initiative / task_scope / artifact 是什么
- 当前 session 已激活哪些 habits
- 当前有哪些 subject 被高置信命中

这一跳回答的是：

- “这次请求应该站在怎样的用户和任务上下文里理解”

### 第二跳：IPK search / associate

如果第一跳后仍需要内容知识，再问：

- IPK 里是否已经有相关 piece
- 更适合走 search 还是 associate
- 该读哪些 surface，是否要继续读正文

这一跳回答的是：

- “长期内容资产里有没有已经整理好的知识”

### 第三跳：session recall

如果前两跳都不够，再问：

- 过去是不是聊过相近问题
- 有没有还没沉淀成 piece、但值得回忆的会话结论

这一跳回答的是：

- “虽然没入长期结构库，但以前确实讨论过”

它的好处是：

- 不会把 adaptation、IPK、chat history 混成一个大池子
- 不会逼所有值得回忆的内容都先入 IPK
- 能把“用户偏好”“长期知识”“历史对话”三类对象保持边界

---

## 5. Hermes 的 `state.db + memory + skills` 分层是什么

Hermes 可以粗略理解成三层：

### 5.1 `state.db`

这是过程层：

- 存 session
- 存 message
- 做 FTS
- 支持 past session search

它解决的是：

- “以前发生过什么”

### 5.2 `memory`

这是偏稳定、偏声明性的长期认知层：

- 用户偏好
- 用户事实
- 环境事实
- agent notes

它解决的是：

- “我应该长期记住什么事实和偏好”

### 5.3 `skills`

这是程序性记忆层：

- 某类任务如何做
- 某个工作流怎么执行
- 已验证的步骤、模板、脚本、参考材料

它解决的是：

- “以后再遇到这类任务时，应该怎么做”

如果映射到 Aether，可以理解成：

- `state.db` 近似未来的 `session recall`
- `memory` 近似 adaptation 的 `profile + confirmed habits` 中偏声明性部分
- `skills` 近似未来可能的 `personalized procedural layer`

---

## 6. typed schema 为什么通常优于 markdown 真源

这里不是说 markdown 没用，而是说：

- markdown 适合做人类阅读面
- typed schema 更适合做机器真源

### 6.1 typed schema 的优势

#### 优势 A：边界稳定

例如 `PieceMeta`、`PieceSurface`、`SignalRecord` 这些对象一旦有类型约束：

- 哪些字段必须存在
- 哪些字段可选
- 哪些值域合法

就不容易被模型自由漂移。

#### 优势 B：更容易做局部更新

如果你要更新：

- `status`
- `subject_ids`
- `open_questions`
- `links`

typed schema 可以只改对应字段。

如果是真源 markdown，经常会变成：

- 改了一整页
- 不知道机器该以哪段为准

#### 优势 C：更适合构建派生层

map、index、surface、read model、routing hint 这些都更适合从结构化真源派生。

typed schema 天然适合：

- compiler
- indexer
- validator
- migrator
- cache invalidation

#### 优势 D：更容易做多视图

同一个真源可以渲染出：

- markdown 审阅面
- search hit
- associate hit
- context packet
- debug view

如果 markdown 本身是真源，反而很难稳定派生出这些视图。

### 6.2 markdown 真源更适合什么

markdown 真源适合：

- 自由写作
- wiki page
- narrative note
- 人工长期手改的文档

但对于 adaptation / IPK 这种要被程序持续读写、筛选、编译、重排的系统，typed schema 往往更稳。

### 6.3 对你来说的更优结构

最适合你的不是“只要 typed schema”，而是：

- typed schema 做真源
- markdown 做人类镜像
- 允许未来在少量高价值对象上提供受控的人类编辑入口

---

## 7. 现在最值得继续借的地方

### 7.1 用户自适应系统

最值得继续借的是：

1. Hermes 的 `后台 review 闭环`
2. Hermes 的 `session recall`
3. Hermes 的 `memory provider interface`
4. wiki-llm 的 `compiled layer` 思维
5. wiki-llm 的 `lint / health-check` 思维

### 7.2 IPK 内容系统

最值得继续借的是：

1. wiki-llm 的 `raw sources -> compiled layer -> maintenance` 思维
2. wiki-llm 的 `log / lint`
3. Hermes 的 `state.db + focused session summarize recall`
4. Hermes 的 “不要把所有长期资产塞进同一层” 的分层意识

---

## 8. 当前最重要的结构判断

结合本轮讨论，我认为当前最重要的结构判断有四条：

1. Aether 当前确实已经覆盖了“用户画像/偏好”和“长期可检索知识”，但“个性化程序性技能层”还不是主轴。
2. 你的 `human in the loop` 不是保守，而是适合问题域的结构选择；尤其对 global / high-impact habits，很可能比 Hermes 更合理。
3. 你的 `subject` 设计应继续坚持横切激活，而不是做 Hermes 式整体 profile 分区。
4. IPK 后面很值得补一层 `session recall`，但它应作为独立层，而不是把 session 和 piece 混成一个统一知识池。
