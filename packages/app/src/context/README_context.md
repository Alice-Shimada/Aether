# App Context Navigation

日期：2026-04-17  
用途：给 Codex 的前端 context 目录导航。本文重点覆盖 `adaptation.tsx`，因为它连接用户自适应后端 API 和前端审阅 UI。

## 0. 使用方式

如果任务只涉及普通前端 context，不一定要读本文。

如果任务涉及用户自适应系统、session scratch、proposal inbox、当前上下文展示、模型设置或习惯审阅，先读：

- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-navigation-map.zh-CN.md`
- `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-module-contracts.zh-CN.md`
- `/home/bzz/Aether/packages/opencode/src/adaptation/README_adaptation.md`
- 本文件

## 1. `adaptation.tsx` 负责什么

`packages/app/src/context/adaptation.tsx` 是前端用户自适应系统状态中心。

它负责：

- 保存当前 session 的 adaptation status。
- 拉取 pending / deferred proposals。
- 拉取当前 session 的 imported habits、scratch habits、scratch conflict reviews。
- 给组件提供 confirm / reject / defer / promote / activate / dismiss / resolve 操作。
- 拉取和保存 adaptation model config。
- 在新增 scratch habit 时弹出用户友好的 toast。

它不负责：

- 判断某条习惯是否应该提取。这在后端 `llm.ts` / `signal.ts` / `scratch.ts`。
- 判断冲突怎样解决。前端只把用户选择发给后端。
- 直接改 confirmed 习惯库真源。前端只能调用后端 API。
- 组装运行时 prompt。那在后端 `packages/opencode/src/context/compile.ts` 和 `packages/opencode/src/context/packet.ts`。

## 2. 任务到文件的快速入口

| 你要做什么 | 先读 | 再读 | 必须一起检查 |
|---|---|---|---|
| 改前端 adaptation 状态字段 | `adaptation.tsx` 顶部 type 定义 | `packages/opencode/src/adaptation/types.ts`、routes | SDK / API 返回字段 |
| 改 refresh/polling | `pull`、`refresh`、`createEffect` | backend status/scratch routes | toast 节奏、性能 |
| 改 proposal 操作 | `update`、`confirm/reject/defer` | `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`、routes | proposal.ts 后端语义 |
| 改 scratch 操作 | `mutateScratch`、`resolveScratchReview` | `packages/app/src/components/adaptation-scratch-dialog.tsx`、routes、scratch.ts | active/pending/conflict 状态 |
| 改当前上下文展示 | `status`、`habits`、`scratch` state | `packages/app/src/components/adaptation-current-context-dialog.tsx`、context packet | imported + scratch 是否并列 |
| 改模型设置 | `getModels`、`setModels` | `packages/app/src/components/adaptation-model-settings-dialog.tsx`、backend model route | model routing guard |
| 改“整理当前对话” | `organize` | `packages/app/src/components/adaptation-organize-session-button.tsx`、backend extract route | signal/scratch/proposal 返回结构 |

## 3. `adaptation.tsx` 内部结构

### 类型区

文件开头定义前端消费的 API shape：

- `AdaptationStatus`
- `Proposal`
- `Habit`
- `Scratch`
- `ScratchReview`
- `ScratchOption`
- `OrganizeResult`
- `AdaptationModelConfig`

如果后端 `types.ts` 或 routes 返回字段变化，优先同步这里，再同步使用这些字段的组件。

### 状态区

主要 Solid signals：

- `status`
- `pending`
- `deferred`
- `habits`
- `scratch`
- `scratchConflicts`
- `scratchReview`
- `scratchOptions`
- `seen`

注意：

- `scratch` 是所有 scratch items。
- `scratchReview` 是待审查的 scratch items。
- `scratchConflicts` 是 conflict review batch。
- `seen` 用于判断是否弹出“发现新的暂存习惯”提示。

### 请求区

- `fetchApi`
  加上当前 server、auth、directory 参数。
- `pull`
  并行拉取 status、pending、deferred、habits、scratch、scratch review。
- `refresh`
  对当前 session 重新拉取。
- `organize`
  触发 `/adaptation/signals/extract`，用于“整理当前对话”。

### 操作区

- `update`
  confirm / reject / defer proposal。
- `mutateScratch`
  promote / dismiss / activate scratch。
- `resolveScratchReview`
  处理 imported conflict 或 scratch conflict。
- `mutateHabit`
  从当前 session 移除某条 habit source。
- `getModels` / `setModels`
  管理 adaptation model config。

## 4. 与组件的耦合关系

| 组件 | 从 context 读取 | 调用 context 操作 | 后端语义 |
|---|---|---|---|
| `packages/app/src/components/adaptation-current-context-dialog.tsx` | `status`、`habits`、`scratch` | `removeSource`、`refresh` | 展示当前已注入 context 的 imported / scratch |
| `packages/app/src/components/adaptation-scratch-dialog.tsx` | `scratch`、`scratchConflicts`、`scratchOptions` | `promoteScratch`、`activateScratch`、`dismissScratch`、`resolveScratchReview` | 管理 session scratch 和冲突 |
| `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx` | `pending`、`deferred`、`scratchReview`、`scratchOptions` | `confirm`、`reject`、`defer`、`promoteScratch`、`dismissScratch` | 管理长期 proposal 和 scratch review |
| `packages/app/src/components/adaptation-menu.tsx` | `status`、`loading` | `organize`、`setSession` | 菜单入口和整理当前对话 |
| `packages/app/src/components/adaptation-organize-session-button.tsx` | `loading` | `setSession`、`organize` | 一键整理当前 session |
| `packages/app/src/components/adaptation-scratch-button.tsx` | `status.scratch_count` | 无直接变更 | 显示 scratch 数量入口 |
| `packages/app/src/components/adaptation-model-settings-dialog.tsx` | 无直接状态 | `getModels`、`setModels` | 模型设置 |

## 5. 不能擅自改变的行为

- 前端不能绕过后端直接修改 confirmed 习惯库。
- 用户点击 confirm / reject / defer / promote / dismiss / resolve 后，必须刷新状态，避免 UI 和后端漂移。
- UI 文案必须以用户可理解的效果和选择为主，不要暴露过多内部 id。
- `pending` proposal 和 `pending` scratch 不能在 UI 中误显示为已生效。
- `current context` 展示要区分 imported confirmed habits 和 active scratch habits。

## 6. 常见风险

- 后端字段改了，前端 type 没同步，导致组件拿不到值或误判状态。
- `sessionOpen` 过滤规则改错，导致别的 session/project 的 proposal 混进当前 UI。
- `scratch_count` 变化和 toast 逻辑不一致，导致重复提醒或不提醒。
- `resolveScratchReview` 的 action 文案和后端语义不一致，用户以为选了 A，实际执行 B。
- 模型设置新增 kind 时只改前端，不改后端或文档。

## 7. 改动后验证

改本文件后按范围检查：

- 类型或 API 字段：
  - 后端 `packages/opencode/src/adaptation/types.ts`
  - 后端 `packages/opencode/src/server/routes/adaptation.ts`
  - SDK 是否需要重新生成。
- UI 行为：
  - `packages/app/src/components/adaptation-current-context-dialog.tsx`
  - `packages/app/src/components/adaptation-scratch-dialog.tsx`
  - `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`
- 模型设置：
  - `packages/opencode/src/adaptation/model.ts`
  - `packages/opencode/src/adaptation/llm.ts`
  - `python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether`

如果改动影响用户自适应系统的产品逻辑，还要同步更新 `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/` 下的导航、契约或改动影响文档。
