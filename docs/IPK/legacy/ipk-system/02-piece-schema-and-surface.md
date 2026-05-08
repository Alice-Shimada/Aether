# IPK：Piece 字段表与 Surface 暴露层设计

这份文档继续细化 IPK 的底层设计，重点回答三个问题：

- 普通问答时，AI 如何自动调用 IPK，而不是只在用户显式打开库时才使用
- `piece` 的字段表应该如何设计，才能兼顾准确检索与自由联想
- `surface` 到底应该暴露哪些信息给 skill，才能让 AI 快速、准确、低成本地判断是否继续深入

## 1. 一个新结论：IPK 不只是“可浏览的库”，还应该是普通问答的后台底座

你这次补充得非常关键。

IPK 的目标不应该只是：

- 让用户主动进入库查看内容
- 让用户按项目、时间、问题去浏览 pieces

它还应该成为普通问答的后台知识与记忆底座。

也就是说，未来理想状态下，用户只是正常发问：

- “这个物理问题怎么理解？”
- “我之前是不是想过类似的问题？”
- “我应该怎么往下学这个主题？”

系统就应该自动判断：

- 这次需不需要查 IPK
- 先查用户已有知识，还是先查用户历史问题
- 先按概念找，还是按项目找，还是按时间找
- 回答时应该更偏严谨论证，还是更偏启发式引导

所以 IPK 的位置，不只是“附属笔记系统”，而应该是：

- 对话系统的长期认知底座

## 2. 这里先只讨论 IPK 本身

这份文档只讨论 `piece`、`surface`、检索和联想本身。

至于：

- 用户风格画像
- 回答策略
- 长期偏好更新

这些内容属于独立的“用户适配系统”，不在这份 IPK 文档里展开。

## 3. Piece 字段表的设计原则

你说得很对：现在不是要列一个“看起来很完整”的字段表，而是要设计一套真正适合 AI 检索和联想的字段表。

我建议字段设计遵守四个原则：

### 3.1 区分“真内容”和“检索暴露面”

不要把所有有用信息都塞进正文，也不要把所有东西都塞进一个大 frontmatter。

应该明确区分：

- 原始正文
- 结构化元数据
- 给 AI 判断用的 surface
- 关系与索引

### 3.2 字段要服务于“判断下一步要不要继续读”

字段不是越多越好。

对 AI 来说，最重要的问题不是“这个 piece 尽可能完整描述了吗”，而是：

- 它和当前问题有没有关系
- 是强相关还是弱相关
- 值不值得继续往下读
- 该把它当证据、背景、启发还是反例

### 3.3 要区分“稳定字段”和“可演化字段”

有些字段非常稳定：

- `id`
- `type`
- `created_at`

有些字段会不断演化：

- `summary`
- `questions`
- `links`
- `status`

第一类适合做基座，第二类适合让 AI 和系统逐步更新。

### 3.4 要支持“准检索”与“弱联想”两种任务

这意味着字段不能只服务关键词过滤，还要服务：

- 结构相似性
- 问题相似性
- 方法相似性
- 认知位置相似性

## 4. Piece 的建议结构：一份正文，三类结构文件

我建议一个 piece 目录内至少有四类文件：

```text
piece_xxx/
  piece.md
  meta.json
  surface.json
  links.json
```

它们分别承担不同职责。

### 4.1 `piece.md`

完整正文。

适合保存：

- 原始想法
- 讨论整理
- 推导过程
- 长段解释
- 阶段性补充

### 4.2 `meta.json`

偏稳定的结构化字段。

适合保存：

- 标识
- 类型
- 时间
- 来源
- 状态
- 基础分类信息

### 4.3 `surface.json`

专门给 AI 检索和路由判断用的暴露面。

这层最重要。

### 4.4 `links.json`

保存结构化关系，避免把复杂关系硬塞进 tags。

## 5. 推荐的 Piece 字段表

下面这套字段，是我基于“AI 检索 + AI 联想 + 研究者场景”综合考虑后给出的第一版建议。

我把它分成四组：核心标识、研究语义、检索语义、关系语义。

## 6. 核心标识字段

这些字段主要放在 `meta.json`。

### 6.1 `id`

唯一标识。

作用：

- 稳定引用
- 建立 links
- 支撑索引
- 避免标题变化导致引用断裂

建议记录：

- 类似 `piece_20260403_001`

### 6.2 `type`

piece 类型。

建议值第一版可以是：

- `idea`
- `knowledge`
- `thread`
- `review`
- `plan`
- `project`

作用：

- 给 AI 一个最基础的语义预期
- 决定默认检索路径
- 决定 UI 呈现方式

### 6.3 `title`

人可读标题。

作用：

- 快速识别
- UI 展示
- 候选列表展示

标题不要求绝对精确，但最好能表达“这条 piece 主要在讲什么”。

### 6.4 `created_at`

创建时间。

作用：

- 时间线视图
- 回顾近三个月做了什么
- 判断某想法形成的历史顺序

### 6.5 `updated_at`

最近更新时间。

作用：

- 反映 piece 是否还在发展
- 支撑“最近活跃内容”

### 6.6 `origin`

piece 的来源。

建议值可以包括：

- `chat`
- `wechat`
- `manual`
- `import`
- `book`
- `review`

作用：

- 让系统知道这条内容最初是怎么来的
- 帮助判断内容可靠度与语境

### 6.7 `status`

piece 当前状态。

建议值：

- `seed`
- `developing`
- `stable`
- `archived`
- `superseded`

作用：

- 判断这是一条初始火花，还是已经成熟的结论
- 检索时决定优先级

## 7. 研究语义字段

这组字段特别重要，因为它们决定 IPK 是否真的懂“研究语境”。

### 7.1 `domains`

物理领域。

例如：

- `statistical-physics`
- `qft`
- `cm`
- `gravity`

作用：

- 比普通 tags 更稳定
- 支撑按领域浏览
- 让 AI 知道这条内容属于哪一类物理问题

### 7.2 `methods`

涉及的方法、工具或理论手段。

例如：

- `rg`
- `duality`
- `path-integral`
- `mean-field`
- `symmetry-analysis`
- `perturbation`

作用：

- 对研究者非常有价值
- 联想时常常比关键词更有力量
- 能帮助找到“问题不同，但方法相似”的历史 piece

### 7.3 `contexts`

使用场景或问题场景。

例如：

- `learning`
- `research`
- `problem-solving`
- `teaching`
- `writing`
- `discussion`

作用：

- 区分“这条 piece 是在学知识，还是在做研究，还是在写作”
- 有助于系统决定回答风格

### 7.4 `projects`

所属项目，可多值。

作用：

- 支撑项目视图
- 让 piece 能同时服务多个项目

### 7.5 `concepts`

核心概念列表。

例如：

- `critical-line`
- `self-duality`
- `anisotropy`

作用：

- 这是比 tags 更面向知识结构的一层
- 非常适合构建“按概念找”

### 7.6 `problems`

piece 主要在围绕哪些问题。

例如：

- “各向异性条件下的自对偶条件如何理解？”
- “RG 语言能否统一解释这个临界条件？”

作用：

- 对问答系统非常关键
- 因为用户常常是以问题形式提问，而不是以概念形式提问

## 8. 检索语义字段

这组字段最直接服务 AI 的“找”和“判”。

### 8.1 `summary`

最核心的简要总结。

作用：

- 候选筛选
- 快速相关性判断
- 结果列表展示

要求：

- 不能太长
- 不能太空
- 应该明确说出 piece 在想什么、说什么、解决什么

### 8.2 `questions`

这条 piece 主动提出的问题。

作用：

- 对检索极其重要
- 很多历史 piece 的真正价值体现在“问了什么”，而不是“说了什么”

### 8.3 `claims`

这条 piece 当前提出的判断、结论或假说。

作用：

- 让系统知道它是“提问型”还是“结论型”
- 可以拿来找支持、反例、修正

### 8.4 `assumptions`

成立前提。

作用：

- 研究讨论里很重要
- 可以帮助 AI 判断 piece 是否适用于当前情境

### 8.5 `open_questions`

尚未解决的问题。

作用：

- 直接支撑“最近卡在哪里”“我长期没解决的问题是什么”
- 很适合 review 与 planning

### 8.6 `keywords`

补充性关键词。

我建议保留，但不把它当主结构。

作用：

- 兼容传统搜索
- 给系统一个低成本的字面入口

### 8.7 `retrieval_hints`

给检索用的补充短语。

例如：

- 这条 piece 可能回答哪些问法
- 可能被哪些近义表达召回

作用：

- 提高召回率
- 尤其适合你的“同一概念不同时期说法不同”的场景

### 8.8 `association_hints`

给联想用的补充短语。

例如：

- 与哪些结构相似问题相关
- 哪些看似不同的问题可能借用它的思路

作用：

- 支撑弱连接探索
- 让联想 skill 更有抓手

## 9. 关系语义字段

这组字段最好放在 `links.json`。

### 9.1 `links`

结构化关系数组。

每条关系建议包括：

- `target`
- `kind`
- `strength`
- `reason`

例如：

```json
[
  {
    "target": "piece_20260329_014",
    "kind": "extends",
    "strength": 0.86,
    "reason": "延续了之前对 self-duality 的直觉讨论"
  }
]
```

### 9.2 建议的 `kind`

- `related_to`
- `supports`
- `contradicts`
- `extends`
- `derived_from`
- `part_of`
- `inspired_by`
- `revisits`
- `uses_method`
- `answers`

作用：

- 让 AI 不只是找到相似 piece
- 而是知道“它们之间发生了什么”

## 10. 哪些字段最适合暴露给 skill

这里是整份设计最关键的部分。

不是所有字段都应该等权暴露给 skill。

我建议分成三层 surface。

## 11. 第一层 Surface：`catalog surface`

这层用于：

- 全局索引
- 候选列表
- 快速过滤

它必须非常短。

建议字段：

- `id`
- `type`
- `title`
- `emoji`
- `domains`
- `methods`
- `projects`
- `status`
- `summary`

为什么这样设计：

- 这些字段已经足够让 AI 在低成本下做第一轮相关性判断
- 它们同时兼顾“研究语境”和“内容摘要”

## 12. 第二层 Surface：`retrieve surface`

这层用于严格检索后的二次判断。

建议字段：

- `catalog surface` 全部字段
- `concepts`
- `problems`
- `questions`
- `claims`
- `assumptions`
- `open_questions`
- `retrieval_hints`

为什么这些字段对检索重要：

- `problems` 和 `questions` 让系统能按“用户问法”匹配历史内容
- `claims` 和 `assumptions` 让系统知道适用边界
- `retrieval_hints` 提高召回

## 13. 第三层 Surface：`associate surface`

这层用于联想。

建议字段：

- `catalog surface` 全部字段
- `concepts`
- `methods`
- `problems`
- `association_hints`
- `links` 的精简版

为什么联想层不同：

- 联想不是找最像的文本
- 而是找“结构上可能给启发”的历史 piece
- 所以方法、问题形态、关系邻居比字面相似更重要

## 14. 为什么要把 `retrieve surface` 和 `associate surface` 分开

因为它们的优化目标不同。

检索要的是：

- 准
- 稳
- 少误召回

联想要的是：

- 广
- 活
- 能带出弱连接

如果强行用同一套 surface 兼顾两者，往往会两头都不够好。

所以更合理的做法是：

- 同一个 piece
- 生成不同用途的 surface

这恰好也和你提出的“检索的 skill 和联想的 skill 可能不一样”一致。

## 15. 我建议普通问答时也自动走一遍 IPK 路由

为了实现你说的“全知全能又很懂我的助理”，未来普通问答最好默认有一个轻量 IPK 路由过程。

这个过程不是每次都重检全库，而是：

1. 先判断问题是否值得查 IPK
2. 若系统启用了外部用户适配系统，可先读取其输出作为额外上下文
3. 再选择检索路径
4. 先取少量 `catalog surface`
5. 再对命中项取 `retrieve surface` 或 `associate surface`
6. 只有必要时才读正文
7. 最后结合当前问题生成回答

这样才能做到：

- 回答像“懂你”的助理
- 但不会每次都把整个库拉进上下文

## 16. IPK 可接收外部用户上下文，但不负责定义它

未来普通问答如果需要更贴合用户，可以在 IPK 路由前接入“外部用户上下文”。

但这部分不属于 piece 本身，也不应写成 piece 的一部分。

换句话说：

- IPK 负责内容与导航
- 用户适配系统负责用户画像与回答策略

## 18. 我当前最推荐的第一版字段集合

如果要先落一个最小但够强的第一版，我建议：

### 18.1 `meta.json`

- `id`
- `type`
- `title`
- `created_at`
- `updated_at`
- `origin`
- `status`
- `domains`
- `methods`
- `contexts`
- `projects`

### 18.2 `surface.json`

- `summary`
- `concepts`
- `problems`
- `questions`
- `claims`
- `assumptions`
- `open_questions`
- `keywords`
- `retrieval_hints`
- `association_hints`
- `emoji`

### 18.3 `links.json`

- `links[]`

### 18.4 `piece.md`

- 完整正文

这套已经足够支撑：

- 多维浏览
- 分层检索
- 精准召回
- 弱连接联想
- 后续接入外部用户适配系统

## 19. 下一轮最值得继续定下来的事

我建议下一轮讨论聚焦两件事。

### 19.1 字段的“必填 / 自动 / 可选”划分

也就是：

- 哪些字段创建 piece 时必须有
- 哪些字段由 AI 自动抽取
- 哪些字段允许后续慢慢补

### 19.2 第一版索引到底做哪几份

比如：

- `by_project`
- `by_time`
- `by_type`
- `by_domain`
- `by_method`
- `open_questions`
- `graph_links`

一旦这两件事定下，IPK 的工程起步结构就会非常清楚。
