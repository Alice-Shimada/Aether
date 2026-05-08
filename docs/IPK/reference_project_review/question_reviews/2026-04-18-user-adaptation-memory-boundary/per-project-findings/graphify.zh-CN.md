# graphify：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`它基本不在回答“用户自适应 vs 记忆”这个问题；它回答的是“项目语料结构记忆”怎么做。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/graphify/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/graphify/README.md`
- 本轮补读样例：`reference_project/graphify/worked/example/README.md`、`worked/mixed-corpus/review.md`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `无证据` | 它构建的是语料/代码知识图，不是用户建模系统。 |
| 2. 用户偏好是否直接作为 memory 保存 | `反证` | 本轮补读内容里没有用户偏好层。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `无证据` | 样例聚焦文件、代码、文档、图片、视频等语料。 |
| 4. 检索结果是否直接改写 agent 行为 | `反证` | graph 用来辅助代码理解和查询，不是用来控制 agent 行为风格。 |
| 5. 是否单独提供稳定 profile 层 | `反证` | 完全没有 profile 语义。 |
| 6. 是否有防污染机制 | `无证据` | 它有“honest about what it found vs guessed”，但这不是用户适配污染治理。 |
| 7. 治理是共用还是分开 | `无证据` | 该问题在此项目里基本不成立。 |

## 2. 本项目对问题的回答

Graphify 的高价值之处在于反证：

- “记忆系统”并不总是指用户记忆。
- 还有一类很重要的系统，是对项目、文件、知识语料做跨会话结构化记忆。

所以它反过来挑战 Aether：

- 以后讨论“记忆系统”时，必须先说清楚是在谈用户记忆，还是在谈项目/知识语料记忆。

## 3. 对 Aether 的启发或挑战

- 这个项目不支持把用户自适应并进项目知识图。
- 它反而支持把“用户记忆”和“工作区/项目记忆”分成两类问题。

## 4. 仍需继续验证

- 无本轮关键阻塞点；该项目对本问题已足够清楚。
