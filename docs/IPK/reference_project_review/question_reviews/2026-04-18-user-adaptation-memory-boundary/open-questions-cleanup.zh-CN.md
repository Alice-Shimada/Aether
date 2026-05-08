# 用户自适应系统与记忆系统边界：Open Questions 清理

> 状态：已追加讨论更新  
> 追加结论来源：[habit-library-as-bounded-memory-subsystem.zh-CN.md](./habit-library-as-bounded-memory-subsystem.zh-CN.md)

## 0. 本轮原则

- 只有当本轮跨项目证据足够稳定时，才建议改写现有 open questions 或权威设计文档。
- 本轮复审已经足够稳定地支持“强耦合分层”这一路线，但还不足以直接改写 Aether 最高约束文档。

## 1. 已解决或原则上收敛的问题

- 长期习惯库和普通记忆的总体关系已经原则上收敛：长期习惯库可以属于长期记忆体系，但必须是有明显边界、强治理、随时 ready 的行为控制子系统。
- 普通记忆是否可以影响回答已经原则上收敛：可以影响，但不一定进入长期习惯库；更常见路径是先形成当前状态摘要或候选证据，再经过长期稳定/用户确认后沉淀为长期习惯库条目或稳定用户画像。
- assistant 输出是否可以进入长期系统已经原则上收敛：可以进入普通记忆、session summary、task memory 或被引用材料；但不能单独作为长期正式习惯证据，除非有用户确认、认可、修正或明确引用。
- 用户要求依赖外部文件时的处理原则已经收敛：习惯保存“行为规则”，文件/IPK/artifact 保存“内容真源”，运行时由 context compiler 按引用读取。
- 短期习惯和长期习惯库的边界已经原则上收敛：当前 session 或当前任务的临时要求可以先进入 scratch 并立即生效，但不自动升级为长期习惯库条目。

说明：

- 上述是产品和架构原则层面的收敛。
- 具体 schema、UI、触发阈值、scratch promotion、USER.md 视图和 session recall 落点仍需后续实现设计。

## 2. 需要改写的问题

- `docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md` 中与“程序性技能层是否独立”相关的问题。
  改写建议：不要再只问“要不要独立 skill layer”，还要补上“稳定用户层”和“更宽记忆层”是否要分开治理。
- 同一文档里所有把“用户自适应 vs 记忆系统”当成单一模糊话题的地方。
  改写建议：改成“稳定用户层、通用记忆层、session recall、程序性技能层之间如何分层与编排”。

## 3. 新增的问题

- Aether 的“总是该带上的稳定用户层”应如何落地：是 `USER.md` 视图、编译后的 profile packet，还是两者并存。
- assistant 输出进入未来通用记忆层的具体白名单、黑名单、schema 和清理策略。
- session recall 是否应该作为 adaptation / IPK 之外的独立层继续设计。
- 未来通用记忆层的具体落点：应新增哪些平行 namespace，哪些内容只在运行时组合，不进入 adaptation 真源。
- 普通记忆到当前状态摘要/候选证据、再到长期习惯候选、长期习惯库或稳定用户画像的 pipeline 应如何设计，包括何时自动生成候选、何时要求用户确认、何时只作为本轮背景使用。
- 带外部引用的习惯应如何建模，例如“用某文件中的符号系统回答 QFT 问题”这类规则的文件引用、摘要缓存和失效处理。
- 短期习惯/scratch 到长期习惯库的 promotion 应如何设计，包括重复次数、用户确认、冲突遮蔽、退出机制和 UI 展示。

## 4. 保持不变的问题

- `三块架构` 最高约束保持不变。
- `v1 自动提取快链路主要看用户消息` 的实现边界保持不变。
- `程序性技能层要不要独立` 继续保留为开放问题，但其优先级提高。

## 5. 本轮是否回写权威文档

- `否`

原因：

- 当前追加讨论已经沉淀为专题结论文档，但还没有进入具体实现设计。
- 更稳的做法是先把 [habit-library-as-bounded-memory-subsystem.zh-CN.md](./habit-library-as-bounded-memory-subsystem.zh-CN.md) 作为下一轮 implementation guide 或 schema 讨论入口，再决定是否正式回写 `implementation-decisions`。
