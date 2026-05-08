# 阶段 1：存储、安全路径与基础类型

## 目标

先把用户自适应系统的长期真源和类型骨架站起来，但先不接模型 prompt、不做 UI。

这一阶段完成后，仓库里应该已经存在：

- 独立的 `adaptation/`、`task-scope/`、`artifact/` 类型与存储模块
- `MemoryPath.adaptationRoot()` 下的目录初始化
- JSON 真源读写辅助函数
- Markdown 审阅镜像渲染入口
- 路径安全校验、原子写入或锁的最小实现
- adaptation 相关 ID 前缀
- 后端 route 空壳

## 必做项

### 1. 确认 memory resolver 可复用

IPK 已经要求落地：

- `packages/opencode/src/memory/identity.ts`
- `packages/opencode/src/memory/path.ts`
- `packages/opencode/src/memory/manifest.ts`

本阶段不要重新设计路径层。

用户自适应系统只能调用：

```ts
MemoryPath.adaptationRoot()
MemoryPath.cacheRoot()
MemoryPath.stateRoot()
```

不得在 adaptation 业务代码、route、UI 或测试中硬编码：

- `Global.Path.data`
- `Global.Path.config`
- `/home/bzz`
- `~/.local/share/aether`
- `.opencode/adaptation`
- `.aether/adaptation`

### 2. 初始化目录树

最小目录锚点：

```text
MemoryPath.adaptationRoot()/
  workspace/
    global-guidance.json
    global-guidance.md
    projects/
      <project_id>/
        project-guidance.json
        project-guidance.md
  global/
    global-policy.json
    global-policy.md
  subjects/
  initiatives/
  task-scopes/
  artifacts/
  signals/
  summaries/
  proposals/
    pending/
    confirmed/
    rejected/
    deferred/
  indexes/
  bindings/
    sessions/
      <session_id>.json
      <session_id>/
        scratch-habits.json
        scratch-conflicts.json
        proposals/
    projects/
    task-scopes/
```

> 注意：`global/`、`subjects/`、`initiatives/`、`task-scopes/`、`artifacts/` 是习惯库**五层平行 scope**（见 [user-adaptation-system-top-level-constraint.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md)），**不得**互相嵌套。`workspace/` 属于 Aether **工作区引用层**（存放 `global-guidance` 与 `projects/<project_id>/project-guidance`），与五层 scope 身份独立，不得混指。

长期真源目录（习惯库五层）单独创建：

```text
subjects/<subject_id>/
  profile.json
  profile.md
  policy.json
  policy.md

initiatives/<initiative_id>/
  initiative-profile.json
  initiative-profile.md
  initiative-policy.json
  initiative-policy.md

task-scopes/<scope_id>/
  scope.json
  scope.md
  policy.json
  policy.md
  summaries/
  proposals/

artifacts/<artifact_id>/
  contract.json
  contract.md
  summaries/
  proposals/
```

派生 context packet 目录：

```text
MemoryPath.cacheRoot()/adaptation/context-packets/
```

### 3. 存储安全辅助函数

在 `adaptation/storage.ts` 或共享 storage helper 中实现：

- `root()`
- `workspaceRoot()`
- `globalRoot()`
- `subjectsRoot()`
- `projectsRoot()` (返回 `workspace/projects/`)
- `initiativesRoot()`
- `taskScopesRoot()`
- `artifactsRoot()`
- `projectRoot(project_id)`
- `initiativeRoot(initiative_id)`
- `taskScopeRoot(scope_id)`
- `artifactRoot(artifact_id)`
- `signalsRoot()`
- `proposalsRoot()`
- `indexesRoot()`
- `bindingsRoot()`
- `cacheRoot()`
- `safeJoin(root, ...parts)`
- `atomicWriteJSON(path, value)`
- `atomicWriteText(path, value)`
- `readJSON(path, fallback)`
- `ensureDir(path)`
- `renderMirror(kind, value)`

安全要求：

- 所有写入路径必须在对应 root 内。
- 禁止 `..`。
- 禁止路径分隔符进入 id。
- 解析 realpath 后不能通过 symlink 写出 root。
- JSON 写入先写临时文件，再 rename。
- 正式对象写入后同步渲染 Markdown 镜像。

### 4. ID 前缀

在 [packages/opencode/src/id/id.ts](/home/bzz/Aether/packages/opencode/src/id/id.ts) 增加最少这些前缀：

- `signal`
- `summary`
- `proposal`
- `scope`
- `artifact`
- `packet`

如果现有 Identifier 约束不方便，可以使用现有可扩展机制，但 ID 前缀必须稳定。

### 5. 基础类型

在 `adaptation/types.ts` 定义：

- `ScopeLevel`
- `RuntimeScopeLevel`
- `ScopeRef`
- `SignalRecord`
- `SummaryRecord`
- `ProposalRecord`
- `ProposalStatus`
- `PromotionInfo`
- `GlobalGuidance`
- `SubjectProfile`
- `ProjectGuidance`
- `PolicyRecord`
- `ContextPacket`
- `HabitSurface`
- `AdaptationStatusView`

在 `task-scope/types.ts` 定义：

- `TaskScopeRecord`
- `TaskScopeView`
- `ScopeMatchInput`
- `ScopeMatchResult`
- `ScopeBinding`

在 `artifact/types.ts` 定义：

- `ArtifactContract`
- `ArtifactView`
- `ArtifactMatchInput`
- `ArtifactMatchResult`

类型字段以 [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md) 为准。

### 6. Markdown 镜像最小模板

第一版先实现朴素模板，不追求设计美观。

至少支持：

- `global-guidance.md`
- `global-policy.md`
- `subject profile.md`
- `subject policy.md`
- `project-guidance.md`
- `scope.md`
- `policy.md`
- `artifact.md`
- `proposal.md`

模板必须包含：

- 标题
- updated_at
- scope
- confirmed / pending 状态
- 人类可读摘要
- 关键 policy / preference / evidence refs
- “JSON 为真源，Markdown 为镜像”的提示

第一版不允许 Markdown 手工编辑写回 JSON。

### 7. route 空壳

新增并注册：

- [packages/opencode/src/server/routes/adaptation.ts](/home/bzz/Aether/packages/opencode/src/server/routes/adaptation.ts)
- [packages/opencode/src/server/routes/task-scope.ts](/home/bzz/Aether/packages/opencode/src/server/routes/task-scope.ts)
- [packages/opencode/src/server/routes/artifact.ts](/home/bzz/Aether/packages/opencode/src/server/routes/artifact.ts)

在 [packages/opencode/src/server/server.ts](/home/bzz/Aether/packages/opencode/src/server/server.ts) 注册：

```ts
.route("/adaptation", AdaptationRoutes())
.route("/task-scope", TaskScopeRoutes())
.route("/artifact", ArtifactRoutes())
```

本阶段只要求健康检查和基础 list/read 空壳可用。

## 推荐文件

- [packages/opencode/src/adaptation/index.ts](/home/bzz/Aether/packages/opencode/src/adaptation/index.ts)
- [packages/opencode/src/adaptation/types.ts](/home/bzz/Aether/packages/opencode/src/adaptation/types.ts)
- [packages/opencode/src/adaptation/storage.ts](/home/bzz/Aether/packages/opencode/src/adaptation/storage.ts)
- [packages/opencode/src/adaptation/render.ts](/home/bzz/Aether/packages/opencode/src/adaptation/render.ts)
- [packages/opencode/src/task-scope/types.ts](/home/bzz/Aether/packages/opencode/src/task-scope/types.ts)
- [packages/opencode/src/task-scope/storage.ts](/home/bzz/Aether/packages/opencode/src/task-scope/storage.ts)
- [packages/opencode/src/artifact/types.ts](/home/bzz/Aether/packages/opencode/src/artifact/types.ts)
- [packages/opencode/src/artifact/storage.ts](/home/bzz/Aether/packages/opencode/src/artifact/storage.ts)
- [packages/opencode/src/server/routes/adaptation.ts](/home/bzz/Aether/packages/opencode/src/server/routes/adaptation.ts)
- [packages/opencode/src/server/routes/task-scope.ts](/home/bzz/Aether/packages/opencode/src/server/routes/task-scope.ts)
- [packages/opencode/src/server/routes/artifact.ts](/home/bzz/Aether/packages/opencode/src/server/routes/artifact.ts)

## 阶段完成标准

- `MemoryPath.adaptationRoot()` 能初始化完整基础目录。
- route 命名空间已经挂载。
- 基础类型可以被后续阶段引用。
- JSON 写入和 Markdown 镜像生成可用。
- 路径穿越、路径分隔符 id、symlink 写出 root 被拒绝。
- `packages/opencode` 可以通过 `bun typecheck`。

## 这一阶段不要做什么

- 不接 `SessionPrompt.prompt()`。
- 不做 scope matching 模型 prompt。
- 不做 proposal UI。
- 不做 signal extraction。
- 不做 workflow_profile。
- 不做跨 worktree 聚合。
- 不做 memory root UI 设置入口。
