# IPK：入库流程规范（第一版）

这份文档把 IPK 从“字段 schema”继续推进到“实际入库流程”。

它回答的问题是：

- 用户完成显式“总结 -> 选消息 -> 开始总结”之后，系统到底应该怎么跑
- 哪些内容由 AI 自动生成
- 哪些内容需要用户确认
- 哪些阶段需要重写
- 什么时候真正写盘
- 什么时候重编译地图与关系

本文默认建立在前面几份文档之上，尤其是：

- `03-ingestion-and-indexes.md`
- `05-surface-schema-and-quality.md`
- `06-schema-v1.md`

## 1. 目标

第一版入库流程要同时满足五个目标：

1. 用户操作足够轻
2. AI 自动完成结构化
3. 用户主要审核“内容是否保真”
4. 系统能产出高质量 `meta / surface / links`
5. 入库后能立即进入地图、检索、联想体系

所以这个流程不能只是：

- 选中聊天
- 直接保存为一篇 Markdown

它必须是一个有多个阶段的“编译流程”。

## 2. 整体流程总览

我建议第一版把入库流程固定成下面八步：

1. `select`
2. `capture`
3. `draft`
4. `structure`
5. `quality`
6. `review`
7. `commit`
8. `reindex`

它们可以理解成一条流水线：

```text
用户选择内容
  -> capture 原始语料
  -> draft 生成人类正文草稿
  -> structure 生成 meta / surface / links 初稿
  -> quality 做结构质量重写
  -> review 给用户确认正文
  -> commit 正式写入 piece
  -> reindex 重建地图和关系视图
```

## 3. 第一步：`select`

### 3.1 目标

明确“这次要从什么内容生成 piece”。

### 3.2 可能输入源

第一版建议支持：

- 一整段聊天会话
- 聊天中的选定消息范围
- 一段手动输入文本
- 一条微信消息及其后续讨论

### 3.3 输出

输出一个统一的输入描述对象，例如：

```json
{
  "kind": "chat_range",
  "session_id": "ses_xxx",
  "message_ids": ["msg_1", "msg_2", "msg_3"]
}
```

### 3.4 设计要求

- 用户只需要决定“从哪段内容生成”
- 不需要先决定 `type`
- 不需要先决定 `project`
- 不需要先决定要不要生成哪些字段

## 4. 第二步：`capture`

### 4.1 目标

把原始输入转成一份统一、可处理的语料包。

### 4.2 输入

- `select` 阶段输出的输入描述

### 4.3 处理内容

系统需要把原始输入整理成：

- 时间顺序清晰的消息流
- 说话者区分明确的文本
- 关键上下文补足
- 基础来源信息

### 4.4 输出

建议输出一份内部 `capture payload`，例如：

```json
{
  "origin": {
    "kind": "chat",
    "session_id": "ses_xxx",
    "message_range": ["msg_1", "msg_3"]
  },
  "content": [
    {
      "role": "user",
      "text": "..."
    },
    {
      "role": "assistant",
      "text": "..."
    }
  ],
  "created_at": "2026-04-03T14:20:00+08:00"
}
```

### 4.5 设计要求

- 尽量保真，不急着总结
- 这一步是“采集”，不是“理解”

## 5. 第三步：`draft`

### 5.1 目标

先生成给人类看的草稿内容。

### 5.2 为什么先做这一步

因为用户最关心的是：

- 这条 piece 到底有没有把我真正想保留的东西写出来

所以要先把：

- `title`
- `body_summary`
- `piece.md`

这些人类可读部分做出来。

### 5.3 输出

建议输出：

```json
{
  "title": "...",
  "body_summary": "...",
  "body": "..."
}
```

随后再渲染成：

- `piece.md`

### 5.4 `piece.md` 第一版建议结构

```md
# 标题

## Summary

给用户看的正文简介

## Body

整理后的正文
```

### 5.5 设计要求

- `body_summary` 不能过于技术化
- 正文应尽量保留思考路径，而不是只留结论
- 允许保留“不完整”“未完成”“还在想”的状态
- commit 后，`piece.md` 里的 `Summary` 段应由 `surface.human.body_summary` 渲染生成，不作为独立真源长期分叉维护

## 6. 第四步：`structure`

### 6.1 目标

基于草稿正文与原始输入，生成三类结构文件初稿：

- `meta.json`
- `surface.json`
- `links.json`

### 6.2 这一阶段生成什么

#### `meta.json`

生成：

- `id`
- `type`
- `emoji`
- `created_at`
- `updated_at`
- `origin`
- `status`
- `domains`
- `methods`
- `contexts`
- `projects`
- `sources`

#### `surface.json`

生成：

- `human.body_summary`
- `catalog`
- `retrieve`
- `associate`

#### `links.json`

生成：

- 初始关系边

### 6.3 设计要求

- 这一步可以生成“可用初稿”
- 但不要求质量已经最优
- 重点是先把结构跑通

## 7. 第五步：`quality`

### 7.1 目标

对结构层做专门质量重写。

这是第一版里非常关键的一步，因为很多字段即使“生成出来了”，也未必足够有判断力。

### 7.2 重点检查对象

我建议至少重点重写这些字段：

- `surface.catalog.summary`
- `surface.retrieve.summary`
- `surface.retrieve.problems`
- `surface.retrieve.questions`
- `surface.retrieve.claims`
- `surface.associate.summary`
- `surface.associate.association_hints`
- `links[].reason`

### 7.3 这一步的核心问题

系统应当至少问自己：

- 这个字段是不是太空
- 这个字段是不是过度泛化
- 这个字段是不是在伪装成熟度
- 这个字段是不是没有真正帮助检索或联想

### 7.4 输出

输出经过质量重写后的：

- `meta.json`
- `surface.json`
- `links.json`

### 7.5 设计要求

- 这一步默认后台自动跑
- 用户通常不需要直接看到内部对比
- 但后续可以在高级模式中暴露调试视图

## 8. 第六步：`review`

### 8.1 目标

把这条 piece 的“人类可确认部分”展示给用户。

### 8.2 用户默认审核内容

第一版建议只让用户重点看：

- `title`
- `body_summary`
- `piece.md` 正文

### 8.3 用户操作

第一版建议区分两层：

- UI 暴露的三个主按钮：
  - `accept`
  - `revise`
  - `stash`
- 工作流内部仍保留一个隐含结果：
  - `discard`

### 8.4 `revise` 的含义

如果用户选择修改，不是让用户自己去改结构字段，而是让用户用自然语言反馈，例如：

- “这里漏掉了我最关心的第二个问题”
- “不要把它写得像结论，它只是直觉”
- “把对 RG 的那部分展开一点”
- “太长了，收缩一点”

然后由系统重新生成：

- `title`
- `body_summary`
- `piece.md`

必要时连带刷新：

- `surface.json`

### 8.5 `stash` 的含义

如果用户选择暂存：

- 当前 review 结果进入草稿存储
- 之后可以从单独的暂存审查入口重新打开
- 重新打开后仍然回到同类 review 流程

它和 `discard` 的区别是：

- `stash` 保留当前 draft
- `discard` 放弃当前 draft

### 8.6 `discard` 的产品含义

第一版 `discard` 不是第四个主按钮。

它由下面这类动作承接：

- 关闭当前 review 弹窗
- 退出当前总结流程
- 放弃当前尚未暂存的 review 结果

### 8.7 设计要求

- `review` 应以“内容对不对”为中心
- 不应让用户承担 schema 设计工作

## 9. 第七步：`commit`

### 9.1 目标

在用户确认后，正式把 piece 写入 IPK 存储层。

### 9.2 写入内容

正式写盘：

- `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

### 9.3 目录分配

第一版建议默认根据：

- `type`
- `created_at` 年份

决定目录，例如：

```text
MemoryPath.ipkRoot()/pieces/idea/2026/piece_xxx/
```

### 9.4 设计要求

- 只有 `accept` 后才真正写正式 piece 文件
- `stash` 允许写入草稿存储
- `discard` 不写正式 piece，也不要求保留当前 draft
- `revise` 不写正式 piece，只回到 `draft` / `structure` / `quality`

## 10. 第八步：`reindex`

### 10.1 目标

让新 piece 进入整个 IPK 的可检索体系。

### 10.2 第一版建议重建内容

至少更新：

- `by_type`
- `by_project`
- `by_time`
- `by_domain`
- `by_method`
- `open_questions`
- `graph_links`

### 10.3 更新顺序建议

建议顺序：

1. 先更新静态索引
2. 再更新关系视图
3. 再更新可能依赖新 links 的轻量地图

### 10.4 设计要求

- `reindex` 应在 `commit` 后自动触发
- 第一版可以做“局部增量更新”
- 如果增量实现太复杂，允许第一版先用“小规模重编译”

## 11. 第一版状态机建议

为了便于实现，我建议 piece 草稿在入库前有一个明确状态机：

```text
selected
  -> captured
  -> drafted
  -> structured
  -> qualified
  -> reviewing
  -> committed
```

如果用户要求重写：

```text
reviewing
  -> drafted
  -> structured
  -> qualified
  -> reviewing
```

如果用户放弃：

```text
reviewing
  -> discarded
```

如果用户暂存：

```text
reviewing
  -> stashed
```

## 12. 第一版内部产物建议

为了方便调试，我建议系统内部保留一个临时草稿对象，而不是每一步都直接写正式文件。

例如：

```json
{
  "draft_id": "draft_xxx",
  "mode": "new",
  "piece_id": null,
  "draft": {
    "title": "...",
    "body_summary": "...",
    "body": "..."
  },
  "meta": { "...": "..." },
  "surface": { "...": "..." },
  "links": { "...": "..." },
  "state": "reviewing"
}
```

这样做的好处是：

- `revise` 更容易重跑
- 不会污染正式仓库
- 便于比较不同版本生成结果
- 便于 `暂存` 后重新打开
- 便于从 `edit-start` 进入统一 review 流

## 13. 第一版最小失败处理

第一版至少应考虑下面几类失败。

### 13.1 `draft` 质量不够

处理：

- 允许直接重新生成草稿

### 13.2 `structure` 字段不完整

处理：

- 保留 piece 草稿
- 标记结构层待补

### 13.3 `quality` 无法显著改进

处理：

- 允许进入 review
- 但在后台打一个低质量标记，后续可重新维护

### 13.4 `reindex` 失败

处理：

- piece 仍可成功写入
- 索引重建任务重试

## 14. 与普通问答的关系

这条流程一旦跑通，就为未来普通问答接入这些 piece 准备好了基础。

因为一条成功入库的 piece 会立即拥有：

- 稳定身份层
- AI 工作面
- 关系边
- 地图入口

也就是说，它会从“刚刚的一段聊天”真正变成“未来可被助理调用的长期记忆单元”。

## 15. 当前最推荐的实现顺序

如果要真正落代码，我建议第一版按下面顺序实现：

1. `select + capture`
2. `draft`
3. `structure`
4. `review`
5. `commit`
6. `reindex`
7. 再补 `quality`
8. 最后补更复杂的 `revise` 循环

原因是：

- 先跑通最短闭环
- 再逐渐提高结构质量

## 16. 一句话总结

`IPK` 的“显式总结 -> review -> stash/commit”本质上不是一个保存动作，而是一条：

`原始对话 -> 内容整理 -> 结构编译 -> 用户确认 -> 正式入库 -> 地图重编译`

的编译流水线。

只有这条流水线清楚了，IPK 才能从“记录系统”真正变成“长期认知系统”。
