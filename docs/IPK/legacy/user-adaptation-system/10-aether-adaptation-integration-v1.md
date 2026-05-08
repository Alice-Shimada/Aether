# User Adaptation System：基于当前 Aether 项目的模块级落地设计（第一版）

这份文档只讨论“逐渐熟悉用户”的系统如何接入当前 Aether 项目。

## 1. 结论

我当前最推荐的落地方式是：

- `signals / summaries / profile / policy` 的持久化与编译放在 `packages/opencode`
- API 通过新的 `/adaptation` route 暴露
- 前端状态与入口放在 `packages/app`
- 普通问答在 `SessionPrompt.prompt()` 阶段读取 `profile / policy`
- 更新通知复用现有 `GlobalBus / SSE / global-sync`

## 2. 最值得复用的现有模式

### 2.1 独立命名空间 route

最自然的方式是新增：

- `/adaptation`

### 2.2 前端 provider 模式

当前 knowledge/context provider 模式已经很成熟，用户适配系统可以直接复用这一组织方式。

### 2.3 Session prompt 的运行时上下文注入

因为这套系统最终要影响回答方式，所以最自然的运行时接入点仍然是：

- `SessionPrompt.prompt()`

### 2.4 全局事件流

现有事件流非常适合承接：

- profile updated
- policy updated

## 3. 后端建议挂载点

我建议新增：

```text
packages/opencode/src/adaptation/
  index.ts
  signal.ts
  summary.ts
  profile.ts
  policy.ts
  analyzer.ts
  storage.ts
  types.ts
```

## 4. API 建议

第一版建议：

- `POST /adaptation/signals/extract`
- `GET /adaptation/signals`
- `POST /adaptation/summaries/rebuild`
- `GET /adaptation/profile`
- `POST /adaptation/profile/rebuild`
- `GET /adaptation/policy`

## 5. 与会话生命周期的关系

这套系统最自然的挂点是：

- 会话结束后抽取 signals
- 达到一定累积后生成 summaries
- 再按需要重建 profile 和 policy

不建议在每条消息发出时立刻改写长期画像。

## 6. 前端建议挂载点

我建议新增：

- `packages/app/src/context/adaptation.tsx`

并提供第一版入口：

- Settings 中的 Assistant Profile 页面
- 用户显式触发的“总结最近风格和偏好”

## 7. 在普通问答中的接入点

普通问答未来可以在进入模型前读取：

- 当前 profile
- 当前 policy

从而调整：

- 回答顺序
- 论证密度
- 发散程度
- 是否补更多边界说明

## 8. 一句话总结

从当前 Aether 项目出发，用户适配系统最合理的落地方式是：

- 在 `packages/opencode` 中形成独立的 `adaptation/` 后端领域模块
- 在 `packages/app` 中形成独立的 `AdaptationProvider` 和相关 UI
- 在 `SessionPrompt.prompt()` 中把 profile / policy 作为普通问答的长期调节层接入
