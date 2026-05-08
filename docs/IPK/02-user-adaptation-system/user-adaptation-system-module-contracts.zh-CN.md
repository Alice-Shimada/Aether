# 用户自适应系统模块契约

日期：2026-04-17  
用途：说明用户自适应系统各模块之间“谁给谁什么、谁不能擅自改什么”，帮助 Codex 避免局部修改引发连锁 bug。

## 0. 总原则

用户自适应系统的业务逻辑由用户拍板。Codex 可以决定代码怎么组织，但不能擅自改变下面这些行为：

- confirmed 习惯库是长期习惯正文真源。
- Aether 工作区引用层只保存轻量背景和 refs。
- 当前 session 生效集合 = imported confirmed habits + active scratch habits。
- 用户最新消息、仓库规则、系统规则永远优先于已有习惯。
- 高影响长期习惯、作用域扩大、正式入库和跨范围默认行为不能静默确认。

## 1. 系统级契约

| 层 | 负责什么 | 输入 | 输出 | 不能擅自改变 |
|---|---|---|---|---|
| 独立习惯库 | confirmed 习惯真源、五层 scope、policy/profile/contract | proposal confirm、promotion、人工维护 | 可被 session 引用的 habit surface / policy / profile | 五层 scope 不得树状嵌套；不得被 project/session 目录替代 |
| Aether 工作区引用层 | global/project/session 侧轻量背景与 refs | project/worktree/session 上下文、scope matching 结果 | session binding、project guidance、global guidance | 不得保存习惯正文真源；不得把 project_guidance 当 initiative |
| Session 暂存区 | 当前 session 新出现且未入库的 scratch habits | 最新用户消息、冲突审阅输入、LLM 候选 | active/pending scratch、scratch conflicts、scratch hits | 不得变成 confirmed 真源；不得静默写入长期层 |
| 运行时上下文 | 把 confirmed 引用和 scratch active 编译进 prompt | session binding、habit surfaces、scratch active、request | context packet、prompt section | 不得忽略 scratch；不得让旧习惯压过用户当前消息 |
| 用户审阅 UI | 让用户管理 proposal、scratch、冲突和当前上下文 | 后端 routes 返回的 status/proposal/scratch | confirm/reject/defer/promote/dismiss/resolve 操作 | 不得要求用户理解底层 id 才能做决定 |

## 2. 后端模块契约

### `types.ts`

- 负责什么：定义 adaptation 对象的结构和边界。
- 上游：设计文档、schema 文档、后端模块。
- 下游：routes、frontend context、SDK、存储读写、LLM 解析。
- 允许 Codex 自行决定：内部类型组织、字段顺序、局部辅助类型。
- 必须用户拍板：新增会改变行为语义的字段、状态枚举、scope 层级、自动化等级。
- 不能擅自改变：
  - `HabitScopeLevel` 只表示习惯库五层：`global / subject / initiative / task_scope / artifact`。
  - 如果运行时需要 `session`，必须使用单独 runtime carrier，而不是把 `session` 混入 confirmed 习惯库 scope。
  - scratch evidence 的证据来源不能扩大到 assistant / tool / diff，除非用户拍板。

### `storage.ts`

- 负责什么：定义 adaptation 数据物理落点。
- 上游：`MemoryPath.adaptationRoot()`、storage access contract。
- 下游：profile、session、scratch、proposal、indexes、context packet cache。
- 允许 Codex 自行决定：安全写入、原子写入、目录创建细节。
- 必须用户拍板：改变目录身份、把长期真源写进 project/session、五层 scope 的物理关系。
- 不能擅自改变：
  - `global / subjects / initiatives / task-scopes / artifacts` 必须保持平行。
  - `workspace/projects` 是 Aether 工作区引用层，不是 initiative 真源。
  - `bindings/sessions` 是 session binding，不是 scratch 或 confirmed habit 真源。

### `session.ts`

- 负责什么：维护当前 session 绑定关系。
- 输入：session id、project id、subject/task/artifact/habit refs。
- 输出：session binding，供 status、context compile、UI 使用。
- 下游：`context/compile.ts`、`index.ts`、routes、frontend status。
- 不能擅自改变：
  - session binding 保存的是引用集合，不是 habit 正文。
  - 移除失效 habit ref 需要保持可审计或 proposal 化，不应无提示破坏用户可见状态。

### `profile.ts`

- 负责什么：读写 global guidance、project guidance、subject profile/policy、initiative profile/policy。
- 输入：scope id、policy/profile 数据。
- 输出：长期或工作区级记录。
- 下游：context compile、proposal confirm、status/API。
- 不能擅自改变：
  - `project_guidance` 不是 `initiative_profile`。
  - global/project guidance 只负责缩小候选范围，不直接让某条 confirmed habit 自动生效。

### `scratch.ts`

- 负责什么：管理当前 session 的 scratch habits、冲突审阅和 imported hit 事件。
- 输入：LLM 提取候选、imported 对比结果、scratch 对比结果、用户冲突审阅选择。
- 输出：active/pending scratch、review batch、hit events、promote proposal。
- 下游：context compile、status、scratch UI、proposal inbox。
- 必须用户拍板：
  - active/pending 判定规则发生语义变化。
  - 是否从“所有 imported habits 对比”改成“先召回 top K 再对比”。
  - 冲突弹窗是否从整组处理改成逐条拆分。
- 不能擅自改变：
  - 用户当前消息是 scratch 快链路证据真源。
  - imported overlap 默认不创建 scratch。
  - imported conflict 不改 confirmed habit 真源，只在当前 session 暂停/采用局部 scratch。

### `llm.ts`

- 负责什么：执行习惯候选提取、候选与 imported/scratch 对比等 LLM 判断。
- 输入：用户消息、候选、imported habits、scratch habits。
- 输出：结构化 JSON 候选和关系判断。
- 下游：scratch、signal、proposal。
- 不能擅自改变：
  - LLM 只判断关系和生成说明，不直接写数据。
  - 新 LLM 调用必须走现有 adaptation model kind，不能随意新增模型设置。

### `signal.ts` / `summary.ts` / `proposal.ts`

- 负责什么：慢链路证据、阶段压缩、长期 proposal 和 promotion。
- 输入：signals、summary patterns、proposal candidates、用户审阅动作。
- 输出：proposal inbox、confirmed/rejected/deferred 记录、target patch。
- 下游：profile/policy 写入、session binding refresh、UI inbox。
- 不能擅自改变：
  - v1 快链路优先当前用户消息；慢链路不能抢先改变 session 局部要求。
  - 高影响长期层 promotion 不能静默 confirmed。

### `indexes.ts`

- 负责什么：维护 habit surface、scope map、trigger/path/subject/task-scope/conflict 等派生索引。
- 输入：confirmed habits、policy/profile、分类 LLM 结果。
- 输出：运行时检索和审计用索引。
- 不能擅自改变：
  - 索引是派生层，不是 habit 真源。
  - graph / index 邻居只能帮助候选召回，不能直接让习惯生效。

## 3. 运行时上下文契约

### `context/compile.ts`

- 负责什么：决定当前请求实际注入哪些 adaptation 记录。
- 输入：session binding、request、confirmed habits、active scratch、budget。
- 输出：context packet。
- 关键契约：
  - 当前 session 的 imported habit refs 和 active scratch 都要进入候选。
  - 被 scratch shadow 的 imported habit 应被省略或降权，并记录 omitted reason。
  - pending proposal 和未生效 scratch 不能作为 active context rule 注入。

### `context/packet.ts`

- 负责什么：把 context packet 渲染成模型可读文本。
- 关键契约：
  - 必须保留“当前用户消息和系统/仓库规则优先于 imported habits、scratch habits 和 adaptation policy”的规则。

## 4. API 与前端契约

### `server/routes/adaptation.ts`

- 负责什么：后端 adaptation API。
- 下游：frontend context、SDK 生成。
- 不能擅自改变：
  - API 字段变化需要同步 `packages/app/src/context/adaptation.tsx` 和 SDK。
  - scratch/proposal 操作必须保持用户可审阅，不得绕过 UI 审核边界。

### `packages/app/src/context/adaptation.tsx`

- 负责什么：前端 adaptation 状态中心。
- 输入：后端 status、proposal、habits、scratch、review、model config。
- 输出：组件可用状态和操作函数。
- 不能擅自改变：
  - UI 中展示的 pending / active / review 状态必须对应后端状态。
  - 提醒文案要用户友好，不要求用户理解内部 id。

### 前端组件

- `adaptation-current-context-dialog.tsx`
  展示当前已生效 imported habits 和 active scratch。
- `adaptation-scratch-dialog.tsx`
  管理 scratch active/pending/promote/dismiss/conflict resolve。
- `adaptation-proposal-inbox-dialog.tsx`
  管理 formal proposal、session review proposal、scratch review。
- `message-timeline.tsx`
  负责在消息阶段结束后刷新 adaptation 状态，让用户能看到新增 scratch。

## 5. 常见改动影响表

| 如果要改 | 必须检查 | 主要风险 |
|---|---|---|
| scope 枚举或目录 | `types.ts`、`storage.ts`、top-level constraint、schema、UI 文案 | 把习惯库五层和工作区三层混在一起 |
| scratch 提取时机 | new_habits_get plan、`signal.ts`、`scratch.ts`、`message-timeline.tsx` | 同一轮 prompt 是否错误依赖最新 scratch |
| imported conflict 处理 | `scratch.ts`、scratch dialog、current context dialog | 误改 confirmed 真源，或让当前用户要求被旧习惯压过 |
| context 注入 | `context/compile.ts`、`context/packet.ts`、session prompt | 忽略 scratch、注入 pending、优先级错误 |
| proposal confirm | `proposal.ts`、`profile.ts`、`session.ts`、proposal inbox | 高影响长期习惯静默生效 |
| API 返回字段 | routes、frontend context、SDK | 前后端类型漂移 |
| LLM 调用 | `llm.ts`、`model.ts`、模型设置 UI、routing guard | 绕过现有模型设置或新增未同步 model kind |

## 6. 修改后必须回答的问题

每次非局部修改后，Codex 应在最终报告中说明：

- 改动是否仍保持三块架构独立。
- imported habits 和 scratch habits 是否仍并列进入 session 生效集合。
- 哪些上游输入和下游输出受影响。
- 哪些用户可见行为发生变化。
- 哪些文档、测试、SDK 或 UI 已同步检查。
