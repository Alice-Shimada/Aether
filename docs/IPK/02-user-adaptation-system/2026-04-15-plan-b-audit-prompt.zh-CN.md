# Plan B 架构对齐审查 Prompt

把下面整段复制到另一个聊天框，要求对方 AI 只审查、不修改：

```md
你是独立审查者。请对 /home/bzz/Aether 仓库下的用户自适应系统做一次“Plan B 命名与目录拆分”架构对齐审查。你的任务是审查，不是改动；即便发现问题，也只报告，不要修。

## 背景

用户自适应系统有一个最高架构约束文档：

- docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md

核心是三块架构：

1. 独立习惯库（长期真源）
   - 五个平行 scope：`global / subject / initiative / task_scope / artifact`
   - 五层必须平行，不得形成树状归属
2. Aether 工作区引用层
   - 三类工作区对象：`global_guidance / project_guidance / session binding`
   - 只存轻量背景 + refs，不存习惯正文真源
3. Session 暂存区（scratch）
   - session 运行时生效集合 = 习惯库引用 + scratch 暂存候选

本次 Plan B 已拍板的关键点：

- 工作区对象统一改名：
  - `global_profile -> global_guidance`
  - `project_profile -> project_guidance`
- 工作区 guidance 与习惯库五层必须目录隔离
- 当前目录约束应为：
  - 工作区 guidance：`adaptation/workspace/global-guidance.json`
  - 工作区 guidance：`adaptation/workspace/projects/<project_id>/project-guidance.json`
  - session binding：`adaptation/bindings/sessions/<session_id>.json`
  - session scratch / session review proposal：`adaptation/bindings/sessions/<session_id>/...`
  - 习惯库真源：`adaptation/global/`、`subjects/`、`initiatives/`、`task-scopes/`、`artifacts/`
- `project_guidance` / `global_guidance` 只能作为 query-time guidance / refs，不是 imported active habit 的真源
- `artifact` 是否与其他四层完全同构仍未最终拍板；这次审查不要把它当成必须完成项，但要检查当前文档是否清楚写出它的特殊性或未决性

## 本次重点审查范围

代码重点：

- packages/opencode/src/adaptation/storage.ts
- packages/opencode/src/adaptation/profile.ts
- packages/opencode/src/adaptation/types.ts
- packages/opencode/src/adaptation/proposal.ts
- packages/opencode/src/adaptation/scratch.ts
- packages/opencode/src/context/compile.ts
- packages/opencode/src/server/routes/adaptation.ts
- packages/opencode/src/adaptation/render.ts
- packages/opencode/src/adaptation/index.ts
- packages/opencode/src/adaptation/indexes.ts
- packages/opencode/src/task-scope/storage.ts
- packages/opencode/src/task-scope/matcher.ts
- packages/opencode/src/artifact/storage.ts

文档重点：

- docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-details.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-details.en.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md
- docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/01-phase-1-storage-and-types.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/05-phase-5-proposal-inbox-and-promotion.zh-CN.md
- docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md

## 审查清单

请逐项给出“通过 / 不通过 + 证据”。

### A. 五层平行

- A1. `MemoryPath.adaptationRoot()` 下的 `global / subjects / initiatives / task-scopes / artifacts` 是否全部顶层平行？
- A2. 代码 helper 是否存在并列的 `globalRoot / subjectsRoot / initiativesRoot / taskScopesRoot / artifactsRoot`？
- A3. 文档中的目录树是否也保持五层平行，没有把 `subject` 嵌进 `global` 或把 `initiative` 挂到 `project` 下？

### B. 工作区 guidance 与习惯库真源隔离

- B1. `global_guidance` 是否位于 `adaptation/workspace/global-guidance.json`，不与库 global policy 共目录？
- B2. `project_guidance` 是否位于 `adaptation/workspace/projects/<project_id>/project-guidance.json`？
- B3. 代码中关于 guidance 的 helper、schema、调用方是否都已统一成 `GlobalGuidance / ProjectGuidance`？
- B4. 代码里是否还残留 `global_profile / project_profile / GlobalProfile / ProjectProfile`？
- B5. 文档里是否还把 `global_guidance / project_guidance` 误写成习惯库五层之一？

### C. Session 运行时层隔离

- C1. `session binding` 是否位于 `adaptation/bindings/sessions/<session_id>.json`？
- C2. session review proposal 是否位于 `adaptation/bindings/sessions/<session_id>/proposals/<status>/`？
- C3. scratch 真源是否位于 `adaptation/bindings/sessions/<session_id>/scratch-habits.json` 与 `scratch-conflicts.json`？
- C4. 代码里如果保留了对旧路径 `projects/<project_id>/sessions/...` 的兼容读取，请说明这是兼容逻辑，而不是当前权威落点。

### D. Guidance 不是 imported habits 真源

- D1. `project_guidance / global_guidance` 是否只参与 query-time guidance / matching / 缩圈？
- D2. imported active habits 是否仍然来自习惯库正式真源 + session binding 的 `habit_ids`，而不是直接来自 guidance 文件？
- D3. 当前习惯 UI / 当前 session 上下文的描述，是否只保留两类来源：
  - 正式习惯库中已被当前 session 引用的 imported habits
  - 当前 session scratch 区中的 active scratch habits

### E. 文档一致性

- E1. priority / authority 列表是否都把 `user-adaptation-system-top-level-constraint.zh-CN.md` 放在最高位？
- E2. 中文 / 英文成对文档是否都改成 `global_guidance / project_guidance` 口径？
- E3. `details / implementation-decisions / scope-mechanics / implementation-guide / storage-access-contract` 对目录和命名是否一致？

### F. 仍需注意但不作为本次必挂项

- F1. `ScopeLevel` 若仍包含 `session`，请判断它是“运行时 scope”用途还是“误把 session 当库 scope”；只要文档明确 session 非库 scope、且 `global_guidance / project_guidance` 没有进入这个 enum，就不必直接判失败。
- F2. `artifact` 若仍表现出与其他四层不同的实现方式，请说明当前文档是否已经清楚表达其特殊性 / 未决性。

### G. 全仓残留扫描

请全仓 grep 并列出任何残留：

- `global_profile`
- `project_profile`
- `GlobalProfile`
- `ProjectProfile`
- `workspace/projects/<project_id>/sessions/<session_id>/proposals`
- `adaptation/projects/<project_id>/`

## 输出格式

请严格用下面结构输出：

## 审查结论

- 通过项：[A1, A2, ...]
- 不通过项：
  - [条目编号] [一句话描述问题]
    - 证据：file:line
    - 建议：如何修
- 全仓残留扫描结果：
  - global_profile: [file:line 列表]
  - project_profile: [file:line 列表]
  - GlobalProfile / ProjectProfile: [file:line 列表]
  - 旧 session proposal 路径: [file:line 列表]
  - 其他：...
- 总体判断：[对齐完整 / 有遗漏 / 有概念风险]

不要改代码，不要改文档。只审查。
```
