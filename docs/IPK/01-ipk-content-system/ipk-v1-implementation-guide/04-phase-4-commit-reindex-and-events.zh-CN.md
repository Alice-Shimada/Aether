# 阶段 4：commit、reindex、索引与事件

## 目标

把“正式入库后真的进入长期系统”这半条链补完整。

这一阶段完成后：

- commit 不只是写四个文件
- 新 piece 会进入派生索引
- `graph_links` 会刷新
- 轻量事件会发出
- 前端能收到更新后重新拉取列表

## 必做项

### 1. 完整 commit 语义

确认 `POST /ipk/piece/commit` 做完下面几件事：

1. 把 draft 转成正式 piece
2. 写入：
   - `piece.md`
   - `meta.json`
   - `surface.json`
   - `links.json`
3. 更新 `updated_at`
4. 触发 `reindex`

如果 `reindex` 失败：

- piece 仍应保留成功 commit
- 重编译任务允许重试

### 2. `indexes/` 最小全集

这一阶段至少落地这些索引文件：

- `by_type.json`
- `by_project.json`
- `by_time.json`
- `by_domain.json`
- `by_method.json`
- `open_questions.json`
- `graph_links.json`

统一外壳至少包含：

- `version`
- `updated_at`
- `entries[]`

每个 `entry` 至少包含：

- `key`
- `label`
- `summary`
- `piece_ids`
- `count`

### 3. `graph_links` 是派生层

要严格保证：

- 新 piece 可以带自己的 `links.json`
- `graph_links` 刷新可以吸收新边
- 但旧 piece 的 `links.json` 不被回写

这是一条硬约束。

### 4. 轻量事件流

至少发出这些事件：

- `ipk.draft.updated`
- `ipk.piece.committed`
- `ipk.reindexed`

前端第一版可以用最简单的策略：

- 收到事件后重新 `fetch`

不要为了这一阶段深绑复杂 sync projector。

### 5. `PieceCard` 稳定下来

这一步要把 `GET /ipk/pieces` 返回体稳定成 `PieceCard[]`，供：

- `编辑pieces`
- 未来列表页
- 轻量卡片展示

不要让前端直接依赖磁盘文件结构。

## 推荐文件

建议新增或修改这些文件：

- [packages/opencode/src/ipk/indexes.ts](/home/bzz/Aether/packages/opencode/src/ipk/indexes.ts)
- [packages/opencode/src/ipk/events.ts](/home/bzz/Aether/packages/opencode/src/ipk/events.ts)
- [packages/opencode/src/ipk/piece.ts](/home/bzz/Aether/packages/opencode/src/ipk/piece.ts)
- [packages/opencode/src/ipk/draft.ts](/home/bzz/Aether/packages/opencode/src/ipk/draft.ts)
- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)
- [packages/app/src/context/ipk.tsx](/home/bzz/Aether/packages/app/src/context/ipk.tsx)

## 阶段完成标准

- commit 后正式 piece 会写到隐藏全局库
- `indexes/` 至少生成最小全集
- `graph_links` 会刷新
- 旧 piece 的 `links.json` 不会被回写
- `PieceCard` 已稳定服务于 `编辑pieces`
- 前端能在 commit/reindex 后重新拿到新结果
- `packages/opencode` 和 `packages/app` 都能通过 `bun typecheck`

## 这一阶段不要做什么

- 不做完整图谱可视化
- 不做复杂地图 UI
- 不做自动普通问答接入
