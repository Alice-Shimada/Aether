# memos：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`它几乎不支持自动用户自适应；更像把“用户自己的知识资产”与 agent 行为控制彻底分开。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/memos/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/memos/memos/README.md`
- 本轮补读代码：`reference_project/memos/memos/server/router/api/v1/memo_service.go`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `无证据` | 它不是 agent memory / profile 产品。 |
| 2. 用户偏好是否直接作为 memory 保存 | `反证` | 笔记是用户自己写的知识资产，不是系统自动抽取的用户偏好层。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `反证` | 本轮补读内容里没有 AI 对话写回长期记忆的主路径。 |
| 4. 检索结果是否直接改写 agent 行为 | `反证` | 它没有 agent 行为控制面。 |
| 5. 是否单独提供稳定 profile 层 | `反证` | 没有 profile / persona / preference engine。 |
| 6. 是否有防污染机制 | `有证据` | README 强调 self-hosted、Markdown-native、portable、zero telemetry，本质上靠用户控制来防污染。 |
| 7. 治理是共用还是分开 | `有证据` | 治理几乎全落在“用户自己的笔记资产”这一层，而不是系统自动抽象出的多层 memory。 |

## 2. 本项目对问题的回答

Memos 给出的不是“怎么合并”，而是另一种提醒：

- 不是所有记忆产品都应该顺手变成用户自适应系统。
- 很多时候，用户真正要的是自己可控、可迁移、可审计的知识资产。

所以它对你的问题更像是一个高价值反证：

- 即便记忆和用户有关，也不代表系统应该自动把这些材料上升成行为控制层。

## 3. 对 Aether 的启发或挑战

- 如果 Aether 以后要做自动用户适配，必须明确区分：
  - 什么是用户自己可见、可编辑的长期资产；
  - 什么是系统内部为了更好回答而抽取出的适配层。
- `memos` 支持把这两者分开，而不是一上来就合并。

## 4. 仍需继续验证

- 若后续看到其 AI 辅助搜索或自动摘要路线，可再补一轮，但对当前问题不构成阻塞。
