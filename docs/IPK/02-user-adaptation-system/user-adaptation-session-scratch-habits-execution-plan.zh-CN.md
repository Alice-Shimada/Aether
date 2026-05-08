# 用户自适应系统：Session 暂存习惯执行设计

这份文档描述当前已经落地、并可继续扩展的 `session scratch habits` 机制。

它解决的问题是：

- 当前 session 里刚刚明确说出的工作习惯，如果还没入习惯库，是否应该立刻被当前 session 注意到。
- 习惯库真源如何继续保持独立，不和 Aether 工作区混存。
- “当前 session 可见习惯”到底由哪些来源构成。

当前拍板：**习惯库真源与工作区仍然完全不连通；但 session 可以拥有自己的临时暂存习惯层。**

注意：

- 本文描述当前已落地机制和后续可继续扩展的行为。
- 当前运行时代码已经把 session 可见习惯拆成 `habit_ids` 引用的正式习惯，以及 session-local scratch habits。

实现状态补充（2026-04-17）：

- 已实现 `after_user_message` 异步提取，不阻塞当前轮回答。
- 已实现“单条用户消息 -> 多个候选习惯”，并把 evidence 扩展为逐条结构化记录。
- 已实现 `candidate -> imported` 全量 LLM comparator：overlap 只记 hit，conflict 进入 batch review。
- 已实现 `candidate -> scratch` LLM comparator 与 active/pending merge matrix。
- 已实现 `superseded` 保留显示但不进入 prompt / 后续匹配。
- 已实现暂存习惯对话框中的 conflict review、evidence message jump，以及用户自由输入覆盖当前冲突组。

## 1. 一句话总结

从现在开始，当前 session 可见习惯分成两类：

1. `imported habits`
   来自独立习惯库、已经确认过的正式习惯，由 session 引用。
2. `scratch habits`
   当前 session 中新产生的、仅绑定该 session 的暂存习惯，不在习惯库中；高置信 scratch 会立即生效，低置信 scratch 只暂存，等待用户确认生效。

因此：

- **进入当前 session 暂存区，不需要用户确认。**
- **低置信 scratch 进入暂存区后不自动生效，用户确认后才注入当前 session。**
- **进入独立习惯库真源，仍然需要用户确认。**

## 2. 用户想法的准确总结

当前认可的用户意图是：

### 2.1 习惯库真源继续独立

- 只有已经确定过的正式习惯才进入习惯库。
- 习惯库和 Aether 工作区完全没有真源交集。
- 工作区只能引用习惯库中的正式习惯，不能把工作区记录当真源。

### 2.2 当前 session 可以拥有自己的临时习惯层

- 当前 session 中刚刚总结出的新习惯，不需要先经过“入库确认”才能进入暂存区。
- 这些习惯先写入 `session scratch habits`。
- `scratch habits` 只属于当前 session；其中只有 `active` 状态会在当前 session 生效。
- `scratch habits` 暂时不入习惯库，也不拥有习惯库真源地位。

### 2.3 session 可见习惯有两种来源

当前 session 中真正可见、可注入模型的习惯有两类：

1. 已从习惯库引用进来的正式习惯。
2. 当前 session 内新产生并存入暂存区、且已经处于 `active` 状态的临时习惯。

### 2.4 暂存习惯确认后才入库

- 某条 active scratch habit 被用户确认后，才把它写成习惯库中的正式习惯真源。
- pending scratch 可能是低置信提取结果，不进入“待入库审查”；用户先确认它在当前 session 生效后，它才成为可入库的 active scratch。
- 用户确认时应看到习惯库五层的入库作用域候选：`task_scope / artifact / initiative / subject / global`。
- v1 当前实现要求：选择器把五层都展示出来；当前没有具体 target 的层级应置灰；`artifact` 在 direct promote 路径尚未完全打通前可先展示为不可选说明项，避免 UI 错把它隐藏成“不存在这层”。
- 入库后，后续仍沿用现有作用域晋升、降级和图谱引用机制。

### 2.5 UI 要把“当前 session 暂存区”和“全局审查入口”分开

- 每个 session 顶部应有一个“暂存习惯”按钮，只看当前 session 的 scratch habits。
- 左侧用户自适应系统中的“待确认习惯”应改名为“审查暂存习惯”。
- 左侧入口是聚合视图，按 Aether project / session 分组，展示所有还没入库且已经 active 的 scratch habits，供用户统一审查和入库。

## 3. 核心模型

### 3.1 三层模型

下一阶段运行模型应明确拆成三层：

```text
独立习惯库真源层
  -> confirmed habits

session 引用层
  -> imported habits

session 暂存层
  -> scratch habits
```

解释：

- 真源层只保存正式习惯。
- 引用层保存当前 session 从习惯库引入的正式习惯引用。
- 暂存层保存当前 session 自己刚刚形成的临时习惯。

### 3.2 当前 session 真正注入模型的集合

下一阶段 `current session habits` 应由：

```text
current session active habits
  = imported active habits
  + scratch active habits
```

其中：

- `imported active habits`
  是当前 session 已经引用的正式习惯。
- `scratch active habits`
  是当前 session 暂存区中未失效、未被覆盖、未被丢弃，并且已经被判定或确认为生效的临时习惯。

## 4. 关键规则

### 4.1 imported habits 的规则

- 只能来自习惯库中的已确认正式习惯。
- 可以在 session 建立时引入，也可以在后续 review 后引入。
- 一旦进入当前 session，就和现在一样，每轮上下文编译时持续注入。
- 如果和当前 session 的最新明确要求冲突，则当前轮不再盲目优先 imported habit。

### 4.2 scratch habits 的规则

- 只属于当前 session。
- 不在习惯库中生成真源记录。
- 只对当前 session 生效。
- 只要系统判断用户在当前 session 中表达了局部工作习惯，就可以自动进入 scratch 区。
- 进入 scratch 区时不需要用户再次确认。
- 高置信 scratch 直接设为 `active`，立刻参与当前 session 上下文。
- 低置信 scratch 设为 `pending`，只在暂存区中可见，暂时不注入上下文。
- pending scratch 的文案必须是用户可读总结与捕获原因，不能把长串底层 id 当主要说明。
- `kind / source / confidence / evidence_refs / suggested_scope` 这类字段属于 scratch 的结构化元数据。它们的主要用途是：解释为什么会被捕获、支持 session 内查重与冲突处理、支持跨 session 相似项聚合，以及为后续“提醒保存为正式习惯”提供依据。

### 4.3 入库规则

- scratch habit 只有在用户确认时，才正式进入习惯库。
- 入库确认时用户可修改推荐作用域。
- 入库后生成正式 habit id、scope、relation、evidence 和后续引用参数。
- 入库完成后，这条习惯在当前 session 中应转为 imported habit；原 scratch habit 标记为 `promoted`，不再继续作为独立临时项活跃。
- 入库审查界面应提示这条 active scratch 在所有暂存记录中有多少相似出现，帮助用户判断它是偶发偏好还是反复出现的习惯。
- 用户可选择“一键处理相似暂存项”：系统不硬删除其他 session 中的相似 scratch，而是把它们标记为已随同一正式习惯处理。

## 5. 自动写入 scratch 的门槛

不是所有模糊表达都自动写入 scratch。

下一阶段的默认规则应是：

- 用户明确表达“当前 session / 这次 / 现在 / 接下来都这样做”的要求，可以直接入 scratch。
- 明显只是模糊倾向、含糊猜测或弱偏好时，不应自动入 scratch。
- AI 推测出的候选习惯，如果不是用户明确表达，应继续走 proposal / review，不应静默进入 scratch。

禁止把语言线索扩展成硬编码关键词 gate。当前实现要求：用户发言是否捕获为 scratch、默认进入 `active` 还是 `pending`，都只由 LLM 的结构化分类结果决定。LLM 不可用时不做 regex fallback，不写 scratch，等待后续重试或用户手动整理。

## 6. 存储设计

### 6.1 根原则

- 习惯库真源继续独立存储。
- session scratch 不进入习惯库。
- session scratch 属于运行时 / session 层数据。

### 6.2 推荐路径

下一阶段建议新增：

```text
MemoryPath.adaptationRoot()/bindings/sessions/<session_id>/
  <session_id>.json
  scratch-habits.json
  scratch-habits.md
  scratch-conflicts.json
  scratch-conflicts.md
```

说明：

- `scratch-habits.json`
  当前 session 的暂存习惯真源。
- `scratch-conflicts.json`
  当前 session 中 scratch / imported 冲突的审查记录。

这些文件属于 session 运行时记忆，不属于习惯库真源。

### 6.3 推荐 schema

#### `SessionScratchHabit`

```json
{
  "id": "scratch_xxx",
  "session_id": "ses_xxx",
  "project_id": "proj_xxx",
  "summary": "这次默认优先用 Python，不要主动改成 C。",
  "kind": "tool_preference",
  "source": "user_explicit",
  "status": "active",
  "confidence": 0.92,
  "evidence_refs": ["msg_xxx"],
  "suggested_scope": {
    "level": "initiative",
    "target": "proj_xxx"
  },
  "duplicates": [],
  "conflicts": [],
  "created_at": "2026-04-14T00:00:00+08:00",
  "updated_at": "2026-04-14T00:00:00+08:00"
}
```

推荐状态：

- `active`
- `superseded`
- `invalidated`
- `promoted`
- `discarded`

#### `SessionScratchConflict`

```json
{
  "id": "scratch_conflict_xxx",
  "session_id": "ses_xxx",
  "kind": "scratch_vs_imported",
  "left_id": "scratch_001",
  "right_id": "habit_global_python",
  "resolution": "latest_request_wins",
  "note": "当前用户最新明确要求与已引用正式习惯冲突，当前轮先按最新要求执行。",
  "created_at": "2026-04-14T00:00:00+08:00",
  "updated_at": "2026-04-14T00:00:00+08:00"
}
```

## 7. 查重与合并规则

### 7.1 session 内部

- 同一个 session 内部要查重并合并。
- 同义、同意图、同结论的 scratch habits 应归并为一条。
- 合并后保留全部 evidence refs。

### 7.2 不同 session 之间

- 不同 session 之间允许查重，但不自动合并。
- 只记录“重复候选关系”。
- 不同 session 里的相似 scratch habits 仍然各自保留。

### 7.3 入库时的跨 session 清理

当用户把某条 scratch habit 确认入库时：

- 系统可以提示是否一键清理其他 session 中的重复 scratch habits。
- 这里的清理默认不是强制的。
- 如果用户选择清理，应把其他重复项标记为 `discarded` 或 `promoted_elsewhere`，而不是静默物理删除。

## 8. 冲突处理规则

### 8.1 scratch vs scratch

如果同一个 session 中：

- 早先有一条 scratch habit
- 后来用户又明确表达了相反要求

则默认：

- 最新明确要求优先。
- 旧 scratch habit 标记为 `superseded` 或 `invalidated`。
- 不推荐直接物理删除。
- 运行时只保留最新仍有效的 scratch habit 注入。

### 8.2 scratch / candidate vs imported

如果当前 session 中：

- 已引用某条正式 imported habit
- 用户后来在当前 session 中提出与之冲突的新明确要求

则默认：

1. 当前轮 assistant 回答先按**最新明确要求**执行；这是 prompt 优先级，不等待后台习惯提取和冲突对比完成。
2. 后台习惯提取与对比链路把新候选和当前 session 的 imported habits 全量比较。
3. 如果只是 overlap，静默记录正式习惯命中事件，不创建 scratch，不弹窗。
4. 如果存在 conflict，先记录 conflict review item，并在批量冲突弹窗中让用户选择。
5. 用户选择采用新 session 要求后，冲突的 imported habit 才在当前 session 中进入 `suspended / shadowed` 或等价暂停状态，新要求写入 active scratch。
6. 用户选择保留正式习惯时，新候选不进入 active scratch。
7. 用户也可以在弹窗中输入新的局部解决要求；v1 直接把该输入生成一条覆盖当前冲突组的 active scratch，不做复杂拆分。

这意味着：

- 不需要每次都同步阻塞弹窗。
- 当轮回答默认“最新用户要求优先于已注入习惯”。
- session habit surface 的持久改变要等后台 review 结果或用户在冲突弹窗中的选择。
- 用户之后再决定这只是本 session 例外，还是应该修改习惯库真源。

## 9. Prompt / Context Compiler 规则

下一阶段 `context compiler` 应改为读取两类内容：

1. 当前 session imported habits
2. 当前 session scratch active habits

注入顺序建议：

```text
system / developer / user current request
  > scratch active habits
  > imported active habits
  > other adaptation policy
```

原因：

- scratch habits 本质上更接近“当前 session 的最新明确要求”。
- imported habits 是正式长期习惯，但在当前 session 内应被 scratch 局部覆盖。
- 如果本次用户发言与已注入习惯冲突，本次回答必须优先遵守用户当前发言。这条优先级通过 prompt 明确写入，不能为了等待习惯提取或冲突 review 而拖慢普通回答。

## 10. UI 设计

### 10.1 聊天框顶部按钮

新增按钮：

- `暂存习惯`

位置：

- 聊天框顶部，和“总结当前对话”同一组操作附近。

图标：

- 文件图标即可。

功能：

- 只展示当前 session 的所有 scratch habits。
- 支持查看状态、证据、是否被覆盖、是否与 imported habit 冲突。

### 10.2 左侧用户自适应入口

现在的“待确认习惯”应改名为：

- `审查暂存习惯`

语义：

- 它不再只是长期 proposal inbox。
- 它是所有尚未入库的 scratch habits 的全局审查入口。

分组方式：

- 先按 Aether project
- 再按 session

操作：

- 确认入库
- 修改建议作用域后入库
- 丢弃
- 标记为仅本 session 临时有效
- 查看重复项和冲突项

### 10.3 当前 Session 习惯视图

当前 Session 习惯视图应拆成两组：

1. `已引用正式习惯`
2. `当前 session 暂存习惯`

否则用户会分不清：

- 哪些是习惯库正式习惯
- 哪些只是当前 session 临时规则

补充约束：

- 用户主视图默认只展示当前已生效的条目，不把 pending proposal 或未生效 scratch 混进来。
- 每条条目至少显示：习惯概括、所属层级、置信度。
- 命中情况先保留结构化接口，后续用于习惯作用范围、置信度提升或下降、命中次数统计。如果未来要展示命中情况，应挂在各自习惯条目里；不要单独暴露编译器的 `used_records / omitted_reason` 原始列表，更不能把 artifact id、scope id、文件路径或其他序列码当主内容展示。

## 11. 从 scratch 入库的流程

```text
user explicit request in current session
  -> auto capture into session scratch
  -> immediate effect in current session
  -> user opens 审查暂存习惯
  -> choose scope / adjust scope
  -> confirm
  -> write formal habit into library
  -> current session converts it into imported habit
  -> optionally clean duplicate scratch items in other sessions
```

## 12. 对现有 proposal / session review gate 的影响

### 12.1 保留的部分

- imported habits 的加入 / 移出仍然可以保留 review / audit 机制。
- 长期作用域 promotion proposal 继续存在。
- 习惯库确认写入仍继续走 proposal / confirm。

### 12.2 被替换的部分

以下旧规则应被下一阶段设计替换：

- “当前 session 中新命中的任意习惯都必须先用户确认，才能在 session 中生效。”

新的规则是：

- **新产生的 session-local 习惯先进入 scratch；高置信直接在本 session 生效，低置信等待用户确认生效。**
- **只有当它要进入习惯库真源时，才需要用户确认。**

## 13. 实现步骤

### Phase A：数据层

1. 新增 `SessionScratchHabit` / `SessionScratchConflict` schema，包含 `pending / active` 状态和 `capture_confidence / capture_reason`。
2. 新增 session scratch 存储文件与读写 API。
3. 新增 session scratch 的 markdown mirror。

### Phase B：运行时

1. 把当前“新命中 habit -> review gate”逻辑改成两条分支：
   - imported candidate 继续走 review
   - session-local habit 进入 scratch，高置信 active，低置信 pending
2. `context compiler` 读取 imported + scratch 两类 active habits。
3. 加入 scratch 覆盖 imported 的排序规则。

### Phase C：冲突与查重

1. session 内 scratch dedupe / merge。
2. scratch vs scratch 冲突覆盖。
3. scratch vs imported 冲突暂停 + conflict record。
4. 跨 session 重复检测但不自动合并。
5. active scratch 入库时显示相似出现次数，并提供用户可选的一键处理相似 scratch。

### Phase D：UI

1. 顶部增加“暂存习惯”按钮。
2. 左侧“待确认习惯”改成“审查暂存习惯”。
3. 当前 Session 习惯视图拆成 imported / scratch 两组，并显示 pending / active 等用户可读状态。

### Phase E：入库

1. scratch -> formal habit 的确认路径。
2. 作用域选择与推荐。
3. 入库后的跨 session 相似暂存项清理由用户选择是否执行。

## 14. 仍然保留为 open question 的点

- scratch 自动捕获的具体阈值和 wording 仍可继续用真实使用数据调优。
- imported habit 被 scratch 覆盖后，UI 是否要对高影响冲突升级为强提醒留到 vNext。
- 跨 session 相似暂存项清理的说明文案仍可继续优化。
- `suspended imported habit` 的最小 schema 是单独字段，还是作为 conflict resolver 派生结果。

## 15. 可直接发给 AI 的 Prompt

```text
请按 /home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md 实现下一阶段的 session scratch habits。

必须遵守：
1. 习惯库真源和 Aether 工作区仍然不连通。
2. 当前 session 可见习惯分为 imported habits 和 scratch habits。
3. 当前 session 中新产生的局部习惯应自动进入 scratch；高置信直接 active 并生效，低置信 pending，等待用户确认生效。
4. scratch 只有在用户确认后才入习惯库。
5. session 内 scratch 要查重并合并；跨 session 只查重不自动合并。
6. scratch vs scratch 冲突时，最新明确要求优先，旧 scratch 标记为 superseded / invalidated，不要直接物理删除。
7. scratch / candidate vs imported 冲突时，当前轮按最新用户要求执行；后台记录 conflict review item，并通过批量弹窗让用户选择是否暂停 imported 并把新要求写入 active scratch。用户在弹窗中输入新要求时，v1 直接生成覆盖当前冲突组的 active scratch。
8. UI 上增加“暂存习惯”按钮，并把左侧“待确认习惯”改为“审查暂存习惯”。
9. 入库审查只列出 active scratch，并显示相似出现次数；用户可一键把其他 session 中相似 scratch 标记为已处理。
10. 实现后同步更新 /docs/IPK 相关权威文档和 open-questions。
```
