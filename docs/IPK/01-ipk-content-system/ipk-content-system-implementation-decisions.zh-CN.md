# IPK 内容系统：当前实现决策

这份文档用于记录已经明确拍板、可以直接影响工程实现的决策。

它的职责不是替代：

- 总览稿
- schema 文档
- workflow 文档
- Aether 集成文档

而是把“已经定下来的实现选择”单独固定下来，避免后续讨论反复漂移。

## 0. 文档冲突处理原则

当前已经明确：

- 所有 IPK 文档都应尽量保持一致，不应长期并存互相冲突的实现要求。
- 如果某些旧稿、讲解稿或英文稿暂时还没完全同步，而与当前 `v1` 方案发生冲突，则实现必须按最新的 `v1` 文档执行。

第一版临时采用下面的冲突处理顺序：

1. `ipk-and-adaptation-storage-access-contract`（跨系统存储/调用/权限约束）
2. `implementation-contract`（v1 实施总约束）
3. `implementation-decisions`（本文件）
4. `schema-v1`
5. `ingestion-workflow-v1`
6. `aether-integration-v1`
7. `storage-layout-v1`
8. `baseline-fixtures`
9. `open-questions`
10. `details / overview / explainer / 早期专题稿`
11. 英文稿

也就是说：

- 跨系统存储契约和实施总约束优先级最高，本文件让位于二者。
- 越具体、越晚拍板、越直接面向 `v1` 落地的文档，优先级越高。
- 讲解稿、展示稿和英文稿更适合作为理解辅助，不应压过已经正式固定的 `v1` 规范。

## 1. 模块边界

当前已经明确：

- `IPK` 要作为一个和现有 Aether 较为独立的模块实现。
- Aether 主要提供：
  - Web UI 入口
  - prompt 桥接点
  - 后端 route 挂载点
  - 事件通知与后台任务运行环境
- `IPK` 不应混入 `reading-mode` 语义，也不应挂成 `knowledge` 的一个子功能。

工程上可以借鉴其他模块的“独立 route / provider / page / store”做法，但 `IPK` 本身是独立领域。

## 2. 数据根与作用域

当前已经明确：

- `IPK` 第一版采用独立存储。
- `IPK` 采用“全局独立库 + Aether 只是入口”的方向。
- 数据根默认放在不可见目录，不放进当前工作区。

第一版默认实现方向：

- 业务层必须通过 `MemoryPath.ipkRoot()` / `MemoryRootResolver` 获取 `IPK` 根目录
- 第一版 `MemoryRootResolver` 采用默认平台路径 + 环境变量覆盖
- 第一版不做 memory root UI 设置入口
- 环境变量名、memory namespace、产品名必须通过 `AppIdentity` / resolver 集中管理
- 当前兼容实现可以把 `MemoryPath.ipkRoot()` 解析到 `Global.Path.data/ipk/`
- 新代码不应直接硬编码 `Global.Path.data/ipk/` 作为长期协议
- 旧路径导入只能 copy，不 move、不 delete；新旧 root 都有数据时不自动合并
- 不按项目或目录拆分成多个库
- 所有 `piece`、索引、地图都进入同一套全局库
- 当前落地文件为 `packages/opencode/src/memory/identity.ts`、`packages/opencode/src/memory/path.ts`、`packages/opencode/src/memory/manifest.ts`
- `packages/opencode/src/ipk/storage.ts` 只能调用 `MemoryPath.ipkRoot()` 获取 IPK 根，并在写入前做 memory root 内路径校验

这样做的原因是：

- 保留跨项目、跨阶段、跨主题的弱联想能力
- 避免分库后削弱长期内容之间的关联性
- 让未来的统一浏览、整理、修订和图像化入口更自然
- 避免 `IPK` 卷入底层 `opencode -> Aether` 改名工程

### 2.1 根目录规范

当前已经明确：

- 第一版的物理根目录规范单独记录在：
  - [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)
- 跨 `IPK` 与用户自适应系统的存储、调用、权限和改名边界记录在：
  - [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
- 如果其他文档里出现旧的 `docs/IPK/pieces/...` 可见目录示例，应以这份根目录规范为准。
- 如果其他文档把 `Global.Path.data/ipk/` 写成固定路径，应理解为当前兼容默认；实现时仍应经由 `MemoryPath.ipkRoot()`。

## 3. 正式内容的真源

当前已经明确：

- 正式入库后的 `piece` 以文件为真源。
- 第一版默认以这四类文件作为正式内容层：
  - `piece.md`
  - `meta.json`
  - `surface.json`
  - `links.json`
- 数据库、缓存或其他内部状态如果存在，也只承担草稿、任务状态、索引缓存等辅助职责。
- `body_summary` 当前实现以 `surface.human.body_summary` 为结构真源。
- `piece.md` 中如果需要出现对应摘要段落，先由 `surface.human.body_summary` 渲染生成。

这样做的原因是：

- 更符合当前 IPK 方案原本的文件化设计
- 更利于后续独立导出、迁移、检查和长期维护
- 不会把正式内容完全锁死在某一种运行时实现里

## 4. 第一版入库入口

当前已经明确：

- 第一版入库必须是显式触发，不是静默后台自动抽取。
- 入口来自 session 聊天界面中的“总结”动作。

第一版交互流程固定为：

1. 用户点击“总结”。
2. 聊天时间线进入“可选模式”。
3. 每条消息左侧出现一个圆圈。
4. 用户和 AI 消息都允许被勾选。
5. 勾选方式参考微信多选消息的交互感觉。
6. 聊天框底部提供“选择到这里”截线操作，用于快速批量选中到截线位置。
7. 当前默认规则是：截线碰到的那条消息也算选中。
8. 勾选完成后，聊天框右下角出现“开始总结”按钮。
9. 点击“开始总结”后，系统进入总结与 review 流程。

当前结论是：

- `v1` 的入库来源以“用户显式选择的消息集合”为主。
- 不要求用户先手填 `type`、`projects`、`domains` 等结构字段。

## 5. 第一版 Review 弹窗与暂存

当前已经明确：

- 第一版 review 以弹窗完成。
- 不做侧边栏 review。
- 不做独立 IPK 库审查页面作为第一版必需项。
- 第一版 review 弹窗要提供三个主要动作：
  - `入库`
  - `改进`
  - `暂存`

弹窗流程固定为：

1. 系统先生成总结结果。
2. 弹窗展示需要用户确认的人类内容层。
3. 弹窗默认至少显示：
   - `title`
   - `body_summary`
   - `piece.md` 对应的人类正文结果
4. 弹窗底部提供三个主要按钮：
   - `入库`
   - `改进`
   - `暂存`
5. 点击 `入库` 后，正式进入 commit 流程。
6. 点击 `改进` 后，弹窗内出现新的文本输入框。
7. 用户在输入框中用自然语言写改进要求。
8. 输入框右下角提供 `重新总结` 按钮。
9. 点击 `重新总结` 后，系统重新生成，并再次回到同一类 review 弹窗。
10. 点击 `暂存` 后，当前 review 结果写入草稿存储，供之后重新打开。
11. 未执行 `暂存` 的临时 review 结果，不要求跨刷新长期保留。
12. 改进循环可以持续到用户点击 `入库` 或 `暂存` 为止。

当前结论是：

- `v1` 的用户职责仍然只聚焦在人类内容层。
- 底层结构字段不要求用户直接手改。
- `暂存` 是第一版正式支持的草稿保留动作。

### 5.1 `discard` 的产品定义

当前已经明确：

- 第一版内部仍然保留 `discard` 这个状态结果。
- 但 `discard` 不是 review 弹窗里的第四个主按钮。
- 第一版 UI 只暴露三个主按钮：
  - `入库`
  - `改进`
  - `暂存`
- `discard` 由关闭弹窗、退出当前总结流程、放弃当前 review 结果等非主按钮动作承接。

这样做的原因是：

- 保持你已经拍板的三按钮主交互
- 同时保留 workflow 层需要的“放弃当前草稿”语义

## 6. `IPK库` 入口与第一版管理菜单

当前已经明确：

- Aether Web UI 最右侧栏需要增加一个 `IPK库` 按钮。
- 点击 `IPK库` 后，先弹出菜单，不要求第一版直接进入独立库页面。
- 第一版菜单包含三个操作：
  - `审查暂存`
  - `编辑pieces`
  - `设置模型`

### 6.1 `审查暂存`

当前已经明确：

- `审查暂存` 只面向已经执行过 `暂存` 的草稿。
- 它以一条一条 review 的形式展示。
- 每一条至少展示一份已经在 review 阶段生成过的压缩总结。
- 用户选择某条草稿后，应回到这条草稿对应的 review 弹窗与原 session 语境，而不是进入一个完全不同的流程。
- 每条可重开的草稿都应有稳定的 `draft_id`。

### 6.2 `编辑pieces`

当前已经明确：

- `编辑pieces` 以时间顺序列出最近正式入库过的 piece。
- 展示形式也采用一条一条 review 的方式。
- 每一条仍然显示用户审查时需要快速识别的总结信息。
- 这类列表可以直接复用 piece 中已经存在的人类审核摘要，不要求另造一套完全不同的摘要结构。
- 第一版可以把它作为 commit 后再次编辑与重编译的主要入口。
- 只有从这个专门入口进入时，系统才应默认把当前操作理解为“编辑已有 piece”。
- 如果用户没有走这个入口，而是从普通 session 中重新选消息总结，第一版默认按“新建 piece”处理。
- 从 `编辑pieces` 打开时，系统应先执行 `edit-start`，把原 piece 转成一个新的工作草稿，再复用同一套 review 流。

### 6.3 `设置模型`

当前已经明确：

- `IPK库` 菜单提供 `设置模型` 入口。
- 模型配置按能力分组维护，不与全局默认模型强绑定。
- 第一版分为四类：
  - `summarize`：总结初稿
  - `revise`：改进重写
  - `search`：搜索重排
  - `associate`：联想重排
- 配置持久化在 `MemoryPath.ipkRoot()/model.json`，刷新和重启后保持不变。
- 当前兼容实现可以由 resolver 在内部把该路径解析到旧数据目录下的对应文件，但 UI 和业务逻辑不得暴露或依赖旧协议。
- 各类未显式指定时，回退到系统默认模型。

当前结论是：

- `v1` 不要求先做完整 IPK 页面。
- 但必须给用户一个正式入口，去重新打开暂存草稿和最近入库的 piece。

## 7. 后台流水线

当前已经明确：

- 构建、编译、链接、索引、地图更新等工程步骤应在后台完成。
- 仍然遵守“人负责内容，AI 负责结构”的原则。

因此第一版在用户点击 `入库` 后，应由后台流水线继续完成：

- `meta` 生成或最终定稿
- `surface` 生成或最终定稿
- `links` 生成或最终定稿
- `commit`
- `reindex`
- 地图和索引更新
- 事件通知

用户不承担这些步骤的手工维护责任。

## 8. 普通问答是否自动调用 IPK

当前已经明确：

- 第一版不做“普通问答自动调用 IPK”。
- 只有在用户明确要求调用 `IPK` 时才进入 `IPK` 路由。
- 第一版建议把 `IPK` 使用意图进一步显式区分为：
  - `搜索`
  - `联想`

这样做的原因是：

- 避免当前阶段系统行为过重、过早侵入普通对话
- 保持 `IPK` 调用边界可控
- 让未来是否与用户自适应系统协作，留在后续阶段再决定
- 让 `搜索` 与 `联想` 两类能力在第一版里不要混用

## 9. 搜索、联想与运行时路由

当前已经明确：

- `搜索` 和 `联想` 应拆成两条不同 skill。
- `搜索` 目标是尽可能准确，并在准确前提下尽可能完整。
- `联想` 目标是更广泛地扩散相关内容，但返回数量应能被用户需求控制。
- 两者都不应只靠关键词匹配。
- 关键词、词表、索引和别名可以作为候选收缩层，但最终判断需要 LLM 参与。
- 第一版不应只靠模型自己猜用户到底想要 `搜索` 还是 `联想`。
- 第一版需要明确入口或明确意图选择，让用户显式指定要走哪一条能力。
- 存储层文件不需要为了 AI 改写成另一套内容格式。
- 运行时应按用途返回不同读模型，而不是把磁盘文件结构原样塞给所有前端和 skill。

第一版建议方向固定为：

- `ipk-search`
  - 先用索引、别名和结构字段缩小候选
  - 再用 LLM 做高精度筛选与排序
- `ipk-associate`
  - 先从相关区域和弱连接候选出发
  - 再用 LLM 做“值得联想给用户”的判断
- `DraftView`
  - 面向 review、暂存重开和 `编辑pieces`
- `PieceCard`
  - 面向列表、卡片和轻量展示
- `SearchHit`
  - 面向 `搜索` 结果
- `AssociateHit`
  - 面向 `联想` 结果

## 10. 事件流与 UI 范围

当前已经明确：

- 第一版事件流采用轻量实现即可。
- 不要求一开始就深度接入复杂 sync 体系。

第一版 UI 范围固定为：

- session 内显式“总结”入口
- 选择消息模式
- review 弹窗
- 右侧栏 `IPK库` 按钮
- `审查暂存`
- `编辑pieces`
- `设置模型`
- 入库后的轻量反馈

第一版暂不要求：

- 完整 IPK 库浏览页
- 图谱可视化
- 全局审查面板
- 系统化整理界面

这些能力可以在后续独立页面中实现。

### 10.1 前端 API 调用策略

当前已经明确：

- 第一版前端先直接调用 `/ipk/*` 接口。
- 等 `/ipk` API 稳定后，再补齐 typed client / SDK 接入。

这样做的原因是：

- 不让 SDK 改造阻塞第一版纵向链路
- 可以先把核心交互尽快跑通
- 以后仍然保留升级成更正式调用方式的空间

## 11. `piece` ID 与 `type`

当前已经明确：

- `piece` 的 ID 不采用日期流水号风格。
- 第一版沿用 Aether 现有 `Identifier` 风格。
- 第一版 `piece.type` 不保留 `project`。
- 某条 piece 是否“属于某个项目”，先通过 `projects[]` 这类关联字段表达，不通过 `type: project` 表达。
- piece 的“项目归属”采用双层结构：
  - 一层是来源工作区/目录身份
  - 一层是 IPK 自己的概念项目归属
- 这两层信息不应被压扁成同一个字段。

这样做的原因是：

- 与现有系统主键风格统一
- 更适合并发创建
- 更适合长期扩展和引用
- 避免和 Aether 现有 `project` 概念直接撞语义
- 保留“内容从哪个工作区来”和“内容在认知上属于哪个项目”这两种不同信息

### 11.1 `type` 不可变规则

当前已经明确：

- `piece.type` 一旦创建后不再变更，与 `id` 同等不可变。
- 如果 piece 的性质确实发生了根本变化，不应修改原 piece 的 `type`，而应：
  - 删除原 piece，新建一个正确 `type` 的 piece（走正常入库流程）。
  - 或者保留原 piece 不变，另新建一个不同 `type` 的 piece（走正常入库流程），新旧 piece 之间通过 `links` 关联。

这样做的原因是：

- `type` 决定了物理存储路径（`pieces/<type>/<year>/`），允许变更 `type` 需要移动目录，引入原子性和索引一致性风险。
- 通过"保留原 piece + 新建"的方式可以保留内容演化的历史轨迹。

### 11.2 字段落点

当前已经明确：

- 来源工作区/目录身份放在 `origin.workspace_ref`
- IPK 自己的概念项目归属继续放在 `projects[]`

这样做的原因是：

- `origin` 更适合承载“这条内容从哪里来”
- `projects[]` 更适合承载“这条内容在认知上属于什么项目”
- 两层语义清楚分离后，后续检索、过滤和 UI 展示都会更稳

## 12. 受控词表

当前已经明确：

- `domains / methods / contexts / projects` 不能完全自由漂移。
- 第一版采用“半受控”方案更合适。
- 如果已有相近规范词，就复用旧词。
- 如果没有合适词，就允许系统新增规范词。
- 这套规范词需要有单独的维护结构，便于按分区查询和复用。

第一版建议方向固定为：

- `contexts` 更接近枚举
- `domains / methods / projects` 更接近 `canonical slug + alias` 归一
- 词表记录至少应包含：
  - `kind`
  - `canonical_slug`
  - `label`
  - `aliases`
- 后续可演进成独立词表模块

### 12.1 词表磁盘组织

当前已经明确：

- 第一版词表采用“按类别分目录 + 目录内索引文件 + 可选单词文件”的折中方案。
- 不采用单一总文件。
- 也不要求每个词一开始就必须独占一个文件。

第一版建议方向固定为：

```text
taxonomy/
  contexts.json
  domains/
    index.json
    items/
      statistical-physics.json
  methods/
    index.json
    items/
      rg.json
  projects/
    index.json
    items/
      anisotropic-ising.json
```

其中：

- `contexts.json`
  - 作为更接近枚举的一类，直接集中维护
- `index.json`
  - 作为该类别的轻量查询入口
  - 至少包含 `version`、`kind`、`updated_at`、`items[]`
- `items/<slug>.json`
  - 只在某个词需要更丰富说明、别名、关系或附加信息时出现

这样做的原因是：

- 既保留按类别分区查询的清晰性
- 又给高价值词条留下单独扩展空间
- 不会像“每词一个文件”那样让第一版文件数爆炸

## 13. `links`、地图与索引

当前已经明确：

- 新 piece 入库时，不应回写旧 piece 的 `links.json`。
- 每条 piece 只负责保存自己的正向 `links`。
- `graph_links` 可以作为派生索引在 `commit` / `reindex` 时刷新。
- `graph_links` 的刷新不等于修改旧 piece 的正式内容文件。

当前结论是：

- 老 piece 的正式源文件保持稳定。
- 全局关系视图通过派生索引更新，而不是通过回写旧源文件更新。

### 13.1 地图和索引的正式 schema

当前已经明确：

- 地图和索引不应每种都完全散着长。
- 第一版采用“统一外壳 + 少量专属字段”的做法。
- `LLM` 可以参与填充这些字段的内容，但第一版不建议让它自由发明新的顶层 schema。
- 第一版 map/index 的可选字段采用白名单方式扩展，而不是开放式自由扩展。

第一版建议方向固定为：

- 所有 map/index 文件至少有：
  - `version`
  - `updated_at`
  - `entries[]`
- 每个 entry 至少有：
  - `key`
  - `label`
  - `summary`
  - `piece_ids`
  - `count`
- 允许按 map 类型增加少量可选字段，例如：
  - `scope`
  - `priority`
  - `next_step_hints`
  - `cluster_ids`

当前结论是：

- `LLM` 可以负责填这些字段的值
- 但不能在第一版里自由新增 schema 顶层键或任意 entry 键

## 14. 中英混合检索

当前已经明确：

- 第一版默认支持中英混合检索。
- 不要求把每一层 `surface` 都拆成完整双语字段。
- 可以通过规范词、别名、提示词和 skill 内部扩展兼顾中英文表达。

## 15. Schema Version 与测试基线

当前已经明确：

- 主要结构文件和索引文件都要带 `version`。
- 第一版要准备一组可重复验证的基线样例。
- 这组基线的目的，是在每次实现或重构后快速检查 IPK 的行为有没有偏掉。

基线不只是测“能不能跑”，还要测：

- 选消息到 review 的流程是否正确
- `暂存` 与重新打开是否正确
- `入库` 后索引更新是否正确
- `搜索` 的准确性与完整性是否达标
- `联想` 的发散度与可控性是否达标

## 16. 当前已确认但仍需继续细化的点

下面这些方向已经有明确倾向，但细节还没有完全拍死：

- 数据根采用全局独立隐藏库
- `IPK` 作为独立模块接入 Aether
- 第一版使用弹窗 review
- 第一版显式触发总结
- 第一版后台执行结构化与入库流程

但下面这些仍然需要后续进一步确定：

- map/index 可选字段还要不要继续扩展

专门记录“暂时这样做，但以后可能进一步调整”的条目，见：

- [ipk-content-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-open-questions.zh-CN.md)
- [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md)
- [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)

## 17. 当前一句话总结

第一版 `IPK` 的方向已经明确为：

> 一个独立于 Aether 核心逻辑的全局长期内容模块，  
> 通过 session 中显式选择消息、弹窗 review、`暂存/入库`、右侧栏 `IPK库` 入口和后台结构化流水线完成入库与回看，  
> 第一版默认不自动介入普通对话，只在用户明确要求 `搜索` 或 `联想` 时调用。
