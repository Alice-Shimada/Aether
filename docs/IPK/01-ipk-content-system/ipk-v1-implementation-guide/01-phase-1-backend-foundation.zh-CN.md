# 阶段 1：后端骨架与隐藏存储根

## 目标

先把 `IPK` 作为独立后端领域模块站起来，但先不碰复杂 UI。

这一阶段完成后，仓库里应该已经存在：

- 独立的 `packages/opencode/src/ipk/` 模块
- 独立的 `/ipk` route 命名空间
- 隐藏全局库根路径与目录辅助函数
- `piece` / `draft` / 读模型的基础类型
- `piece` / `draft` 的 ID 前缀支持

## 必做项

### 0. `MemoryRootResolver` 与 `AppIdentity`

在写 `IPK` 存储层之前，先建立独立长期记忆路径层。

第一版要求：

- 新增集中身份 / resolver 层，管理 `productName`、`envPrefix`、`memoryNamespace`、`legacyStorageNames`。
- `MemoryRootResolver` 支持默认平台路径 + 环境变量覆盖。
- 环境变量名由 `AppIdentity.envPrefix` 生成；当前实现使用 `<ENV_PREFIX>_MEMORY_HOME`。
- 第一版不做 memory root UI 设置入口。
- 至少暴露：
  - `MemoryPath.root()`
  - `MemoryPath.ipkRoot()`
  - `MemoryPath.adaptationRoot()`
  - `MemoryPath.cacheRoot()`
  - `MemoryPath.stateRoot()`
- `IPK` 代码不得直接读取具体环境变量名。
- `IPK` 业务代码不得硬编码 `Global.Path.data/ipk/`。
- 官方构建的产品名、环境变量前缀和 memory namespace 只能由 `AppIdentity` / resolver 决定，不得散落在业务模块、route、UI 或测试中。

旧路径导入只做安全兼容：

- 新 root 为空且旧 root 有数据时，可以提示用户 copy 导入。
- 只 copy，不 move，不 delete。
- 只检查 resolver 明确列出的旧路径候选，不扫描整个磁盘或 home。
- 新旧 root 都有数据时，不自动合并。
- 导入后写 `manifest.json` 记录来源、时间和 copy-only 策略。

推荐文件：

- [packages/opencode/src/memory/identity.ts](/home/bzz/Aether/packages/opencode/src/memory/identity.ts)
- [packages/opencode/src/memory/path.ts](/home/bzz/Aether/packages/opencode/src/memory/path.ts)
- [packages/opencode/src/memory/manifest.ts](/home/bzz/Aether/packages/opencode/src/memory/manifest.ts)

当前代码落地后，`Global.Path.data/ipk/` 只能出现在 resolver 内部作为兼容默认或 legacy candidate。`packages/opencode/src/ipk/storage.ts` 应通过 `MemoryPath.ipkRoot()` 获取根目录，并提供分段路径校验、memory root 内校验和临时文件 rename 写入辅助函数。

### 1. ID 与基础类型

在 [packages/opencode/src/id/id.ts](/home/bzz/Aether/packages/opencode/src/id/id.ts) 中为 `IPK` 增加最少两个前缀：

- `piece`
- `draft`

然后在 `ipk/types.ts` 中定义：

- `DraftMode`
- `DraftState`
- `DraftRecord`
- `DraftView`
- `PieceMeta`
- `PieceSurface`
- `PieceLinks`
- `PieceCard`
- `SearchHit`
- `AssociateHit`

这一步先把类型站稳，不要求立刻把所有生成逻辑做全。

### 2. 隐藏全局库路径

在 `ipk/storage.ts` 中实现最小路径层。  
路径层必须经由 `MemoryPath.ipkRoot()` / `MemoryRootResolver`，不要在业务代码里直接硬编码 `Global.Path.data/ipk/`。

第一阶段如果还没有完整独立 memory root，可以让 resolver 的兼容默认值指向 `Global.Path.data/ipk/`，但调用方仍然只依赖 `MemoryPath.ipkRoot()`。

最小路径 API：

- `root()`
- `piecesRoot()`
- `draftsRoot()`
- `indexesRoot()`
- `mapsRoot()`
- `taxonomyRoot()`
- `pieceDir(meta)`
- `draftDir(draftID)`

并确保第一次使用时自动创建：

- `MemoryPath.ipkRoot()`
- `manifest.json`

### 3. 后端 route 骨架

新增 [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)，并在 [packages/opencode/src/server/server.ts](/home/bzz/Aether/packages/opencode/src/server/server.ts) 注册：

- `.route("/ipk", IpkRoutes())`

这一阶段建议至少把下面几个接口的空壳注册出来：

- `GET /ipk/drafts`
- `GET /ipk/pieces`
- `GET /ipk/draft/:id`

如果你愿意，也可以把完整接口一次性全部注册，但此阶段不要求所有实现都完成。

### 4. 目录与 schema 约束

让 `IPK` 后端模块严格遵守：

- 正式内容在 `pieces/`
- 工作草稿在 `drafts/`
- 派生索引在 `indexes/`
- 地图在 `maps/`
- 词表在 `taxonomy/`

不要把 `IPK` 正式内容塞进数据库表作为真源。

## 推荐文件

建议这一阶段新增或修改这些文件：

- [packages/opencode/src/id/id.ts](/home/bzz/Aether/packages/opencode/src/id/id.ts)
- [packages/opencode/src/memory/identity.ts](/home/bzz/Aether/packages/opencode/src/memory/identity.ts)
- [packages/opencode/src/memory/path.ts](/home/bzz/Aether/packages/opencode/src/memory/path.ts)
- [packages/opencode/src/memory/manifest.ts](/home/bzz/Aether/packages/opencode/src/memory/manifest.ts)
- [packages/opencode/src/ipk/index.ts](/home/bzz/Aether/packages/opencode/src/ipk/index.ts)
- [packages/opencode/src/ipk/types.ts](/home/bzz/Aether/packages/opencode/src/ipk/types.ts)
- [packages/opencode/src/ipk/storage.ts](/home/bzz/Aether/packages/opencode/src/ipk/storage.ts)
- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)
- [packages/opencode/src/server/server.ts](/home/bzz/Aether/packages/opencode/src/server/server.ts)

## 阶段完成标准

- `/ipk` route 已经挂载
- `MemoryRootResolver` / `MemoryPath` 已经可用
- 默认平台路径 + 环境变量覆盖已经可用
- `MemoryPath.ipkRoot()` 能被自动创建
- `piece` 与 `draft` ID 可以通过统一 `Identifier` 生成
- `IPK` 的基础类型和路径层已经稳定
- `packages/opencode` 可以通过 `bun typecheck`

## 这一阶段不要做什么

- 不做 message 选择 UI
- 不做 review 弹窗
- 不做普通问答自动接入
- 不做 map/index 真实重编译
- 不做完整 search/associate
- 不做 memory root UI 设置入口
- 不做旧库自动合并
- 不做导出或同步到 `.opencode/`、`.aether/`
