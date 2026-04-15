# IPK v1 实施总约束

这份文件是给“全新 AI 实现者”的总合同。

如果和其他较早的讲解稿冲突，以这份文件和上游权威文档为准。

## 1. 文档优先级

实现时必须遵守下面顺序：

1. [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
2. [ipk-content-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-implementation-decisions.zh-CN.md)
3. [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
4. [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
5. [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
6. [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)
7. [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md)
8. [ipk-content-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-open-questions.zh-CN.md)

## 2. 必须实现的 v1 边界

### 2.1 产品边界

- `IPK` 是独立模块，不混入 `reading-mode` 语义。
- `IPK` 第一版只在用户显式要求时触发，不自动介入普通问答。
- session 内必须支持显式“总结 -> 选消息 -> 开始总结”。
- `review` 必须是弹窗，不是独立页面。
- `review` 必须只有三个主按钮：
  - `入库`
  - `改进`
  - `暂存`
- `discard` 只能作为隐式状态，不是第四个主按钮。
- 第一版必须有右侧 `IPK库` 入口。
- `IPK库` 第一版有三个操作：
  - `审查暂存`
  - `编辑pieces`
  - `设置模型`

### 2.2 存储边界

- `IPK` 业务层只能通过 `MemoryPath.ipkRoot()` 获取数据根。
- 当前兼容实现可以把 `MemoryPath.ipkRoot()` 解析到 `Global.Path.data/ipk/`。
- 新代码不应直接硬编码 `Global.Path.data/ipk/` 作为长期协议。
- `Global.Path.data/ipk/` 如需兼容，只能在 `MemoryRootResolver` / `MemoryPath` 内部出现。
- IPK 写入必须校验目标仍在 memory root / IPK 允许子树内，并避免 `..`、路径分隔符和 symlink 写出 root。
- 第一版 `MemoryRootResolver` 采用默认平台路径 + 环境变量覆盖，不做 memory root UI 设置入口。
- 环境变量名、memory namespace、产品名必须通过 `AppIdentity` / resolver 集中管理。
- 旧路径导入只允许 copy，不 move、不 delete、不全盘扫描；新旧 root 都有数据时不自动合并。
- 第一版不导出、不同步到 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`。
- 正式内容真源是文件，不是数据库。
- 正式 piece 最少包含：
  - `piece.md`
  - `meta.json`
  - `surface.json`
  - `links.json`
- 工作过程放在 `drafts/`，不是直接污染正式 piece。
- 新 piece 入库不能回写旧 piece 的 `links.json`。
- `graph_links` 之类关系视图只能通过派生索引刷新。

### 2.3 schema 边界

- `piece.type` 只能先支持：
  - `idea`
  - `knowledge`
  - `thread`
  - `review`
  - `plan`
- 第一版不保留 `type: project`。
- `piece.type` 一旦创建不再变更，与 `id` 同等不可变。如需变更 type，走"删旧建新"或"保留原 piece + 新建另一 type 的 piece"流程。
- 来源工作区放 `origin.workspace_ref`。
- 概念项目归属放 `projects[]`。
- `surface.human.body_summary` 是当前结构真源。
- `piece.md` 的 `Summary` 段由它渲染生成。

### 2.4 运行时边界

- `搜索` 和 `联想` 必须显式区分。
- 第一版不允许系统自己猜用户到底想要 `搜索` 还是 `联想`。
- 第一版不要求把 `IPK` 自动挂进 `SessionPrompt.prompt()` 主链。
- 前端第一版直接 `fetch("/ipk/*")`，不要求先接 SDK typed client。

## 3. 明确延期，不要提前做

- 不做完整 IPK 库浏览页。
- 不做图谱可视化。
- 不做全局审查大页面。
- 不做自动并入已有 piece。
- 不做普通问答自动查 `IPK`。
- 不做自由扩展的 map/index schema。
- 不让 LLM 自由新增 schema 顶层键。

## 4. 推荐的后端模块落点

建议在 [packages/opencode/src/ipk](/home/bzz/Aether/packages/opencode/src/ipk) 下组织 `IPK` 领域代码。

推荐最小文件集合：

- `index.ts`
- `types.ts`
- `storage.ts`
- `draft.ts`
- `piece.ts`
- `compile.ts`
- `taxonomy.ts`
- `indexes.ts`
- `events.ts`
- `search.ts`
- `associate.ts`

必须新增：

- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)

必须修改：

- [packages/opencode/src/server/server.ts](/home/bzz/Aether/packages/opencode/src/server/server.ts)
- [packages/opencode/src/id/id.ts](/home/bzz/Aether/packages/opencode/src/id/id.ts)

## 5. 推荐的前端落点

建议新增：

- [packages/app/src/context/ipk.tsx](/home/bzz/Aether/packages/app/src/context/ipk.tsx)
- [packages/app/src/components/ipk-review-dialog.tsx](/home/bzz/Aether/packages/app/src/components/ipk-review-dialog.tsx)
- [packages/app/src/components/ipk-summary-button.tsx](/home/bzz/Aether/packages/app/src/components/ipk-summary-button.tsx)
- [packages/app/src/components/ipk-library-menu.tsx](/home/bzz/Aether/packages/app/src/components/ipk-library-menu.tsx)

大概率需要修改：

- [packages/app/src/app.tsx](/home/bzz/Aether/packages/app/src/app.tsx)
- [packages/app/src/components/prompt-input.tsx](/home/bzz/Aether/packages/app/src/components/prompt-input.tsx)
- [packages/app/src/pages/session.tsx](/home/bzz/Aether/packages/app/src/pages/session.tsx)
- [packages/app/src/pages/session/message-timeline.tsx](/home/bzz/Aether/packages/app/src/pages/session/message-timeline.tsx)
- [packages/app/src/pages/session/session-side-panel.tsx](/home/bzz/Aether/packages/app/src/pages/session/session-side-panel.tsx)

## 6. 统一的 API 合同

第一版建议稳定成下面这组接口。

### 6.1 草稿与 review

- `POST /ipk/piece/draft`
- `POST /ipk/piece/draft/stream`
- `POST /ipk/piece/revise`
- `POST /ipk/piece/revise/stream`
- `POST /ipk/piece/stash`
- `POST /ipk/piece/commit`
- `GET /ipk/draft/:id`
- `GET /ipk/drafts`
- `GET /ipk/pieces`
- `POST /ipk/piece/:id/edit-start`
- `POST /ipk/reindex`

### 6.2 显式检索、联想与模型设置

- `POST /ipk/search`
- `POST /ipk/associate`
- `GET /ipk/model`
- `POST /ipk/model`

### 6.3 推荐的请求形态

`POST /ipk/piece/draft`

```json
{
  "session_id": "ses_xxx",
  "message_ids": ["msg_a", "msg_b", "msg_c"],
  "mode": "new"
}
```

`POST /ipk/piece/revise`

```json
{
  "draft_id": "draft_xxx",
  "instruction": "不要写成结论，它只是一个猜想"
}
```

`POST /ipk/piece/draft/stream` 与 `POST /ipk/piece/revise/stream`

- 请求体与同名非流式接口保持一致
- 响应为 `text/event-stream`
- 前端默认走 `*/stream`，用于 review 弹窗的实时输出；非流式接口保留为兼容调用

`*/stream` 事件格式：

```text
event: progress   data: {"phase":"llm|finalize","title":"...","body_summary":"...","body":"...","raw":"...?"}
event: complete   data: <DraftView JSON>
event: error      data: {"message":"..."}
```

`POST /ipk/piece/stash`

```json
{
  "draft_id": "draft_xxx"
}
```

`POST /ipk/piece/commit`

```json
{
  "draft_id": "draft_xxx"
}
```

`POST /ipk/piece/:id/edit-start`

```json
{
  "piece_id": "piece_xxx"
}
```

`POST /ipk/search`

```json
{
  "query": "帮我搜索和 anisotropic Ising 自对偶条件最直接相关的 piece",
  "limit": 5
}
```

`POST /ipk/associate`

```json
{
  "query": "围绕这条关于 duality 的想法做更广泛的联想",
  "limit": 5,
  "seed_piece_id": "piece_xxx"
}
```

`POST /ipk/model`

```json
{
  "summarize": { "providerID": "openai", "modelID": "gpt-5.4-mini" },
  "revise": { "providerID": "openai", "modelID": "gpt-5.4" },
  "search": { "providerID": "openai", "modelID": "gpt-5.4-mini" },
  "associate": { "providerID": "openai", "modelID": "gpt-5.4-mini" }
}
```

## 7. 统一的读模型合同

第一版至少稳定这四类读模型。

### 7.1 `DraftView`

必须至少包含：

- `draft_id`
- `mode`
- `state`
- `session_id`
- `message_ids`
- `piece_id`
- `title`
- `body_summary`
- `body`
- `meta`
- `surface`
- `links`
- `updated_at`

### 7.2 `PieceCard`

必须至少包含：

- `piece_id`
- `title`
- `body_summary`
- `type`
- `status`
- `created_at`
- `updated_at`
- `projects`

### 7.3 `SearchHit`

必须至少包含：

- `piece_id`
- `title`
- `summary`
- `role`
- `confidence`
- `why`

### 7.4 `AssociateHit`

必须至少包含：

- `piece_id`
- `title`
- `summary`
- `bridge_reason`
- `risk`
- `confidence`

## 8. 统一的轻量事件

第一版至少需要这三个事件名：

- `ipk.draft.updated`
- `ipk.piece.committed`
- `ipk.reindexed`

允许前端先采用“收到事件后重新 fetch”这种轻量同步方式。

## 9. 统一的验证规则

每完成一个阶段，至少做下面两件事：

1. 在 [packages/opencode](/home/bzz/Aether/packages/opencode) 运行 `bun typecheck`
2. 在 [packages/app](/home/bzz/Aether/packages/app) 运行 `bun typecheck`

不要从仓库根目录直接跑测试。
