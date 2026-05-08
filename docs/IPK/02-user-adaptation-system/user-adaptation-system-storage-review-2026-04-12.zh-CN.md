# 用户自适应系统文档审查：储存相关缺陷与待决事项

审查日期：2026-04-12
审查范围：`docs/IPK/02-user-adaptation-system/` 全部 11 个文档 + 跨系统存储契约 + 已有代码
审查重点：储存方式的定义清晰度、文档间一致性、实现者可执行性

## 0. 阅读本文前须知

本文是对用户自适应系统现有文档的一次系统审查结果。

它的目的是：

- 列出所有已发现的储存相关缺陷和文档间矛盾。
- 区分"可以直接修复"和"需要用户决策"的问题。
- 为后续讨论和修改提供完整上下文，让接手的 AI 不需要重新全量阅读所有文档就能定位问题。

本文不修改任何现有文档。所有修改应在用户确认方案后进行。

### 涉及的文件

审查涵盖以下文件（按文档优先级从高到低）：

1. `docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md`（存储契约，最高优先级）
2. `docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md`
3. `docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md`
4. `docs/IPK/02-user-adaptation-system/user-adaptation-system-aether-integration-v1.md`
5. `docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md`
6. `docs/IPK/02-user-adaptation-system/user-adaptation-system-details.zh-CN.md`
7. `docs/IPK/02-user-adaptation-system/user-adaptation-system-details.en.md`
8. `docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md`
9. `docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.en.md`
10. `docs/IPK/02-user-adaptation-system/user-adaptation-system-vision.md`
11. `docs/IPK/02-user-adaptation-system/user-adaptation-system-profile-and-adaptation.md`
12. `packages/opencode/src/memory/identity.ts`（AppIdentity 定义）
13. `packages/opencode/src/memory/path.ts`（MemoryRootResolver / MemoryPath 实现）
14. `packages/opencode/src/memory/manifest.ts`（manifest schema 与读写）

### 文档优先级规则

当文档之间存在冲突时，以 `implementation-decisions.zh-CN.md` section 0 确立的优先级为准：

```text
1. implementation-decisions（已拍板约束）
2. schema-v1（推荐 schema）
3. aether-integration-v1（嵌入方案）
4. open-questions（未定问题）
5. details / overview / vision / profile-and-adaptation（说明性文档）
6. 英文稿
```

跨系统存储契约 `ipk-and-adaptation-storage-access-contract.zh-CN.md` 在涉及"存储根、调用边界、权限边界"时优先于上述所有文档。

---

## 1. 储存布局：schema-v1 section 11 严重不完整

### 问题描述

`schema-v1.md` section 11 "推荐本地文件布局" 是实现者最先参考的布局定义。但它只列出了两个子树：

```text
MemoryPath.adaptationRoot()/global/
MemoryPath.adaptationRoot()/workspace/projects/<project_id>/
```

而存储契约 section 4.2 的完整目录树还包括以下子树，schema-v1 中完全没有提到：

| 缺失子树 | 存储契约中的位置 | 作用 |
|---|---|---|
| `signals/<year>/<month>/signals.jsonl` | 契约 4.2 + 6.6.1 | signal 的全局 JSONL 归档 |
| `summaries/` (全局级) | 契约 4.2 + 6.6.1 | global/subject 级 summary 存储 |
| `proposals/pending/confirmed/rejected/` (全局级) | 契约 4.2 + 6.6.1 | global/subject 级 proposal 存储 |
| `bindings/sessions/` `projects/` `task-scopes/` | 契约 4.2 | session -> memory 对象的绑定索引 |
| `indexes/` | 契约 4.2 | 适配记录的检索索引 |

### 影响

实现者如果只读 schema-v1，会完全不知道：

- signals 应该存在哪里。
- global/subject 级的 summaries 和 proposals 放在哪里（只看到 task-scope 级的）。
- session 绑定索引放在哪里。

### 修复方向

直接补齐 schema-v1 section 11 的布局，使其与存储契约一致。或者改为只引用存储契约，不重复列出（见 #11）。

---

## 2. `project_guidance` 曾有布局位置但无完整 schema 定义（已按 v1 最小版收敛）

### 问题描述

存储契约和 schema-v1 的布局中都出现了：

```text
projects/<project_id>/
  project-guidance.json
  project-guidance.md
```

但整套文档中早期没有任何地方完整定义 `project_guidance` 的字段结构，也没有把“project guidance 的轻量 refs”与“长期 policy 真源”分清。

对比之下，`global_guidance`（schema-v1 section 5）和 `subject_profile`（schema-v1 section 6）都有完整的 JSON 示例和字段说明。

### 原本需要用户决策的问题

- **问题 A**：`project-guidance` 的字段和 `global_guidance` 一样吗？还是它有独立的结构（比如包含 `project_id`、项目级别的工作偏好等）？
- **问题 B**：project guidance 的轻量 refs 与长期 policy 真源应该怎样分工？它和 task_scope / initiative / global 的覆盖关系是什么？
- **问题 C**：第一版是否需要实现 project_guidance，以及重复候选的降噪应该怎样与它分工？

### 背景

早期文档曾把 project 层误混进 policy 层级，同时又缺少清晰 schema；这导致 project 引用层、initiative 真源和 guidance refs 三者边界不清。

### 本轮处理结论

用户已同意采用 v1 最小版：

- `project_guidance.json` 进入 v1，只保存项目级稳定背景、引用关系和轻量上下文，不保存项目正文。
- `project_policy.json` 已从设计中删除；后续又进一步删除了 `project_suppression`，重复候选降噪改由 guidance 维护与 proposal merge 承担。
- 长期 policy 覆盖顺序拍板为 `artifact > task_scope > initiative policy > subject > global`。
- adaptation policy 不能覆盖系统 / developer 指令、权限判断、当前用户明确要求或 repo `AGENTS.md`。

---

## 3. JSON + Markdown 双视图的 .md 文件规则从未定义

### 问题描述

多处文档推荐为每个长期记录同时维护 `.json` 和 `.md` 两个文件：

- 详情文档 section 9.3 说"JSON 作为结构化稳定读写层，Markdown 作为人类和 AI 都容易快速审阅的镜像层"。
- schema-v1 section 11 的布局中每个对象都有 `.json` + `.md` 双文件。

但从未说明：

| 未定义项 | 影响 |
|---|---|
| `.md` 是自动从 `.json` 渲染的，还是独立编写的？ | 决定是否需要写渲染器 |
| `.md` 的模板/格式是什么？ | 决定生成逻辑 |
| `.json` 更新后 `.md` 何时同步？ | 决定更新流程 |
| 两者内容冲突时以谁为准？ | 决定冲突处理逻辑 |
| 用户是否可以直接编辑 `.md`？ | 决定是否需要 md -> json 反向解析 |

### 需要用户决策的问题

- **问题 A**：`.md` 是 `.json` 的只读镜像（自动生成、不可手动编辑）？
- **问题 B**：还是 `.md` 和 `.json` 是各自独立的视图，`.json` 给系统用、`.md` 给人用，两者各自维护？
- **问题 C**：还是第一版不做 `.md` 双视图，只保存 `.json`，等系统稳定后再加人类可读层？

### 建议

如果选择 A，实现上最简单——每次写入 `.json` 后立即调用渲染函数生成 `.md`，`.json` 是唯一真源。如果选择 B，复杂度会大幅增加，需要冲突检测和合并。如果选择 C，可以在 open-questions 中记录，不增加第一版工作量。

---

## 4. `context_packet` 的储存位置含糊

### 问题描述

`context_packet` 是 query-time 编译结果，详情文档 section 6.8 说"不一定需要长期保存为最终真源"。

但存储契约 section 7 的 session db 绑定列表中包含：

```text
session_id -> context_packet_id
session_id -> context_packet_snapshot
```

这意味着 context_packet 至少要在某个地方持久化。但目录树（存储契约 section 4.2）中没有为 context_packet 分配位置。

### 需要用户决策的问题

- **问题 A**：context_packet 只存在 session db 中（作为 snapshot），不写独立文件？
- **问题 B**：context_packet 写入 `cache/adaptation/` 作为派生缓存，session db 只存引用 ID？
- **问题 C**：context_packet 完全不持久化，session db 中的 snapshot 只是用于调试/审计的可选字段？

### 影响

这决定了 context compiler 的输出应该写到哪里，以及 session db schema 应该怎么设计。

---

## 5. 三处布局描述完整度不一致

### 问题描述

同一套 adaptation 目录结构在三个文档中都有描述，但各自的完整度不同：

| 文档 | 位置 | 覆盖范围 |
|---|---|---|
| 存储契约 section 4.2 | 完整目录树 | signals, global, projects, summaries, proposals, bindings, indexes, cache |
| schema-v1 section 11 | 布局推荐 | 只有 global + projects（缺 signals, bindings, indexes, 全局 summaries/proposals） |
| 详情文档 section 9.2 | 存储推荐 | 只有 global + projects（同样缺失） |

### 修复方向

这个问题和 #1 相关，解决方案见 #11。

---

## 6. signal 的 evidence 字段名在两处文档不一致

### 问题描述

**schema-v1 section 2** 的 signal 示例：

```json
"evidence": [
  {
    "source": "user_message",
    "ref": "msg_123",
    "quote": "尽量先用我熟悉的统计物理语言来讲。"
  }
]
```

**详情文档 section 6.1** 的 signal 示例：

```json
"evidence": [
  {
    "message_id": "msg_123",
    "quote": "尽量先用我熟悉的统计物理语言来讲。"
  }
]
```

差异：

| 字段 | schema-v1 | 详情文档 |
|---|---|---|
| 来源类型 | `"source": "user_message"` | 无 |
| 消息引用 | `"ref": "msg_123"` | `"message_id": "msg_123"` |

### 修复方向

可以直接统一。建议以 schema-v1 为准（它有更多结构化字段），同时更新详情文档保持一致。schema-v1 的 `source` + `ref` 组合更通用，因为 signal 来源不一定是用户消息，也可能来自文件变更、工具操作等。

---

## 7. proposal 状态列表曾在 schema-v1 中不完整

### 问题描述

早期文档里曾写过：

```text
pending -> confirmed / rejected / deferred
```

而运行时代码实际采用的是 `pending / confirmed / rejected / deferred` 四态。该问题现在已经通过同步 schema、details 和 implementation guide 修正。

### 修复方向

保持 schema 与代码一致，继续使用 `pending / confirmed / rejected / deferred`；如果后续确实需要 `draft / archived`，应作为新增实现再统一引入。

---

## 8. 详情文档存在空壳父标题

### 问题描述

详情文档 `user-adaptation-system-details.zh-CN.md` 中：

- `## 6. 核心对象` 标题下没有任何正文，直接跳到 `## 6.1 signals`
- `## 9. 本地存储设计` 标题下没有任何正文，直接跳到 `## 9.1 总体原则`

### 修复方向

给空壳标题加一两句引导语，或者去掉父标题直接用子标题。

---

## 9. 存储契约引用了不存在的 `MemoryPath.root()`（复核后已不成立）

### 问题描述

存储契约 section 3 写了：

```ts
MemoryPath.root()
MemoryPath.ipkRoot()
MemoryPath.adaptationRoot()
MemoryPath.cacheRoot()
MemoryPath.stateRoot()
```

复核当前代码后，`packages/opencode/src/memory/path.ts` 已经暴露 `MemoryPath.root()`，并委托 `MemoryRootResolver.root()`。

因此这一条属于 review 与当前代码之间的时间差，不再需要修改存储契约。

### 修复方向

无需修复。后续只需维持文档和代码一致：`MemoryPath.root()` 可以作为公开路径 API 存在，但业务模块仍应优先调用更具体的 `MemoryPath.ipkRoot()` / `MemoryPath.adaptationRoot()`。

---

## 10. 存储契约的 AppIdentity 概念示例与代码不一致

### 问题描述

存储契约 section 3 的概念示例：

```ts
AppIdentity = {
  productName: "Aether",
  compatibilityName: "opencode",
  memoryNamespace: "...",
  legacyStorageNames: ["opencode"]
}
```

实际代码 `packages/opencode/src/memory/identity.ts`：

```ts
export const AppIdentity = {
  productName: "Aether",
  envPrefix: "AETHER",
  memoryNamespace: "aether-memory",
  legacyStorageNames: ["opencode"],
} as const
```

差异：

- 代码里没有 `compatibilityName`，用的是 `legacyStorageNames`。
- 代码里有 `envPrefix: "AETHER"`，概念示例里没有。
- 代码里 `memoryNamespace` 有具体值 `"aether-memory"`，概念示例只写了 `"..."`。

### 修复方向

将存储契约中的概念示例更新为与代码一致。概念示例应反映实际已实现的字段。

---

## 11. 建议：将文件布局统一到单一权威来源

### 当前状况

adaptation 目录结构在三处定义，各自残缺且有微妙差异（见 #1 和 #5）。

### 建议方案

将存储契约 section 4.2 作为唯一完整的 adaptation 目录树权威来源。schema-v1 section 11 和详情文档 section 9.2 改为：

```text
完整目录树请参考 ipk-and-adaptation-storage-access-contract.zh-CN.md section 4.2。
```

然后只保留与自身语境相关的补充说明（比如 schema-v1 可以保留 "session db 只保存过程绑定" 的规则，但不再重复列目录）。

### 需要用户确认

- 是否同意这个统一方向？
- 还是更希望每份文档都保持自包含，即使有重复？

---

## 总结：问题分类与后续行动

### 可以直接修复（不需要用户决策）

| # | 问题 | 修复方式 |
|---|---|---|
| 1 | schema-v1 布局不完整 | 补齐或改为引用存储契约（取决于 #11 决策） |
| 5 | 三处布局不一致 | 同上 |
| 6 | signal evidence 字段名冲突 | 统一为 schema-v1 的 `source` + `ref` 结构 |
| 7 | proposal 状态列表不完整 | 在 schema-v1 补齐完整枚举 |
| 8 | 详情文档空壳标题 | 加引导语 |
| 9 | MemoryPath.root() 引用错误 | 复核后已不成立，无需修改 |
| 10 | AppIdentity 示例过时 | 按代码更新 |

### 需要用户决策 / 本轮收敛状态

| # | 问题 | 核心决策点 |
|---|---|---|
| 2 | project_guidance 边界与项目级局部控制无 schema | 已按 v1 最小版收敛；后续只讨论扩展字段与 UI 覆盖解释 |
| 3 | .md 双视图规则未定义 | 本轮建议收敛为 JSON 真源 + Markdown 自动渲染镜像 |
| 4 | context_packet 储存位置 | 本轮建议收敛为 session db 可存 snapshot，完整文件只进 cache |
| 11 | 布局是否统一到存储契约一处 | 本轮建议收敛为存储契约 section 4.2 作为唯一完整目录树权威来源 |

## 12. 本轮处理建议状态

根据本次复核，建议后续把本 review 的问题状态理解为：

- 已可直接吸收：#6、#7、#8、#10。
- 已建议吸收：#1、#5、#11，采用“存储契约 section 4.2 是唯一完整目录树权威来源”的方式，schema/details 只保留关键锚点。
- 已形成第一版建议决策：#3，JSON 是结构化真源，Markdown 是自动渲染的人类可读镜像。
- 已形成第一版建议决策：#4，`context_packet` 不是长期真源；session db 可保存 snapshot，完整文件如需落盘只进入 cache。
- 已形成并继续收敛的决策：#2，`project_guidance` 进入 v1，`project_policy` 删除；后续进一步删除 `project_suppression`，重复候选降噪改由 guidance 维护与 proposal merge 承担；policy 覆盖顺序为 `artifact > task_scope > initiative policy > subject > global`。
- 已不成立：#9，当前代码已经有 `MemoryPath.root()`。
