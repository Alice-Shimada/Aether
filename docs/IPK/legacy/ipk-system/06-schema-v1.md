# IPK：`meta.json` / `surface.json` / `links.json` 第一版正式 Schema

这份文档把 IPK 第一版的三个结构文件收敛成接近正式实现的 schema 说明。

目标是为后续实现提供稳定边界，重点明确：

- 字段名
- 字段类型
- 是否可空
- 自动生成来源
- 更新时机

本文是第一版规范草案，允许未来在真实构建和测试中继续修订。

## 1. 设计原则

第一版 schema 遵守下面几条原则：

1. 默认由 AI 自动生成，不要求用户手填结构字段。
2. 用户主要审核 `piece.md` 和 `human.body_summary`，不是审核底层工作字段。
3. `meta.json` 偏稳定，`surface.json` 偏工作面，`links.json` 偏关系层。
4. 字段要优先服务：
   - 地图编译
   - 精确检索
   - 联想扩展
   - 长期演化
5. 第一版宁可边界清楚，也不要一次放太多模糊字段。

## 2. 术语约定

为了写清“自动生成来源”和“更新时机”，这里先定义几个内部角色。

### 2.1 `capture`

把聊天、微信、手动输入等原始内容整理成初始 piece 草稿的生成阶段。

### 2.2 `schema`

从 piece 正文和上下文中抽取结构字段的生成阶段。

### 2.3 `surface`

专门生成 `catalog / retrieve / associate` 三层工作面的阶段。

### 2.4 `links`

生成和更新 piece 关系边的阶段。

### 2.5 `review`

在 piece 已存在后，基于后续对话、用户修改或系统维护做增量更新的阶段。

## 3. 目录结构

第一版默认每个 piece 使用一个独立目录：

```text
piece_xxx/
  piece.md
  meta.json
  surface.json
  links.json
```

## 4. `meta.json` schema

`meta.json` 是 piece 的结构身份证，负责提供相对稳定的归档信息。

### 4.1 建议结构

```json
{
  "id": "piece_20260403_001",
  "type": "idea",
  "title": "关于 anisotropic model 自对偶条件的一点直觉",
  "emoji": "💡",
  "created_at": "2026-04-03T10:20:00+08:00",
  "updated_at": "2026-04-03T11:05:00+08:00",
  "origin": {
    "kind": "chat",
    "session_id": "ses_xxx",
    "message_range": ["msg_a", "msg_b"]
  },
  "status": "seed",
  "domains": ["statistical-physics"],
  "methods": ["duality", "rg"],
  "contexts": ["research", "discussion"],
  "projects": ["anisotropic-ising"],
  "sources": [
    {
      "kind": "conversation",
      "ref": "ses_xxx"
    }
  ]
}
```

### 4.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 否 | `capture` | 仅创建时生成，后续不改 |
| `type` | `"idea" \| "knowledge" \| "thread" \| "review" \| "plan" \| "project"` | 否 | `schema` | 创建时生成；仅在系统判断 piece 性质发生明显变化时更新 |
| `title` | `string` | 否 | `capture` | 创建时生成；用户要求改写正文摘要或正文后可重写 |
| `emoji` | `string` | 是 | `schema` | 创建时生成；允许在 review 时微调 |
| `created_at` | `string (ISO datetime)` | 否 | `capture` | 仅创建时生成 |
| `updated_at` | `string (ISO datetime)` | 否 | `review` | 每次 piece 正文或结构层更新时刷新 |
| `origin.kind` | `"chat" \| "wechat" \| "manual" \| "import" \| "book" \| "review"` | 否 | `capture` | 仅创建时生成 |
| `origin.session_id` | `string` | 是 | `capture` | 来源是 chat 时生成；后续不改 |
| `origin.message_range` | `string[]` | 是 | `capture` | 来源是 chat/wechat 时生成；后续不改 |
| `status` | `"seed" \| "developing" \| "stable" \| "archived" \| "superseded"` | 否 | `schema` | 创建时生成；review 时可更新 |
| `domains` | `string[]` | 是 | `schema` | 创建时生成；正文或分类判断变化后可更新 |
| `methods` | `string[]` | 是 | `schema` | 创建时生成；正文补充或 links 扩展后可更新 |
| `contexts` | `string[]` | 是 | `schema` | 创建时生成；review 时可更新 |
| `projects` | `string[]` | 是 | `schema` | 创建时生成；项目归属变化时可更新 |
| `sources` | `Array<{ kind: string, ref: string }>` | 是 | `capture` + `review` | 创建时生成；后续引入外部来源时追加 |

### 4.3 字段说明

#### `id`

piece 的稳定主键。

规则：

- 必须全局唯一
- 不依赖标题
- 一旦创建不再变化

#### `type`

piece 的主语义类型。

用途：

- 决定默认存储路径
- 决定默认地图入口
- 决定回答时的预期角色

#### `title`

面向人类阅读的标题。

要求：

- 不必追求学术论文式正式
- 但要尽量准确表达 piece 主体

#### `emoji`

轻量语义图标。

用途：

- UI 展示
- 帮助快速区分 piece 气质

#### `status`

piece 当前成熟度。

它和 `type` 不同：

- `type` 说它是什么
- `status` 说它发展到哪一步

#### `domains`

物理领域分类。

建议：

- 优先写稳定领域词
- 不要用过于随意的自造标签

#### `methods`

与该 piece 强相关的方法、工具、理论语言。

这一字段很重要，因为它同时服务：

- 方法视图
- 弱连接联想
- 研究型检索

#### `contexts`

表示这条 piece 所处语境。

第一版建议枚举值：

- `learning`
- `research`
- `discussion`
- `writing`
- `reflection`

#### `projects`

关联项目，可多值。

#### `sources`

表示该 piece 的外部来源或原始来源引用。

## 5. `surface.json` schema

`surface.json` 是 AI 的工作面。

第一版采用四层结构：

- `human`
- `catalog`
- `retrieve`
- `associate`

其中 `human` 面向用户审核，后三层面向 AI。

### 5.1 建议结构

```json
{
  "human": {
    "body_summary": "..."
  },
  "catalog": {
    "...": "..."
  },
  "retrieve": {
    "...": "..."
  },
  "associate": {
    "...": "..."
  }
}
```

## 6. `surface.human` schema

`human` 不是检索层，而是用户确认层。

### 6.1 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `body_summary` | `string` | 否 | `capture` | 创建时生成；用户要求重写正文表达时更新 |

### 6.2 字段说明

#### `body_summary`

给用户看的正文简介。

用途：

- 帮用户快速判断这条 piece 有没有保留住真正想保留的东西

要求：

- 自然语言
- 比 `catalog.summary` 更贴近人类阅读
- 不必压缩到最短

## 7. `surface.catalog` schema

`catalog` 负责：

- 第一轮筛选
- 地图编译
- 列表展示

### 7.1 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `summary` | `string` | 否 | `surface` | 创建时生成；正文或关键信息变化时更新 |
| `domains` | `string[]` | 是 | `surface` from `meta.domains` | `meta.domains` 更新时同步更新 |
| `methods` | `string[]` | 是 | `surface` from `meta.methods` | `meta.methods` 更新时同步更新 |
| `projects` | `string[]` | 是 | `surface` from `meta.projects` | `meta.projects` 更新时同步更新 |
| `contexts` | `string[]` | 是 | `surface` from `meta.contexts` | `meta.contexts` 更新时同步更新 |
| `status` | `string` | 否 | `surface` from `meta.status` | `meta.status` 更新时同步更新 |
| `salience` | `number` | 是 | `surface` | 创建时估计；review 或地图重编译时可更新 |

### 7.2 字段说明

#### `summary`

这是给地图和首轮路由看的摘要。

要求：

- 1 到 2 句话
- 有方向感
- 不要过长
- 不要伪装成熟度

#### `salience`

piece 的整体显著性分数。

第一版建议：

- 允许为空
- 如果存在，范围应在 `0` 到 `1`

用途：

- 地图排序
- 候选优先级调整

## 8. `surface.retrieve` schema

`retrieve` 负责精确判断：

- 是否相关
- 是否值得继续读正文
- 该把它当什么角色使用

### 8.1 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `summary` | `string` | 否 | `surface` | 创建时生成；正文变化时更新 |
| `concepts` | `string[]` | 是 | `schema` + `surface` | 创建时生成；正文或领域结构变化时更新 |
| `problems` | `string[]` | 是 | `surface` | 创建时生成；正文补充后可更新 |
| `questions` | `string[]` | 是 | `surface` | 创建时生成；正文补充或后续讨论并入时更新 |
| `claims` | `string[]` | 是 | `surface` | 创建时生成；状态或结论变化时更新 |
| `assumptions` | `string[]` | 是 | `surface` | 创建时生成；当适用边界更明确时更新 |
| `open_questions` | `string[]` | 是 | `surface` | 创建时生成；问题被解决或新问题出现时更新 |
| `keywords` | `string[]` | 是 | `schema` | 创建时生成；必要时更新 |
| `retrieval_hints` | `string[]` | 是 | `surface` | 创建时生成；召回质量不佳时重写 |
| `role` | `"idea" \| "evidence" \| "background" \| "method" \| "reflection"` | 是 | `surface` | 创建时生成；piece 定位变化时更新 |

### 8.2 字段说明

#### `summary`

比 `catalog.summary` 更精确。

要求：

- 明确它在处理什么问题
- 明确它是直觉、背景、证据还是方法说明

#### `concepts`

核心概念表。

要求：

- 以概念词为主
- 不要用完整长句代替概念

#### `problems`

这是最重要的检索字段之一。

要求：

- 用问题句写
- 优先表达“用户会怎么问”

#### `questions`

更偏 piece 内部的追问、探索问题和认知卡点。

#### `claims`

记录当前判断、结论或假设。

关键要求：

- 必须和 `status` 一致
- 不允许把 `seed` 级直觉写成确定性结论

#### `assumptions`

描述适用前提和解释边界。

#### `open_questions`

记录未解决的问题。

这对未来的：

- 规划
- 复盘
- 长期演化

都很重要。

#### `retrieval_hints`

补充各种可能召回该 piece 的表达方式。

用途：

- 提高召回
- 对抗用户术语变化

#### `role`

让系统知道在回答里该怎么用这条 piece。

比如：

- `evidence`
  更适合作为强支撑
- `idea`
  更适合作为启发

## 9. `surface.associate` schema

`associate` 负责：

- 联想
- 桥接
- 方法迁移
- 弱连接扩展

### 9.1 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `summary` | `string` | 否 | `surface` | 创建时生成；正文或 links 变化时更新 |
| `concepts` | `string[]` | 是 | `surface` | 创建时生成；必要时更新 |
| `methods` | `string[]` | 是 | `surface` from `meta.methods` | `meta.methods` 更新时同步更新 |
| `problems` | `string[]` | 是 | `surface` | 创建时生成；必要时更新 |
| `association_hints` | `string[]` | 是 | `surface` | 创建时生成；联想质量不佳时重写 |
| `bridge_targets` | `string[]` | 是 | `surface` | 可在第二版再强化；第一版允许为空 |
| `link_glimpse` | `Array<{ target: string, kind: string, reason: string }>` | 是 | `links` + `surface` | `links.json` 更新时同步更新 |
| `association_risk` | `"low" \| "medium" \| "high"` | 是 | `surface` | 创建时生成；links 或 surface 重写时可更新 |

### 9.2 字段说明

#### `summary`

应比 `retrieve.summary` 更偏抽象层。

重点不是：

- 具体讲了什么细节

而是：

- 它能迁移出什么结构
- 为什么可能对别的问题有启发

#### `association_hints`

这是联想层最关键字段之一。

要求：

- 必须是有启发力的短句
- 不能只是把标签换个说法重复一遍

#### `bridge_targets`

描述这条 piece 适合桥接到哪些问题类型、研究阶段或解释任务。

#### `link_glimpse`

关系边的轻量预览。

作用：

- 让联想 skill 决定是否沿着关系图继续展开

#### `association_risk`

表示这条联想有多大概率跑偏。

用途：

- 控制发散强度
- 防止系统把弱联想当强命中

## 10. `links.json` schema

`links.json` 负责保存 piece 和其他 piece 之间的关系边。

### 10.1 建议结构

```json
{
  "links": [
    {
      "target": "piece_20260329_014",
      "kind": "extends",
      "strength": 0.86,
      "reason": "延续了之前对 self-duality 的讨论"
    }
  ]
}
```

### 10.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `links` | `object[]` | 否 | `links` | 创建时生成；新 piece 入库、旧 piece 更新、图重建时更新 |
| `links[].target` | `string` | 否 | `links` | 关系生成时写入 |
| `links[].kind` | `"related_to" \| "supports" \| "contradicts" \| "extends" \| "derived_from" \| "part_of" \| "inspired_by" \| "revisits" \| "uses_method" \| "answers"` | 否 | `links` | 关系生成时写入；必要时更新 |
| `links[].strength` | `number` | 是 | `links` | 关系生成时估计；图重建时可更新 |
| `links[].reason` | `string` | 否 | `links` | 关系生成时写入；必要时重写 |

### 10.3 字段说明

#### `target`

目标 piece 的 `id`。

#### `kind`

关系类型。

关键要求：

- 要尽量写“发生了什么关系”
- 不要一股脑全部退化成 `related_to`

#### `strength`

关系强度。

第一版建议：

- 范围 `0` 到 `1`
- 允许为空

#### `reason`

关系解释。

这个字段很重要，因为没有解释的关系图很容易变成噪音。

## 11. 可空策略

第一版推荐的总体策略是：

- 标识字段尽量不可空
- 判断核心字段尽量不可空
- 辅助字段允许为空

### 11.1 推荐不可空

- `meta.id`
- `meta.type`
- `meta.title`
- `meta.created_at`
- `meta.updated_at`
- `meta.origin.kind`
- `meta.status`
- `surface.human.body_summary`
- `surface.catalog.summary`
- `surface.retrieve.summary`
- `surface.associate.summary`
- `links.links`

### 11.2 推荐可空

- `emoji`
- `domains`
- `methods`
- `projects`
- `contexts`
- `concepts`
- `problems`
- `questions`
- `claims`
- `assumptions`
- `open_questions`
- `keywords`
- `retrieval_hints`
- `association_hints`
- `bridge_targets`
- `link_glimpse`
- `association_risk`
- `strength`

原因不是这些字段不重要，而是第一版应允许系统在信息不足时先生成一个仍然合法的 piece。

## 12. 更新时机总表

为了方便实现，更新时机可以收敛成下面几类触发器：

### 12.1 `on_create`

piece 首次生成时。

更新：

- 全部基础字段

### 12.2 `on_user_rewrite`

用户要求重写标题、正文简介或正文后。

更新：

- `meta.title`
- `surface.human.body_summary`
- 所有 `surface.*.summary`
- 必要时更新 `problems / questions / claims`

### 12.3 `on_body_change`

正文发生实质变化时。

更新：

- `updated_at`
- 全部 `surface`
- 必要时更新 `status / methods / projects / domains`
- 重新计算 `links`

### 12.4 `on_link_rebuild`

关系图重建时。

更新：

- `links.json`
- `surface.associate.link_glimpse`
- 必要时更新 `association_risk`

### 12.5 `on_periodic_review`

系统定期复盘和维护时。

更新：

- `status`
- `salience`
- `open_questions`
- `association_hints`
- 关系边强度

## 13. 最小实现建议

如果第一版实现想更稳一点，我建议：

1. 先完整实现 `meta.json`
2. 先完整实现 `surface.human`、`surface.catalog`、`surface.retrieve`
3. `surface.associate` 先做简化版
4. `links.json` 先保证有：
   - `target`
   - `kind`
   - `reason`
5. `strength`、`salience`、`association_risk` 都允许先做弱约束估计

## 14. 一句话总结

第一版 schema 的分工可以压缩成下面三句：

- `meta.json` 解决“这条 piece 是什么”
- `surface.json` 解决“AI 现在该怎么用这条 piece”
- `links.json` 解决“这条 piece 和别的 piece 怎么连”

只要这三层边界清楚，后续地图、检索、联想和自适应问答都能比较自然地接上。
