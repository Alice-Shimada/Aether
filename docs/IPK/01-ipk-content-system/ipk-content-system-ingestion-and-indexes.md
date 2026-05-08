# IPK：自动生成 Piece、用户审核边界与第一版索引

这份文档记录当前对 IPK 入库流程、用户审核边界、结构字段自动生成原则，以及“第一版索引”含义的进一步设计。

它主要回答三个问题：

- 用户在创建 piece 时到底需要做什么，不需要做什么
- `meta.json / surface.json / links.json` 的第一版 schema 应该长什么样
- “第一版索引”具体指的是什么

## 1. 一个重要原则：Piece 不应要求用户手工填写结构字段

这个判断我认同，而且我觉得很关键。

IPK 面向的不是“懂 AI 检索设计的人”，而是研究者、学习者、普通使用者。

所以在理想流程里，用户不应该被要求去决定这些事情：

- `id` 是什么
- `type` 是什么
- 该暴露哪些字段给检索 skill
- 该暴露哪些字段给联想 skill
- `surface` 该怎么写才更适合 AI
- `links` 该怎么抽取

这些都应该由系统自动完成。

换句话说：

- 用户负责提供原始内容和判断“表达对不对”
- AI 负责结构化、归纳、分类、建索引、生成暴露层

## 2. 用户应该审核什么

你这里也提了一个非常重要的边界：

用户主要应该审核的是“正文部分是否表达到了自己真正想保留的内容”，而不是审核底层检索结构。

我建议把用户审核层明确分成两部分。

### 2.1 用户必须可见并可修改的内容

这部分是人类内容层，应该主要给用户看。

包括：

- `title`
- `body_summary`
- `piece.md` 正文

这里的目标是：

- 确认 AI 是否把这次对话或想法真正整理对了
- 确认有没有漏掉用户觉得重要的部分
- 确认有没有写得太多、太偏、太歪

### 2.2 用户默认不必操心，但可在高级模式查看的内容

这部分属于 AI 工作层。

包括：

- `type`
- `domains`
- `methods`
- `concepts`
- `retrieval_hints`
- `association_hints`
- `links`
- `status`
- `origin`

这些信息当然也可以允许高级用户查看，但默认不应该要求用户手工决定。

## 3. 显式总结入库的理想流程

你提到的“总结后进入 piece 流程”是未来的核心入口，我建议它按下面这条链工作。

### 3.1 输入

长期看，输入可以来自：

- 一次完整聊天
- 聊天中的选定消息范围
- 一条微信消息及其延伸讨论
- 用户手动输入的一段原始想法

但第一版真正落地的主入口，应以：

- 聊天中的选定消息范围

为准。

### 3.2 自动生成草稿

系统自动生成一个 piece 草稿包，包含：

- `title`
- `body_summary`
- `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

### 3.3 用户审核

用户默认主要检查：

- 标题是否准确
- 正文简介是否抓住重点
- 正文是否保留了自己想保留的思考

如果用户觉得：

- 不够全面
- 太啰嗦
- 漏了重要判断
- 没突出自己真正在意的问题

就提出要求，然后由 AI 重新生成。

### 3.4 系统入库

用户确认后，系统才正式写入 piece，并触发：

- 索引更新
- links 更新
- 其他后续编译或同步钩子

## 4. 这里要明确区分两种“简介”

你刚才特别提醒这一点，我认为非常对。

我们至少应该区分两种不同的 summary。

### 4.1 `body_summary`

这是给用户看的“正文简介”。

它应该更像：

- 这条 piece 到底在说什么
- 这次讨论主要保留下来了什么
- 适合人类确认内容是否准确

它可以相对自然语言一些。

### 4.2 `surface.summary`

这是给 AI 检索和路由看的摘要。

它应该更像：

- 一个紧凑、标准化、利于判断相关性的描述
- 尽量少废话
- 尽量突出问题、方法、适用语境和价值

所以：

- `body_summary` 是“人类审核摘要”
- `surface.summary` 是“AI 检索摘要”

它们不应该强制相同。

## 5. 第一版 schema 的设计原则

在你刚才这个思路下，我建议第一版 schema 进一步调整成：

- 用户不需要手填任何字段
- 系统自动生成所有字段
- 但字段内部要明确区分：
  - 用户内容层
  - 系统结构层
  - AI 检索层
  - AI 联想层

## 6. 推荐的 Piece 目录结构

```text
piece_xxx/
  piece.md
  meta.json
  surface.json
  links.json
```

## 7. `piece.md` 的职责

`piece.md` 是这条 piece 的人类主文档。

我建议它包含两个部分：

1. `body_summary`
2. `body`

例如：

```md
# 关于 anisotropic model 自对偶条件的一点直觉

## Summary

这条 piece 记录了一次围绕 anisotropic Ising 模型自对偶条件的讨论，重点保留了当时形成的直觉、问题意识，以及想继续向 RG 语言推广的思路。

## Body

...
```

这里的 `Summary` 更偏人类阅读与审核。

第一版实现里，应把 `surface.human.body_summary` 当作结构真源；`piece.md` 里的 `Summary` 段由它渲染生成，而不是长期各写各的。

## 8. `meta.json` 第一版 schema

`meta.json` 负责保存偏稳定、偏结构化、偏系统内部使用的信息。

建议第一版：

```json
{
  "id": "piece_xxx",
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

### 8.1 字段说明

#### `id`

系统生成的唯一标识。

用途：

- 内部引用
- 建立 links
- 维持稳定性

#### `type`

系统判断这条 piece 属于哪类对象。

第一版建议值：

- `idea`
- `knowledge`
- `thread`
- `review`
- `plan`

用途：

- 决定默认存储路径
- 决定默认检索路径
- 决定默认 UI 呈现方式

#### `title`

给人类看的标题。

#### `emoji`

轻量语义图标。

用途：

- UI 识别
- 视觉提示

#### `created_at` / `updated_at`

时间字段。

用途：

- 时间线
- 最近活跃内容
- 阶段回顾

#### `origin`

piece 的来源。

用途：

- 追溯这条 piece 从哪里来
- 未来可回看原会话

#### `status`

piece 的成熟度。

建议值：

- `seed`
- `developing`
- `stable`
- `archived`
- `superseded`

用途：

- 判断应不应该高优先级用于回答
- 区分想法火花与相对稳定认知

#### `domains`

物理领域分类。

用途：

- 领域检索
- 支撑专业语境理解

#### `methods`

涉及的方法、理论工具、分析手段。

用途：

- 找“问题不同但方法类似”的 piece
- 支撑方法视图

#### `contexts`

这条 piece 的使用场景。

例如：

- `learning`
- `research`
- `discussion`
- `writing`

用途：

- 帮助系统选择回答方式

#### `projects`

所属项目，可多值。

用途：

- 项目视图
- 项目内检索

#### `sources`

引用来源。

用途：

- 溯源
- 对正文或结论做背景说明

## 9. `surface.json` 第一版 schema

`surface.json` 负责给 AI 做低成本判断。

我建议它不要只是一平层，而是分成：

- `human`
- `catalog`
- `retrieve`
- `associate`

这样职责最清楚。

建议第一版：

```json
{
  "human": {
    "body_summary": "这条 piece 记录了一次围绕 anisotropic Ising 模型自对偶条件的讨论，重点保留了当时形成的直觉、问题意识，以及想继续向 RG 语言推广的思路。"
  },
  "catalog": {
    "summary": "关于 anisotropic Ising 自对偶条件的一条初始研究直觉，关联 duality 与 RG 解释。",
    "domains": ["statistical-physics"],
    "methods": ["duality", "rg"],
    "projects": ["anisotropic-ising"],
    "status": "seed"
  },
  "retrieve": {
    "summary": "讨论 anisotropic square lattice 中自对偶条件的理解，并尝试把临界条件改写成更适合 RG 语言解释的问题。",
    "concepts": ["anisotropy", "self-duality", "critical-line"],
    "problems": [
      "各向异性条件下的自对偶条件如何理解？",
      "RG 语言能否统一解释这一临界条件？"
    ],
    "questions": [
      "与 isotropic 情形相比，变化的是物理条件还是解释框架？"
    ],
    "claims": [
      "这条 piece 当前更接近启发式直觉，而不是严格证明。"
    ],
    "assumptions": [
      "默认讨论对象为 square lattice Ising model。"
    ],
    "open_questions": [
      "这种思路是否能推广到更一般的 anisotropic setting？"
    ],
    "keywords": ["ising", "duality", "anisotropic"],
    "retrieval_hints": [
      "临界线理解",
      "自对偶条件解释",
      "各向异性 Ising"
    ]
  },
  "associate": {
    "summary": "一条关于“条件不再是单点而是临界线”如何被重新理解的研究直觉。",
    "concepts": ["critical-line", "reinterpretation", "duality"],
    "methods": ["duality", "rg"],
    "problems": [
      "当系统从单点条件变成连续条件时，应该如何改变解释框架？"
    ],
    "association_hints": [
      "与任何涉及参数空间中临界流形而非单点条件的问题相关。",
      "与解释框架转变有关，而不只与 Ising 模型本身有关。"
    ],
    "link_glimpse": [
      {
        "target": "piece_prev_a",
        "kind": "extends",
        "reason": "延续了 earlier self-duality discussion"
      }
    ]
  }
}
```

## 10. 为什么要把 `surface` 分成四块

### 10.1 `human`

给用户审核。

重点：

- 是否表达准确
- 是否遗漏重要内容
- 是否过多或过少

### 10.2 `catalog`

给总览和第一轮筛选。

重点：

- 足够短
- 足够稳定

### 10.3 `retrieve`

给严格检索。

重点：

- 精准判断是否相关
- 值不值得继续深入

### 10.4 `associate`

给发散联想。

重点：

- 能否拉出弱连接
- 能否找到看似不同但结构相似的 piece

## 11. `links.json` 第一版 schema

建议第一版：

```json
{
  "links": [
    {
      "target": "piece_prev_a",
      "kind": "extends",
      "strength": 0.86,
      "reason": "延续了之前对 self-duality 的讨论"
    },
    {
      "target": "piece_prev_b",
      "kind": "uses_method",
      "strength": 0.74,
      "reason": "都依赖 duality 视角来理解条件结构"
    }
  ]
}
```

### 11.1 字段说明

#### `target`

关联 piece 的 `id`。

#### `kind`

关系类型。

第一版建议：

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

#### `strength`

关系强度。

用途：

- 联想时控制扩展范围
- 检索时决定是否优先展开

#### `reason`

简短解释。

用途：

- 帮 AI 和人理解为什么连起来

## 12. 所以“第一版索引”到底是什么意思

你刚才问得很好。

这里的“第一版索引”不是指数据库索引那种很底层的技术细节，而是指：

- 第一批为了让 AI 和用户高效使用 IPK，而预先生成的结构化视图文件

也就是说，它们更像：

- `views`
- `maps`
- `catalogs`
- `lookups`

它们不是原始 piece，但能帮助系统快速定位 piece。

## 13. 为什么需要索引，而不能每次现扫所有 piece

因为未来 pieces 会很多。

如果每次都让 AI：

- 现读大量目录
- 现看所有 surface
- 现做全局判断

就会：

- 慢
- 贵
- 容易丢失准确性

所以必须提前准备一些“低成本入口结构”。

## 14. 我建议的第一版索引集合

第一版不需要太多，但要覆盖最常见的使用维度。

我建议至少做这些。

### 14.1 `by_type.json`

按 `type` 聚合的索引。

用途：

- 快速找出所有 `idea`、`knowledge`、`review`

### 14.2 `by_project.json`

按项目聚合。

用途：

- 看某个项目里积累了哪些 piece
- 回顾项目进度和路线

### 14.3 `by_time.json`

按时间聚合。

用途：

- 回顾最近三个月做了什么
- 找某段时期的活跃主题

### 14.4 `by_domain.json`

按物理领域聚合。

用途：

- 从学科层面浏览

### 14.5 `by_method.json`

按方法聚合。

用途：

- 找“同一种方法曾经用在什么问题上”

### 14.6 `open_questions.json`

汇总所有 piece 的 `open_questions`。

用途：

- 找长期未解决问题
- 支撑 review / planning

### 14.7 `graph_links.json`

汇总关系网络。

用途：

- 支撑联想扩展
- 支撑关系视图

## 15. 第一版索引里放什么信息最合适

我建议索引里默认不要放正文，也不要放太长摘要。

索引里更适合放：

- `id`
- `title`
- `type`
- `emoji`
- `created_at`
- `updated_at`
- `status`
- `domains`
- `methods`
- `projects`
- `catalog.summary`

也就是说，索引更多是：

- 对 `catalog surface` 的有组织重排

## 16. 对话系统未来如何自动调用 IPK

这部分属于未来扩展方向，不属于第一版默认行为。

为了实现“平时问物理问题也能自然调用这个库”，我建议未来普通问答多一条轻量路由链：

1. 先判断这次问题是否值得查 IPK
2. 若系统有额外的会话上下文层，可先读取其输出
3. 再优先读取合适的索引
4. 再取少量候选 piece 的 `catalog` 或 `retrieve` surface
5. 若需要联想，再补读 `associate` surface
6. 必要时才读正文
7. 最后整合成回答

这样能同时满足：

- 回答看起来懂你
- 不至于每次都把整个库拉进上下文

## 17. 当前最推荐的工程落地顺序

如果要从工程角度分阶段落地，我建议：

### 第一步

先把 piece 目录结构和自动生成流程做出来。

### 第二步

先生成：

- `meta.json`
- `surface.json`
- `links.json`
- `piece.md`

### 第三步

先做第一版索引：

- `by_project`
- `by_time`
- `by_type`
- `by_domain`
- `by_method`
- `open_questions`
- `graph_links`

### 第四步

再让普通问答接一个轻量 IPK 路由。

### 第五步

最后再做更高级的：

- 更复杂的联想策略
- 与其他外部上下文层的联动

## 18. 当前这一轮讨论的结论

这一轮可以比较明确地定下三件事：

1. 用户不应手填结构字段，piece 默认由 AI 自动生成
2. 用户审核重点应放在正文和正文简介，而不是检索字段
3. 第一版索引指的是面向 AI 与 UI 使用的预生成结构化视图，而不是原始 piece 本身

这三个原则一旦成立，后面的 schema 和功能实现就会顺很多。
