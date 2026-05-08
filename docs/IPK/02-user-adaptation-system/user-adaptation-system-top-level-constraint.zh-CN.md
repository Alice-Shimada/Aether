# 用户自适应系统：最高架构约束（Top-Level Constraint）

> **本文档是用户自适应系统的最顶层约束。**
>
> 它从 [user-adaptation-system-implementation-decisions.zh-CN.md](./user-adaptation-system-implementation-decisions.zh-CN.md) 的 §0.5 抽出单列，便于查看、引用与未来修改。
>
> 凡与本文档冲突的章节、文档、代码实现、提示词、UI 描述，一律以本文档为准。
>
> 后续 AI 在新增功能、重构、修 bug、写新文档前，**必须先读本文档并与之对齐**。
>
> 约束来源：**用户 2026-04-14 拍板**。

## 0. 三块架构总览

用户自适应系统由**三块相互独立、职责清晰**的区域组成：

1. **独立习惯库**（长期真源）
2. **Aether 工作区引用层**（Aether global / project / session 三层）
3. **Session 暂存区**（scratch）

这三块**不得**被混成同一层对象，也**不得**在命名、目录、类型、运行时装配上彼此渗透。

---

## 1. 第一块：独立习惯库（长期真源）

- 这是全系统**唯一**的习惯正文真源。一切关于"某个习惯写什么、在哪些 scope 成立、置信度多少、证据来自哪里"的权威答案只能从这里读。
- 习惯库内部有 `global / subject / initiative / task_scope / artifact` **五层平行 scope 标签**。
  - 它们是**平行**的，**不是树状归属关系**。
  - subject **不是** global 的子目录。
  - initiative **不挂在** project 下面。
  - artifact **不是** task_scope 的孩子。
  - 每一层是一个独立 scope 维度，描述这条习惯"适合在哪些范围被引用"。
- 工作区、repo、project、session、scratch **只能向习惯库提交证据、proposal 和引用请求**，不得在其它位置保存习惯正文真源。
- 物理落点虽然共享 `MemoryPath.adaptationRoot()` 一个根，但五层 scope 必须**各自独立为顶层子目录**（或等价的平行命名空间），**不得互相嵌套**。
- 每个习惯库 scope 内部仍可按职责拆成 `profile / policy / contract` 等对象；这是**同一 scope 内部的文件职责分工**，不是新增的第六层、第七层 scope。

## 2. 第二块：Aether 工作区引用层

- 工作区引用层有自己独立的 **`global_guidance` / `project_guidance` / `session binding` 三类工作区对象**。
  - 它们是 Aether 侧的组织单位。
  - **不是**习惯库五层的别名。
  - **不得**与之一对一混同。
  - 特别地：`project_guidance` ≠ `initiative`；工作区 `global_guidance` ≠ 习惯库 `global`。
- 工作区引用层记录只保存**轻量背景 + refs**，**不存习惯正文真源**。
  - refs 可以包含 habit id、关联理由、分块、禁用/排序和解释路径。
  - 背景部分只允许极短摘要与稳定上下文，供 session 缩小候选范围。
- `global_guidance` 与 `project_guidance` 可按 subject 分块，为 session matching 提供强参考，告诉 session 应该去习惯库哪些 scope 取回引用。
- 工作区通过 `scope matching / scope read / scope promotion` **三个机制**与习惯库交互；**不得绕过这三个机制直接改写真源**。
- 当前 v1 允许 `project_guidance` / `global_guidance` 作为 query-time 的轻量 guidance：
  - 先用这些小 profile 缩小候选范围。
  - 再去习惯库和 IPK 做更窄的检索。
  - 它们负责"先缩范围"，**不负责直接让某条习惯自动生效**。

## 3. 第三块：Session 暂存区（scratch）

- **session habit record**（工作区 session 层）是**运行时真正生效的小集合**。
- 这个集合**同时容纳两种来源**，**两支并列共存**：
  1. 从习惯库 5 层真源通过 scope matching 取回的**引用**；
  2. 本 session 新产生、尚未 confirm 的**暂存候选**（scratch habits）。
- 运行时的 policy 装配、prompt 注入、context packet 输出**必须同时考虑这两支**，不能只看一支。
- 暂存候选的生命周期：
  - **入**：session 里新被捕获。
  - **出**：要么随 session 消散、要么经 proposal → confirmed 升入习惯库某一 scope，之后下一次 session 以"引用"而非"暂存"方式生效。
- 暂存区**不是**习惯库的前置关卡，也**不是**必须先经过才能运行的通道。
  - 它是 session 运行时生效集合里和"库引用"**并列的另一支来源**。

---

## 4. 硬性约束总结（Hard Constraints）

1. **五层平行**：习惯库五层（global / subject / initiative / task_scope / artifact）必须平行，**不得形成任何树状归属**。
2. **引用层只存引用**：工作区三类对象（`global_guidance` / `project_guidance` / `session binding`）只存**轻量背景 + refs**，不存正文真源。
3. **身份独立**：工作区三层与习惯库五层**必须保持命名、身份、生命周期的独立**；**不得在代码中用同一个枚举、同一个 id、同一个目录混指两边**。
4. **session = 库引用 + 暂存**：Session 运行时生效习惯 = 库引用 + 暂存候选，**两者并列**。
5. **违反即修**：任何实现、文档、提示词、UI 描述若违反以上四条，**必须先改回本文档，再做其他工作**。

---

## 5. 权威冲突顺序

当本文档与其他文档冲突时，实现优先级（高 → 低）：

1. **本文档**（top-level-constraint）
2. `ipk-and-adaptation-storage-access-contract`
3. `user-adaptation-v1-implementation-guide`
4. `implementation-decisions`（§0.5 以外的章节）
5. `schema-v1`
6. `scope-mechanics-v1`
7. `aether-integration-v1`
8. `open-questions`
9. `details / overview / vision / profile-and-adaptation`
10. 英文稿

---

## 6. 改 adaptation 前必读 checklist

在改 `packages/opencode/src/adaptation/**`、相关前端 context、或任何 adaptation 设计文档之前，先回答四个问题：

- [ ] 我要改的结构/目录，**是否保持五层 scope 的平行关系**？（不能让 subject 嵌入 global 下，不能让 initiative 挂在 project 下，等等）
- [ ] 我要改的工作区对象（global_guidance / project_guidance / session binding），**是否只保留轻量背景 + refs**？（不能复制习惯正文真源）
- [ ] 我要改的代码或枚举，**是否让"工作区三层"与"习惯库五层"保持命名、身份、生命周期独立**？（不能让 `project_id` 直接当 initiative target，不能让 `global_guidance` 混指库 global）
- [ ] 我要改的 session 运行时集合，**是否同时容纳"库引用"和"暂存候选"两支，并让两支并列生效**？（不能把 scratch 误做成"必须先经过的前置关卡"）

任何一个回答为「否」，先改回来，再继续其他工作。

---

## 7. 来源与历史

- 用户 2026-04-14 明确拍板。
- 用户最初同时指出 `policy.ts` 的 score 和 `storage.ts` 目录存在违反"五层平行"原则的风险；其中 `storage.ts` 的 `subjects/` 嵌套问题后来确认是旧记忆，现代码已收敛为顶层平行结构。
- 原文保存在 [user-adaptation-system-implementation-decisions.zh-CN.md §0.5](./user-adaptation-system-implementation-decisions.zh-CN.md#05-三块架构--最高约束用户-2026-04-14-拍板)。
- 本独立文档由 2026-04-15 抽出单列，便于查看、引用和后续修改；当本文档与原 §0.5 文本不一致时，以本文档为准，并同步回 §0.5。
