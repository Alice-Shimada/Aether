# reference_project 首轮审阅总览

> 状态：已完成  
> 对应批次：`2026-04-18` 首轮全量审阅  
> 范围：`/home/bzz/Aether/reference_project`（排除 `andrej-karpathy-skills`、`darwin_skill`、`docs`）

## 0. 这份文档是干什么的

这是一份简略导航页，回答三件事：

1. 这轮到底审阅了哪些项目。  
2. 生成出来的各类文件分别是干什么的。  
3. 从所有项目里提炼出来的最重要结论是什么。

如果你只想先抓全貌，先读这份；再按需要跳到进度、单项目分析或跨项目综合。

## 1. 已审阅项目清单

本轮已完成 11 个项目：

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

## 2. 当前最值得先看的文档

### 2.1 如果你想先知道“整体做了什么”

- [round-1-progress.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/round-1-progress.zh-CN.md)  
  进度台账。告诉你每个项目是否完成、批次怎么分、都产出了什么。

- [cross-project-synthesis.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md)  
  跨项目综合结论。告诉你这一轮读下来，对 Aether 最重要的挑战和启发是什么。

### 2.2 如果你想先快速认识某个项目

每个项目先读它自己的：

- `README.zh-CN.md`：一句话定位、核心概念、主流程、优点和顾虑
- `code-reading-log.zh-CN.md`：我读了哪些文档和代码，确认了哪些主链路
- `user-adaptation-system.zh-CN.md`：专门看用户自适应
- `memory-system.zh-CN.md`：专门看记忆系统

## 3. 每类文件分别是什么

| 文件 | 作用 | 适合什么时候读 |
| --- | --- | --- |
| `round-1-overview.zh-CN.md` | 这份总览导航页 | 想先抓全貌时 |
| `round-1-progress.zh-CN.md` | 首轮台账，列出项目、批次、产物、阶段结论 | 想知道“都做完没有、做到了哪一步”时 |
| `cross-project-synthesis.zh-CN.md` | 把全部项目放在一起后的综合判断 | 想知道“对 Aether 有什么真正重要的启发”时 |
| `<project>/README.zh-CN.md` | 某个项目的简短介绍页 | 想先粗看某个项目时 |
| `<project>/code-reading-log.zh-CN.md` | 某个项目的阅读证据与入口文件记录 | 想知道结论是从哪里来的时 |
| `<project>/user-adaptation-system.zh-CN.md` | 某个项目的用户自适应正式分析 | 想专门看用户画像/偏好/适配流程时 |
| `<project>/memory-system.zh-CN.md` | 某个项目的记忆系统正式分析 | 想专门看写入、检索、压缩、删除、长期化时 |

## 4. 单项目里最重要的东西，压缩版合集

| 项目 | 一句话看法 | 最重要的提炼 |
| --- | --- | --- |
| `mem0` | 用户适配几乎直接长在 memory layer 上 | 它提醒我们：用户画像完全可以作为 scoped memory 自然出现 |
| `zep` | 把“总该知道的用户事实”和“时间图谱”组合起来 | user summary 常驻，图谱按需召回 |
| `memos` | 更像用户知识资产库，不是自动适配系统 | 说明记忆不一定要自动学习用户 |
| `graphiti` | 时间感很强的动态图谱记忆引擎 | 事实有效期、episode 真源、失效机制很关键 |
| `graphify` | 项目/语料结构记忆层，不太碰用户画像 | 项目记忆和用户记忆是两类不同系统 |
| `letta` | 完整长期 agent 产品 | 常驻核心记忆区 + 可检索长期区的组合非常成熟 |
| `langgraph` | durable execution 和 state persistence 基础设施 | 当前线程状态、跨线程长期数据、当前 run 依赖应明确分层 |
| `recommenders` | 推荐系统工具箱 | 个性化可以主要是统计建模，不一定是显式记忆 |
| `RecBole` | 统一推荐 benchmark 框架 | 长期偏好、短期序列、上下文、知识增强最好分型建模 |
| `hermes` | 长期个人 agent 的闭环学习系统 | 用户记忆、历史回忆、技能沉淀三条线一起构成长期适配 |
| `openclaw` | 本地工作区驱动的个人助手系统 | 显式真源、session 隔离、主动 recall、dreaming 可以并存 |

## 5. 跨项目最重要的结论合集

这一轮最值得记住的，不超过 8 条：

1. 用户自适应和记忆系统强相关，但不等价。  
2. 成熟项目普遍会区分“常驻核心事实”和“按需召回历史”。  
3. 当前会话历史、长期记忆、执行状态，通常不是一层东西。  
4. 真源和检索索引必须分开想。  
5. 时间性很关键，很多记忆错误其实是时间建模错误。  
6. 主动 recall 正在变成独立层，而不是完全靠模型自己想起来。  
7. 显式、可编辑的长期真源并不会天然削弱系统能力。  
8. 推荐系统视角提醒我们：个性化不一定非要长成显式 memory。

## 6. 如果你现在只想按最省力路线读

建议顺序：

1. [round-1-overview.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/round-1-overview.zh-CN.md)  
2. [round-1-progress.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/round-1-progress.zh-CN.md)  
3. [cross-project-synthesis.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md)  
4. 然后再挑你最关心的项目，先看它的 `README.zh-CN.md`，再看两份正式分析。

## 7. 现在还没有放进这份总览的内容

这份文档故意不展开：

- 各项目的详细代码证据表
- 更细的 Aether 架构挑战
- 第二轮专题审阅的问题分解

这些内容都还在各项目正式分析和跨项目综合里。
