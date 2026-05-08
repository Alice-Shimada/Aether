# IPK：三层 Surface 正式 Schema 与字段质量标准（第一版）

这份文档把 IPK 的三层 surface 收敛成一版接近正式实现的定义。

目标有两个：

- 给后续工程实现一个清晰的字段边界
- 给后续自动生成与质量校验一个统一标准

本文只讨论三层 AI 工作面：

- `catalog`
- `retrieve`
- `associate`

不重复展开 `human.body_summary`，因为那一层主要面向用户审核。

## 1. 总原则

三层 surface 的职责必须严格分开：

- `catalog`
  负责低成本筛选与地图编译
- `retrieve`
  负责准确判断相关性与是否继续深入
- `associate`
  负责弱连接、迁移、类比与启发扩展

这三层都不是正文替代品。

## 2. 第一版总体结构

建议 `surface.json` 采用如下顶层结构：

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

其中本文件正式定义的是：

- `catalog`
- `retrieve`
- `associate`

## 3. `catalog` schema

### 3.1 目标

`catalog` 用于：

- 第一轮候选筛选
- 地图编译
- 轻量列表展示

它必须短、小、稳，但又不能失去方向感。

### 3.2 第一版建议 schema

```json
{
  "summary": "关于 anisotropic Ising 自对偶条件的一条初始研究直觉，关联 duality 与 RG 解释。",
  "domains": ["statistical-physics"],
  "methods": ["duality", "rg"],
  "projects": ["anisotropic-ising"],
  "contexts": ["research", "discussion"],
  "status": "seed",
  "salience": 0.72
}
```

### 3.3 字段定义

#### `summary`

类型：

- `string`

要求：

- 1 到 2 句话
- 明确说出“这条 piece 在想什么/处理什么”
- 尽量包含问题方向或研究意义

用途：

- 低成本相关性初筛
- 地图摘要
- 列表展示

#### `domains`

类型：

- `string[]`

要求：

- 1 到 3 个稳定领域标签
- 尽量是相对标准的领域词，而不是随意短语

用途：

- 领域地图
- 领域过滤

#### `methods`

类型：

- `string[]`

要求：

- 0 到 5 个方法词
- 优先填写“这条 piece 真正依赖的方法”，不要只写泛词

用途：

- 方法地图
- 联想入口

#### `projects`

类型：

- `string[]`

要求：

- 可为空
- 可多值
- 应只写真实相关项目

用途：

- 项目视图
- 项目内路由

#### `contexts`

类型：

- `string[]`

建议值：

- `learning`
- `research`
- `discussion`
- `writing`
- `reflection`

用途：

- 帮系统判断这条 piece 的语境

#### `status`

类型：

- `string`

建议值：

- `seed`
- `developing`
- `stable`
- `archived`
- `superseded`

用途：

- 候选排序
- 回答时判断成熟度

#### `salience`

类型：

- `number`

范围：

- `0` 到 `1`

含义：

- 这条 piece 在当前库中的整体重要度或代表性

用途：

- 地图排序
- 候选优先级

说明：

- 第一版可以由 AI 估计
- 后续也可混合用户使用频率、链接中心性等信号

### 3.4 `catalog` 质量标准

一条高质量 `catalog` 至少应满足：

- 读完 `summary` 后，AI 能知道大致方向
- 看见 `domains + methods + contexts` 后，AI 能快速判断它属于哪类材料
- `summary` 不依赖正文上下文也能成立
- 不会把尚未成熟的内容包装成稳定结论

### 3.5 `catalog` 常见失败

失败例 1：

```json
{
  "summary": "关于物理的一些想法。",
  "domains": ["physics"],
  "methods": [],
  "projects": [],
  "contexts": ["discussion"],
  "status": "seed",
  "salience": 0.5
}
```

问题：

- `summary` 太空
- `domains` 太泛
- 没有真正的方向信息

失败例 2：

```json
{
  "summary": "严格证明 anisotropic 模型临界线由 RG 唯一决定。",
  "domains": ["statistical-physics"],
  "methods": ["rg"],
  "projects": ["anisotropic-ising"],
  "contexts": ["research"],
  "status": "seed",
  "salience": 0.9
}
```

问题：

- 把 `seed` 级直觉写成了严格结论
- 过度强化，会误导后续检索

## 4. `retrieve` schema

### 4.1 目标

`retrieve` 用于：

- 第二轮精确判断
- 判断是否继续读正文
- 判断这条 piece 是证据、背景、方法还是启发

### 4.2 第一版建议 schema

```json
{
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
  ],
  "role": "idea"
}
```

### 4.3 字段定义

#### `summary`

类型：

- `string`

要求：

- 1 到 3 句话
- 明确说出这条 piece 在处理什么问题
- 必须有判断力，而不是泛泛而谈

用途：

- 精确判断是否相关

#### `concepts`

类型：

- `string[]`

要求：

- 2 到 8 个
- 尽量写稳定概念，不写整句

用途：

- 概念对齐
- 概念视图

#### `problems`

类型：

- `string[]`

要求：

- 1 到 5 条问题陈述
- 必须用问题语言写
- 应优先表达“用户会怎样问”

用途：

- 这是最重要的检索字段之一

#### `questions`

类型：

- `string[]`

要求：

- 记录 piece 内部主动提出的问题
- 可以比 `problems` 更细、更探索性

用途：

- 找历史思考路径
- 找真正的认知卡点

#### `claims`

类型：

- `string[]`

要求：

- 写当前判断、结论或假设
- 显式区分它是稳定结论还是初步判断

用途：

- 让系统知道该把它当证据还是当猜想

#### `assumptions`

类型：

- `string[]`

要求：

- 写明适用前提
- 只写真正影响解释边界的前提

用途：

- 避免误用

#### `open_questions`

类型：

- `string[]`

要求：

- 记录这条 piece 尚未解决的核心问题

用途：

- 规划
- 复盘
- 长期问题跟踪

#### `keywords`

类型：

- `string[]`

要求：

- 作为补充，不是主结构

用途：

- 兼容字面搜索

#### `retrieval_hints`

类型：

- `string[]`

要求：

- 写可能召回这条 piece 的近义表达、问法或缩略说法

用途：

- 提升召回
- 弥补术语漂移

#### `role`

类型：

- `string`

建议值：

- `idea`
- `evidence`
- `background`
- `method`
- `reflection`

用途：

- 让系统知道这条 piece 在回答时该扮演什么角色

### 4.4 `retrieve` 质量标准

一条高质量 `retrieve` 至少应满足：

- 不读正文，AI 也能大致判断是否值得继续深入
- `problems` 和 `questions` 能体现真实问题形态
- `claims` 不会伪装成熟度
- `assumptions` 能有效约束适用边界
- `role` 有助于回答组织

### 4.5 `retrieve` 常见失败

失败例 1：

```json
{
  "summary": "这是一次关于 Ising 的讨论。",
  "concepts": ["ising"],
  "problems": [],
  "questions": [],
  "claims": [],
  "assumptions": [],
  "open_questions": [],
  "keywords": ["ising"],
  "retrieval_hints": [],
  "role": "idea"
}
```

问题：

- 除了主题名，几乎没有判断力
- 无法支持精准检索

失败例 2：

```json
{
  "summary": "该 piece 证明了 RG 是解释 anisotropy 的唯一方法。",
  "concepts": ["rg", "anisotropy"],
  "problems": ["如何解释 anisotropy？"],
  "questions": [],
  "claims": ["RG 是唯一方法。"],
  "assumptions": [],
  "open_questions": [],
  "keywords": ["rg"],
  "retrieval_hints": ["RG explanation"],
  "role": "evidence"
}
```

问题：

- 断言过强
- `role` 误标为 `evidence`
- 极易误导后续回答

## 5. `associate` schema

### 5.1 目标

`associate` 用于：

- 类比
- 桥接
- 方法迁移
- 弱连接启发

它不是为了“最准确命中”，而是为了“有控制地扩展”。

### 5.2 第一版建议 schema

```json
{
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
  "bridge_targets": [
    "与其他从 isolated point 变成 manifold condition 的问题建立类比",
    "与需要从 exact condition 转向 RG interpretation 的问题建立类比"
  ],
  "link_glimpse": [
    {
      "target": "piece_prev_a",
      "kind": "extends",
      "reason": "延续了 earlier self-duality discussion"
    }
  ],
  "association_risk": "medium"
}
```

### 5.3 字段定义

#### `summary`

类型：

- `string`

要求：

- 比 `retrieve.summary` 更抽象一点
- 更强调结构、解释框架或迁移价值

用途：

- 为联想扩展提供抽象入口

#### `concepts`

类型：

- `string[]`

用途：

- 联想时的概念桥接

#### `methods`

类型：

- `string[]`

用途：

- 方法迁移
- 发现“题不同、法相似”

#### `problems`

类型：

- `string[]`

要求：

- 更偏“问题结构”而不是具体问题细节

用途：

- 找形态相似问题

#### `association_hints`

类型：

- `string[]`

要求：

- 必须写成真正有启发性的短句
- 不能只是再说一遍标签

用途：

- 这是联想层最关键字段之一

#### `bridge_targets`

类型：

- `string[]`

要求：

- 写这条 piece 可能桥接到哪些其他问题类型、解释任务或研究阶段

用途：

- 给联想 skill 明确的“往外扩”的方向

#### `link_glimpse`

类型：

- `object[]`

用途：

- 提供少量关系预览
- 帮联想 skill 决定要不要沿图扩展

#### `association_risk`

类型：

- `string`

建议值：

- `low`
- `medium`
- `high`

含义：

- 这条联想有多大概率跑偏

用途：

- 帮系统控制发散程度

### 5.4 `associate` 质量标准

一条高质量 `associate` 至少应满足：

- 能说清这条 piece 为什么可能对别的问题有启发
- 不只是标签堆砌
- 能把“问题结构”说出来
- 能提示联想风险

### 5.5 `associate` 常见失败

失败例 1：

```json
{
  "summary": "和很多东西都有关。",
  "concepts": ["physics"],
  "methods": [],
  "problems": [],
  "association_hints": ["可能有帮助"],
  "bridge_targets": [],
  "link_glimpse": [],
  "association_risk": "low"
}
```

问题：

- 没有任何联想抓手
- 甚至会制造噪音

失败例 2：

```json
{
  "summary": "这条 piece 可以推广到所有临界现象。",
  "concepts": ["criticality"],
  "methods": ["rg"],
  "problems": ["任何临界问题怎么理解？"],
  "association_hints": ["与所有 RG 问题相关"],
  "bridge_targets": ["所有场景"],
  "link_glimpse": [],
  "association_risk": "low"
}
```

问题：

- 过度泛化
- 联想边界失控
- 风险评估失真

## 6. 三层 surface 的硬边界

为了防止后面实现时混乱，我建议写死下面几个边界。

### 6.1 `catalog` 不承担精确解释

它不能试图替代 `retrieve`。

### 6.2 `retrieve` 不承担自由发散

它的第一职责是判断相关性，不是开脑洞。

### 6.3 `associate` 不能伪装成事实命中

它必须允许系统显式标注：

- 这是联想
- 这是类比
- 这是弱连接

### 6.4 正文仍然是最终证实层

如果 `retrieve` 读完仍然不能确定，就必须继续读正文。

## 7. 生成与校验建议

第一版建议把三层 surface 的生成分成两步：

1. 先从 `piece.md + meta.json + links.json` 生成初稿
2. 再跑一轮质量校验与重写

### 7.1 重点校验字段

最值得重点校验的是：

- `catalog.summary`
- `methods`
- `problems`
- `questions`
- `claims`
- `association_hints`
- `bridge_targets`
- `association_risk`

### 7.2 重点校验问题

校验时至少要问：

- 这条 `summary` 是否过空或过泛
- `problems` 是否真是问题而不是主题词
- `claims` 是否过度断言
- `association_hints` 是否真的提供桥接方向
- `association_risk` 是否明显过低估计

## 8. 最小实现建议

如果第一版要更克制一些，我建议：

- `catalog`
  先完整做
- `retrieve`
  先做到可用
- `associate`
  先做简化版

也就是说，第一版可以让 `associate` 先只保留：

- `summary`
- `methods`
- `problems`
- `association_hints`
- `association_risk`

等后续联想链路更稳定，再补：

- `bridge_targets`
- `link_glimpse`

## 9. 当前建议的一句话总结

三层 surface 里：

- `catalog` 决定“往哪看”
- `retrieve` 决定“要不要深入”
- `associate` 决定“要不要向外扩”

这三层只要边界清晰、字段有判断力，IPK 才能既快、又准、又有生命力。
