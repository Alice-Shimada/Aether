# 用户自适应系统：2026-04-16 `project-suppression` 删除清单

这份清单用于收敛当前关于 `project-suppression` 的讨论结果。

这份清单最初用于删除前收敛范围；现在可作为“本次删除已覆盖哪些面”的执行记录。

目的包括：

- 为什么它在当前体系里已经接近冗余
- 如果删除，哪些职责需要转移给 `project_guidance / global_guidance`
- 真正动手删除时，代码、UI、接口、文档要一起改哪些地方

## 1. 当前讨论结论

### 1.1 为什么它现在变得多余

当前已明确的运行时模型是：

- 当前 session 真正生效的习惯集合 = `imported active habits + scratch active habits`
- imported 分支以当前 session 的 `habit_ids` 为准
- 当前不会以 project 作为独立生效裁决层

在这个前提下，`project-suppression` 原本承担的两项作用：

1. 真源保留，但当前 project 不使用
2. 拦截同类候选在当前 project 里反复进入

都已经失去核心地位：

- 第 1 项不再自然成立，因为现在所有显式引用都是以 session 为基础，而不是以 project 为基础
- 第 2 项更适合转由 `project_guidance / global_guidance` 的维护机制解决，而不是继续保留一个 project-local negative filter

### 1.2 删除后应由什么承接

当前倾向是：

- `project_guidance` 负责维护当前 project 的轻量背景、稳定 refs、重复出现的高置信缩圈线索
- `global_guidance` 负责维护跨 project、跨任务稳定成立的更保守 guidance
- 重复候选问题不再通过 `project-suppression` 的“禁用规则”解决，而改由 guidance 沉淀与 routing 参考解决

更具体地说，后续应逐步收敛成：

- 重复出现的 `subject_ids / task_scope_refs / artifact_refs` 写入 guidance refs
- 高频重复、且有显式确认支持的稳定背景，才允许进入 `project_guidance.summary / stable_context`
- `global_guidance` 更新继续保持最保守策略，只允许在更强确认下写入

## 2. 当前程序里 `project-suppression` 还在做什么

如果未来确认删除，目前需要一起移除或改写的行为主要有三类：

### 2.1 query-time compile 过滤

当前 compiler 还会：

- 读取 `project-suppression.json`
- 把命中的正式习惯从本轮 context packet 里省略
- 记录 `omitted by project suppression`

删除后应改成：

- 不再依赖 project-local suppression 过滤正式习惯
- imported habits 是否进入当前上下文，只取决于 session 的实际挂载与当前文档口径

### 2.2 proposal merge 候选拦截

当前 proposal merge 还会：

- 在候选合并前读取 `project-suppression`
- 跳过与 suppression 规则相似的候选

删除后应改成：

- 不再使用 suppression 作为 proposal skip gate
- 重复候选去重与降噪，改由 proposal merge 自身、guidance 维护策略、以及后续 routing 设计承担

### 2.3 UI 的 project-local disable 动作

当前 UI 里仍存在：

- `suppress-project` 按钮
- `POST /adaptation/habits/suppress-project` 路由
- “当前已被本项目 suppression 命中”的状态展示

如果删除 `project-suppression`，这些都应一并删除，不应留下空动作或过时文案。

## 3. 删除时需要同步转移给 guidance 的职责

这部分是删除后最容易遗漏的地方。

### 3.1 `project_guidance` 至少要承担的职责

- 当前 project 的稳定一句话背景
- 跨 task_scope 成立的极短背景上下文
- `subject_ids`
- `task_scope_refs`
- `artifact_refs`
- `ipk_piece_refs`
- 对“这个 project 里高频重复出现的线索”进行保守沉淀

### 3.2 `global_guidance` 至少要继续承担的职责

- 跨 project 稳定成立的轻量背景
- 更保守的 `subject_ids / task_scope_refs / artifact_refs / ipk_piece_refs`
- 只作为 query-time guidance / 缩圈参考

### 3.3 当前还没有完全设计清楚的部分

这也是为什么这次先出清单、不直接删代码：

- guidance 的更新触发条件是否已经足够清楚
- “重复出现”如何变成可写入 guidance 的高置信依据
- `project_guidance.summary / stable_context` 是否允许自动沉淀，还是仍然必须逐条 proposal 确认
- `global_guidance` 是否只允许显式确认写入，还是允许少量更自动的 refs 更新

## 4. 真正删除时必须一起改的代码面

### 4.1 后端

- `packages/opencode/src/adaptation/habit.ts`
- `packages/opencode/src/context/compile.ts`
- `packages/opencode/src/adaptation/proposal.ts`
- `packages/opencode/src/adaptation/index.ts`
- `packages/opencode/src/server/routes/adaptation.ts`
- `packages/opencode/src/adaptation/types.ts`
- 以及任何依赖 `suppressed / suppress_reason / project_suppressed` 的调用方

### 4.2 前端

- `packages/app/src/components/adaptation-current-context-dialog.tsx`
- `packages/app/src/context/adaptation.tsx`
- 任何显示 “suppressed” / “suppress-project” 的视图与状态

### 4.3 SDK / contract

- 生成出来的 SDK endpoint 类型
- API contract 文档
- UI review / integration 文档中的操作说明

## 5. 真正删除时必须同步修改的文档面

- `user-adaptation-system-implementation-decisions.zh-CN.md`
- `user-adaptation-system-schema-v1.md`
- `user-adaptation-system-scope-mechanics-v1.zh-CN.md`
- `user-adaptation-system-details.zh-CN.md`
- `user-adaptation-system-details.en.md`
- `user-adaptation-system-aether-integration-v1.md`
- `user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md`
- `user-adaptation-v1-implementation-guide/03-phase-3-scope-read-and-context-packet.zh-CN.md`
- `user-adaptation-v1-implementation-guide/05-phase-5-proposal-inbox-and-promotion.zh-CN.md`
- `user-adaptation-v1-implementation-guide/06-phase-6-ui-and-user-review.zh-CN.md`
- `ipk-and-adaptation-storage-access-contract.zh-CN.md`

## 6. 删除后应保持的替代口径

如果后续正式拍板删除 `project-suppression`，应统一改成下面这套表述：

- 当前 session 真正生效的仍然只有 `imported active habits + scratch active habits`
- project 不再承担“局部禁用正式习惯”的独立职责
- `project_guidance / global_guidance` 只承担轻量背景 + refs + 缩圈 guidance
- 重复候选的降噪与沉淀，不再通过 project-local suppression 处理，而改由 guidance 维护策略、proposal merge 和后续 routing 机制承担

## 7. 当前执行状态

当前已进入并完成的执行方向：

1. 已拍板：`project-suppression` 从 v1 删除
2. 已同步：后端、前端、路由、SDK、文档一起移除 `project-suppression`
3. 已转移：重复候选降噪职责改写到 guidance 维护、proposal merge 和后续 routing 机制
4. 后续仍需继续检查：当前 UI 中“已引用正式习惯”“proposal 去重”“guidance 缩圈”三条链是否仍然完全自洽
