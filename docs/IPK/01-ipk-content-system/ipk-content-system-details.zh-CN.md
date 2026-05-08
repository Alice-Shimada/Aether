# IPK 内容系统细节总稿

## 1. 这份文档的用途

这份文档不是展示稿，也不是新的计划稿。  
它是 `IPK` 内容系统的细节总稿，用来把已经分散在多份专题文档中的核心设计重新收束成一份统一参考。

它主要回答下面这些问题：

- 这套系统到底是什么，不是什么
- 为什么 `piece` 必须作为统一最小单元
- `piece.md / meta.json / surface.json / links.json` 分别负责什么
- 为什么 surface 要分层，地图又为什么不能替代 surface
- 入库、审核、索引和运行时调用大致怎么协作
- 它和 `Skill`、用户自适应系统、Aether 当前架构分别是什么关系

如果别人问：

- 为什么 IPK 不只是“笔记库”
- 为什么不能只靠关键词搜索
- 为什么 `piece` 不是 skill
- 为什么要有 `catalog / retrieve / associate` 三层 surface
- 为什么要有地图和多层导航
- 长期方向下，普通问答如何接入 IPK

都应该优先来查这份文档。

需要说明的是：

- 这份文档会统一解释现有设计
- 但不会替代本目录里的专题技术稿
- 也不会改写现有计划类文档的职责

## 2. 系统现在的准确定位

`IPK` 内容系统不是普通笔记功能，也不是“把内容都丢进知识库里”这么简单。

它现在更准确的定位是：

- 一个长期内容系统
- 一个围绕 `piece` 组织的认知材料库
- 一个既服务显式 `IPK` 调用，也为未来普通问答扩展预留能力的内容底座
- 一个通过 surface、links、地图与导航，把原始内容变成可再次调用材料的系统

换句话说，它关心的不是：

- 用户喜欢怎样被回答
- 用户的长期互动风格
- 用户适配与执行策略

这些内容已经独立到：

- [user-adaptation-system-readme.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-readme.md)

`IPK` 只关心内容本身，以及内容如何被长期保存、组织、查找、验证和再次使用。

## 3. 系统边界

### 3.1 这个系统记录什么

这个系统记录的是与长期认知材料有关的内容。

包括：

- 想法
- 知识
- 讨论整理
- 反思
- 项目相关片段
- 计划
- 这些内容之间的结构关系
- 给 AI 检索、判断和联想用的表层信息
- 为大规模内容导航而预先生成的地图和索引

### 3.2 这个系统不直接记录什么

它不直接负责：

- 用户风格画像
- 回答偏好
- 工作顺序和操作习惯
- 回答与执行时的策略选择

这些属于用户自适应系统，而不是内容系统本身。

它也不应该直接承担：

- 把大量 `piece` 做成 skill
- 把所有运行时策略硬塞进系统 prompt
- 让用户手工维护底层 schema、索引和检索结构

## 4. 最重要的总原则

### 4.1 人负责内容，AI 负责结构

这套系统最重要的原则之一是：

- 用户负责表达真正想保留的内容
- AI 负责把这些内容整理成可长期使用的结构

用户主要应该做的是：

- 说出自己的想法、问题、判断和材料
- 查看生成后的正文是否表达正确
- 在必要时要求重写和补充

用户不应该被要求去决定：

- `id`
- `type`
- `surface` 字段
- `links` 如何抽取
- 地图如何编译
- 检索结构如何组织

### 4.2 `piece` 承载内容，`skill` 承载方法

`piece` 不应该被做成 skill。

更合理的分工是：

- `piece`
  承载用户自己的内容

- `skill`
  承载如何检索、如何联想、如何下钻、如何综合的工作流方法

- `tool / query`
  负责真正执行读取、搜索、路由和局部展开

### 4.3 地图负责引路，surface 负责判断，正文负责证实

这是 IPK 里最关键的结构分工。

- 地图告诉 AI 先去哪里看
- surface 告诉 AI 值不值得继续深入
- 正文告诉 AI 真正的内容、细节和证据是什么

三者不能互相替代。

### 4.4 长期方向：普通问答如何接入 IPK

`IPK` 不应该永远只是一个“需要用户主动打开的资料库”。

但这部分属于长期方向，不是第一版默认行为。

更理想的长期状态是：

- 用户正常提问
- 系统在未来扩展里判断这次是否需要查 `IPK`
- 先走地图和 `surface`
- 再决定是否读正文

第一版仍然只在用户明确要求调用 `IPK` 时使用它。

## 5. `piece` 作为统一最小单元

当前最重要的结构性结论是：

- `piece` 应该作为统一最小单元

这样做的原因是：

- 它足够中性
- 不会预设内容一定是笔记、论文摘要还是日记
- 适合统一索引
- 适合统一关系图
- 适合在未来扩展不同类型

当前推荐的第一版类型包括：

- `idea`
- `knowledge`
- `thread`
- `review`
- `plan`
- `project`

这里要注意：

- `type` 说的是 piece 是什么
- `status` 说的是 piece 发展到哪一步

## 6. `piece` 的文件结构

当前最推荐的 piece 结构是：

```text
piece_xxx/
  piece.md
  meta.json
  surface.json
  links.json
```

这四类文件分别承担不同职责。

### 6.1 `piece.md`

这是正文层，也是真实内容层。

它适合保存：

- 原始想法
- 讨论整理
- 推导过程
- 研究判断
- 反思内容
- 未解决问题
- 后续补充

它通常还会包含给用户审核用的 `body_summary`。

### 6.2 `meta.json`

这是结构身份证。

它偏稳定，适合保存：

- `id`
- `type`
- `title`
- 时间字段
- 来源信息
- `status`
- 领域、方法、语境、项目等基础分类

### 6.3 `surface.json`

这是 AI 的工作面。

它不等于正文摘要，而是给 AI 做路由、判断、检索和联想的结构化暴露层。

第一版最推荐的顶层结构是：

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

### 6.4 `links.json`

这是关系层。

它用于保存结构化 links，而不是把一切关系都压扁成 tags。

它应该能表达：

- 引用关系
- 发展关系
- 方法相似性
- 问题延伸
- 项目归属或上下游关系

## 7. 为什么要把正文、surface 和 links 分开

如果不分开，就会出现几个问题。

### 7.1 正文太重

如果 AI 每次都直接读正文：

- 成本高
- 慢
- 上下文容易爆
- 大量内容其实和当前问题无关

### 7.2 检索和联想会混在一起

如果只有一层摘要：

- 系统很难区分“强相关命中”
- 和“弱相关启发”

### 7.3 关系会退化成标签堆

如果没有 `links.json`：

- 很多真正重要的关系表达不出来
- tags 会被过度滥用

所以分层不是形式主义，而是为了让系统真正可扩展。

## 8. 三层 surface 的职责

IPK 的 surface 现在最推荐分成三层 AI 工作面：

- `catalog`
- `retrieve`
- `associate`

### 8.1 `catalog`

`catalog` 负责：

- 第一轮候选筛选
- 地图编译
- 轻量列表展示

它必须：

- 短
- 稳
- 方向清楚

但它不负责精确解释。

### 8.2 `retrieve`

`retrieve` 负责：

- 判断这条 piece 和当前问题是否真的相关
- 判断是证据、背景、反例、方法提示还是问题线索
- 决定是否继续读正文

这一层对准确性要求最高。

### 8.3 `associate`

`associate` 负责：

- 弱连接
- 类比
- 方法迁移
- 启发式扩展

这一层不能伪装成“事实命中”，否则会误导系统。

## 9. 为什么不能只靠关键词搜索

关键词搜索当然有价值，但它不能成为主入口。

原因是：

- 很多 piece 的价值不在关键词，而在问题形态
- 很多研究材料真正相关，是方法上相似而不是文本重合
- 很多历史内容是“当时怎么想的”，不是标准教科书语言
- 仅靠关键词很难支持弱联想和跨主题迁移

因此更合理的结构是：

- 关键词只是手段之一
- 主链路应是地图 + surface + 渐进下钻

## 10. 地图与多层导航

当 piece 变多之后，系统不能每次都盲搜全库。

所以必须预先生成多张地图，并允许多层导航。

### 10.1 地图不是一张，而是一组

当前最推荐至少支持这些维度：

- 项目维
- 时间维
- 领域维
- 方法维
- 问题维
- 关系维

### 10.2 地图不是答案摘要

地图不负责替用户回答问题。

它更像：

- 一个高度压缩的入口层
- 一个“去哪里继续找”的路由先验

### 10.3 多层导航的意义

多层导航意味着系统不会：

- 一步命中全文
- 或者一上来就让 AI 全库盲找

更合理的是：

1. 先进入合适的地图
2. 再进入候选区域
3. 再看 `catalog / retrieve / associate`
4. 最后才决定是否读正文

## 11. 入库与审核工作流

IPK 的理想入库流程不是让用户手工填表，而是一条自动化链路。

当前最推荐的高层工作流是：

```text
select
  -> capture
  -> draft
  -> structure
  -> quality
  -> review
  -> commit
  -> reindex
```

### 11.1 输入来源

输入可以来自：

- 完整聊天
- 聊天中的选定消息
- 微信消息及其延伸讨论
- 用户手动输入的一段原始内容

### 11.2 自动生成草稿

系统自动生成：

- `title`
- `body_summary`
- `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

### 11.3 用户审核边界

用户默认主要审核：

- `title`
- `body_summary`
- `piece.md`

也就是审核“内容有没有表达对”，而不是审核底层检索结构。

### 11.4 正式入库

用户确认后，系统再：

- commit piece
- 更新 links
- 重建或增量更新索引
- 重编译相关地图

## 12. 两种不同的 summary

这一点非常重要，不能混。

### 12.1 `body_summary`

这是给用户看的正文简介。

它更像：

- 这条 piece 到底在说什么
- 这次讨论主要保留了什么
- 适不适合让用户快速确认

### 12.2 `surface.summary`

这是给 AI 检索和判断用的工作摘要。

它更像：

- 一个紧凑、标准化、可判断相关性的表述

因此：

- `body_summary` 面向用户审核
- `surface.summary` 面向 AI 路由和检索

两者不应该强制相同。

## 13. 运行时调用逻辑

未来如果要在普通问答里接入 `IPK`，最推荐的调用逻辑是：

1. 判断这次是否需要查 IPK
2. 若需要，先选择地图入口
3. 读取候选 piece 的 `catalog`
4. 再根据问题读取少量 `retrieve`
5. 若需要扩展，再看 `associate`
6. 只有在证据不足时才继续读正文
7. 最后再综合生成回答

这里最关键的是：

- 不能只根据地图回答
- 不能只根据联想结果回答
- 若 `retrieve` 仍不够，就必须进一步读正文或缩小问题

## 14. `Skill` 在这里扮演什么角色

`Skill` 不应该直接承载 piece 数据。

更合理的角色是：

- `ipk-capture`
  负责把原始输入整理成 piece 草稿

- `ipk-route`
  负责选择合适地图或导航入口

- `ipk-retrieve`
  负责精确检索和候选收缩

- `ipk-associate`
  负责弱联想扩展

- `ipk-synthesize`
  负责把命中的内容综合进回答或总结

所以：

- IPK 是内容层
- skill 是工作流层

## 15. 和用户自适应系统的关系

这两套系统密切协作，但边界必须清楚。

### IPK 内容系统负责：

- 存什么内容
- 内容之间怎么连
- 内容怎样分层暴露给 AI
- 从哪里找、如何验证和如何下钻

### 用户自适应系统负责：

- AI 应该怎样理解用户
- AI 应该怎样理解任务和产物
- 回答和执行时该采用什么策略

所以关系更像是：

- IPK 提供“可被使用的长期内容”
- adaptation 提供“怎样更合适地使用这些内容”

## 16. 在 Aether 中的落地位置

从当前 Aether 项目出发，IPK 最自然的挂载点是：

- 后端 `packages/opencode/src/ipk/`
- 前端 `packages/app/src/context/ipk.tsx`
- 未来普通问答接入 hook `SessionPrompt.prompt()`
- 入库和索引更新复用后处理与事件流

高层理解可以写成：

```text
原始输入
  -> IPK ingest
  -> piece / surface / links
  -> maps / indexes
  -> runtime route + retrieve
  -> 回答 / 复盘 / 研究调用
```

## 17. 本目录里各专题稿的角色

这份 details 总稿负责统一主线。  
下面这些文档继续保留各自的专题职责：

- [ipk-content-system-piece-and-retrieval.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-and-retrieval.md)
  讲 `piece`、存储、分级检索和 skill 分工。
- [ipk-content-system-piece-schema-and-surface.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-schema-and-surface.md)
  讲 `piece` 字段和 surface 暴露层。
- [ipk-content-system-surface-schema-and-quality.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-surface-schema-and-quality.md)
  讲三层 surface 的正式 schema 与质量标准。
- [ipk-content-system-ingestion-and-indexes.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-and-indexes.md)
  讲自动生成 piece、用户审核边界和第一版索引。
- [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
  讲入库工作流和状态机。
- [ipk-content-system-map-quality-and-routing.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-map-quality-and-routing.md)
  讲地图质量、surface 质量和路由规划。
- [ipk-content-system-multi-layer-maps-and-navigation.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-multi-layer-maps-and-navigation.md)
  讲多层地图与导航结构。
- [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
  讲正式 schema。
- [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
  讲 Aether 集成。

## 18. 当前最重要的设计结论

当前最重要的结论不是某一个字段，而是下面这些：

1. `IPK` 不是普通笔记库，而是长期内容系统。
2. `piece` 必须作为统一最小单元。
3. `piece` 负责内容，`skill` 负责方法，二者不能混。
4. `piece.md / meta.json / surface.json / links.json` 应清楚分层。
5. `catalog / retrieve / associate` 三层 surface 必须严格分工。
6. 地图负责引路，surface 负责判断，正文负责证实。
7. 长期上普通问答可以接入 `IPK`，但第一版只在用户显式要求时调用。
8. IPK 内容系统与用户自适应系统应长期协作，但边界必须清楚。
