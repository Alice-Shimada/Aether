# IPK System：基于当前 Aether 项目的模块级落地设计（第一版）

这份文档只讨论 `idea + knowledge` 内容系统如何接入当前 Aether 项目。

## 1. 结论

我当前最推荐的落地方式是：

- `piece / map` 的持久化与编译放在 `packages/opencode`
- API 与事件流通过新的 `/ipk` route 暴露
- 前端交互与状态管理放在 `packages/app`
- 普通问答接入点放在 `SessionPrompt.prompt()` 的额外上下文构建阶段
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
IPK 的自动调用，最自然就应该挂在这一层。

### 2.4 全局事件流与前端同步机制

现有：

- `GlobalSDKProvider`
- `global-sync`
- SSE

非常适合承接：

- piece committed
- ipk reindexed

## 3. 后端建议挂载点

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
- `POST /ipk/piece/revise`
- `POST /ipk/piece/commit`
- `GET /ipk/piece/:id`
- `GET /ipk/pieces`
- `GET /ipk/maps/:name`
- `POST /ipk/reindex`

## 5. 前端建议挂载点

我建议新增：

- `packages/app/src/context/ipk.tsx`

并提供：

- session 内的一键生成 piece
- piece 审核对话框
- IPK 独立面板或页面

## 6. 与 session 的关系

第一版最自然的接法是：

- session 提供原始对话输入
- IPK ingest 把它编译成 piece

不建议一开始就把 piece 强塞进 session 存储表，因为：

- session 是对话过程对象
- piece 是长期认知对象

## 7. 在普通问答中的接入点

普通问答里，IPK 应该挂在：

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
