# IPK 内容系统：待进一步琢磨的问题

这份文档只记录两类内容：

- 目前已经有临时实现方向，但还没有彻底拍死的问题
- 第一版先不上、以后可能补回来的字段

它不是总览稿，也不是正式 schema。

## 1. `body_summary` 的唯一真源

当前临时实现方向：

- 先把 `surface.human.body_summary` 当作结构真源。
- `piece.md` 中如果需要出现对应摘要段落，先由它渲染生成，而不是单独再维护一份可直接编辑的副本。

为什么还留在这个文档里：

- 这套做法很稳，适合第一版实现。
- 但长期看，`body_summary` 和 `piece.md` 摘要段之间是否还要进一步收敛、合并或重构，仍然值得后续再琢磨。

第一版实现要求：

- 先按上面的临时方案实现。
- 代码和数据结构要尽量保留以后继续调整的空间。

## 2. `draft_id` / `edit-start` 的细节形态

当前第一版实现方向：

- 每个工作草稿都有稳定的 `draft_id`
- `审查暂存` 通过 `draft_id` 重新打开对应草稿
- `编辑pieces` 不直接改正式 piece，而是先执行 `edit-start`，生成一个新的 `edit` 模式工作草稿，再回到同一 review 流

为什么还留在这个文档里：

- 我们已经定下了这套机制的方向
- 但它最终是落成 `GET /ipk/draft/:id`、`POST /ipk/piece/:id/edit-start`，还是其他等价 API 形态，后续仍可能微调

第一版实现要求：

- 必须有稳定 `draft_id`
- 必须有 `edit-start` 这类“先转工作草稿再编辑”的机制
- 不直接让编辑入口绕开 review 流去改正式 piece

## 3. 已有 Piece 的自动并入判断

当前第一版实现方向：

- 如果用户从 `编辑pieces` 入口进入，就按“编辑已有 piece”处理。
- 如果用户没有从这个入口进入，而是直接在普通 session 里重新选消息总结，就默认按“新建 piece”处理。

为什么还留在这个文档里：

- 你已经明确表示，未来可能会有“系统自动识别这一段是不是更适合并入已有 piece”的能力。
- 但这件事会直接牵涉内容判定、冲突策略和误合并风险，第一版不应现在就做。

第一版实现要求：

- 不做自动并入已有 piece 的判断。
- 不让系统在后台偷偷把新内容合并进旧 piece。

## 4. 第一版先不上或允许为空的字段

下面这些字段不是第一版最短闭环所必需的：

- `emoji`
- `salience`
- `links[].strength`
- `association_risk`
- `bridge_targets`
- `link_glimpse`

当前临时实现方向：

- 第一版可以不生成，或者允许为空。
- 不让这些字段阻塞 `select -> summarize -> review -> stash/commit -> reindex` 的核心闭环。

后续可能再考虑：

- 哪些字段应该由编译器稳定生成
- 哪些字段应该在地图重编译时再补
- 哪些字段只在更高级的联想/导航阶段才真正有价值

## 5. “选择到这里”截线的包含策略

当前第一版实现方向：

- 选择模式下，聊天框底部提供“选择到这里”截线按钮。
- 点击后按时间线批量选中到截线位置。
- 当前默认策略为“包含截线碰到的这条消息”。

为什么还留在这个文档里：

- 后续可能增加用户设置，让“选择到这里”在两种语义之间切换：
  - 包含截线碰到的这条消息
  - 只选到它的上一条，不包含这条

第一版实现要求：

- 先固定为“包含截线碰到的消息”。
- 不在第一版引入额外设置面板。

## 6. 独立 session recall 层与 IPK 的边界

当前对比 Hermes 后，一个重新变得明确但尚未进入 v1 的问题是：

- 未来是否增加独立的 `session recall` 层，用来回忆“以前聊过、但未必已经入 piece 的内容”。

为什么它是开放问题：

- Hermes 的 `state.db + FTS + summarize` 证明这层非常有价值。
- 但当前 IPK v1 还在优先打磨 `piece / surface / search / associate / map` 主闭环。
- 如果过早把 session history 混进 IPK，会破坏你已经明确的“session 是过程对象，piece 是长期认知对象”的边界。

当前倾向：

- `session recall` 未来应作为 adaptation 与 IPK 之外的独立层继续设计。
- 该层主要服务“历史回忆”，不作为 IPK piece 真源。
- recall 更适合走：

```text
adaptation context
  -> IPK search / associate
  -> session recall
```

而不是把所有历史聊天先并入 IPK 再查询。

后续仍需决定：

- session recall 的真源是独立 session db、现有 session store，还是新的派生索引。
- recall 结果是摘要文本、结构化 hit，还是二者兼有。
- recall 什么时候自动触发，什么时候只在显式请求下触发。
