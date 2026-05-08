# reference_project 首轮全量审阅进度

> 状态：首轮全量审阅已完成  
> 启动日期：2026-04-18  
> 审阅范围：`/home/bzz/Aether/reference_project`  
> 排除范围：
>
> - `andrej-karpathy-skills`
> - `darwin_skill`
> - `docs`

## 0. 本轮遵守的锁定要求

- 先按外部项目自己的问题意识理解，再回头写 Aether 启发。
- 用户自适应系统与记忆系统分开成文，不合并。
- 正式分析中显式区分代码证据、文档证据和推断。
- 在全部项目读完前，不回写 Aether 权威设计文档。

## 1. 项目总表

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| graphify | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| graphiti | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| hermes | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| langgraph | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| letta | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| mem0 | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| memos | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| openclaw | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| RecBole | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| recommenders | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |
| zep | 首轮正式分析已完成 | 已产出 README、代码阅读日志、用户自适应、记忆系统 |

## 2. 已完成批次

### Batch 1

- `mem0`
- `zep`
- `memos`

本批次目的：

- 先吃透三种强对比样本：
  - `mem0`：把个体偏好和 agent 经验都装进 memory layer 的产品。
  - `zep`：把 context engineering、时间图谱和 user summary 绑定起来的产品。
  - `memos`：几乎不做 agent 自适应，但把“用户自己的知识资产”做得很纯粹的产品。

### Batch 2

- `graphiti`
- `graphify`

本批次目的：

- 先把“时间图谱记忆引擎”和“项目结构图谱记忆层”拆清楚：
  - `graphiti`：把动态事实、episode 和 validity window 做成通用时间图谱。
  - `graphify`：把代码与多模态语料压成可跨会话查询的结构图，但几乎不碰用户画像。

### Batch 3

- `letta`
- `langgraph`

本批次目的：

- 先把“完整长期 agent 产品”和“底层状态编排框架”拆开看：
  - `letta`：把用户关系、core memory、recall、archival、compact、sleeptime 绑成一套 agent 产品。
  - `langgraph`：把 thread checkpoint、interrupt、store 做成底层执行与持久化原语，不直接替应用定义用户画像。

### Batch 4

- `recommenders`
- `RecBole`

本批次目的：

- 先把“推荐系统里的个性化建模”和“agent 里的用户自适应/记忆系统”严格分开：
  - `recommenders`：重在推荐场景、行为历史、排序模型和离线评估。
  - `RecBole`：重在统一数据格式、训练评估协议和多类推荐任务的 benchmark 框架。

### Batch 5

- `hermes`
- `openclaw`

本批次目的：

- 先把“长期个人 agent 的闭环学习系统”和“本地工作区驱动的个人助手系统”并排拆开看：
  - `hermes`：把 persistent memory、session search、skills、外部 memory provider 绑成长期学习闭环。
  - `openclaw`：把 workspace bootstrap files、session routing、memory plugins、active memory、dreaming 组合成个人助手长期上下文系统。

## 3. 已产出文件

### mem0

- `docs/IPK/reference_project_review/mem0/README.zh-CN.md`
- `docs/IPK/reference_project_review/mem0/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/mem0/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/mem0/memory-system.zh-CN.md`

### zep

- `docs/IPK/reference_project_review/zep/README.zh-CN.md`
- `docs/IPK/reference_project_review/zep/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/zep/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/zep/memory-system.zh-CN.md`

### graphiti

- `docs/IPK/reference_project_review/graphiti/README.zh-CN.md`
- `docs/IPK/reference_project_review/graphiti/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/graphiti/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/graphiti/memory-system.zh-CN.md`

### graphify

- `docs/IPK/reference_project_review/graphify/README.zh-CN.md`
- `docs/IPK/reference_project_review/graphify/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/graphify/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/graphify/memory-system.zh-CN.md`

### letta

- `docs/IPK/reference_project_review/letta/README.zh-CN.md`
- `docs/IPK/reference_project_review/letta/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/letta/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/letta/memory-system.zh-CN.md`

### langgraph

- `docs/IPK/reference_project_review/langgraph/README.zh-CN.md`
- `docs/IPK/reference_project_review/langgraph/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/langgraph/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/langgraph/memory-system.zh-CN.md`

### recommenders

- `docs/IPK/reference_project_review/recommenders/README.zh-CN.md`
- `docs/IPK/reference_project_review/recommenders/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/recommenders/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/recommenders/memory-system.zh-CN.md`

### RecBole

- `docs/IPK/reference_project_review/RecBole/README.zh-CN.md`
- `docs/IPK/reference_project_review/RecBole/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/RecBole/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/RecBole/memory-system.zh-CN.md`

### memos

- `docs/IPK/reference_project_review/memos/README.zh-CN.md`
- `docs/IPK/reference_project_review/memos/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/memos/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/memos/memory-system.zh-CN.md`

### hermes

- `docs/IPK/reference_project_review/hermes/README.zh-CN.md`
- `docs/IPK/reference_project_review/hermes/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/hermes/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/hermes/memory-system.zh-CN.md`

### openclaw

- `docs/IPK/reference_project_review/openclaw/README.zh-CN.md`
- `docs/IPK/reference_project_review/openclaw/code-reading-log.zh-CN.md`
- `docs/IPK/reference_project_review/openclaw/user-adaptation-system.zh-CN.md`
- `docs/IPK/reference_project_review/openclaw/memory-system.zh-CN.md`

### cross-project synthesis

- `docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md`

## 4. 当前阶段性结论

- `mem0` 倾向把“用户自适应”直接做成 memory layer 的一个自然结果，而不是独立用户画像系统。
- `zep` 倾向把“总是该带上的用户事实”做成单独的 user summary contract，再叠加时间图谱和关系检索。
- `memos` 强烈提醒我们：不是所有“记忆”产品都需要自动用户自适应；很多时候用户要的是自己可控、可审计、可迁移的知识资产。
- `graphiti` 说明“动态事实的时间失效、episode 真源、group 分区”可以成为记忆系统的骨架，而不只是一种高级优化。
- `graphify` 说明“项目/语料结构记忆”与“用户自适应记忆”是两类不同系统，不能混成一个讨论。
- `letta` 说明很多成熟 agent 产品会把用户自适应直接做进 memory hierarchy，尤其是“常驻核心区 + 可检索长期区”的组合。
- `langgraph` 说明 thread 内状态、跨 thread 长期数据、当前 run 依赖最好从一开始就分层，而不是都叫 memory。
- `recommenders` 说明推荐系统里的“用户自适应”通常是统计排序问题，而不是显式用户记忆管理问题。
- `RecBole` 说明长期偏好、短期序列、上下文和知识增强最好分型建模，而不是假设一层用户画像就够。
- `hermes` 说明长期个人 agent 往往会把用户记忆、历史会话回忆、技能沉淀一起做成闭环，而不是只做一个 memory store。
- `openclaw` 说明显式工作区真源、session 隔离、主动 recall 与 dreaming 可以共存，而且它们分别解决不同问题。

跨项目最终结论已另写到 `cross-project-synthesis.zh-CN.md`，这里保留阶段记录。

## 5. 下一批建议顺序

1. 首轮已完成，下一步应进入第二轮专题调研，而不是继续扫项目

## 6. 仍未执行的后续项

- 不要立刻回写 Aether 权威设计文档。
- 基于 `cross-project-synthesis.zh-CN.md` 选择第二轮专题问题。
- 第二轮稳定后，才考虑回写 Aether 权威设计文档。
