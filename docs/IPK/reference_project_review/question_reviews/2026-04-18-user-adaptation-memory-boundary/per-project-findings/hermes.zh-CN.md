# hermes：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`明显不是一个单块系统；它把 USER 层、一般记忆层、会话回忆层、外部建模层拆开，但用统一 agent loop 强耦合起来。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/hermes/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/hermes/hermes-agent/README.md`、`plugins/memory/honcho/README.md`
- 本轮补读代码：`reference_project/hermes/hermes-agent/tools/memory_tool.py`、`tools/session_search_tool.py`、`agent/memory_manager.py`、`agent/memory_provider.py`、`hermes_cli/config.py`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `有证据` | 内置层就区分 `USER.md` 与 `MEMORY.md`，同时还把 `session_search` 单独拆出来。 |
| 2. 用户偏好是否直接作为 memory 保存 | `有证据` | README 和配置都把 `user profile` 作为正式 memory 能力，`USER.md` 是显式真源。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `有证据` | provider 接口有 `sync_turn(user, asst)`，说明整轮对话会同步进外部记忆。 |
| 4. 检索结果是否直接改写 agent 行为 | `有证据` | `MemoryManager.build_system_prompt()` 与 `prefetch_all()` 会把用户/记忆上下文编进主 prompt。 |
| 5. 是否单独提供稳定 profile 层 | `有证据` | `USER.md` 与 Honcho peer card 都是稳定用户层。 |
| 6. 是否有防污染机制 | `有证据` | 拆层本身就是防线，且 `MemoryManager` 限制同一时间只启用一个外部 provider，避免后端冲突。 |
| 7. 治理是共用还是分开 | `有证据` | `USER.md` 可手工维护，`session_search` 是独立工具，provider 又有自己的同步与生命周期。 |

## 2. 本项目对问题的回答

Hermes 很像在直接回答你这次的问题：

- 用户适配和记忆系统确实强相关。
- 但它们不该粗暴合并成一团。
- 更合理的做法是把“用户相关长期事实”“一般长期事实”“历史会话回忆”“外挂建模服务”拆成不同层，再在 agent loop 里组合。

它反映出的看法是：

- 两个系统应该强耦合；
- 但耦合点应是统一调度层，而不是共享一个无边界的数据池。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 后面倾向“不完全合并”，Hermes 是很强的现实样本。
- 它尤其支持一种架构心智：
  - 用户层单独可审计；
  - 会话回忆单独存在；
  - 自动建模可外挂；
  - 但主对话仍通过一个统一 orchestration 层消费这些能力。

## 4. 仍需继续验证

- `Honcho` 实际冲突解决策略。
- `USER.md`、provider profile、session summary 同时存在时的优先级。
