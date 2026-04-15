# Decision: Project ↔ Initiative 完全解绑 + 习惯库分层路由/分区机制

- **日期**：2026-04-14
- **拍板人**：用户
- **状态**：v1 必须遵守，覆盖所有早期文档中与本文件冲突的条款
- **优先级**：高于 `user-adaptation-system-implementation-decisions.zh-CN.md` §0.5 之外的所有章节；高于所有较早的 details / overview / vision / schema / scope-mechanics / implementation-guide 文稿；冲突时以本文件为准
- **关联**：[implementation-decisions.zh-CN.md §0.5 三块架构最高约束](../IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)

## 1. 取消 v1 默认 1:1 绑定

Aether 工作区侧的 `project` 与习惯库内部的 `initiative` scope 层在 v1 **不建立任何默认绑定**。具体地：

- 创建 / 打开一个 Aether project 时，**禁止**自动在习惯库下创建对应 initiative 记录。
- `initiative_id` **不得**由 `project_id` 派生（不得使用 `iid(project_id)` 之类的硬推导）。
- Aether 工作区 session 记录**不得**假设"当前 session 正处于某个 initiative" —— 这个归属关系必须由分区/路由机制回答。
- `ScopeLevel` 类型层不得再出现 `project → initiative` 的 preprocess 或别名替换；Aether 工作区永远叫 `project`，习惯库 scope 标签叫 `initiative`，两者身份独立。
- 显式 binding 仍被允许：用户可以在 UI 里手动声明 "这个 Aether project 为某些 initiative 提供 hint"，但这条 binding 只作为路由 classifier 的上下文信号，不是硬绑定。

这条决策取代所有较早文档中 "v1 默认一对一映射" / "v1 可以由当前 Aether project 绑定到一个独立 initiative_id" / "第一版默认一对一绑定" 等表述。

## 2. 决策动机

早期的 1:1 绑定是**对"习惯怎么分区"没想清楚的占位方案**：把 Aether project 当成 initiative 的代理键，回避了真正的分区问题。问题在于 initiative 应该对应**用户生活/工作里的真实长期事项**，这与 Aether 工作区 project 的边界并不一致。一个用户的同一个 Aether project 下可以做多件长期事，多个 Aether project 也可能服务同一件长期事；1:1 绑定会迫使习惯库的 scope 拓扑跟着 Aether 工作区拓扑走，污染真源。

v1 改为使用**分层路由/分区机制**解决这个问题，从根本上移除对 1:1 绑定的依赖。

## 3. 分层路由/分区机制（v1 纳入）

### 3.1 问题定义

习惯库五层中，每一层不是一个扁平 bucket，而是**多个命名 bucket 的集合**：

| 层 | 每个 bucket 的含义 | 分区键 |
|---|---|---|
| global | 全局偏好（v1 基本只有 1 个 bucket） | 无 |
| subject | 一个主题/学科 | subject 概念 |
| initiative | 一件真实长期事项 | 长期事项身份 |
| task_scope | 一个具体任务 | 任务身份 |
| artifact | 一个产物（文件 / piece / 文档） | 产物身份 |

当一条 scratch 习惯被 confirm 升级到某一层时，必须决定：**归入该层下哪一个已有 bucket？或者新建一个 bucket？** 这个决定就是"路由"。

### 3.2 路由双步流水线

路由发生在 proposal confirm 阶段（即暂存候选要升级进真源库的瞬间）。

**Step 1：AI classifier**

输入：
- 候选习惯正文；
- 关联的 evidence signals；
- 当前 session 上下文（session_id / subject tags / 所在 Aether project 作为 hint，但仅作 hint）；
- 目标层下所有已有 bucket 的轻量画像：`{id, display_name, aliases, summary, 最近 10 条 evidence 摘要}`（**不读正文**，以控制 prompt 成本）。

输出三种形态之一：
- `match`：建议归入某个已有 bucket id + 置信度分数 + 理由；
- `new`：建议新建 bucket + 候选名字 + 候选 aliases + 理由；
- `unsure`：低置信度，无推荐，转给用户人工决策。

**Step 2：处置规则**

- **高置信度 `match` 或 `new`** → AI **可以直接执行**（直接归入 / 直接新建 bucket 并写入）。阈值需要一个可配置常量，默认较保守（例如 0.85）；所有自动处置必须留痕到 audit log 让用户回看与撤销。
- **中等置信度** → 进入 proposal inbox 等用户 review；review 界面展示 classifier 输出，用户可 accept / 改到其它 bucket / 改层 / 编辑新 bucket 名 / 拒绝。
- **低置信度或 `unsure`** → 必进 inbox，默认不写入。

所有"新 bucket"即便由 AI 自动创建，也必须：
- 立即生成独立的 bucket id（uuid / slug 派生，不复用任何现有 id）；
- 物理创建最小骨架（`<layer>/<bucket_id>/profile.json` 等基础文件）；
- 写入 audit log，标注 `created_by: ai` + classifier 置信度 + 触发证据。

### 3.3 路由在五层的具体适配

| 层 | 现成可复用机制 | 新增/适配 |
|---|---|---|
| global | 无需路由（v1 视为 1 bucket） | 无 |
| subject | [taxonomy.ts](../../packages/opencode/src/adaptation/taxonomy.ts) 的 alias 归一 | 扩展 classifier 调用该归一表 |
| initiative | 无 | 全新 classifier + bucket list + 创建流程 |
| task_scope | 无 | 同 initiative |
| artifact | 无 | 同 initiative，但 bucket 粒度较细（一文件一 bucket） |

### 3.4 Merge / Split

- **Merge 进 v1**：两个 bucket 发现是同一件事时支持合并。实现方式：把被合并 bucket 标 tombstone + redirect 到目标 bucket id；工作区引用层按 id 会自动跟上。evidence 证据迁移：merge 时一次性把被合并 bucket 的 evidence 挂到目标 bucket。
- **Split 延后到 vNext**：一个 bucket 涨太大需要拆分的场景，涉及 evidence 重新分配与历史证据归属判定，v1 不做。

### 3.5 跨层多 scope tag

允许同一条习惯同时挂多个 scope tag（例如一条规则既是 `initiative=A`，又是 `subject=B`）。这与"五层平行 scope 标签"的架构一致 —— scope 是**标签集合**，不是单一归属。Proposal 升级时 classifier 可以对多层分别给出建议（同一条习惯可能触发多层 bucket 决定）。

### 3.6 工作区侧的变更

- `project.ts` 删除自动创建 initiative 的路径。
- session binding 里不再硬绑 `initiative_id`；session → 习惯库的引用通过 classifier 路由建立。
- Aether project / session 仍可作为 classifier 的上下文信号源。
- Aether project 引用层继续叫 `project`，永不改名为 `initiative`。

## 4. 对既有代码的影响

必须同步修正（已在之前审计列为 V1–V10）：

- **V7**：删除 [types.ts:4-7](../../packages/opencode/src/adaptation/types.ts) 的 `project → initiative` preprocess。
- **V8**：重写 [project.ts:60-93](../../packages/opencode/src/adaptation/project.ts) 的自动 initiative 生成；改为"不再自动创建 initiative"。
- **V6**：`ScopeLevel` 拆成 `HabitScopeLevel` 与 `WorkspaceLayer` 两个独立枚举。
- 其它耦合修复（V1/V2/V3/V4/V5/V9/V10）见 implementation-decisions §0.5 的审计清单。

## 5. 对既有文档的影响

下列文档中所有 "v1 默认一对一绑定 / v1 由 project 映射推导出 initiative_id / v1 不跨 project 复用 initiative" 表述必须按本文件重写或删除：

- `docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md` §2.7b 与 350-354 行附近
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md` 33-43 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-readiness-review-2026-04-12.zh-CN.md` 104、137 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md` 117 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/02-phase-2-bindings-and-scope-matching.zh-CN.md` 9、23-24、30 行（整节需重写）
- `docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/07-phase-7-indexes-hardening-and-fixtures.zh-CN.md` 171 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md` 316、394 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-details.zh-CN.md` 546、548 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-details.en.md` 513-515 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md` 123 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.en.md` 84 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-vision.md` 184 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md` 56、60、287、853、868、878-883 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-habit-library-graphify-execution-plan.zh-CN.md` 29、500、537、806-807 行
- `docs/IPK/02-user-adaptation-system/user-adaptation-system-storage-review-2026-04-12.zh-CN.md` 125、395 行

同时 `docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/` 需要新增或修订一节/一个 phase 专述"路由 classifier + merge + 多 scope tag"。

## 6. 流程防复发

为避免类似"用户口头拍板但从未入档"的失传，以后任何架构级拍板必须：

1. 当场开 `docs/decisions/<topic>.md`；
2. 同一轮动作里把受影响的长稿（details / overview / implementation-guide / schema 等）同步改掉；
3. 在 [CHANGELOG.md](../../CHANGELOG.md) 的 Unreleased 段加一行引用。

本文件本身就是这条流程的第一次实践。
