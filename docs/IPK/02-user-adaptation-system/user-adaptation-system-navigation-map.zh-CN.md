# 用户自适应系统导航地图

日期：2026-04-17  
用途：让后续 Codex 在修改用户自适应系统时，先用较少阅读量找到正确文档和代码入口。

## 0. 怎么使用这份地图

这份文档不是总览稿，也不是实现细节长文。它的作用是回答：

> “我要改某个行为时，先读哪里？哪些文件一定要一起检查？哪些文件暂时不用读？”

推荐顺序：

1. 先读本文，找到任务入口。
2. 再读 [user-adaptation-system-top-level-constraint.zh-CN.md](./user-adaptation-system-top-level-constraint.zh-CN.md)，确认没有违反最高架构约束。
3. 再按下面表格读取对应文档和代码。
4. 如果要改代码，再读 [user-adaptation-system-module-contracts.zh-CN.md](./user-adaptation-system-module-contracts.zh-CN.md) 和 [user-adaptation-system-change-impact-checklist.zh-CN.md](./user-adaptation-system-change-impact-checklist.zh-CN.md)。
5. 进入代码目录后，先读对应代码侧导航：
   - [packages/opencode/src/adaptation/README_adaptation.md](/home/bzz/Aether/packages/opencode/src/adaptation/README_adaptation.md)
   - [packages/app/src/context/README_context.md](/home/bzz/Aether/packages/app/src/context/README_context.md)

## 1. 这个区域做什么

用户自适应系统负责让 Aether 长期理解用户的习惯、工作方式、解释偏好、任务状态和当前 session 的临时要求。

它不是 IPK 内容库。IPK 内容库管理“知识内容和材料”；用户自适应系统管理“AI 应该怎样理解这个用户，并在未来回答和操作中怎样调整自己”。

当前最高结构是三块：

- 独立习惯库：保存 confirmed 习惯真源。
- Aether 工作区引用层：保存 global / project / session 侧的轻量背景和 habit refs。
- Session 暂存区：保存当前 session 新出现、尚未入库、但可能已经生效的 scratch habits。

## 2. 权威文档阅读顺序

| 优先级 | 文档 | 什么时候必须读 |
|---|---|---|
| 1 | [user-adaptation-system-top-level-constraint.zh-CN.md](./user-adaptation-system-top-level-constraint.zh-CN.md) | 改任何 adaptation 代码、schema、prompt、UI 或设计文档前必读。 |
| 2 | [ipk-and-adaptation-storage-access-contract.zh-CN.md](../ipk-and-adaptation-storage-access-contract.zh-CN.md) | 改存储根、目录、Aether 工作区引用层、session binding 或 confirmed 真源时必读。 |
| 3 | [user-adaptation-v1-implementation-guide/README.zh-CN.md](./user-adaptation-v1-implementation-guide/README.zh-CN.md) | 要理解 v1 分阶段实现顺序时读。 |
| 4 | [user-adaptation-system-implementation-decisions.zh-CN.md](./user-adaptation-system-implementation-decisions.zh-CN.md) | 要确认已拍板工程决定时读。 |
| 5 | [user-adaptation-system-schema-v1.md](./user-adaptation-system-schema-v1.md) | 改类型、JSON 结构、API 返回字段、UI 数据字段时读。 |
| 6 | [user-adaptation-system-scope-mechanics-v1.zh-CN.md](./user-adaptation-system-scope-mechanics-v1.zh-CN.md) | 改 scope matching / scope read / scope promotion 时读。 |
| 7 | [user-adaptation-system-open-questions.zh-CN.md](./user-adaptation-system-open-questions.zh-CN.md) | 发现未定行为、vNext 项或风险时读和维护。 |

## 3. 任务到文件的快速入口

| 你要做什么 | 先读文档 | 先看代码 | 必须一起检查 |
|---|---|---|---|
| 理解整体架构 | top-level constraint、overview、implementation decisions | `packages/opencode/src/adaptation/types.ts`、`storage.ts`、`index.ts` | module contracts、open questions |
| 改 confirmed 习惯库五层 scope | top-level constraint、storage access contract、schema | `types.ts`、`storage.ts`、`profile.ts`、`indexes.ts` | context compile、routes、UI scope 文案 |
| 改 Aether global/project/session 引用层 | top-level constraint、storage access contract | `session.ts`、`project.ts`、`profile.ts`、`context/compile.ts` | `WorkspaceLayer` 与 `ScopeLevel` 是否仍独立 |
| 改 session scratch habits | session scratch execution plan、new_habits_get plan、schema | `scratch.ts`、`llm.ts`、`types.ts`、`context/compile.ts` | scratch UI、message timeline 刷新、prompt 优先级 |
| 改用户发言后新习惯提取 | new_habits_get plan | `signal.ts`、`llm.ts`、`scratch.ts`、`index.ts` | model routing、imported/scratch comparison、UI review |
| 改 proposal inbox / promotion | scope mechanics、schema、implementation guide phase 5/6 | `proposal.ts`、`profile.ts`、`index.ts`、routes | proposal UI、open questions、confirmed 真源写入 |
| 改运行时上下文注入 | schema、scope mechanics、scratch plan | `context/compile.ts`、`context/packet.ts`、`render.ts` | session binding、scratch active、prompt 优先级 |
| 改后端 API | schema、implementation contract | `server/routes/adaptation.ts`、`index.ts`、`types.ts` | frontend context、SDK 生成、API 文案 |
| 改前端用户审阅体验 | overview、scratch plan、scope mechanics | `packages/app/src/context/adaptation.tsx`、`adaptation-*.tsx` | routes、types、用户友好文案 |
| 改模型选择或 LLM 调用 | model routing guard、schema | `model.ts`、`llm.ts`、`habit-classify.ts`、`semantic.ts` | `llm-model-routing-guard`、模型设置 UI |
| 调研外部用户画像 / memory / persona / workflow 系统 | `../reference_project_review/README.zh-CN.md`、external systems comparison、open questions | 先看对方仓库 README / docs / session loop / context builder / memory store | 单项目同名文件夹、跨项目对比、implementation decisions 或 open questions |

代码侧二级导航：

- 后端 adaptation 目录先读 [packages/opencode/src/adaptation/README_adaptation.md](/home/bzz/Aether/packages/opencode/src/adaptation/README_adaptation.md)。
- 前端 context 目录先读 [packages/app/src/context/README_context.md](/home/bzz/Aether/packages/app/src/context/README_context.md)。

## 4. 关键代码入口

### 后端 adaptation 核心

- `packages/opencode/src/adaptation/types.ts`
  定义 adaptation 主要数据结构。改字段时通常会影响 routes、frontend context、SDK 和文档。
- `packages/opencode/src/adaptation/storage.ts`
  定义本地存储目录。这里必须保持五层习惯库平行、工作区引用层独立、session binding 独立。
- `packages/opencode/src/adaptation/index.ts`
  对外服务入口。routes 和上层调用通常通过 `Adaptation.*` 进入。
- `packages/opencode/src/adaptation/session.ts`
  管理 session binding，也就是当前 session 引用了哪些 confirmed habits、当前 project / task / subject / artifact 是什么。
- `packages/opencode/src/adaptation/profile.ts`
  管理 global guidance、project guidance、subject profile、initiative profile / policy 等长期对象。
- `packages/opencode/src/adaptation/scratch.ts`
  管理 session scratch habits、imported conflict、scratch conflict、promote / activate / dismiss。
- `packages/opencode/src/adaptation/signal.ts`
  处理 signal 提取、慢链路 summary/proposal 的候选来源。
- `packages/opencode/src/adaptation/proposal.ts`
  管理 proposal inbox、confirm / reject / defer、promotion 写入。
- `packages/opencode/src/adaptation/indexes.ts`
  维护习惯索引、scope map、trigger / path / subject / task-scope / conflict indexes。
- `packages/opencode/src/adaptation/llm.ts`
  承担习惯提取、imported 对比、scratch 对比等 LLM 调用。
- `packages/opencode/src/adaptation/model.ts`
  管理 adaptation 不同 LLM 任务对应的模型设置。

### 运行时上下文

- `packages/opencode/src/context/compile.ts`
  把 confirmed habits、session binding、scratch active habits 合成运行时 context packet。
- `packages/opencode/src/context/packet.ts`
  把 context packet 渲染成注入模型的文本，并声明“当前用户消息和系统/仓库规则优先于已有习惯”。
- `packages/opencode/src/session/prompt.ts`
  会读取 adaptation context 并放进 session prompt。

### 后端 API

- `packages/opencode/src/server/routes/adaptation.ts`
  暴露 health、status、context compile、signals extract、habits、scratch、proposal、model config 等接口。

### 前端

- `packages/app/src/context/adaptation.tsx`
  前端 adaptation 状态中心。负责请求后端 status、habits、scratch、proposal、model config，并提供操作函数。
- `packages/app/src/components/adaptation-current-context-dialog.tsx`
  展示当前已经进入 context 的 imported habits 和 active scratch。
- `packages/app/src/components/adaptation-scratch-dialog.tsx`
  展示、激活、丢弃、提升 scratch habits，并处理冲突审阅。
- `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`
  展示正式 proposal、session review proposal 和 scratch review。
- `packages/app/src/pages/session/message-timeline.tsx`
  在消息时间线里触发 turn settled 后刷新 adaptation 状态，避免用户手动刷新才看到新增 scratch。

## 5. 不要默认阅读的内容

- 历史审计文档：只有追溯旧决策来源时读，例如 `*-readiness-review-*`、`*-storage-review-*`。
- 外部系统比较文档：只有做架构对照或借鉴 Hermes / wiki-llm / Graphify / 其它用户画像和 memory 系统时读；reference_project 单项目阅读记录写入 `docs/IPK/reference_project_review/<project-name>/`。
- 英文版 overview/details：只有维护英文展示稿或检查中英文一致性时读。
- `user-adaptation-v1-implementation-guide/01-07`：只有改对应阶段能力时按阶段读，不要每次全读。

## 6. 改动前最低检查

改 adaptation 前，至少确认：

- 是否违反五层习惯库平行 scope。
- 是否把工作区引用层和 confirmed 习惯库真源混在一起。
- 是否让 session 运行时只看 imported habits 或只看 scratch habits，而不是两支并列。
- 是否改变用户可见行为、审阅边界或自动化程度。
- 是否需要更新 schema、routes、frontend context、SDK、IPK 文档、open questions。

如果任意一点不清楚，先补 [user-adaptation-system-change-impact-checklist.zh-CN.md](./user-adaptation-system-change-impact-checklist.zh-CN.md)，不要直接改代码。
