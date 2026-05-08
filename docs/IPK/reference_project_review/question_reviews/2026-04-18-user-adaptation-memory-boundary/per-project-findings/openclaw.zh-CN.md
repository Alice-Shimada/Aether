# openclaw：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`不是单系统合并，而是“工作区真源 + 检索层 + active memory + 可选 Honcho 用户建模”的多层强耦合结构。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/openclaw/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/openclaw/openclaw/README.md`、`docs/concepts/memory.md`、`memory-builtin.md`、`memory-search.md`、`active-memory.md`、`memory-honcho.md`
- 本轮补读代码：`reference_project/openclaw/openclaw/extensions/memory-core/index.ts`、`extensions/active-memory/index.ts`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `有证据` | `MEMORY.md`、daily notes、session memory、active memory、Honcho user model 是不同层。 |
| 2. 用户偏好是否直接作为 memory 保存 | `有证据` | `memory.md` 直接把 `MEMORY.md` 定义为 durable facts、preferences、decisions。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `有证据` | `memory-honcho.md` 明确写到每轮后 user 和 agent messages 都会被观察并持久化。 |
| 4. 检索结果是否直接改写 agent 行为 | `有证据` | `MEMORY.md` 会在 DM session 开头加载；active memory 会在主回复前插入回忆。 |
| 5. 是否单独提供稳定 profile 层 | `有证据` | 工作区 memory 文件和 Honcho profile 都可承担稳定用户层。 |
| 6. 是否有防污染机制 | `有证据` | temporal decay、deep promotion、active memory 只在合格 session 运行、session 开关、hidden recalled context 都是治理手段。 |
| 7. 治理是共用还是分开 | `有证据` | builtin file memory、session memory、Honcho profile、active memory 各有不同的生命周期与开关。 |

## 2. 本项目对问题的回答

OpenClaw 的答案是“强关联，但不要混成一层”：

- 真正稳定、可审计的部分放在工作区文件。
- 检索层负责把这些真源和 session transcript 变成可搜索上下文。
- active memory 负责“该回忆时主动回忆”。
- Honcho 负责更自动化的用户建模。

所以它体现出的观点是：

- 用户适配和记忆共享材料来源；
- 但两者不必共用一个数据面或一个执行面；
- 更好的方式是多层协作。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 担心“完全合并会让错误记忆污染行为”，OpenClaw 是支持分层的强证据。
- 它特别值得借鉴的是把“用户真源”“回忆层”“主动回忆层”“自动建模层”拆开。
- 这比简单地讨论“用户自适应系统和记忆系统要不要合并”更接近真实产品形态。

## 4. 仍需继续验证

- `USER.md` 在当前版本中的正式加载位置和默认启用情况。
- Honcho 与 builtin memory 同时命中时的最终合成策略。
