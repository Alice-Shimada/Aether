# IPK 与用户自适应系统：独立存储、调用与权限约束

这份文档用于交给之后参与实现的 AI 或开发者阅读。

它记录当前已经讨论并认可的存储设计方向，重点回答：

- `IPK` 库应该怎样保存与调用
- 用户自适应系统应该怎样保存与调用
- 会话数据库与长期记忆之间应该是什么关系
- 如何避免卷入 `opencode -> Aether` 改名工程
- 哪些安全与架构规则绝对不能违反

本文不是替代现有 schema、workflow、integration 文档。  
它是跨 `IPK` 内容系统与用户自适应系统的存储/调用契约。

涉及“存储根、调用边界、权限边界、是否硬编码 Aether/opencode”时，本文优先于旧文档里的具体路径示例。  
如果旧文档写着 `Global.Path.data/ipk/`、`${Global.Path.config}/adaptation/` 或 `<worktree>/.opencode/adaptation/`，应按本文解释为旧实现/兼容默认或候选方案，而不是新的业务代码必须硬编码的最终协议。

## 1. 总原则

最核心的原则是：

```text
会话是过程对象，用户习惯是长期对象。
会话可以删除、归档、迁移、重建；长期习惯应该能跨会话生效。
```

因此：

- 不要把长期用户习惯真源锁死在某一个 session db 里。
- 不要把 `IPK` 正式库分散到每个项目目录里。
- 不要靠“文件放在一起”来让记忆产生作用；应由 context compiler 按作用域读取、排序、压缩并注入。
- 不要让 `IPK` / 用户自适应系统参与底层 `opencode` 改名工程。
- 不要为了长期记忆给 AI 工具全盘读写权限。

## 2. 与 `opencode -> Aether` 改名工程的边界

当前 Aether 仍然基于 opencode，底层仍有大量稳定兼容约定：

- `.opencode/`
- `opencode.json` / `opencode.jsonc`
- `OPENCODE_*`
- `@opencode-ai/*`
- `Global.Path.data` / `Global.Path.config` 当前可能仍落在 `opencode` 命名空间

`IPK` 和用户自适应系统的第一版设计不应触碰这些底层改名问题。

禁止做：

```text
全项目把 opencode 替换成 aether
直接把 Global.Path 里的 app = "opencode" 改成 "aether"
在 IPK/adaptation 代码里到处硬编码 Aether
在 IPK/adaptation 代码里到处硬编码 opencode
```

推荐做：

```text
保留当前 opencode 兼容层
新增独立 MemoryRootResolver
让 IPK 和 adaptation 只依赖 MemoryRootResolver
未来底层改名时，只需要调整 resolver 或迁移入口
```

## 3. 禁止硬编码 Aether 的含义

“构建时禁止硬编码 Aether”不是说产品名不能叫 Aether。

可以出现：

- UI 标题：`Aether`
- 安装包名称：`Aether`
- 命令名：`aether`
- 用户可见文案：`Aether`

不应该散落硬编码：

- 数据目录名
- 配置目录名
- 数据库名
- 环境变量前缀
- 项目扫描目录
- 缓存目录
- 迁移目录
- 权限白名单路径

这些应该集中到一个 identity / resolver 层。

概念上：

```ts
AppIdentity = {
  productName: "Aether",
  envPrefix: "AETHER",
  memoryNamespace: "aether-memory",
  legacyStorageNames: ["opencode"]
}
```

但 `IPK` / adaptation 不应直接读取这些细节。它们只应调用：

```ts
MemoryPath.root()
MemoryPath.ipkRoot()
MemoryPath.adaptationRoot()
MemoryPath.cacheRoot()
MemoryPath.stateRoot()
```

## 4. 独立长期记忆根目录

第一版建议新增一个专门的长期记忆根：

```text
<AetherMemoryRoot>/
```

这个 root 专门服务：

- `IPK`
- 用户自适应系统
- 未来长期记忆、画像、灵感库

它不要求修改现有 `Global.Path`，也不要求现在完成 `opencode -> Aether` 改名。

对用户自适应系统，存储契约还要区分两个概念区域：

- 习惯库：保存已确认习惯的长期真源，以及五个平行 scope 标签、关系边和派生索引。
- Aether 工作区引用层：保存 `global_guidance`、`project_guidance`、`session binding` 等工作区对象的轻量背景 + refs，用于给 session 缩小候选范围；不保存习惯正文真源。

Aether 工作区引用层不能成为习惯正文的第二真源。任何工作区文档中的习惯都应通过 habit id / relation 指向习惯库条目。

### 4.1 解析优先级

`AetherMemoryRoot` 应通过 resolver 解析，不能在各模块里手拼路径。

第一版拍板采用：

```text
默认平台路径 + 环境变量覆盖
```

第一版不做 memory root 的 UI 设置入口。  
如果用户需要把长期记忆目录放到自定义位置，应先通过环境变量覆盖。

解析优先级：

```text
1. 用户显式指定的 memory root 环境变量
   变量名由 AppIdentity.envPrefix 集中生成；当前实现使用 <ENV_PREFIX>_MEMORY_HOME

2. 构建或运行时注入的 memory namespace
   由 AppIdentity / build identity 决定

3. 平台默认 app data 目录下的独立 memory namespace
   例如 XDG / macOS Application Support / Windows AppData
```

注意：

- 环境变量名、memory namespace、产品名都必须由 identity / resolver 层统一管理。
- `IPK`、adaptation、路由、UI 和测试都不应直接读取 `process.env.AETHER_MEMORY_HOME` 这类具体变量名。
- 重点是所有路径必须经由同一个 resolver。
- 不允许在 `IPK` 或 adaptation 业务代码中写死 `/home/bzz`、`~/.local/share/aether`、`~/.config/aether` 等路径。

### 4.1.1 构建注入与 `AppIdentity`

第一版需要一个集中身份对象，概念上类似：

```ts
AppIdentity = {
  productName: string,
  envPrefix: string,
  memoryNamespace: string,
  legacyStorageNames: string[]
}
```

规则：

- 官方构建可以通过 build define、运行时 manifest、package metadata 或等价机制注入 `AppIdentity`。
- 如果需要默认值，只能集中放在 identity / resolver 层。
- 业务模块、route、UI、测试不得用字符串 `"Aether"` 或 `"opencode"` 自己决定存储路径。
- `MemoryRootResolver` 只依赖 `AppIdentity` 与平台目录 API。
- `MemoryPath.*` 是 IPK 与用户自适应系统能看到的唯一长期记忆路径 API。

### 4.1.2 `cache` / `state` 的第一版策略

第一版可以把持久数据、缓存和状态都放在同一个 memory root 下面：

```text
<AetherMemoryRoot>/
  ipk/
  adaptation/
  cache/
  state/
```

这样可以减少权限、迁移和打包复杂度。

以后如果需要把 cache / state 移到平台更标准的位置，只调整 resolver 暴露的：

```ts
MemoryPath.cacheRoot()
MemoryPath.stateRoot()
```

业务代码不应自己拼平台缓存目录。

### 4.2 推荐目录树

```text
<AetherMemoryRoot>/
  manifest.json

  ipk/
    pieces/
    drafts/
    indexes/
    maps/
    taxonomy/
    events/
    locks/
    exports/

  adaptation/
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
      <subject_id>/
        profile.json
        profile.md
        policy.json
        policy.md

    initiatives/
      <initiative_id>/
        initiative-profile.json
        initiative-profile.md
        initiative-policy.json
        initiative-policy.md
        proposals/

    task-scopes/
      <scope_id>/
        scope.json
        scope.md
        policy.json
        policy.md
        summaries/
        proposals/

    artifacts/
      <artifact_id>/
        contract.json
        contract.md
        summaries/
        proposals/

    signals/
      <year>/
        <month>/
          signals.jsonl
    summaries/
    proposals/
      pending/
      confirmed/
      rejected/
    indexes/
    bindings/
      sessions/
        <session_id>.json
        <session_id>/
          scratch-habits.json
          scratch-habits.md
          scratch-conflicts.json
          scratch-conflicts.md
          proposals/
      projects/
      task-scopes/

  cache/
    ipk/
    adaptation/

  state/
    locks/
    migrations/
```

## 5. IPK 存储规则

`IPK` 是一个全局长期内容库。

它的目标是形成：

```text
一个可全局调用、可读写、可长期维护的知识 + 灵感库。
```

第一版设计要求：

- 正式 `piece` 只保存一份。
- 不按 project 或 session 分散成多个库。
- 不把正式 `piece` 塞进会话 db。
- 不把正式 `piece` 默认放进用户项目目录。
- 不把巨大 `IPK` payload 放进 `.opencode/` 这类配置扫描目录。

推荐结构：

```text
<AetherMemoryRoot>/ipk/
  pieces/
    idea/
    knowledge/
    thread/
    review/
    plan/
  drafts/
  indexes/
  maps/
  taxonomy/
```

正式内容进入：

```text
ipk/pieces/
```

工作过程进入：

```text
ipk/drafts/
```

检索和导航产物进入：

```text
ipk/indexes/
ipk/maps/
```

受控词表进入：

```text
ipk/taxonomy/
```

### 5.1 与当前 `Global.Path.data/ipk` 文档的关系

现有 IPK 文档和当前代码里已有：

```text
Global.Path.data/ipk/
```

这是当前 Aether/opencode 实现下的可用默认路径。

但在未来面向独立 Aether memory 的设计里，业务逻辑不应直接硬编码 `Global.Path.data/ipk`。  
应把它视作 `MemoryRootResolver` 的一种兼容默认或迁移来源。

推荐理解：

```text
旧/当前实现默认：
  Global.Path.data/ipk/

长期解耦目标：
  MemoryPath.ipkRoot()
```

如果未来迁移：

- 只 copy，不 move，不 delete。
- 不破坏原 opencode 数据。
- 不假设用户机器上一定有 opencode。
- 只检查 resolver 明确列出的已知旧路径候选，不做全盘扫描。
- 只有新 root 为空且旧 root 有数据时，才提示用户导入。
- 如果新旧 root 都有数据，不自动合并。
- 导入后写入 manifest，记录来源、时间、版本和 copy-only 策略。

当前实现应已经把直接拼接 `Global.Path.data/ipk` 收敛到 `MemoryRootResolver` / `MemoryPath` 内部。  
业务模块、路由、UI 文案和测试不应继续把 `Global.Path.data/ipk` 当成最终协议；如果为了兼容现有库仍解析到该位置，也只能由 resolver 负责。

### 5.2 旧路径导入规则

第一版只允许安全、可回退的旧路径导入。

```text
新 root 为空 + 旧 root 有数据
  -> 可以提示用户 copy 导入

新 root 有数据 + 旧 root 有数据
  -> 不自动合并，最多提示用户稍后使用显式导入/冲突处理工具

新 root 有数据 + 旧 root 无数据
  -> 直接使用新 root

新旧 root 都无数据
  -> 初始化新 root
```

禁止：

- 静默 move。
- 静默 delete。
- 自动合并两个已有库。
- 为了寻找旧库扫描整个磁盘或整个 home。

导入完成后建议写入 manifest，例如：

```json
{
  "schema": "aether.memory.manifest.v1",
  "created_at": "2026-04-11T00:00:00.000Z",
  "imports": [
    {
      "source": "legacy-global-data-ipk",
      "source_path": "<known legacy path>",
      "target": "ipk",
      "mode": "copy-only",
      "imported_at": "2026-04-11T00:00:00.000Z"
    }
  ]
}
```

## 6. 用户自适应系统存储规则

用户自适应系统不是单一大库，而是分层长期记录系统。

它至少包含：

- `signal`
- `summary`
- `proposal`
- `global_guidance`
- `subject_profile`
- `policy`
- `task_scope`
- `artifact_contract`
- `context_packet`

第一版推荐将真源集中保存在：

```text
<AetherMemoryRoot>/adaptation/
```

而不是默认写入每个项目目录。

这应被理解为一个独立习惯库，而不是某个工作区的附属目录。

- 工作区、repo、Aether project 和 session 是习惯库的证据来源和引用方。
- 习惯库通过自己的结构化对象、索引、作用域图和审计记录保存长期习惯。
- 工作区不应把长期习惯真源混入项目目录；它只应通过服务端 API 和 mapping/binding 引用习惯库。
- 同一个习惯在库中可以与多个工作区、project、task_scope、subject 或 artifact 建立关系边。
- 改变习惯作用范围时，应优先通过新版本、关系边、redirect 或 tombstone 维护引用完整性；不要因为晋升或降级就默认物理删除旧记录。

派生导航层也保存在 `adaptation/` 下，但不是真源：

```text
<AetherMemoryRoot>/adaptation/indexes/
  scope-map.json
  habit-index.jsonl
  trigger-index.json
  path-index.json
  subject-index.json
  task-scope-index.json
  reference-index.json    # global_guidance / project_guidance / session binding 的 refs 派生索引，后续补齐
  conflict-index.json
  habit-graph.json        # vNext，可由真源和 relation 重建
  habit-report.md         # vNext，给模型和用户快速读的结构摘要
  habit-wiki/             # vNext，面向人工管理的 community/wiki 视图
```

这些文件的作用类似 Graphify 的 `graph.json / GRAPH_REPORT.md / wiki`：帮助检索、解释、审计和管理。它们不能替代 profile / policy / task_scope / artifact_contract / habit record 的真源地位，损坏或过期时应通过 `rebuildIndexes()` 或后续 graph rebuild 流程重建。

### 6.1 全局层

保存位置：

```text
<AetherMemoryRoot>/adaptation/workspace/global-guidance.json
<AetherMemoryRoot>/adaptation/global/global-policy.json
```

用于保存：

- 工作区 global 侧的轻量背景 + refs（`workspace/global-guidance.*`）
- 全局策略（习惯库 global scope 真源，`global/global-policy.*`）

示例：

```text
workspace/global-guidance.json
workspace/global-guidance.md
global/global-policy.json
global/global-policy.md
```

### 6.2 subject 层

保存位置：

```text
<AetherMemoryRoot>/adaptation/subjects/<subject_id>/
```

用于保存某个学科、领域、主题下的用户习惯，例如：

- 熟悉的概念锚点
- 偏好的解释语言
- 常用符号约定
- 容易混淆或需要慢讲的区域

### 6.3 Aether project 引用分区与 initiative 解耦

第一版默认不要把项目级习惯真源写进用户项目目录。

这里的目录名 `projects/<project_id>` 表示 Aether 工作区 project 的引用分区，不是习惯库五层 scope 名。习惯库五层中原先叫 `project` 的长期事项层已统一改名为 `initiative`；**v1 不建立任何默认的 Aether project ↔ initiative 绑定**，initiative 归属只能来自路由 classifier 或用户显式选择，并写入 session binding。

推荐保存位置：

```text
<AetherMemoryRoot>/adaptation/workspace/projects/<project_id>/
```

这样做的好处：

- 不修改用户项目文件。
- 不污染 git 工作区。
- 不依赖 `.opencode` 是否存在。
- 不卷入 `.opencode` / `.aether` 命名和扫描优先级问题。
- 方便跨会话聚合与统一管理。

可以保存：

```text
project-guidance.json
```

### 6.4 task_scope 层

保存位置：

```text
<AetherMemoryRoot>/adaptation/task-scopes/<scope_id>/
```

用于保存长期任务状态和习惯，例如：

- 当前任务目标
- 已完成事项
- 决策
- open questions
- 偏好的工作顺序
- 相关 subject
- 关联 artifacts
- 关联 IPK pieces

### 6.5 artifact_contract 层

保存位置：

```text
<AetherMemoryRoot>/adaptation/artifacts/<artifact_id>/contract.json
```

用于描述某个文件或文件组应该怎样被维护，例如：

- 文件路径
- 文档角色
- 写入模式
- 更新触发条件
- 成对/成组 artifact 关系
- 保护区块
- 输出格式约束

### 6.6 signals / summaries / proposals

过程性证据与待确认变化建议不要直接写进长期 profile。

#### 6.6.1 存储位置与路由规则

`summaries` 和 `proposals` 的物理存储位置由 `scope.level` 决定：

| scope.level | 存储位置 |
| --- | --- |
| `global` / `subject` | `<AetherMemoryRoot>/adaptation/summaries/` 和 `proposals/` |
| `session` | `<AetherMemoryRoot>/adaptation/bindings/sessions/<session_id>/proposals/` |
| `initiative` | `<AetherMemoryRoot>/adaptation/initiatives/<initiative_id>/proposals/` |
| `task_scope` | `<AetherMemoryRoot>/adaptation/task-scopes/<scope_id>/summaries/` 和 `proposals/` |
| `artifact` | `<AetherMemoryRoot>/adaptation/artifacts/<artifact_id>/summaries/` 和 `proposals/` |

`signals` 始终保存在全局位置：

```text
<AetherMemoryRoot>/adaptation/signals/<year>/<month>/signals.jsonl
```

#### 6.6.2 IPK piece 与 adaptation signal 为什么采用不同存储粒度

- IPK `piece` 是低频、高价值的长期对象，每条包含 4 个文件（piece.md / meta.json / surface.json / links.json），需要独立目录以支持原子读写和逐条编辑。
- Adaptation `signal` 是高频、低价值的单次观察证据，每条通常只有几百字节。使用 JSONL 按年月归档可以减少文件系统碎片，同时支持高效的批量写入和窗口扫描。

#### 6.6.3 规则

- `signal` 必须带证据。
- `summary` 用于压缩一段时间或一组会话里的模式。
- 高影响推断必须先进入 `proposal`，不能直接改长期 profile。
- `proposal` 被确认后，才写入 profile / policy / task_scope / artifact_contract。

#### 6.6.4 Signals 清理策略

- 被 `summary` 引用过的 signal 应标记为"已吸收"（`absorbed`）。
- 已吸收且超过设定时限的 signal 可被清理。
- 长期未被再次触发的 signal 应定期展示给用户审阅：如果用户认为不代表自己的习惯，可删除该 signal。
- 第一版清理时限和展示频率作为待调参数，在 v1 使用后根据体验确定。

#### 6.6.5 Drafts 清理策略（适用于 IPK `drafts/`）

- 长时间无操作且无类似 signal 再次出现的草稿，系统应自动删除或询问用户后删除。
- 第一版过期时限作为待调参数。

#### 6.6.6 Indexes 重建策略（适用于 IPK `indexes/`）

- 每次启动时应校验索引完整性，不一致则自动全量重建。
- 运行期间如果 pieces 被手动修改（非通过 `/ipk/*` 服务），不立即自动重建，而是等用户点击"重建索引"按钮后触发。
- `IPK库` 菜单或等价入口应提供"重建索引"操作。

## 7. 会话数据库的角色

会话数据库是过程层，不是长期用户习惯真源。

允许会话 db 保存：

```text
session_id -> project_id
session_id -> task_scope_id
session_id -> subject_ids
session_id -> habit_ids
session_id -> signal_ids
session_id -> proposal_ids
session_id -> context_packet_id
session_id -> context_packet_snapshot
```

不允许会话 db 成为下列对象的唯一长期真源：

```text
workspace/global-guidance.json
global/global-policy.json
subject-profile.json
workspace/projects/<project_id>/project-guidance.json
initiative-policy.json
task-scope.json
artifact-contract.json
IPK piece
```

推荐查询流程：

```text
拿到 session_id
  -> 从 db 或 bindings 查 session 关联的 project_id / scope_id / subject_ids / habit_ids
  -> 从 MemoryPath.adaptationRoot() 读取长期记录
  -> 从 MemoryPath.ipkRoot() 按需读取 IPK indexes/maps/pieces
  -> context compiler 编译为 context_packet
  -> 把压缩后的上下文注入模型
```

这样既能降低“从会话找到相关习惯”的难度，也不会牺牲跨会话、跨项目的长期增益。

## 8. 项目目录与 `.opencode` 的关系

由于第一版要避免触碰底层改名和 opencode 兼容问题，默认不要把用户自适应真源写进：

```text
<worktree>/.opencode/adaptation/
```

更不要强制创建：

```text
<worktree>/.aether/
```

第一版默认：

```text
项目级工作区 guidance 放在 <AetherMemoryRoot>/adaptation/workspace/projects/<project_id>/
```

未来可以可选支持：

```text
<worktree>/.opencode/adaptation-pointer.json
<worktree>/.aether/adaptation-pointer.json
```

或导出：

```text
<worktree>/.opencode/adaptation/
<worktree>/.aether/adaptation/
```

但这些只能是显式导出、同步或指针层，不应成为第一版默认真源。

第一版进一步拍板：

- 不默认创建 `<worktree>/.opencode/adaptation/`。
- 不默认创建 `<worktree>/.aether/adaptation/`。
- 不做持续同步。
- 不做双向同步。
- 不把长期真源写进项目目录。

未来如果要接入项目目录，推荐按下面顺序逐步推进：

```text
pointer < explicit export < one-way sync < two-way sync
```

含义：

- `pointer`：项目目录只保存一个指针文件，指向 memory root 内的对象。
- `explicit export`：用户明确触发后，把可读摘要或快照导出到项目目录。
- `one-way sync`：memory root 到项目目录的单向同步，需要明确策略和冲突处理。
- `two-way sync`：项目目录与 memory root 互相修改并合并，风险最高，第一版不做。

## 9. 调用与上下文编译规则

长期记忆不应被无差别塞进 prompt。

应由 context compiler 在 query time 读取、筛选、排序、压缩。

推荐读取顺序：

```text
1. global guidance
2. subject profile
3. project guidance
4. task_scope
5. artifact_contract
6. current session signals/summaries/proposals
7. relevant IPK maps/indexes/surfaces/pieces
```

推荐优先级：

```text
global < subject < initiative < task_scope < artifact < session
```

注意：

- 优先级不等于简单 JSON 覆盖。
- 应保留来源、作用域、证据、置信度、更新时间。
- 进入 prompt 前必须压缩成可读、可控、可解释的 `context_packet`。
- `IPK` 负责内容与导航；用户自适应系统负责用户偏好、工作方式和调用策略。

## 10. 权限与安全规则

这是不可违反的安全边界。

### 10.1 不允许全盘读写

禁止为了 `IPK` 或用户自适应系统给 AI 工具授予：

```text
整个电脑
用户 home 全部目录
根目录 /
C:\ 全盘
任意项目目录
```

的无条件读写权限。

### 10.2 通过服务写入，不通过通用 write 工具写入

长期记忆写入应通过专门后端服务：

```text
/ipk/*
/adaptation/*
```

而不是让模型直接调用通用 `write` / `edit` 工具随意写 memory 文件。

服务内部必须校验：

- 目标路径必须在 `AetherMemoryRoot` 内。
- `IPK` 写入只能进入 `ipk/` 允许子树。
- adaptation 写入只能进入 `adaptation/` 允许子树。
- 禁止 `..` 路径穿越。
- 禁止通过 symlink 写出 root。
- 写正式对象前应使用原子写入或锁。
- 高影响 profile/policy 变更必须经过 proposal 确认。

### 10.3 项目级写入必须显式

如果未来支持写入：

```text
<worktree>/.opencode/adaptation/
<worktree>/.aether/adaptation/
```

则必须满足：

- 这是显式导出、同步或用户确认后的行为。
- 不应由默认后台流程静默写入。
- 不应扩大到整个 worktree 的任意文件写权限。

## 11. 不可违反规则清单

后续 AI 或开发者实现时必须遵守：

1. 不要把长期用户习惯真源塞进 session db。
2. 不要把 `IPK` 正式库拆散到每个项目目录。
3. 不要把巨大 `IPK` payload 放进 `.opencode/` 或其他配置扫描目录。
4. 不要全项目硬替换 `opencode -> aether`。
5. 不要直接修改底层 `Global.Path` app namespace 来服务 IPK/adaptation。
6. 不要在业务代码中硬编码 `/home/bzz` 或任何用户机器的绝对路径。
7. 不要在业务代码中硬编码 `Aether` 作为存储协议。
8. 不要让 AI 工具获得全盘读写权限。
9. 不要让通用 `write/edit` 工具直接维护长期记忆真源。
10. 不要让低置信度推断直接改写长期 profile。
11. 高影响行动偏好必须先进入 `proposal`，经确认后再写入长期对象。
12. `IPK` 和 adaptation 必须通过 resolver 获取 root。
13. 会话 db 只能保存绑定、引用、快照和过程数据。
14. 项目级习惯第一版默认保存到 memory root 的 `projects/<project_id>/`。
15. 写入 memory root 时必须做路径归属校验、锁或原子写入。
16. 第一版 `MemoryRootResolver` 采用默认平台路径 + 环境变量覆盖，不做 UI 设置入口。
17. 环境变量名、memory namespace、产品名必须通过 `AppIdentity` / resolver 集中管理。
18. 旧路径导入只能 copy，不 move、不 delete；新旧 root 都有数据时不自动合并。
19. 第一版不导出、不同步到 `.opencode/adaptation/` 或 `.aether/adaptation/`。
20. 如果 `/docs/IPK` 是交接真源，正式交付时必须让它进入 git 跟踪或等价备份机制，不能只依赖本地 `.git/info/exclude` 外的磁盘文件。
21. `piece.type` 一旦创建不再变更；如需变更 type，走"删旧建新"或"保留原 piece + 新建"流程。
22. `surface.catalog` 不存储 `meta.json` 的镜像字段（`domains` / `methods` / `projects` / `contexts` / `status`），运行时直接从 `meta.json` 读取。
23. `summaries` 和 `proposals` 的物理存储位置由 `scope.level` 决定：`global` / `subject` 级放全局目录，`task_scope` / `artifact` 级放对应 task-scope 子目录。

## 12. 推荐给未来 AI 的实现口令

如果之后要让新的 AI 实现相关功能，可以直接给它以下约束：

```text
请不要修改 Aether/opencode 的底层命名空间，不要全局重命名 opencode。
请为 IPK 与用户自适应系统实现独立 MemoryRootResolver。
第一版 MemoryRootResolver 采用默认平台路径 + 环境变量覆盖，不做 UI 设置入口。
请通过 AppIdentity / build identity 集中注入 productName、envPrefix、memoryNamespace 和 legacyStorageNames。
IPK 真源放在 MemoryPath.ipkRoot()。
用户自适应真源放在 MemoryPath.adaptationRoot()。
session db 只保存 session 到 memory 对象的绑定、引用与 context_packet 快照。
项目级工作区 guidance 第一版不要默认写入项目目录，保存到 adaptation/workspace/projects/<project_id>/。
旧路径导入只能 copy，不 move、不 delete；如果新旧 root 都有数据，不自动合并。
第一版不要导出或同步到 .opencode/adaptation 或 .aether/adaptation；未来最多先做 pointer 或显式导出。
长期记忆写入必须走 /ipk 或 /adaptation 服务，不要让模型用通用 write/edit 直接写 memory root。
禁止全盘读写权限。
禁止在业务代码中硬编码 Aether、opencode、/home/bzz 或平台绝对路径。
高影响用户习惯变更必须走 proposal 确认流。
```

## 13. 当前结论的一句话版本

```text
IPK 是一份全局长期内容库；用户自适应系统是分层长期行为记忆；会话 db 只做过程、绑定和快照；二者通过独立 MemoryRootResolver 落盘，不参与 opencode 改名，不申请全盘读写。
```
