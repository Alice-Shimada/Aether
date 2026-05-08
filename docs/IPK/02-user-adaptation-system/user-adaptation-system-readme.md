# 用户自适应系统

这个文件夹讨论的，是一套独立但会和 `IPK` 内容系统协作的长期用户与任务适配系统。

它关心的不是“保存了哪些知识内容”，而是：

- AI 应该怎样长期理解这个用户
- AI 应该怎样理解这个用户在不同学科里的知识坐标
- AI 应该怎样理解某个具体任务当前做到哪里了
- AI 应该怎样理解用户的工作习惯、记录习惯与工具使用习惯
- AI 应该怎样把这种理解真正带入未来回答、总结、文件写入和实际操作

这里仍然不讨论 `piece`、内容库、地图、入库流程和内容存储本身。  
那套系统仍然独立在：

- [ipk-content-system-readme.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-readme.md)

## 当前文档结构

- [ipk-terms-glossary.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-terms-glossary.zh-CN.md)
  统一术语表。第一次阅读 `overview` 或专题稿时，建议先配合它一起看。

- [user-adaptation-system-top-level-constraint.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md)
  **最高架构约束**：三块架构（独立习惯库 / Aether 工作区引用层 / Session 暂存区）与五层平行 scope 原则。改 adaptation 前必读；与其它文档冲突时以它为准。

- [user-adaptation-system-overview.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md)
  面向中文讲解的展示版总览，适合直接拿去给别人介绍项目。
- [user-adaptation-system-overview.en.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.en.md)
  面向英文讲解的展示版总览。
- [user-adaptation-system-details.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-details.zh-CN.md)
  中文细节总稿，系统的完整逻辑、作用域、存储、更新和集成都在这里。
- [user-adaptation-system-details.en.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-details.en.md)
  英文细节总稿。
- [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
  当前已经比较明确、会影响工程实现的决策记录。实现时若和较早讲解稿冲突，应优先遵守这里。
- [user-adaptation-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md)
  当前未拍板问题、vNext 方向和待调研事项。用于避免新 AI 把未定问题误当成实现约束。
- [user-adaptation-system-dual-track-roadmap.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-dual-track-roadmap.zh-CN.md)
  双线推进路线文档。把“短期以 Hermes 风格骨架做第一版应用、长期继续发展 Aether 结构化新系统”的建议收成一份清晰路线，适合产品与架构讨论时快速对齐。
- [user-adaptation-system-navigation-map.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-navigation-map.zh-CN.md)
  面向 Codex 的快速导航地图。改用户自适应系统前先用它判断应读哪些文档和代码，避免全仓库乱扫。
- [user-adaptation-system-module-contracts.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-module-contracts.zh-CN.md)
  模块契约说明。记录后端、运行时、API 与前端之间的输入输出、上下游和不能擅自改变的行为。
- [user-adaptation-system-change-impact-checklist.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-change-impact-checklist.zh-CN.md)
  非局部修改前的影响分析检查表。用于列出直接文件、间接受影响文件、用户可见行为、风险和验证命令。
- [../reference_project_review/README.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/README.zh-CN.md)
  `reference_project` 外部项目审阅区。它横跨 IPK 内容库、记忆系统和用户自适应系统；如果只关注用户画像 / memory / persona / workflow，也从这里进入。
- [user-adaptation-v1-implementation-guide/README.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/README.zh-CN.md)
  用户自适应系统 v1 的正式分步实施指南。新的 AI 应优先按该文件夹中的 `00 -> 07` 阶段顺序实现。
- [user-adaptation-session-scratch-habits-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md)
  当前已落地的 session 暂存习惯设计与后续扩展文档。它解释 imported habits 与 scratch habits 的双层模型，以及 scratch 入库、查重、冲突和 UI 改造规则。
- [new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md)
  从用户新发言中提取习惯、与正式习惯引用和 session scratch 对比、合并、替换、冲突弹窗审阅的最新设计草案。
- [new_habits_get/session-scratch-merge-implementation-handoff-prompt.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-implementation-handoff-prompt.zh-CN.md)
  可以直接发给新 AI 的实现 prompt，要求它阅读对应文件并落地本轮已拍板的新习惯提取与 session scratch 合并系统。
- [user-adaptation-system-vision.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-vision.md)
  愿景、核心原则与为什么这样设计。
- [user-adaptation-system-profile-and-adaptation.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-profile-and-adaptation.md)
  适配层本身的对象边界：`signals`、`summaries`、`proposals`、`profile`、`policy`。
- [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)
  当前推荐的本地记录对象与 schema 草案。
- [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)
  `scope matching`、`scope read`、`scope promotion` 三个核心机制的集中说明，包括触发时机、路径、prompt contract、确认规则和 UI 边界。
- [user-adaptation-system-implementation-readiness-review-2026-04-12.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-readiness-review-2026-04-12.zh-CN.md)
  正式生成分步实施指南前的实现可交接性复核。该文件主要保留为历史复核记录，实际实施以 `user-adaptation-v1-implementation-guide/` 为准。
- [user-adaptation-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-aether-integration-v1.md)
  这套系统如何嵌入 Aether，哪些现有结构可复用，哪些地方应重构。

## 当前版本的一句话说明

这套系统不再只是一层“用户偏好记录”。

它已经发展成一套由 AI 自己维护、默认本地私有、分层作用域明确的长期上下文系统。  
它会逐渐形成：

- 对用户全局风格的理解
- 对用户在不同学科中的知识坐标的理解
- 对某个具体任务当前状态的理解
- 对某个具体产物应该如何写和如何更新的理解
- 对用户在这个任务里如何工作与调用资源的理解
- 对局部习惯何时应该提升到 `task_scope`、`initiative`、`subject` 或 `global` 层的可审阅判断

然后把这种理解编译成未来回答和执行时真正会被使用的上下文。
