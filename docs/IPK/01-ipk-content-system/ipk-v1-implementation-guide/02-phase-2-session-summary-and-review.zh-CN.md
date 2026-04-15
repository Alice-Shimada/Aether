# 阶段 2：session 内显式总结与 review 弹窗

## 目标

把 `IPK v1` 最核心的用户闭环先做通：

- 点击“总结”
- 勾选消息
- 点击“开始总结”
- 生成 `DraftView`
- review 弹窗
- `改进`
- `暂存`
- `入库`

这一步是整套系统的主链，不要被高级功能分散注意力。

## 必做项

### 1. 前端 `IPKProvider`

新增 [packages/app/src/context/ipk.tsx](/home/bzz/Aether/packages/app/src/context/ipk.tsx)，承担三类职责：

- 直接 `fetch("/ipk/*")` 的 API 封装
- 当前 session 的 `IPK` 选择模式状态
- review 弹窗打开、关闭和当前草稿状态

然后在 [packages/app/src/app.tsx](/home/bzz/Aether/packages/app/src/app.tsx) 中把它挂进现有 provider 栈。

### 2. session 内“总结”入口

在 [packages/app/src/components/prompt-input.tsx](/home/bzz/Aether/packages/app/src/components/prompt-input.tsx) 中增加显式“总结”按钮。

建议位置：

- 与现有 [knowledge-button.tsx](/home/bzz/Aether/packages/app/src/components/knowledge-button.tsx) 同一工具区

要求：

- 进入“选择消息模式”前要有清楚的视觉反馈
- 不要把这个入口埋进多级菜单

### 3. 消息多选模式

修改 [packages/app/src/pages/session/message-timeline.tsx](/home/bzz/Aether/packages/app/src/pages/session/message-timeline.tsx)，让用户在进入 `IPK` 总结模式后：

- 每条消息左侧出现圆圈
- 用户消息和 AI 消息都允许勾选
- 勾选手感参考微信多选消息
- 聊天框底部出现“选择到这里”横线按钮，支持一键批量选到截线位置

必须满足：

- 未进入选择模式时，不出现这些圆圈
- 退出选择模式后，选择状态可清空
- 选中的消息顺序必须按时间线保留
- 当前默认策略：截线碰到的那条消息也算选中

### 4. “开始总结” CTA

在选择模式下，当至少选中一条消息时，出现“开始总结”按钮。

推荐位置：

- session 底部右下区域
- 或紧贴 composer 的右下控制区

要求：

- 按钮只能在选择模式且存在已选消息时出现
- 点击后默认调用 `POST /ipk/piece/draft/stream`
- review 弹窗在生成中必须可见，并随着流式事件持续刷新内容

### 5. 后端 draft 生成链

在后端实现：

- `capture`
- `draft`
- `structure`
- `quality`

第一阶段可以把这几步先组合在一条内部服务里，但最终必须产出一个 `DraftView`。

至少实现这些接口：

- `POST /ipk/piece/draft`
- `POST /ipk/piece/draft/stream`
- `POST /ipk/piece/revise`
- `POST /ipk/piece/revise/stream`
- `POST /ipk/piece/stash`
- `POST /ipk/piece/commit`
- `GET /ipk/draft/:id`

### 6. review 弹窗

新增 [packages/app/src/components/ipk-review-dialog.tsx](/home/bzz/Aether/packages/app/src/components/ipk-review-dialog.tsx)。

弹窗默认至少展示：

- `title`
- `body_summary`
- `piece.md` 对应正文

底部必须有三个主按钮：

- `入库`
- `改进`
- `暂存`

交互要求补充：

- 当 `draft/revise` 正在生成时，弹窗要明确显示“正在流式生成”
- `title/body_summary/body` 必须边生成边更新，避免用户误判为卡死

### 7. 改进循环

点击 `改进` 后：

- 在同一个弹窗内展开自然语言输入框
- 显示 `重新总结` 按钮
- 默认调用 `POST /ipk/piece/revise/stream`
- 成功后刷新当前 `DraftView`

必须保证：

- 用户不直接编辑底层结构字段
- 重写主要作用在人类内容层
- 必要时允许后台同时刷新 `surface`

### 8. 暂存与隐式 discard

点击 `暂存` 后：

- 草稿写入 `drafts/draft_xxx/draft.json`
- 之后可通过 `draft_id` 重开

关闭弹窗或退出流程但未暂存时：

- 视为 `discard`
- 不写正式 piece
- 不要求跨刷新保留

### 9. 最小 commit

点击 `入库` 后：

- 将 `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

写入 `MemoryPath.ipkRoot()/pieces/<type>/<year>/<piece_id>/`

本阶段允许先只做最小 commit，不要求 reindex 完整。

## 推荐文件

建议新增或修改这些文件：

- [packages/app/src/context/ipk.tsx](/home/bzz/Aether/packages/app/src/context/ipk.tsx)
- [packages/app/src/components/ipk-summary-button.tsx](/home/bzz/Aether/packages/app/src/components/ipk-summary-button.tsx)
- [packages/app/src/components/ipk-review-dialog.tsx](/home/bzz/Aether/packages/app/src/components/ipk-review-dialog.tsx)
- [packages/app/src/app.tsx](/home/bzz/Aether/packages/app/src/app.tsx)
- [packages/app/src/components/prompt-input.tsx](/home/bzz/Aether/packages/app/src/components/prompt-input.tsx)
- [packages/app/src/pages/session/message-timeline.tsx](/home/bzz/Aether/packages/app/src/pages/session/message-timeline.tsx)
- [packages/app/src/pages/session.tsx](/home/bzz/Aether/packages/app/src/pages/session.tsx)
- [packages/opencode/src/ipk/draft.ts](/home/bzz/Aether/packages/opencode/src/ipk/draft.ts)
- [packages/opencode/src/ipk/compile.ts](/home/bzz/Aether/packages/opencode/src/ipk/compile.ts)
- [packages/opencode/src/ipk/piece.ts](/home/bzz/Aether/packages/opencode/src/ipk/piece.ts)
- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)

## 阶段完成标准

- 用户能从 session 内点击“总结”
- 用户能同时勾选 user 和 assistant 消息
- “开始总结” 会生成 `DraftView`
- review 弹窗能显示人类审核内容
- `改进 -> 重新总结` 能循环
- `暂存` 会保留草稿
- `入库` 会写出正式 piece 文件
- 未暂存直接关闭会丢弃当前临时结果
- `packages/opencode` 和 `packages/app` 都能通过 `bun typecheck`

## 这一阶段不要做什么

- 不做 `IPK库 -> 审查暂存 / 编辑pieces` 菜单
- 不做完整 map/index 重编译
- 不做普通问答自动接入
- 不做自动并入旧 piece
