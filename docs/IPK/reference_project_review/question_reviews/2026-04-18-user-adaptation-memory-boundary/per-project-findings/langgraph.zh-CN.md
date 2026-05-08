# langgraph：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`它主要在回答“状态与持久化怎么分层”，并没有给出强观点说用户自适应应该并入记忆系统。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/langgraph/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/langgraph/README.md`、`libs/langgraph/README.md`
- 本轮补读持久化说明：`reference_project/langgraph/libs/checkpoint/README.md`、`checkpoint-sqlite/README.md`、`checkpoint-postgres/README.md`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `无证据` | 它讨论的是 graph state、checkpoint、thread、persistent memory 原语，不是用户画像产品。 |
| 2. 用户偏好是否直接作为 memory 保存 | `无证据` | 本轮补读样本没有看到官方默认 profile 结构。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `无证据` | checkpointer 只定义状态快照机制，不替应用规定消息语义。 |
| 4. 检索结果是否直接改写 agent 行为 | `无证据` | 它给的是基础设施，不给默认行为控制面。 |
| 5. 是否单独提供稳定 profile 层 | `反证` | 默认材料里没有单独的稳定用户层。 |
| 6. 是否有防污染机制 | `有证据` | `thread_id`、checkpoint 边界、`delete_thread()` 这些原语支持隔离状态污染。 |
| 7. 治理是共用还是分开 | `有证据` | checkpoint 接口和 thread 边界说明短期状态治理是独立概念，而不是所有东西都塞到一个 memory 名字下。 |

## 2. 本项目对问题的回答

LangGraph 的价值不在于告诉你“该不该合并”，而在于提醒：

- 当前执行状态、
- thread 内持续状态、
- 跨 session 持久化，

这几类东西从一开始就应该分层。

所以它对你问题的真实贡献是：

- 它支持“不要把所有东西都笼统叫 memory”；
- 但它并不直接支持“用户自适应一定要单独成系统”或“一定并入记忆系统”。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 后面要拆“当前状态”“会话历史”“长期记忆”“用户层”，LangGraph 提供的是底层分层逻辑支持。
- 但它不能单独拿来回答“用户自适应和记忆系统关系该怎么定”，因为它故意不替应用拍板。

## 4. 仍需继续验证

- 官方 memory guide 里的示例应用是否进一步区分 profile 与 generic store。
