# 用户自适应系统与记忆系统边界：跨项目比较

> 状态：已完成  
> 来源：`docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/per-project-findings/`

## 0. 先给结论

如果只保留一句最重要的话：

> 外部项目普遍支持“用户自适应和记忆系统强关联”，但多数成熟做法不是把两者压成同一层对象，而是做成不同层，再在运行时强耦合组合。

这 11 个项目大致分成四类：

- `统一底座型`：`mem0`、`letta`
- `强耦合分层型`：`zep`、`hermes`、`openclaw`
- `基础设施型`：`langgraph`、`graphiti`
- `反例型`：`graphify`、`memos`、`recommenders`、`RecBole`

## 1. 问题轴 1：项目是否显式区分“用户自适应数据”和“通用记忆数据”

多数模式：

- 多数成熟 agent 产品不会把二者当作完全无关系统。
- 但也不会把二者完全压平到一个无边界的数据池。

典型样本：

- `zep`：`thread + graph + user summary`
- `hermes`：`USER.md + MEMORY.md + session_search + provider`
- `openclaw`：workspace memory + session memory + active memory + Honcho

少数做法：

- `mem0`、`letta` 更接近统一底座，再在内部做 type / block / hierarchy 分层。

高价值反例：

- `graphify` 说明还有一类“项目/语料记忆”，根本不在回答用户适配问题。
- `recommenders`、`RecBole` 说明用户适配也可以完全不通过显式 memory subsystem 实现。

对 Aether 的意义：

- 不能再把“用户自适应”和“记忆系统”当成一个模糊总词。
- 更稳的说法应是：二者有关，但边界至少要在真源、运行时装配和治理上说清楚。

## 2. 问题轴 2：用户偏好、习惯、长期画像是否直接作为 memory 保存

多数模式：

- 是，很多项目都把用户偏好视作 memory 的一部分。

典型样本：

- `mem0` 的 `user memory`
- `letta` 的 `human` block
- `graphiti` 的 `Preference` entity
- `openclaw` 的 `MEMORY.md`

但多数项目还会继续再抽一层：

- `zep` 抽 `user summary`
- `hermes` 抽 `USER.md`
- `openclaw` 在 memory 之外再加 Honcho profile

结论：

- “习惯也是一种记忆”这句话在外部项目里总体成立。
- 但“习惯只要留在普通记忆层就够”并不成立，因为很多项目又把它再抽成更稳定、更靠近行为控制的一层。

## 3. 问题轴 3：记忆写入时是否同时吸收用户发言与 AI 输出

多数模式：

- 通用记忆层经常会吸收整轮对话，而不只吸收用户发言。

典型样本：

- `mem0` 在 `agent_id + assistant role` 时走 agent memory extraction
- `hermes` provider 接口明确 `sync_turn(user, asst)`
- `openclaw` 的 Honcho 观察 user 和 agent messages
- `zep` thread / graph 从完整会话中持续更新

更谨慎的地方：

- 就算通用记忆会吸收 assistant 输出，真正的“稳定用户层”仍更偏用户事实，而不是 assistant 自身产物。

对 Aether 的意义：

- 这轮外部证据不支持把“assistant 文本永远不该进入任何长期记忆”说得过死。
- 但它也没有支持“assistant 文本可以直接当用户习惯证据”。
- 更合理的边界是：
  - 通用记忆可更宽；
  - 用户适配真源应更谨慎、以用户侧证据为主。

## 4. 问题轴 4：记忆检索是直接改写 agent 行为，还是只提供事实性上下文

多数模式：

- 成熟系统往往两者并存，但分层实现。

行为控制层样本：

- `letta` 的 core memory / persona
- `zep` 的 user summary
- `hermes` 的 `USER.md`
- `openclaw` 的开场加载 memory + active memory preflight

事实上下文层样本：

- `graphiti` 的 temporal graph
- `langgraph` 的持久化原语
- `graphify` 的项目知识图

共同结论：

- “总是该带上的稳定用户信息”与“按需召回的更宽记忆”最好不是同一层。
- 这也是外部项目对“两个系统该耦合多强”的最稳定回答：
  - 存储上可以共根；
  - 运行时必须分层。

## 5. 问题轴 5：是否单独提供 profile / summary / persona 这样的稳定用户层

多数模式：

- 强用户适配项目几乎都会抽出一层稳定用户层。

典型样本：

- `letta`：`human/persona`
- `zep`：`user summary`
- `hermes`：`USER.md`
- `openclaw`：`MEMORY.md` / Honcho profile

少数例外：

- `mem0`、`graphiti` 更相信统一记忆底座，通过 metadata / entity type 解决问题。

结论：

- 如果 Aether 后面完全不做“稳定用户层”，将与多数成熟样本偏离。
- 这层不一定非叫 profile，但它必须回答：
  - 什么信息总要带上；
  - 什么信息只按需召回。

## 6. 问题轴 6：项目如何防止记忆污染用户自适应

多数模式：

- 防污染靠的不是一个大模型“自己判断”，而是分层和生命周期。

典型手段：

- `graphiti`：`invalid_at`、provenance、group 隔离
- `openclaw`：temporal decay、active memory 只在合格 session 跑、deep promotion
- `hermes`：`USER.md` 与 `MEMORY.md` 分离、`session_search` 独立
- `mem0`：scope filters、history、delete/reset

高风险做法：

- `letta`、`mem0` 这种统一底座路线灵活，但如果没有更强治理，很容易把用户偏好、杂项事实、agent 经验混在一起。

结论：

- 如果 Aether 要合并底座，必须把污染治理单独设计出来。
- 如果 Aether 不想先做很复杂治理，那就更应保留层边界。

## 7. 问题轴 7：删除、纠正、审计能力是共用还是分开

多数模式：

- 越偏统一底座，治理越共用。
- 越偏分层，治理越分开。

统一底座样本：

- `mem0`：同一 memory lifecycle 管 delete/history/reset
- `graphiti`：统一图谱治理

分层样本：

- `hermes`：文件真源、session recall、provider lifecycle 各自独立
- `openclaw`：builtin memory、session memory、active memory、Honcho 各自有不同开关与生命周期

当前不能完全下结论的原因：

- 多数项目对“用户可见删除/纠正 UX”公开不足。

## 8. 多数项目共同模式

- 有一层“总是该带上的稳定用户信息”。
- 有一层“按需召回的更宽记忆”。
- 当前会话历史、长期记忆、用户层、agent 经验层经常不是同一层。
- 用户适配和记忆通常强耦合，但更常见的耦合点是运行时 orchestration，而不是单一数据池。

## 9. 高价值反例

- `graphify`：说明必须把“项目/知识记忆”和“用户记忆”分开谈。
- `memos`：说明用户可控知识资产不该自动等于适配层。
- `recommenders` / `RecBole`：说明用户适配也可以主要是隐式建模，而非显式记忆系统。

## 10. 暂时仍冲突的做法

- `mem0` / `letta` 更接近统一底座。
- `zep` / `hermes` / `openclaw` 更接近强耦合分层。

这组冲突不是简单的“谁对谁错”，而是反映了两种前提：

- 如果目标是快速让 agent 长期变聪明，统一底座很诱人。
- 如果目标是让用户长期信任、可纠正、可审计，分层更稳。

## 11. 证据不足区域

- 大多数项目公开材料对“用户显式纠错后的长期回滚策略”说得不够细。
- `graphiti` 默认会话 ingestion 是否总把 assistant 输出与 user 输入等权对待，本轮仍不够确定。
- `zep` 的 summary / graph 分层治理界面，本轮仍偏样例级证据。

## 12. 对 Aether 的直接回答

针对你原始问题，这轮复审给出的最稳回答是：

1. 不建议把“用户自适应系统”和“记忆系统”完全合并成一个无分层的大系统。
2. 也不建议把两者做成弱耦合、彼此几乎无关的两个系统。
3. 更成熟的路线是：
   - 底层强关联；
   - 真源与治理可分层；
   - 运行时强耦合；
   - 行为控制层只带少量稳定用户信息；
   - 更宽记忆层继续负责会话、环境、关系、agent 经验和时间变化。
