# 从用户发言中提取新习惯：session scratch 合并系统设计草案

日期：2026-04-17  
状态：设计重述与实现计划，尚未进入代码实现  
范围：当前 session 内，从用户新发言中提取习惯、与正式习惯引用和 session 暂存习惯对比、合并、替换、冲突审阅的完整流程。

## 0. 本文目的

本文把 2026-04-17 关于“session 内 scratch 合并系统”的讨论完整固化下来。目标是让后续实现者只读本文，就能清楚理解用户刚刚提出的全部要求，而不需要回到原始聊天记录逐句核对。

本文只设计“快链路”：用户每发一条消息后，系统立即从这条用户消息中提取可能影响当前 session 行为的习惯，并把它们合并进当前 session 的生效习惯结构。`signal / summary / proposal` 慢链路仍然重要，但当前优先级低于快链路，后续应单独继续打磨。

实现状态补充（2026-04-17）：

- 本文第 3、4、5、6、7、8、9、10、11 节对应的 v1 主链路已经在运行时代码落地：多 candidate 提取、imported 全量比较、scratch comparator、merge matrix、batch review、evidence message jump、hit event 接口、prompt 优先级说明均已接通。
- 仍保留为后续调优项的内容，主要是：active/pending 判定细则、全量 imported 比较的成本反馈、hit event 如何进一步服务作用范围与置信度维护、evidence 权重设计与更强的 UI 提醒节奏。

## 1. 当前 session 生效习惯的结构要求

一个 session 里的“生效习惯区”必须明确拆成两部分：

1. 从正式习惯库引用进当前 session 的习惯。
2. 当前 session 内暂存的 scratch 习惯。

这两部分都必须是高度结构化、条目化、相互独立的记录。原因是 session 中的习惯需要被加入、对比、合并、删除、覆盖和暂停。如果习惯不是独立条目，而是混成一段自由文本，后续的查重、冲突处理、替换、证据跳转、UI 展示和正式入库都会变得混乱。

当前实现已经部分满足这个方向：`ScratchHabit` 已有 `state`、`summary`、`evidence`、`conflicts` 等字段，scratch evidence 也是数组而不是单一文本。但当前实现仍不满足本文要求，因为现有提取和合并流程还不够结构化，尤其是一次用户发言不能稳定提取多个习惯，每个习惯也不能稳定挂多个分离 evidence。

## 2. 核心术语

`imported habit`：从正式习惯库引用到当前 session 的习惯。它已经是正式习惯，当前 session 只是引用它。引用可以被暂停或移除，但不能直接改变正式习惯库中的真源。

`scratch habit`：当前 session 内暂存的习惯。它只对当前 session 生效，分为 `active` 和 `pending`。它可以以后被用户保存为正式习惯，但保存动作需要用户确认或由用户选择作用域。

`extracted candidate`：LLM 从用户最新一条发言中提取出的习惯候选。它还没有进入 scratch，也没有改变 imported habit，只是一个待处理的候选条目。

`evidence`：证明为什么可以从用户发言中提取某条习惯的证据。evidence 必须分条保存，不允许把多个 evidence 合并成一个。每条 evidence 应能指回对应聊天消息，最好还能定位到原文片段。

`overlap / duplicate`：新候选习惯和已有习惯语义高度重合，适合视作同一条习惯的新增证据或使用记录。

`conflict`：新候选习惯和已有习惯会让应用在当前 session 中不知道该按哪个要求做。冲突不要求两条习惯完全相反；部分冲突、适用边界冲突、执行方式冲突，只要会给应用带来困扰，都应视为冲突。

`active`：当前 session 立即生效，会进入运行时可用习惯集合。

`pending`：当前 session 暂不生效，需要用户后续激活，或作为弱偏好/低确定性候选保留。

## 3. 用户发言后的提取要求

### 3.1 触发时机

每次用户发出一条消息后，应立即异步触发习惯提取。触发点不应等到 assistant 正常回答结束，因为习惯的直接证据来自用户发言，而不是 assistant 的复述。

如果系统因为性能或 UI 原因需要短暂 debounce 或后台排队，可以作为工程实现细节，但语义上应理解为“用户消息后触发”，而不是“assistant response 后触发”。

当前 assistant 回答不等待习惯提取和冲突对比完成。每次用户发言对应的 assistant 回复，只注入“截至这次用户消息发出之前已经生效的习惯”。同一轮回答中，最新用户发言本身一定会被模型看到，因此不需要先把这条发言提取成习惯再注入 prompt。

为了处理“最新用户发言和已注入习惯冲突”的情况，session habit prompt 必须包含一条严格优先级规则：如果本次用户发言和已有习惯冲突，本次回答以用户当前要求为准，忽略冲突的已有习惯。与此同时，独立的习惯提取 LLM 和对比 LLM 在后台并行工作，尽量在下一次用户发言前完成 scratch 合并或冲突弹窗。

### 3.2 证据来源

快链路只从用户发言中提取习惯。assistant 的话不能被当成习惯证据，除非用户明确同意 assistant 的某个行为标准。此时真正的证据仍然是用户的同意表达，而不是 assistant 自己的复述。

v1 快链路仍然只看当前 session 的用户消息，不接入 assistant 文本、文件改动、工具操作、代码 diff 等更广证据。assistant 文本最多只作为理解“用户在同意或纠正什么”的对话上下文，不属于 habit evidence 真源。

### 3.3 一条用户消息可以产生多个习惯

一次用户发言可能很长，里面可能包含多个可以记为习惯的点。提取 prompt 不能把一整条用户消息压成一个分类结果，而应输出一个候选习惯数组。

每个候选习惯都应尽量原子化。原子化不是把每个短句都拆开，而是让每条候选都能独立生效、独立对比、独立合并、独立删除或替换。

提取 prompt 应明确要求“偏原子化”：一条候选习惯尽量只对应一件事，避免一条新候选同时和多条已有习惯发生复杂的重合或冲突。这样可以减少“一条候选和某些已有习惯冲突、又和另一些已有习惯重合”的奇怪情况，也能降低后续弹窗和合并逻辑的复杂度。

### 3.4 一条候选习惯可以有多个 evidence

同一条用户消息中，可能有多个片段共同支持同一条习惯。这些片段都必须作为独立 evidence 挂在同一候选习惯下面，不允许合并成一个 evidence。

这样做有三个原因：

1. evidence 数量本身可以反映用户对这个习惯的重视程度。
2. evidence 需要支持跳转到对应聊天记录或原文片段。
3. 后续调试和审计时，可以清楚看到某条习惯为什么被总结出来。

### 3.5 同一用户消息内部的语义重合

如果用户在同一条消息里用不同说法表达了同义或高度相近的习惯，LLM 应把它们合并成一个候选习惯，但保留多个 evidence。

如果两处说法略有差别，候选习惯的 `summary` 或 `canonical_text` 应反映两者合并后的更准确含义，而不是只保留第一次表达。原始 evidence 仍然分条保存，不能融合。

### 3.6 同一用户消息内部的冲突

v1 可以暂时不做同一条用户消息内部的冲突检查。理由是用户在一条消息中直接提出互相冲突的习惯概率较低，而且过早处理会增加实现复杂度。

如果后续发现这类情况常见，可以增加一个独立的内部冲突检测步骤。

## 4. LLM 提取结果建议结构

提取器应返回强约束 JSON，而不是自由文本。建议结构如下：

```json
{
  "message_id": "msg_xxx",
  "candidates": [
    {
      "candidate_id": "local_1",
      "summary": "以后在实现这类功能时，优先保持 session 内暂存习惯条目化、结构化。",
      "canonical_text": "当前 session 内的暂存习惯必须以独立结构化条目保存，方便合并、替换、删除和证据追踪。",
      "state_suggestion": "active",
      "kind": "workflow",
      "impact": "behavior",
      "explicit": true,
      "temporary": true,
      "confidence": 0.94,
      "scope_hint": "session",
      "traits": ["session_scratch", "structured_items"],
      "evidence": [
        {
          "evidence_id": "local_1_ev_1",
          "message_id": "msg_xxx",
          "quote": "这个session习惯生效区需要做到高度的条目结构化",
          "reason": "用户明确说明 session 生效习惯区需要高度条目化，以支持后续操作。",
          "source": "user_message"
        }
      ],
      "note": "候选还未与 imported habits 或 scratch habits 对比。"
    }
  ]
}
```

字段解释：

- `summary` 是 UI 展示用的简短习惯条目。
- `canonical_text` 是合并、对比和写入 scratch 时使用的规范化语义。
- `state_suggestion` 是 LLM 对 `active / pending` 的建议，不等同于置信度字段本身。
- `explicit` 表示用户是否明确提出要求或明确同意某个行为标准。
- `temporary` 表示该习惯是否更像当前 session 的临时要求。
- `confidence` 表示 LLM 对提取正确性的信心。
- `scope_hint` 只用于提示后续可能的作用域，不应在快链路中直接决定正式习惯库层级。
- `evidence` 是独立 evidence 数组，必须保留每条证据。

## 5. 整体处理流水线

从用户新发言中提取出的每个候选习惯，都应单独走流程。

总顺序是：

1. LLM 从最新用户消息中提取候选习惯数组，每条候选带独立 evidence 数组。
2. 每条候选先与当前 session 中引用的正式习惯库习惯对比。
3. 如果与正式习惯库引用重合，则不创建 scratch，而是作为正式习惯的使用、适用范围、置信度或频次证据进入维护事件。
4. 如果与正式习惯库引用冲突，则该候选暂停进入 scratch，等待批量冲突弹窗让用户选择。
5. 如果与正式习惯库引用既不重合也不冲突，则立即进入与 session scratch 习惯的对比。
6. 与 scratch 对比后，根据 active / pending 与重合 / 冲突矩阵进行合并、替换、标记或弹窗。

这里的关键点是：与正式习惯库引用的冲突弹窗不应阻塞所有候选。只有和 imported habit 有冲突的候选需要等待弹窗；没有冲突也没有重合的候选，应立即继续进入 scratch 对比和合并。

## 6. 与正式习惯库引用的对比

### 6.1 对比对象

每条新候选习惯都应先和当前 session 中从正式习惯库引用进来的所有习惯对比。这里不包括 session scratch 中的 active 或 pending 习惯。

用户明确要求：每条新候选习惯可以独立调用一次 LLM，把这条候选和所有 imported habits 一起发给 LLM。传给 LLM 时必须给 imported habits 编号，方便 LLM 返回准确对应关系。

如果 imported habits 数量未来非常大，工程上可以考虑先做 embedding 或关键词召回 top K，再交给 LLM；但这会改变“所有 imported habits 都参与判断”的语义，需要另行拍板。

### 6.2 LLM 对比 prompt 的职责

LLM 只负责判断关系和生成说明，不负责直接修改数据。

LLM 应返回：

- 哪些 imported habits 和新候选重合。
- 哪些 imported habits 和新候选冲突。
- 冲突是完全冲突还是部分冲突。
- 如果冲突，给出一段简短对比分析，供弹窗展示。
- 每个结论都必须返回 imported habit 的编号或 id。

### 6.3 imported 对比结果建议结构

```json
{
  "candidate_id": "local_1",
  "relations": [
    {
      "habit_ref": "imported_3",
      "habit_number": 3,
      "relation": "conflict",
      "conflict_kind": "partial",
      "comparison_summary": "新要求强调当前 session 内先按用户刚提出的结构化 scratch 规则执行；已引用习惯更偏向旧的 signal->summary->proposal 慢链路，会让当前实现优先级和生效时机发生冲突。"
    }
  ],
  "has_blocking_conflict": true
}
```

`relation` 建议限定为：

- `none`
- `overlap`
- `conflict`

`conflict_kind` 建议限定为：

- `full`
- `partial`

### 6.4 与 imported habit 重合时

如果新候选和 imported habit 重合，说明当前正式习惯在这个 session 中被再次验证。此时不应创建新的 scratch habit。

该候选的主要作用变成更新正式习惯的使用频次、适用范围、置信度或触发历史。这属于正式习惯库的结构化维护问题，当前可以先记录维护事件，不必在 v1 中完整实现 rescope / 升级 / 降级机制。

已拍板：imported overlap 默认不弹窗、不要求用户确认，只静默记录为一次正式习惯命中事件。未来可以在“当前上下文 / 本轮习惯命中记录”这类非打扰 UI 中展示，但该 UI 尚未仔细设计。无论 UI 是否展示，overlap 都不应创建新的 scratch habit，也不应进入冲突弹窗。

### 6.5 与 imported habit 冲突时

如果新候选和 imported habit 冲突，说明当前 session 中已经生效的正式习惯可能不适用于这次对话，或者用户刚刚提出了新的 session 局部要求。

此时不能直接覆盖正式习惯库真源，因为正式库习惯反映的是用户过去确认过或沉淀出的习惯。但也不能忽略新要求，因为当前 session 中用户刚刚提出的要求通常更贴近当前任务。

处理方式：

1. 该候选暂停进入 scratch 对比。
2. 记录 imported conflict review item。
3. 等所有新候选与 imported habits 的并发对比结束后，统一弹出一个冲突弹窗。
4. 弹窗中列出所有冲突对：新候选 vs imported habit。
5. 每一对冲突展示 LLM 生成的简短对比分析。
6. 用户必须对所有冲突项做出选择后，才能点击“确认”应用。

用户选择“保留正式习惯”时：

- 当前 session 继续引用该 imported habit。
- 新候选不进入 active scratch。
- 可以把这次冲突记录为“用户保留旧习惯”的维护事件。

用户选择“采用当前 session 新习惯”时：

- 当前 session 移除或暂停对该 imported habit 的引用。
- 正式习惯库真源不变。
- 新候选变成 active scratch habit，进入当前 session 暂存区并立即生效。
- 系统记录维护提示：这个 imported habit 可能被错误引用，未来可能需要收窄作用域、调整内容、降低权重或进入维护审查。

是否物理删除当前 session 的 imported 引用，还是标记为 `suspended / shadowed`，是实现细节。为了审计和可恢复，建议使用暂停标记，而不是直接无痕删除。

### 6.6 imported 冲突弹窗要求

弹窗应在所有 candidate-vs-imported 对比完成后统一出现，而不是每发现一个冲突就弹一次。

弹窗中每个条目至少包含：

- 新候选习惯摘要。
- 冲突的 imported habit 摘要。
- LLM 写的简短对比分析。
- 选择项：保留正式习惯、采用当前 session 新习惯、用户重新提出局部解决要求。

如果一条新候选同时冲突多条 imported habits，v1 弹窗应以 candidate 为中心分组展示：“新候选习惯 A 与以下 N 条正式习惯引用冲突”。用户对 candidate 做一次整体选择。选择采用 A 时，一次性暂停所有冲突 imported 引用；选择保留现有习惯时，A 不生效。

用户也可以在弹窗中直接输入一段新的解决要求，针对刚刚的冲突逐个解释这个 session 中应该怎么用。该输入必须被视为新的用户证据和冲突解决指令，不直接改正式习惯库真源。v1 可以把这段输入转成新的 active scratch habit，并暂停或替换相关冲突引用；更细的局部拆分策略后续再继续设计。

已进一步拍板：v1 不做复杂的局部拆分和二次原子化。用户在冲突弹窗中输入新的解决要求后，系统直接生成一条覆盖当前冲突组的 active scratch，并暂停或替换该冲突组里的相关条目。更细的逐条拆分以后再设计。

## 7. 与 session scratch 习惯的对比

只有在新候选与 imported habits 既不重合也不冲突后，才进入 scratch 对比。

对比对象包括当前 session scratch 中所有 active 和 pending 习惯。每条新候选应单独进行一次对比。由于每条候选完成 imported 对比的时间不一定一致，scratch 对比不要求全局并发；某条候选一旦通过 imported 对比，就可以立即继续走 scratch 对比。

### 7.1 scratch 对比 prompt 的职责

LLM 对比 prompt 应接收：

- 一条新候选习惯。
- 当前 session scratch active / pending 习惯列表。
- 每条 scratch habit 的稳定 id 或编号。
- 每条 scratch habit 的 `summary`、`canonical_text`、`state` 和必要标签。

LLM 应返回：

- 哪些 scratch habits 与新候选重合。
- 哪些 scratch habits 与新候选冲突。
- 冲突是完全冲突还是部分冲突。
- 如果冲突，生成简短对比分析。
- 如果重合但有细微差别，直接返回建议的 `merged_summary` 和 `merged_canonical_text`。
- 所有关系必须带 scratch habit id 或编号。

LLM 只做判断和说明，不直接修改 scratch。真正的合并、替换、删除、状态更新由程序按硬编码规则执行。

### 7.2 scratch 对比结果建议结构

```json
{
  "candidate_id": "local_2",
  "relations": [
    {
      "scratch_id": "scratch_7",
      "scratch_number": 7,
      "relation": "overlap",
      "conflict_kind": null,
      "comparison_summary": "两条都要求在 session 内保留独立 evidence，不应融合 evidence 文本。",
      "merged_summary": "session 内习惯必须以独立条目保存，并保留每条 evidence，不融合 evidence 文本。",
      "merged_canonical_text": "当前 session 的 scratch habit 应保持条目化；同义习惯合并时 evidence 逐条追加，summary/canonical_text 吸收新表达的细微差别。"
    }
  ]
}
```

`relation` 建议限定为：

- `none`
- `overlap`
- `conflict`

`conflict_kind` 建议限定为：

- `full`
- `partial`

## 8. scratch 合并与冲突矩阵

### 8.1 新 active + 旧 active 重合

直接合并到旧 active scratch habit。

合并规则：

- evidence 取并集，新增 evidence 逐条追加，不能融合。
- 旧条目的 `summary` 或 `canonical_text` 可以被更新，以吸收新表达中的细微差别。
- 旧条目保持 active。
- 置信度、重要度、出现频次可以提升，但具体公式后续再设计。

### 8.2 新 active + 旧 pending 重合

直接合并，并把旧 pending 提升为 active。

理由是：用户后提出的是 active 级别的新要求，说明这个习惯现在足够明确，应在当前 session 生效。

合并规则：

- evidence 取并集。
- `summary` / `canonical_text` 更新为更准确的合并版本。
- `state` 设为 active。

### 8.3 新 active + 旧 active 或 pending 冲突

直接用新 active 替换旧 scratch habit。v1 中不区分完全冲突和部分冲突的最终处理，二者都先按完全替换处理。

理由是：这些都是 session 暂存习惯，后提出的 active 要求通常代表用户在当前 session 的新理解或新决定，不需要再次向用户确认。

实现建议：

- 新候选创建为 active scratch habit。
- 旧 scratch habit 标记为 `superseded`，并记录 `superseded_by`。
- `superseded` 条目不进入 prompt，不参与后续 active/pending 匹配。
- `superseded` 条目仍应在习惯暂存区中继续显示，但要明确标记为“已被覆盖”。
- 保留 `superseded` 的原因是用户可能仍在纠结，后续也可能再次提到被覆盖的习惯。

后续可改进方向：

- 对部分冲突不一定直接替换，可以重新生成一条更精确的新 scratch habit。
- 如果习惯足够原子化，部分冲突会明显减少，可能只剩完全相反的冲突。
- 如果之后用户要求中再次提到某个被覆盖的习惯，系统直接恢复或生成新的 active scratch。这个新表达可以与旧 `superseded` 条目重合作为进一步证据，但 v1 暂不做这种相互参考；先把它当成新的用户发言候选，重新走查重和矛盾处理流程。
- 这些改进暂时记入 open questions。

### 8.4 新 pending + 旧 active 重合

直接合并到旧 active scratch habit，旧条目保持 active。

理由是：pending 的新表达本身不应降低已有 active 习惯的生效状态；它主要作为额外 evidence，提高置信度或重要度。

合并规则：

- evidence 取并集。
- `summary` / `canonical_text` 可以吸收新表达中的细微差别。
- `state` 保持 active。

### 8.5 新 pending + 旧 pending 重合

直接合并到旧 pending scratch habit。

合并规则：

- evidence 取并集。
- `summary` / `canonical_text` 可以更新。
- `state` 保持 pending，除非后续置信度或用户确认规则明确允许自动提升。

### 8.6 新 pending + 旧 active 冲突

这是较复杂但概率较低的情况。因为 pending 不会即时改变当前 session 行为，而 active 已经在当前 session 生效，不能静默让 pending 覆盖 active。

处理方式：

1. 新 pending 暂不直接合并或替换旧 active。
2. 记录 pending-vs-active conflict review item。
3. 等所有 pending 新候选与 session scratch active 习惯的冲突对比完成后，统一弹出一个冲突弹窗。
4. 弹窗中列出所有冲突项，并展示 LLM 生成的简短对比分析。
5. 用户选择如何处理后，统一确认应用。

弹窗选项可以包括：

- 保留旧 active，丢弃或保留新 pending 为未采纳记录。
- 采用新 pending，并将其激活为 active，旧 active 被替换。
- 用户重新提出局部解决要求，系统把这段输入作为新的用户证据和冲突解决指令处理。

已拍板：pending-vs-active 冲突时，默认保留旧 active。新 pending 不进入 prompt，只作为带冲突标记的 pending review item 保存。只有用户在批量弹窗中选择采用新 pending，或输入新的解决要求后，新要求才会激活并替换旧 active。

### 8.7 新 pending + 旧 pending 冲突

不弹窗，不立即影响当前 session 行为。

处理方式：

- 两条 pending 都可以保留。
- 在两条 pending 的记录下都标记冲突关系。
- UI 中提示“可能和某条 pending 习惯冲突”。
- 后续用户激活其中一条时，再处理与另一条 pending 的关系。

理由是 pending 不会进入 prompt，不会即时改变 assistant 行为，因此不需要马上打扰用户。

## 9. evidence 存储与跳转要求

evidence 是本设计的核心，不只是备注。

每条 evidence 应至少保存：

- `evidence_id`
- `session_id`
- `message_id`
- `quote`
- `reason`
- `source`
- `created_at`

建议额外保存：

- `start_offset`
- `end_offset`
- `candidate_id`
- `source_role = user`
- `jump_scope = session_local`

当前系统中 proposal evidence 已有跳转到消息的 UI 能力，scratch dialog 也已有 evidence 展示。但需要确认 scratch evidence 是否已经完整支持点击跳转，以及这种跳转是否只在同一 session 内生效。

已拍板：数据层从一开始为 span 级跳转做准备，UI v1 可以先做到消息级跳转。

v1 evidence 必须保存 `message_id + quote + reason`。`start_offset / end_offset` 作为可选字段预留；如果可以稳定定位就写入，如果不能稳定定位也不阻塞 capture。UI v1 至少支持跳到对应消息并展示 quote，span 高亮作为增强能力。跨 session evidence 跳转、跨会话搜索、跨设备定位都属于后续能力。

## 10. 建议的数据结构

### 10.1 当前 session 生效习惯视图

运行时应能编译出一个高度结构化的 session habit surface：

```ts
type SessionHabitSurface = {
  session_id: string
  imported: ImportedHabitEntry[]
  scratch: ScratchHabitEntry[]
}
```

`ImportedHabitEntry` 建议包含：

```ts
type ImportedHabitEntry = {
  id: string
  habit_id: string
  source: "imported"
  state: "active" | "suspended"
  summary: string
  canonical_text: string
  scope: string
  kind: string
  imported_reason?: string
  suspended_reason?: string
  maintenance_hints?: string[]
}
```

`ScratchHabitEntry` 建议包含：

```ts
type ScratchHabitEntry = {
  id: string
  source: "scratch"
  state: "active" | "pending" | "superseded" | "discarded"
  summary: string
  canonical_text: string
  kind: string
  impact?: string
  explicit?: boolean
  temporary?: boolean
  confidence?: number
  scope_hint?: string
  traits?: string[]
  evidence: ScratchEvidence[]
  conflicts: ScratchConflictRef[]
  supersedes?: string[]
  superseded_by?: string
  created_at: number
  updated_at: number
}
```

### 10.2 候选习惯结构

候选习惯应独立于 scratch habit，避免“还没完成对比就已经写进暂存区”：

```ts
type ExtractedHabitCandidate = {
  id: string
  batch_id: string
  session_id: string
  message_id: string
  summary: string
  canonical_text: string
  state_suggestion: "active" | "pending"
  kind: string
  impact?: string
  explicit?: boolean
  temporary?: boolean
  confidence?: number
  scope_hint?: string
  traits?: string[]
  evidence: ScratchEvidence[]
}
```

### 10.3 冲突审阅记录

```ts
type HabitConflictReview = {
  id: string
  session_id: string
  batch_id: string
  candidate_id: string
  target_source: "imported" | "scratch"
  target_id: string
  relation: "conflict"
  conflict_kind: "full" | "partial"
  comparison_summary: string
  status: "pending" | "resolved"
  resolution?: "keep_existing" | "use_candidate" | "defer"
  created_at: number
  resolved_at?: number
}
```

### 10.4 维护事件

与 imported habit 重合或冲突时，不应直接修改正式习惯库真源。应先记录维护事件，供后续慢链路或习惯库维护系统使用：

```ts
type HabitMaintenanceEvent = {
  id: string
  session_id: string
  habit_id: string
  event: "matched" | "conflicted" | "suspended_in_session" | "kept_over_candidate"
  candidate_id?: string
  evidence?: ScratchEvidence[]
  note?: string
  created_at: number
}
```

## 11. UI 要求

### 11.1 imported conflict 批量弹窗

该弹窗用于处理“新候选习惯 vs 正式习惯库引用”的冲突。

它应满足：

- 所有 candidate-vs-imported 对比完成后统一弹出。
- 一个弹窗包含所有冲突项。
- 每个冲突项展示新候选、正式习惯和 AI 生成的对比分析。
- 用户必须处理所有冲突项后，才能点击确认应用。
- 应用后只改变当前 session 的引用和 scratch，不改正式习惯库真源。

### 11.2 pending-vs-active scratch 冲突批量弹窗

该弹窗用于处理“新 pending 候选 vs 已生效 active scratch”的冲突。

它应满足：

- 所有 pending 新候选与 scratch active 的冲突检测完成后统一弹出。
- 一个弹窗包含所有相关冲突项。
- 每个冲突项展示新 pending、旧 active 和 AI 生成的对比分析。
- 用户确认后再统一应用。

### 11.3 pending-vs-pending 冲突展示

pending 与 pending 冲突不需要弹窗。UI 只需要在对应 pending 条目下显示冲突标记，并允许用户查看它可能冲突的另一条 pending。

### 11.4 evidence 展示与跳转

scratch habit 的 evidence 应能展开查看。每条 evidence 应保留独立 quote 和 reason，并尽量支持跳转到对应消息。

如果当前跳转只在同一 session 内可靠，应明确标注为 session-local。

## 12. 当前实现差距

基于当前代码和文档的初步检查，现状大致如下：

- 当前 session 生效习惯已经有 imported habits 与 scratch habits 的双层模型。
- `ScratchHabit.evidence` 已经是数组，这符合“evidence 不合并”的方向。
- 当前 scratch 合并已有相似度合并和 evidence 追加，但主要依赖简单相似度或文本规范化，不是本文要求的 LLM 结构化对比。
- 当前提取链路更接近对一条消息做分类，不能稳定输出多个候选习惯和每条候选的多个 evidence。
- 当前与 imported habit 的冲突处理较偏即时 heuristic，不是“所有候选并发比较后统一弹窗审阅”。
- 当前 UI 已有 scratch dialog 和 proposal evidence 跳转能力，但 scratch evidence 的跳转范围、粒度和是否支持 quote/span 定位需要进一步确认。
- 当前缺少候选对象、候选 batch、LLM compare result、批量 conflict review、maintenance event 等结构。

这些差距说明：当前结构方向可复用，但需要把提取、对比、合并、冲突审阅升级为结构化 pipeline。

## 13. 实现计划

### Phase 1：补 schema 和类型

新增或扩展以下结构：

- `ExtractedHabitCandidate`
- `ScratchEvidence` 的 `evidence_id / reason / offset / source_role`
- `HabitCompareResult`
- `HabitConflictReview`
- `HabitMaintenanceEvent`
- scratch habit 的 `superseded / discarded / superseded_by`

同时明确 session habit surface 的编译结果，保证 imported 与 scratch 都是可独立操作的条目。

### Phase 2：改造用户消息提取 prompt

把提取器从“单条消息分类”改成“从一条用户消息中输出多个候选习惯，每条候选带多个 evidence”。

要求：

- 只从用户消息中找证据。
- 不使用硬编码 regex / 关键词 gate 作为最终提取条件。
- LLM 输出强约束 JSON。
- 提取结果尽量原子化，一条候选习惯只对应一件事。
- 同一消息内部同义候选由 LLM 合并，evidence 分开保留。
- 内部冲突 v1 暂不处理。

### Phase 3：实现 candidate-vs-imported 对比

为每条候选独立调用 LLM comparator。

要求：

- 输入一条候选和所有当前 session imported habits。
- imported habits 必须编号。
- 输出 overlap / conflict / none。
- conflict 必须带 full / partial 和简短对比分析。
- 程序根据结构化输出处理，不让 LLM 直接改数据。

处理结果：

- overlap 记录维护事件，不创建 scratch。
- conflict 写入 batch review，等待 imported conflict 弹窗。
- none 立即进入 scratch 对比。

### Phase 4：实现 imported conflict 批量弹窗

新增或改造 UI：

- 收集同一批用户消息产生的所有 imported conflicts。
- 所有 candidate-vs-imported 对比完成后统一弹窗。
- 弹窗按 candidate 分组展示；用户对每个 candidate 选择保留现有习惯、采用 session candidate，或直接输入新的局部解决要求。
- 确认后批量应用。

应用规则：

- 保留 imported：candidate 不进入 active scratch。
- 采用 candidate：暂停当前 session 中所有冲突 imported 引用，candidate 写入 active scratch。
- 用户输入新要求：把该输入作为新的用户证据和冲突解决指令，生成或更新 active scratch，并暂停/替换相关冲突条目。
- 正式习惯库真源不变，只记录维护提示。

### Phase 5：实现 candidate-vs-scratch 对比

对通过 imported 检查的候选，和当前 session scratch active / pending 对比。

要求：

- 每条候选单独对比。
- scratch habits 必须编号。
- LLM 输出 overlap / conflict / none。
- conflict 必须带 full / partial 和简短对比分析。
- overlap 若有细微差别，comparator 直接返回 `merged_summary / merged_canonical_text`。
- 程序根据矩阵硬编码处理。

### Phase 6：实现 scratch 合并矩阵

按本文第 8 节实现：

- active + active overlap：合并 evidence，保持 active。
- active + pending overlap：合并 evidence，提升 active。
- active + any conflict：新 active 替换旧 scratch，v1 中 partial 也按替换处理。
- 被替换旧 scratch 标记为 `superseded`，仍在暂存区显示“已被覆盖”，但不进入 prompt 或匹配。
- pending + active overlap：合并 evidence，保持 active。
- pending + pending overlap：合并 evidence，保持 pending。
- pending + active conflict：进入批量弹窗。
- pending + pending conflict：双方记录冲突标记，不弹窗。

### Phase 7：实现 pending-vs-active scratch 冲突弹窗

新增第二类批量弹窗：

- 收集所有新 pending 与旧 active scratch 的冲突。
- 统一展示 AI 对比分析。
- 用户确认后批量应用。

### Phase 8：补 evidence 跳转和审计能力

完善 scratch evidence UI：

- 每条 evidence 独立展示。
- 支持跳转到 `session_id + message_id`。
- 如果有 `start_offset / end_offset`，支持更精确定位。
- 如果暂不支持跨 session，明确 UI 文案或实现边界。

### Phase 9：测试和 fixture

至少覆盖：

- 一条用户消息提取多个候选。
- 一个候选多个 evidence。
- 同一消息内部同义表达合并为一个候选。
- candidate 与 imported overlap 时不创建 scratch。
- candidate 与 imported conflict 时进入批量弹窗。
- active/pending 与 scratch active/pending 的所有 overlap / conflict 矩阵。
- evidence 不融合，只追加。
- 旧 scratch 被替换后标记为 `superseded`，不再生效，但仍在暂存区显示“已被覆盖”。
- pending-pending conflict 只标记不弹窗。

## 14. 2026-04-17 已拍板补充决策

### 14.1 imported overlap 默认静默记录

新候选和 imported habit 重合时，不弹窗、不要求用户确认、不创建 scratch。系统只记录一次正式习惯命中事件，用于后续使用频次、适用范围、置信度或触发历史统计。

未来可以在“当前上下文 / 本轮习惯命中记录”中非打扰展示这些命中，但该 UI 尚未设计。这个未设计不影响 v1 的默认行为：overlap 静默记录。

### 14.2 scratch 替换使用 superseded，不物理删除

scratch 冲突替换时，不物理删除旧条目。旧 scratch 标记为 `superseded`，记录 `superseded_by`，并继续在习惯暂存区中显示，只是明确标记“已被覆盖”。

`superseded` 条目不进入 prompt，不参与后续 active/pending 匹配。保留它的原因是用户可能仍在纠结，也可能之后再次提到被覆盖的习惯。

### 14.3 evidence v1 消息级跳转，span 字段预留

数据层从一开始为 span 级跳转做准备。v1 evidence 必须保存 `message_id + quote + reason`，并把 `start_offset / end_offset` 作为可选字段预留。

UI v1 至少支持跳到对应消息并展示 quote；span 高亮是增强能力，不阻塞 v1。

### 14.4 comparator 直接返回合并后的 summary

新候选和旧 scratch 被判断为重合但有细微差别时，comparator 直接返回 `merged_summary / merged_canonical_text`。这样更符合快链路目标，也充分利用当前 LLM 的语义改写能力。

程序仍应保留兜底：如果 comparator 没有返回合并文本，先保留旧 `summary / canonical_text` 并追加 evidence，不阻塞合并。

### 14.5 多冲突按 candidate 分组处理

一条 candidate 同时冲突多个 imported 或 scratch 时，v1 不要求用户对每一对关系分别做互相独立的选择，而是以 candidate 为中心分组展示。

弹窗展示形式是：“新候选习惯 A 与以下 N 条当前生效习惯冲突”，下面列出每条冲突对象和 AI 生成的对比分析。用户对 A 做一次整体选择：

- 采用 A：暂停或替换所有冲突对象。
- 保留现有习惯：A 不生效。
- 用户直接输入新的局部解决要求：系统把该输入作为新的用户证据和冲突解决指令，生成或更新 active scratch。

为了尽量避免多冲突，用户消息提取 prompt 必须要求候选习惯偏原子化，一条习惯尽量只对应一件事。

### 14.6 imported habits v1 全量比较

v1 中，每条新 candidate 与当前 session 的所有 imported habits 全量比较。当前不使用 embedding 预筛选。

理由是：当前不能依赖 embedding 模型，而且一个 session 通常不会引用太多习惯。即使对话很长，往往也在做一件事，新增和注入的习惯数量不会无限增长。

如果未来测试显示全量比较成本过高，再讨论召回优化或其它预筛选机制。该问题保留为性能与测试结果相关的后续议题。

### 14.7 当前回答的时效性和最新用户要求优先级

每次用户发言所配套注入的习惯，是截止这次消息发出之前已经生效的所有习惯。新消息中刚提出的要求，不需要先被提取成习惯再让 assistant 遵守，因为回答模型本身能看到最新用户消息。

如果本次用户发言和已注入习惯冲突，本次回答必须按用户当前要求来，忽略冲突的已有习惯。这个优先级通过 prompt 明确写入，而不是等待后台冲突检测。

习惯提取 AI、习惯对比查重 AI、回答用户的 AI 是相互独立的调用。回答 AI 立即按当前用户消息生成回复；习惯相关调用在后台并行处理，尽量在下一次对话前产出合并结果或冲突弹窗。

### 14.8 pending-vs-active 冲突默认保留 active

新 pending 与旧 active scratch 冲突时，默认保留旧 active。新 pending 不进入 prompt，只作为带冲突标记的 pending review item 保存。

只有用户在批量弹窗中选择采用新 pending，或直接输入新的局部解决要求后，新要求才会激活并替换旧 active。

## 15. 仍需进一步明确的问题

### 15.1 当前上下文 / 本轮习惯命中记录 UI

imported overlap 已确定静默记录。这里不要求现在设计完整 UI，只需要保留以后可用的命中记录接口，用于后续习惯作用范围、置信度提升或下降、命中次数统计等机制。

### 15.2 冲突弹窗自由输入的后续增强

已拍板：弹窗中允许用户直接输入新的局部解决要求，并把它作为新的用户证据和冲突解决指令。v1 直接生成一条覆盖当前冲突组的 active scratch，不再做复杂的进一步原子化拆分。

后续可继续增强：如果用户在输入框里同时说明多个局部规则，未来可以考虑再走一次原子化提取；但这不进入当前落地范围。

### 15.3 被 superseded 的习惯再次被用户提及时如何处理

已拍板：`superseded` 条目保留显示但不进入 prompt 或匹配。如果用户之后又提到一个被覆盖的习惯，系统直接恢复或生成新的 active scratch，并把这次提及当成新的候选重新走查重和矛盾处理流程。

v1 暂不把“新提及与旧 superseded 条目的重合”作为特殊证据合并；这种相互参考以后再设计。

### 15.4 active / pending 的判定标准

当前方向是强指令进 active，弱偏好进 pending；高置信默认 active，低置信默认 pending。但具体如何把 LLM 的 `explicit / confidence / temporary / impact` 映射到 active/pending，需要更精确规则。

### 15.5 imported habits 全量比较的测试反馈

v1 已拍板全量比较所有 imported habits，不用 embedding 预筛选。

后续需要基于测试结果观察：session 中 imported habits 数量、LLM 延迟、token 成本、冲突漏判/误判率。如果测试显示全量比较不可接受，再讨论召回优化。

### 15.6 多条 evidence 的权重

用户明确说 evidence 数量可以体现习惯是否被重视、可以检验置信度。后续需要设计：

- 同一消息内多个 evidence 和跨消息多个 evidence 的权重是否相同。
- evidence 数量如何影响 active/pending、入库建议、作用域提升建议。
- evidence 质量是否需要评分。

### 15.7 regex fallback 的未来定位

当前已明确：从用户发言中提取习惯时，不能用硬编码 regex / 关键词 gate 替代 LLM 判断，也不能用它过滤掉 LLM 认为有效的习惯。

但 regex / 关键词线索在 v1 中先不实现，只保留为后续 open question：未来如果要接入，也只能作为低权重的参考层或兜底触发层，例如把消息标记为“必须触发 LLM 复核”“等待模型恢复后优先重试”，或在调试/验收中提示这条消息高概率含有短期或长期习惯候选。这个兜底层不能直接生成 scratch、signal 或 processed 标记，也不能绕过 LLM 结构化输出。

## 16. 可以改进的建议

### 16.1 使用 candidate batch 追踪一次用户消息的全部结果

每次用户消息提取应生成一个 `candidate_batch_id`。这样可以追踪：

- 这条消息提取了哪些候选。
- 哪些候选命中了 imported habit。
- 哪些候选进入 scratch。
- 哪些候选被冲突弹窗拦截。
- 用户最后如何处理这些冲突。

这会让调试、UI 展示和后续慢链路统计都更清楚。

### 16.2 LLM 负责判断，程序负责变更

所有 prompt 都应保持一个边界：LLM 只输出结构化判断、合并建议和对比分析；真正修改 imported 引用、scratch 条目、evidence 数组、冲突状态的动作由程序执行。

这样既能利用 LLM 的语义理解，又能保证数据变更可预测、可测试、可回滚。

### 16.3 用 tombstone / superseded 保留历史

对 scratch 的“删除”和“替换”建议优先实现为 `superseded / discarded` 状态，而不是物理删除。原因是：

- 可以审计为什么某条习惯不再生效。
- 可以支持撤销。
- 可以保留 evidence 和对比历史。
- 可以为后续习惯库维护提供数据。

### 16.4 把正式习惯库维护和 session 快链路分开

当 imported habit 被重合命中或冲突暂停时，快链路只记录事件，不直接改正式习惯库真源。正式习惯的升级、降级、收窄、扩展、重写，应该进入后续的结构化维护系统。

这和用户当前判断一致：晋升/降级机制更适合针对已经正式入库的习惯，或已经在 session 暂存区中真实生效过的习惯，而不是从 raw signal 开始就急着问用户是否确认。

### 16.5 先实现 session 内查重合并，再做跨 session 统计

当前最值得先做的是 session 内 scratch 合并系统。只有 session 内条目、evidence、冲突、替换都稳定后，跨 session 高频统计、暂存习惯入库建议、正式习惯库升级/收窄建议才有可靠数据基础。
