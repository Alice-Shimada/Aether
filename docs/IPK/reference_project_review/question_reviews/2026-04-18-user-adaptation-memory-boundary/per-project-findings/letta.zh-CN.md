# letta：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`高度合并，但在统一 memory hierarchy 内部再分 core / recall / archival / persona。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/letta/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/letta/README.md`
- 本轮补读代码：`reference_project/letta/letta/functions/function_sets/base.py`、`letta/schemas/agent.py`、`letta/templates/summary_request_text.j2`、`letta/services/summarizer/compact.py`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `反证` | 它没有把用户适配做成独立 subsystem，而是把它嵌进同一套 memory hierarchy。 |
| 2. 用户偏好是否直接作为 memory 保存 | `有证据` | README 的 `memory_blocks` 示例里直接有 `human`、`persona`，函数集支持持续编辑 memory block。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `有证据` | `conversation_search`、`archival_memory_insert`、compaction summary 都来自整段会话，而非只看用户发言。 |
| 4. 检索结果是否直接改写 agent 行为 | `有证据` | core memory blocks 是常驻 prompt 内容，会直接影响说话方式和行为。 |
| 5. 是否单独提供稳定 profile 层 | `有证据` | `human` / `persona` blocks 就是稳定层，但它们仍属于 memory hierarchy 内部。 |
| 6. 是否有防污染机制 | `有证据` | 分层本身就是主要防线：core 常驻、conversation recall 按需搜、archival 长期存、compact 防丢失。 |
| 7. 治理是共用还是分开 | `仍不确定` | 本轮确认了 memory edit tools，但未在补读样本里完整确认 human/persona 与 archival 的治理界面是否完全分开。 |

## 2. 本项目对问题的回答

letta 的回答几乎是“把你的两个系统视作一个大系统里的不同层”：

- 用户适配最强的一层是 `human/persona` 这类常驻块。
- 会话回忆和长期存档则分别放在 `conversation_search` 与 `archival_memory`。
- compact 负责在上下文收缩时尽量不丢掉关于人的重要事实。

所以它不是说“这俩没区别”，而是说：

- 二者边界应该体现在 memory hierarchy 里；
- 不一定要上升成两个完全平行的系统。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 想把“行为风格控制”和“长期事实回忆”做强耦合，letta 是很强的支持证据。
- 但它也暴露风险：一旦允许模型主动改写 core memory，错误画像会长期污染回答。
- 对你的问题来说，letta 支持“合并底座、分层使用”，不支持“完全拆开互不相干”。

## 4. 仍需继续验证

- Letta 当前对 human/persona block 的人工审核和回滚边界。
- archival memory 与 core memory 发生冲突时的正式优先级。
