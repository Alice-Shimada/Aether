# 用户自适应系统与记忆系统边界：问题驱动批量复审

> 状态：已完成  
> 启动日期：2026-04-18  
> 输出目录：`docs/IPK/reference_project_review/question_reviews/2026-04-18-user-adaptation-memory-boundary/`  
> 项目范围：`/home/bzz/Aether/reference_project`

## 0. 用户问题

原始问题：

> 我现在不知道用户自适应系统和记忆系统是否应该合并为一个系统。如果不合并为一个系统，那么两个系统的耦合应该有多强。因为我觉得这俩系统是强关联的，其实都是从用户的发言和对话中抽取信息，但是两个系统又有一些不同，因为用户自适应系统一般只关注用户信息，记忆系统还要关注 AI 输出的信息。同时用户自适应系统更注重更改 AI 的行为和说话方式。但是从更大的理论来说，习惯其实也是一种记忆，只是抽取了记忆中可以用于用户习惯的部分。所以我有一点不清楚。而我希望参考这些项目的做法，以及他们的做法反映出的他们对这个问题的看法。

本次审阅主题：

> 外部项目是把“用户自适应”当作“记忆系统”的一部分，还是把二者拆成不同层；如果拆开，它们之间靠什么接口耦合。

## 1. 问题轴

| 轴 | 要判断什么 | 为什么重要 |
| --- | --- | --- |
| 1 | 项目是否在概念上显式区分“用户自适应数据”和“通用记忆数据” | 这是“合并为一个系统”还是“拆成两个系统”的第一层证据。 |
| 2 | 用户偏好、习惯、长期画像是否直接作为 memory 保存 | 这决定“习惯只是记忆的一部分”在产品里是否被直接采纳。 |
| 3 | 记忆写入时是否同时吸收用户发言与 AI 输出 | 这对应你关心的一个关键差异：用户自适应更偏用户侧，记忆系统常常会收进更宽的对话材料。 |
| 4 | 记忆检索结果是直接改写 agent 行为，还是只提供事实性上下文 | 这决定二者耦合强度到底是“共用存储”还是“共用行为控制入口”。 |
| 5 | 项目是否单独提供 profile / summary / persona 这样的稳定用户层 | 即使底层共用存储，很多系统仍会抽出一层“总是该带上的用户信息”。 |
| 6 | 项目如何防止记忆污染用户自适应，或防止错误画像长期影响行为 | 失败模式决定 Aether 是否应该把两者隔离、分层或增加审计。 |
| 7 | 删除、纠正、审计能力是按一套数据走，还是按两类数据分别管理 | 如果治理方式不同，通常意味着系统边界不该完全合并。 |

## 2. 项目范围

| 项目 | 路径 | 状态 | 备注 |
| --- | --- | --- | --- |
| graphify | `reference_project/graphify` | 已完成 | 项目知识图反例，说明“记忆”不总是用户记忆 |
| graphiti | `reference_project/graphiti` | 已完成 | 支持“偏好属于时间化记忆”，但缺少独立行为层 |
| hermes | `reference_project/hermes` | 已完成 | 强耦合分层样本：`USER.md`、general memory、session recall、provider |
| langgraph | `reference_project/langgraph` | 已完成 | 基础设施样本：强调状态/持久化分层，不替应用拍板用户画像 |
| letta | `reference_project/letta` | 已完成 | 统一 memory hierarchy 样本：behavior layer 与 recall layer 共存 |
| mem0 | `reference_project/mem0` | 已完成 | 统一 memory substrate 样本：靠 scope/type 而非双系统维持边界 |
| memos | `reference_project/memos` | 已完成 | 用户知识资产反例：不支持自动适配即是高价值结论 |
| openclaw | `reference_project/openclaw` | 已完成 | 多层强耦合样本：真源、检索、active memory、Honcho |
| RecBole | `reference_project/RecBole` | 已完成 | 建模反例：长期偏好/短期序列/上下文应分型处理 |
| recommenders | `reference_project/recommenders` | 已完成 | 建模反例：个性化不等于显式记忆系统 |
| zep | `reference_project/zep` | 已完成 | `thread + graph + user summary` 分层样本 |

排除项：

- `reference_project/andrej-karpathy-skills`
- `reference_project/darwin_skill`
- `reference_project/docs`

项目扫描结论：

- 本次扫描出的默认范围与首轮全量审阅一致。
- 未发现新增项目。
- 未发现首轮项目缺失。

## 3. 判断标准

每个项目都必须给出下列四种之一：

- `有证据`：在代码或文档里找到直接支持本问题轴判断的材料。
- `无证据`：项目里没有找到相关机制，且项目定位本身也不把这件事当重点。
- `反证`：项目的实现或文档明确指向相反做法。
- `仍不确定`：找到了一些相关线索，但证据不足以下强判断。

## 4. 当前进度

- 已完成：工作流确认、项目清单扫描、问题轴固化、11 个项目定向补读。
- 已完成：跨项目比较、Aether 影响分析、open questions 清理。
- 本轮未做：不提前改写 Aether 权威架构文档，只给出影响与后续问题。

## 5. 预期输出

- `per-project-findings/<project>.zh-CN.md`：每项目定向判断与证据。
- `comparative-report.zh-CN.md`：按问题轴组织的跨项目比较。
- `aether-impact.zh-CN.md`：哪些外部模式可吸收、需讨论、需实验。
- `open-questions-cleanup.zh-CN.md`：本轮是否解决、改写或新增 Aether 相关 open questions。

## 6. 本轮一句话结论

外部项目整体不支持“把用户自适应系统和记忆系统完全当成同一层对象”，但也很少支持“二者彻底解耦”。更常见的成熟做法是：

- 底层强关联；
- 中层明确分层；
- 行为控制层只带少量稳定用户信息；
- 更宽的记忆层继续保存会话、关系、环境、agent 经验与时间变化事实。
