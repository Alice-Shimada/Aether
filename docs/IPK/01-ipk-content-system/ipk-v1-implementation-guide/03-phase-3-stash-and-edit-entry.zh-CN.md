# 阶段 3：暂存审查与 `编辑pieces` 入口

## 目标

把 `review` 阶段的“可回来继续做”能力补完整。

这一阶段完成后，用户应当可以：

- 从 `IPK库 -> 审查暂存` 重开已暂存草稿
- 从 `IPK库 -> 编辑pieces` 重开最近入库的 piece
- 对已入库 piece 走 `edit-start -> review -> commit`，而不是直接改正式源文件

## 必做项

### 1. `IPK库` 按钮与菜单

在现有右侧工具区域增加 `IPK库` 入口。

推荐优先接入位置：

- [packages/app/src/pages/session/session-side-panel.tsx](/home/bzz/Aether/packages/app/src/pages/session/session-side-panel.tsx)

如果当前实现中更合适的位置不是这里，也必须满足两个要求：

- 它在用户感知上属于右侧工具区，而不是左侧项目导航区
- 它弹出的第一版菜单包含三个操作

第一版菜单固定为：

- `审查暂存`
- `编辑pieces`
- `设置模型`

### 2. `审查暂存`

实现：

- `GET /ipk/drafts`
- `GET /ipk/draft/:id`

前端展示要求：

- 以一条一条 review 的形式展示
- 每条至少有可识别的摘要预览
- 选择某条后回到对应草稿的 review 弹窗
- 如果草稿关联原 `session_id`，尽量导航回原 session 再打开弹窗

### 3. `编辑pieces`

实现：

- `GET /ipk/pieces`
- `POST /ipk/piece/:id/edit-start`

后端语义固定为：

1. 用户选中某条已入库 piece
2. 系统创建一个新的 `edit` 模式工作草稿
3. 返回该草稿的 `DraftView`
4. 再进入同一套 review 流

不要做：

- 直接打开正式文件让用户编辑
- 绕开 review 流程直接改正式 piece

### 4. 保持“普通总结默认新建”

这一阶段要特别保证：

- 从 `编辑pieces` 入口进入，才默认理解为“编辑已有 piece”
- 从普通 session 重新选择消息总结，仍然默认新建 piece

这条规则不能被后台猜测逻辑偷偷打破。

### 5. `draft_id` 贯穿全链

这一步要把 `draft_id` 真正用起来。

至少保证：

- 暂存列表项能稳定定位到某个草稿
- `edit-start` 创建的新草稿也有独立 `draft_id`
- 草稿重开后，仍可继续 `改进 / 暂存 / 入库`

## 推荐文件

建议新增或修改这些文件：

- [packages/app/src/components/ipk-library-menu.tsx](/home/bzz/Aether/packages/app/src/components/ipk-library-menu.tsx)
- [packages/app/src/components/ipk-draft-list-dialog.tsx](/home/bzz/Aether/packages/app/src/components/ipk-draft-list-dialog.tsx)
- [packages/app/src/components/ipk-piece-list-dialog.tsx](/home/bzz/Aether/packages/app/src/components/ipk-piece-list-dialog.tsx)
- [packages/app/src/context/ipk.tsx](/home/bzz/Aether/packages/app/src/context/ipk.tsx)
- [packages/app/src/pages/session/session-side-panel.tsx](/home/bzz/Aether/packages/app/src/pages/session/session-side-panel.tsx)
- [packages/opencode/src/ipk/draft.ts](/home/bzz/Aether/packages/opencode/src/ipk/draft.ts)
- [packages/opencode/src/ipk/piece.ts](/home/bzz/Aether/packages/opencode/src/ipk/piece.ts)
- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)

## 阶段完成标准

- 右侧有 `IPK库` 按钮
- 菜单包含 `审查暂存`、`编辑pieces`、`设置模型`
- `审查暂存` 能展示已暂存草稿摘要并重开
- `编辑pieces` 能展示最近入库 piece 摘要并通过 `edit-start` 进入 review
- 编辑旧 piece 时不会直接改正式源文件
- 普通重新总结仍默认新建 piece
- `packages/opencode` 和 `packages/app` 都能通过 `bun typecheck`

## 这一阶段不要做什么

- 不做完整 IPK 库管理页面
- 不做图谱页面
- 不做自动识别“该不该并入旧 piece”
