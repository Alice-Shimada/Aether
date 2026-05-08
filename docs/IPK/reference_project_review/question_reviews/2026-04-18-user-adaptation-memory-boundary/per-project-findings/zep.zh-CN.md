# zep：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`不是完全合并，也不是完全分裂；它把 thread、graph、user summary 拆成不同层，再在 context block 里组合。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/zep/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/zep/README.md`、`examples/python/user-summary-instructions-example/README.md`、`examples/python/agent-memory-full-example/README.md`
- 本轮补读代码/样例：`reference_project/zep/examples/python/chat_history/memory.py`、`examples/python/advanced.py`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `有证据` | `thread`、`graph`、`user summary` 在样例里职责明显不同。 |
| 2. 用户偏好是否直接作为 memory 保存 | `有证据` | graph 会保留 preferences，user summary 会把关键偏好抽成“总要带上”的摘要。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `有证据` | `advanced.py` 的多轮 thread 示例把 user 与 assistant 消息都送进 thread，graph 从整段会话里持续更新。 |
| 4. 检索结果是否直接改写 agent 行为 | `有证据` | `get_user_context()` 会把 user summary 自动放进 context block，让回复默认受其影响。 |
| 5. 是否单独提供稳定 profile 层 | `有证据` | `user summary instructions` 明确是在 graph 之外再抽一层稳定用户层。 |
| 6. 是否有防污染机制 | `有证据` | temporal graph 追踪事实变化，user summary 会随着新信息更新，而不是只累加旧偏好。 |
| 7. 治理是共用还是分开 | `仍不确定` | 本轮样例看到了 thread 删除和 summary 自动更新，但未看到 summary 与 graph 的分开治理界面。 |

## 2. 本项目对问题的回答

zep 的看法比 mem0 更偏“强耦合分层”：

- 用户适配和长期记忆强相关，因为二者都从跨会话材料中抽信息。
- 但它不把所有信息扔进同一个池子，而是额外抽出 `user summary` 这一层，专门承载“始终该知道的用户事实”。
- 图谱继续负责时间变化、关系和更宽的上下文检索。

也就是说，它对你的问题给出的答案更像：

- 不必拆成两个完全独立系统。
- 但一定要把“稳定用户层”和“更宽的长期记忆层”区分出来。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 后面不想把“用户自适应系统”做成一张静态 profile 表，zep 提供了一个很强的中间路线：
  - 底层保留记忆图谱；
  - 上层抽出一个稳定 user summary contract。
- 这很贴近你说的“习惯本质上也是记忆，但又是记忆里一个更适合直接控制行为的子集”。

## 4. 仍需继续验证

- 正式产品里的删除、纠正和 summary 重建接口是否分层公开。
- graph 与 user summary 冲突时，最终以哪层为准。
