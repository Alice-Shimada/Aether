# 用户自适应系统：2026-04-15 Session 作用域与当前习惯 UI 讨论纪要

这份文件用于整理 2026-04-15 围绕“暂存习惯入库作用域 UI”“当前 Session 习惯视图”“artifact 层语义”展开的讨论。

目的不是立即推动实现，而是把当前讨论中的结论、疑点和后续检查项集中记录下来，等其他改动稳定后再统一复核并实现。

## 1. 本轮明确暴露出来的问题

### 1.1 “入库作用域”UI 混淆了两件事

当前 UI/实现把下面两件事混在了一个下拉框里：

- 选择要写入习惯库的哪一个 `scope level`
- 选择该层级下具体写入哪个 bucket / target id

但用户当前明确要求是：

- 用户只负责选择作用域层级
- 具体写入哪个 bucket / target id 由系统自己决定
- 这个系统决定方式后续还需要继续打磨

因此，当前“作用域候选来自 session binding / project_guidance / global_guidance refs”的做法，不应再作为用户主交互模型。

### 1.2 `project_guidance` / `global_guidance` 的 refs 角色被用得过重

当前实现里，某些作用域候选会从：

- 当前 session 已绑定目标
- `project_guidance`
- `global_guidance`

里拼出来。

但当前讨论进一步明确：

- `project_guidance` / `global_guidance` 只是工作区 guidance / refs
- 它们不是习惯正文真源
- 它们也不应被用户理解为“入库作用域的来源”
- 它们最多只能作为系统内部 routing / matching 的参考信号

换句话说，用户在“确认入库”时看到的主问题应是“写到哪一层”，而不是“这些 workspace refs 里挑一个”。

### 1.3 当前 session 的正式习惯来源必须收敛成两类

当前讨论再次确认，当前 session 中真正生效的习惯来源只有两类：

1. 从习惯库真源引用进当前 session 的正式习惯
2. 当前 session 暂存区中已生效的 scratch habits

进一步说：

- session imported habits 必须来自习惯库正式真源
- `project_guidance` / `global_guidance` 不是 imported habits 的真源
- 它们只能帮助系统“去习惯库里找到候选”，不能自己直接变成当前 session 生效习惯

如果系统发现某条 `project_guidance/global_guidance` guidance 可用，它也应回到习惯库真源中找到对应正式 habit，再通过 `habit_ids` / review gate 注入 session，而不是直接把 profile/ref 当成生效习惯。

### 1.4 旧版“命中记录”价值有限，且展示位置错误

旧版“命中记录”显示的并不是：

- 某条习惯在这个 session 中有没有真的被触发过

而是：

- `context compiler` 在本轮 query-time 组装 `context_packet` 时读取了哪些记录
- 排除了哪些记录

它本质上属于：

- 审计/调试信息
- 编译器工作痕迹

不适合直接作为普通用户主视图的一部分。

## 2. 当前讨论形成的暂行共识

以下内容可视为“当前暂行共识”，但在真正实现前仍需再复核一次。

### 2.1 入库确认时，用户只选 scope level

当前倾向是：

- 用户在确认入库时，只选 `global / subject / initiative / task_scope / artifact` 中的哪一层
- 具体 bucket / target id 由系统自己决定
- 系统内部可使用 routing / classifier / matching / refs 作为参考
- 但不应把这些内部目标候选直接暴露成用户必须操作的 UI 主体

这意味着后续更合理的 UI 应更接近：

1. 选作用域层级
2. 系统内部决定目标 bucket
3. 必要时再向用户解释“为什么落到这个 bucket”

而不是让用户在一开始就面对 session binding / project/global refs 的混合候选。

### 2.2 imported habits 的真源约束需要更严格

当前进一步明确：

- imported habits 是“已经从习惯库真源中确认并引用到当前 session 的正式习惯”
- 它们不应直接来自 `project_guidance`
- 也不应直接来自 `global_guidance`
- profile/ref 只能帮助 matching 缩小候选范围

因此，后续检查实现时要特别确认：

- 是否存在“系统认为 profile/ref 可用，就直接把它们当成当前 session 生效习惯”的情况
- 是否存在“没有回到习惯库真源，只凭 guidance/ref 就生成 imported habits”的情况

如果存在，这应视为实现偏差。

### 2.3 当前 Session 习惯主视图只保留两类来源

UI 主视图上，当前 session 生效习惯只应按两类展示：

1. `已引用正式习惯`
2. `当前 session 暂存习惯`

对普通用户来说，不应再出现第三类“来自 project_guidance/global_guidance”的来源标签。

因为：

- 它们不是生效习惯真源
- 它们只是 guidance / reference

### 2.4 命中信息应是习惯条目的附属说明

如果要保留“命中情况”，也应写成用户可读文案，挂到各条习惯上，例如：

- 本轮已注入当前上下文
- 当前 session 已引用
- 当前 session 已生效

而不是直接暴露：

- `used_records`
- `omitted_reason`
- 文件路径
- artifact id
- scope id
- 编译器调试串

## 3. 当前仍未拍板的问题

### 3.1 `artifact` 到底是不是应与其他四层完全平行

当前讨论没有拍板，只确认了问题真实存在：

- 理论设计上，五层 scope 写成了平行结构
- 但实现上，`artifact` 更像“具体输出目标的 contract / 文件规则对象”
- 它和另外四层在真源结构、注入方式、索引方式、promotion 路径上都显得不完全同构

需要后续专门讨论的问题包括：

- `artifact` 是否保留为五层之一
- 如果保留，它是否承载普通 habits，还是只承载 `artifact_contract`
- 它应当与其他四层完全同构，还是作为特殊的 target-contract 层存在
- 它和“行为准则 / 思维方式 / profile / policy / workflow skill”之间的边界该怎么划

当前结论是：

- 暂不实现这部分结构调整
- 等其他问题收敛后，再专门复核和拍板

### 3.2 系统如何自动决定具体 target bucket

虽然当前倾向已经明确“用户只选层级，系统决定 bucket”，但系统怎么决定还没有拍板。

还需进一步设计的部分：

- 依据哪些信号选择目标 bucket
- 允许多大程度的自动新建 bucket
- 低置信度时是否需要二次确认
- 是否要给用户展示“目标选择解释”
- 如何避免把 workspace guidance 和习惯库真源混淆

## 4. 这份纪要对后续实现的约束

在真正开始实现本轮讨论内容之前，应先回头逐条检查：

1. 当前实现是否把 `project_guidance/global_guidance` 当成了 imported habits 的直接来源
2. 当前“入库作用域”UI 是否仍把“层级选择”和“target bucket 选择”混在一起
3. 当前正式习惯注入 session 时，是否确实经过习惯库真源与 `habit_ids`
4. 当前 `artifact` 相关实现是否只是临时不对称，还是设计上本来就不应对称
5. 当前讨论中的前提，在其他正在进行的改动完成后是否依然成立

在这些检查完成之前，这份纪要不应被当作“立即编码实现说明”，而应被视为：

- 一份待复核的设计收敛记录
- 一份帮助后续实现时避免思路漂移的参考

## 5. 下一次回到这件事时，建议优先检查的顺序

1. imported habits 的真源链是否纯净
2. 作用域 UI 是否只让用户选 scope level
3. 系统内部 bucket routing 如何设计
4. `artifact` 的独立架构问题

