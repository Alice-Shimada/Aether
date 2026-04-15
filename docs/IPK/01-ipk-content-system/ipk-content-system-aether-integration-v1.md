# IPK System：基于当前 Aether 项目的模块级落地设计（第一版）

这份文档只讨论 `idea + knowledge` 内容系统如何接入当前 Aether 项目。

## 1. 结论

我当前最推荐的落地方式是：

- `piece / map` 的持久化与编译放在 `packages/opencode`
- API 与事件流通过新的 `/ipk` route 暴露
- 前端交互与状态管理放在 `packages/app`
- 普通问答接入点保留在 `SessionPrompt.prompt()` 的额外上下文构建阶段，作为未来扩展 hook
- 地图与入库后的更新通知复用现有 `GlobalBus / SSE / global-sync`

## 2. 最值得复用的现有模式

### 2.1 独立命名空间的后端 route 组织

当前 server 已经按功能拆出多条 route，所以 IPK 最自然的方式是新增：

- `/ipk`

### 2.2 知识库的“后端服务 + 前端 provider”模式

当前 knowledge 模块已经提供了一个成熟模板：

- 后端 route
- 前端 context
- UI 面板

IPK 很适合复用这一组织方式。

### 2.3 Session prompt 的运行时额外上下文注入

当前 `SessionPrompt.prompt()` 已经支持在正式进入模型前拼接额外知识上下文。  
IPK 如果未来要接普通问答，这一层仍然是最自然的 hook。

### 2.4 全局事件流与前端同步机制

现有：

- `GlobalSDKProvider`
- `global-sync`
- SSE

非常适合承接：

- piece committed
- ipk reindexed

## 3. 后端建议挂载点

> **注意**：下面的文件拆分是本文档的早期建议。后端模块的最终最小文件集合以 [00-implementation-contract.zh-CN.md](ipk-v1-implementation-guide/00-implementation-contract.zh-CN.md) 为准。如果二者有冲突，以 implementation-contract 为准。

我建议新增：

```text
packages/opencode/src/ipk/
  index.ts
  piece.ts
  schema.ts
  storage.ts
  ingest.ts
  quality.ts
  map.ts
  link.ts
  route.ts
  search.ts
  types.ts
```

## 4. API 建议

第一版建议：

- `POST /ipk/piece/draft`
- `POST /ipk/piece/draft/stream`
- `POST /ipk/piece/revise`
- `POST /ipk/piece/revise/stream`
- `POST /ipk/piece/stash`
- `POST /ipk/piece/commit`
- `GET /ipk/draft/:id`
- `GET /ipk/piece/:id`
- `GET /ipk/pieces`
- `GET /ipk/drafts`
- `POST /ipk/piece/:id/edit-start`
- `GET /ipk/maps/:name`
- `POST /ipk/reindex`

其中 `*/stream` 为前端默认调用入口，返回 `text/event-stream`，事件约定如下：

- `event: progress`：中间草稿（用于 review 弹窗实时刷新 `title/body_summary/body`）
- `event: complete`：最终 `DraftView`
- `event: error`：失败信息 `{ message }`

## 5. 前端建议挂载点

我建议新增：

- `packages/app/src/context/ipk.tsx`

并提供：

- session 内显式“总结”入口
- piece 审核对话框
- 右侧栏 `IPK库` 按钮
- `IPK库` 菜单中的 `审查暂存`
- `IPK库` 菜单中的 `编辑pieces`
- `IPK库` 菜单中的 `设置模型`

## 6. 与 session 的关系

第一版最自然的接法是：

- session 提供原始对话输入
- IPK ingest 把它编译成 piece

不建议一开始就把 piece 强塞进 session 存储表，因为：

- session 是对话过程对象
- piece 是长期认知对象

## 7. 在普通问答中的接入点

这部分是未来扩展挂接点，不属于第一版默认行为。

如果后续要让普通问答接 IPK，最自然的接法仍然是：

- `SessionPrompt.prompt()`

未来可以在 prompt 构造阶段：

1. 判断是否需要查 IPK
2. 若需要，读取地图和 surface
3. 拼出压缩后的辅助上下文
4. 再进入模型

## 8. 一句话总结

从当前 Aether 项目出发，IPK 内容系统最合理的落地方式是：

- 在 `packages/opencode` 中形成独立的 `ipk/` 后端领域模块
- 在 `packages/app` 中形成独立的 `IPKProvider` 和相关 UI
- 在 `SessionPrompt.prompt()` 中接入普通问答时的运行时上下文增强
