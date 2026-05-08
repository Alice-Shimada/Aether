# 用户自适应系统与记忆系统边界：本轮复审总览

> 状态：已完成  
> 入口目录：`docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/`

## 0. 这份文档是干什么的

如果你现在只想快速知道三件事：

- 这轮到底审了哪些项目；
- 目录里的每个文件分别是干什么的；
- 这轮从所有文件里抽出来的最重要结论是什么；

那就先看这一份，不用先翻全部细节。

## 1. 这轮审了什么

本轮专题问题是：

> 用户自适应系统和记忆系统到底应不应该合并；如果不完全合并，二者应该耦合多强。

本轮自动扫描并复审了这些项目：

- `graphify`
- `graphiti`
- `hermes`
- `langgraph`
- `letta`
- `mem0`
- `memos`
- `openclaw`
- `RecBole`
- `recommenders`
- `zep`

本轮排除了：

- `reference_project/andrej-karpathy-skills`
- `reference_project/darwin_skill`
- `reference_project/docs`

## 2. 目录里的每个文件是做什么的

### 2.1 总入口文件

- [review-brief.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/review-brief.zh-CN.md)
  这份是任务说明书。
  它告诉你：原始问题是什么、被拆成了哪些问题轴、审阅范围是什么、这轮最终的一句话结论是什么。

- [comparative-report.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/comparative-report.zh-CN.md)
  这份是跨项目总报告。
  它不按项目一个个复述，而是按问题轴汇总：多数项目怎么做、少数反例是什么、哪些地方还冲突。

- [aether-impact.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/aether-impact.zh-CN.md)
  这份只看 Aether。
  它告诉你：哪些结论可以直接吸收，哪些还要继续讨论，哪些现在还不能写进权威设计文档。

- [aether-current-keep-points-and-main-issue.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/aether-current-keep-points-and-main-issue.zh-CN.md)
  这份把本轮结论进一步压成“哪些值得保留、哪些值得修改、两边各自最高优先级是什么”。
  因为它已经不只是本专题的局部结论，而是可直接服务全量审阅后的 Aether 判断，所以文件现存放在 `reference_project_review/` 根目录。

- [habit-library-as-bounded-memory-subsystem.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/habit-library-as-bounded-memory-subsystem.zh-CN.md)
  这份是本轮后续讨论的拍板结论。
  它用“两段式”结构说明：第一部分是短版核心观点，第二部分按同样顺序展开细节。核心结论是：习惯库可以属于长期记忆体系，但必须是有边界、强治理、随时 ready 的行为控制子系统。

- [open-questions-cleanup.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/open-questions-cleanup.zh-CN.md)
  这份是“后续该怎么处理旧问题列表”。
  它告诉你：这轮没有正式解决哪些问题，哪些问题的表述该改，哪些新问题应该加入下一轮讨论。

### 2.2 单项目证据文件

- [per-project-findings](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/per-project-findings)
  这个文件夹里每个项目一份文件。
  每一份都包含：
  - 该项目对本问题的直接答案；
  - 本轮复用的旧审阅材料；
  - 本轮新增补读的代码/文档；
  - 对 7 个问题轴分别给出的 `有证据 / 无证据 / 反证 / 仍不确定` 判断；
  - 对 Aether 的启发。

## 3. 如果你只想快读，建议按这个顺序看

1. 先看本文件 `README.zh-CN.md`
2. 再看 [comparative-report.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/comparative-report.zh-CN.md)
3. 再看 [habit-library-as-bounded-memory-subsystem.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/habit-library-as-bounded-memory-subsystem.zh-CN.md)
4. 再看 [aether-impact.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/aether-impact.zh-CN.md)
5. 如果你想追证据，再去 `per-project-findings/` 看单项目文件

## 4. 这轮最重要的结论合集

### 4.1 最核心一句话

外部项目整体不支持“把用户自适应系统和记忆系统完全当成同一层对象”，但也很少支持“把它们做成两个几乎无关的系统”。

更常见的成熟做法是：

- 底层强关联；
- 中层明确分层；
- 运行时强耦合组合；
- 行为控制层只带少量稳定用户信息；
- 更宽记忆层继续保存会话、关系、环境、agent 经验和时间变化。

### 4.2 这轮看到的三种主路线

- `统一底座型`
  代表项目：`mem0`、`letta`
  含义：用户偏好、长期记忆、agent 经验都放在一个大 memory substrate 里，再靠 type / scope / hierarchy 分层。

- `强耦合分层型`
  代表项目：`zep`、`hermes`、`openclaw`
  含义：用户层、通用记忆层、session recall、主动回忆层彼此强关联，但不是同一层对象。

- `反例型`
  代表项目：`graphify`、`memos`、`recommenders`、`RecBole`
  含义：提醒我们“记忆”可能是项目知识图、“用户适配”可能是统计建模，也可能根本不该自动变成用户画像。

### 4.3 这轮最稳定的共识

- 强用户适配项目几乎都会抽出一层“稳定用户层”。
  例如 `user summary`、`USER.md`、`human block`、`MEMORY.md` 这类“总是该带上的少量信息”。

- 更宽的记忆层通常还会继续保留。
  它负责会话历史、关系、环境、agent 经验、时间变化事实，而不只服务用户适配。

- 会话历史、长期记忆、用户画像、agent 经验，通常不是一层。

- 防污染靠的主要不是“大模型自己判断”，而是分层、生命周期、作用域和治理。

### 4.4 对 Aether 最有价值的提炼

- Aether 更不适合走“一个无边界共享池”。
- Aether 更适合走“分层真源 + 运行时强耦合”的路线。
- Aether 后面大概率需要补一层更稳定的“总是该带上的用户层”。
- Aether 还应该把 `session recall` 作为单独问题继续讨论，而不是一直混在 adaptation 或 IPK 里。

## 5. 每份文件里最值得看的内容

如果你只想抓每份文件最有价值的部分：

- `review-brief`
  看第 1 节问题轴和第 6 节一句话结论。

- `comparative-report`
  看第 0 节先给结论、第 8 节共同模式、第 12 节对 Aether 的直接回答。

- `aether-impact`
  看第 1 节可以立即吸收的实现技巧、第 2 节需要重新讨论的产品假设、第 6 节当前建议。

- `open-questions-cleanup`
  看第 2 节需要改写的问题、第 3 节新增的问题。

- `per-project-findings/*`
  每份都优先看：
  - “直接答案”
  - “问题轴判断”表
  - “对 Aether 的启发或挑战”

## 6. 如果你现在只想知道“结论到底偏哪边”

这轮复审更偏向这个答案：

- 不建议完全合并成一个系统。
- 也不建议做成两个弱耦合系统。
- 更成熟的方向是：
  - 用户自适应层保留更稳定、更谨慎、更可审计的真源；
  - 记忆系统层保留更宽的会话/环境/agent 经验/时间事实；
  - 两者在运行时由统一编排层强耦合使用。
