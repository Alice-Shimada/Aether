# reference_project 批量审阅工作流

> 状态：调研工作流  
> 日期：2026-04-18  
> 范围：`/home/bzz/Aether/reference_project` 中除 `andrej-karpathy-skills`、`darwin_skill` 外的项目  
> 目标：先充分理解外部项目自己的用户需求、产品判断和实现逻辑，再回头评估 Aether 用户自适应系统与记忆系统是否需要局部改进或根本重构。

## 0. 核心原则

本轮调研有两个同等重要的视角。

### 0.1 独立研究者视角

先把每个项目当成一个独立优秀项目来读，不以 Aether 现有架构为筛子。

阅读时必须先回答：

- 这个项目认为真实用户有什么需求。
- 它为这些需求设计了什么产品流程。
- 它的程序架构怎样服务这些流程。
- 它为什么这样做，而不是采用另一种常见做法。
- 它在哪些地方可能是被真实用户反馈、社区使用和工程约束塑造出来的。

禁止一开始就把问题变成：

- 哪些点能借鉴到 Aether。
- 哪些点和 Aether 相同或相反。
- 它能不能放进 Aether 现有五层 scope。
- 它是否支持 Aether 当前已经写好的权威文档。

### 0.2 Aether 开发者视角

在独立理解之后，再从 Aether 角度分析。

这里不只允许提出局部实现改进，也允许提出更根本的问题：

- Aether 对用户需求的理解是否错了。
- Aether 把“用户自适应”和“记忆系统”的边界划得是否合理。
- Aether 的三块架构、五层 scope、proposal review、session scratch 是否需要简化、拆分或改名。
- Aether 是否过早设计了复杂结构，却缺少真实使用反馈。
- 哪些旧权威文档可以被新证据挑战。

如果外部项目显示 Aether 的某个前提不稳，应明确写出“被挑战的 Aether 前提”，而不是为了维护旧文档而弱化结论。

## 1. 用户自适应系统与记忆系统分开审阅

每个项目都分成两个正式分析文件。必要时可以额外补充 IPK / 知识库分析，但用户自适应和记忆系统两份文件不能合并：

```text
docs/IPK/reference_project_review/<project-name>/user-adaptation-system.zh-CN.md
docs/IPK/reference_project_review/<project-name>/memory-system.zh-CN.md
```

两份文件必须分开写，即使某个项目只明显偏向其中一类。

### 1.1 用户自适应系统

这里关注：

- 用户画像、persona、profile、preference。
- 用户工作习惯、沟通偏好、能力状态、熟悉度。
- 系统怎样根据用户改变回答、行动、工具选择或默认流程。
- 用户如何确认、纠正、撤销、提升或禁用这些适配。
- 系统如何避免把临时指令误当长期习惯。

### 1.2 记忆系统

这里关注：

- 记忆如何写入、存储、检索、压缩、删除。
- 短期记忆和长期记忆如何转换。
- 语义检索、关键词检索、图谱、缓存、索引、top K、timeout。
- session history、project memory、knowledge base、episodic memory、semantic memory 的边界。
- 记忆如何进入 prompt、context builder、tool loop 或 background task。

### 1.3 两者的关系

分开写不等于认为它们互不相关。

每个项目还要记录：

- 它是否把用户自适应建立在记忆系统之上。
- 它是否把用户画像当成一种特殊 memory。
- 它是否没有明确区分二者，但运行时实际分出了不同职责。
- 如果 Aether 保持二者分离，会得到什么好处和代价。

## 2. 批量项目清单

本轮需要审阅：

| 项目 | 本地路径 | 状态 |
| --- | --- | --- |
| graphify | `/home/bzz/Aether/reference_project/graphify` | 待审阅 |
| graphiti | `/home/bzz/Aether/reference_project/graphiti` | 待审阅 |
| hermes | `/home/bzz/Aether/reference_project/hermes` | 待审阅 |
| langgraph | `/home/bzz/Aether/reference_project/langgraph` | 待审阅 |
| letta | `/home/bzz/Aether/reference_project/letta` | 待审阅 |
| mem0 | `/home/bzz/Aether/reference_project/mem0` | 待审阅 |
| memos | `/home/bzz/Aether/reference_project/memos` | 待审阅 |
| openclaw | `/home/bzz/Aether/reference_project/openclaw` | 待审阅 |
| RecBole | `/home/bzz/Aether/reference_project/RecBole` | 待审阅 |
| recommenders | `/home/bzz/Aether/reference_project/recommenders` | 待审阅 |
| zep | `/home/bzz/Aether/reference_project/zep` | 待审阅 |

明确排除：

- `/home/bzz/Aether/reference_project/andrej-karpathy-skills`
- `/home/bzz/Aether/reference_project/darwin_skill`
- `/home/bzz/Aether/reference_project/docs`

## 3. 单项目输出结构

每个项目使用同名文件夹：

```text
docs/IPK/reference_project_review/<project-name>/
```

建议文件：

```text
README.zh-CN.md
user-adaptation-system.zh-CN.md
memory-system.zh-CN.md
code-reading-log.zh-CN.md
aether-implications.zh-CN.md
```

其中：

- `README.zh-CN.md` 只放项目定位、仓库路径、阅读结论摘要。
- `user-adaptation-system.zh-CN.md` 是用户自适应正式分析。
- `memory-system.zh-CN.md` 是记忆系统正式分析。
- `code-reading-log.zh-CN.md` 记录读过的入口文件、证据和仍未读的区域。
- `aether-implications.zh-CN.md` 等所有项目或单项目结论稳定后再写，避免一开始就被 Aether 旧结构牵引。

### 3.1 轮次级固定产物

第一次全量审阅除了单项目文件，还要固定产出三份轮次级文件：

```text
docs/IPK/reference_project_review/round-1-overview.zh-CN.md
docs/IPK/reference_project_review/round-1-progress.zh-CN.md
docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md
```

三者分工如下：

- `round-1-overview.zh-CN.md`：简略总览。说明本轮到底审阅了什么、目录里各类文件分别是什么、每个项目和跨项目最重要的结论合集，以及推荐阅读顺序。
- `round-1-progress.zh-CN.md`：进度台账。记录每一轮已经读到哪些项目、产出了哪些文件、当前还剩什么。
- `cross-project-synthesis.zh-CN.md`：跨项目综合判断。只在所有项目正式分析完成后写，按问题和设计分歧组织，而不是按项目复述。

## 4. 审阅流程

每个项目按同一流程审阅，不因为它看起来不像用户画像系统就降低标准。

### 4.1 第一遍：项目自我定位

先读：

- README
- docs / examples
- architecture / design notes
- package metadata
- quickstart
- tests 或 demo

目标：

- 判断这个项目给用户承诺什么。
- 判断它最核心的使用场景是什么。
- 判断它真正优化的是 agent、memory、workflow、knowledge base、recommendation 还是 graph。

### 4.2 第二遍：运行时主链路

找这些入口：

- session start
- message loop
- context builder
- prompt assembly
- tool loop
- memory read / write
- post-turn hook
- background job

目标：

- 画出“用户输入到模型调用”的数据流。
- 画出“模型输出到记忆更新”的数据流。
- 标出用户信息在哪里进入、在哪里改变行为。

### 4.3 第三遍：存储、索引与更新

找这些结构：

- 数据库表
- JSON / Markdown / 文件存储
- vector store
- graph store
- cache
- search index
- summary / compaction
- deletion / replacement / tombstone

目标：

- 判断什么是真源。
- 判断什么是派生索引。
- 判断哪些数据可以重建。
- 判断用户能否审计、纠正或删除。

### 4.4 第四遍：用户自适应分析

写 `user-adaptation-system.zh-CN.md`。

必须先从项目自身角度解释：

- 它是否真的做用户自适应。
- 如果做了，用户信息从哪里来。
- 如果没明显做，它为什么不需要做或暂时没做。
- 它隐含了哪些用户需求假设。

然后再写 Aether 角度：

- Aether 旧假设被支持、挑战或补充了什么。
- Aether 是否应该改变用户需求理解。
- Aether 是否应该改变架构，而不是只改实现。

### 4.5 第五遍：记忆系统分析

写 `memory-system.zh-CN.md`。

必须先从项目自身角度解释：

- 记忆是什么。
- 记忆为什么存在。
- 记忆怎样被写入、召回、压缩、删除。
- 它解决了哪些真实延迟、规模、准确性或可用性问题。

然后再写 Aether 角度：

- Aether 的 IPK、session recall、adaptation memory 是否应该拆开或合并。
- Aether 是否需要更朴素的 memory 优先方案。
- Aether 是否过早把 memory 和 user adaptation 混进同一个讨论。

### 4.6 第六遍：暂不汇总，先避免早期锚定

在所有项目读完前，不急着形成总架构结论。

可以记录单项目启发，但跨项目判断至少等第一轮所有项目完成后再做：

- 哪些用户需求被多个项目共同支持。
- 哪些架构模式反复出现。
- 哪些 Aether 旧设想没有外部项目支持。
- 哪些外部项目做法彼此冲突，说明这是开放设计空间。

### 4.7 轮次不是停点

如果审阅过程按“第一轮 / 第二轮 / 第三轮”分批推进，这些轮次只是内部批处理单位，不是默认停点。

要求：

- 每轮结束后先更新进度文档，例如 `round-1-progress.zh-CN.md` 或等价文件。
- 只要仍有默认项目处于 `pending` / `reading` / `writing`，就应自动进入下一轮。
- 不要因为完成了一个稳定批次就停下来等待用户确认。
- 只有在真实阻塞时才停下，例如项目缺失、文件损坏、路径冲突、输出规则互相矛盾，或用户明确要求暂停。

## 5. 审阅质量标准

每份分析文件必须区分三种内容：

| 类型 | 写法 |
| --- | --- |
| 代码证据 | 标明文件路径和具体模块 / 函数 / 配置。 |
| 文档证据 | 标明 README、docs、example 或测试。 |
| 推断 | 明确写“这是从代码结构推断，不是项目明确声明”。 |

每份正式分析都必须包含：

- 用户可见流程。
- 程序数据流。
- 关键文件入口。
- 它解决的真实问题。
- 它没有解决的问题。
- 对 Aether 现有设计的挑战。
- 对 Aether 当前设计中哪些点值得保留、哪些点可能需要更改的初步判断。
- 对 Aether 后续调研的开放问题。

## 6. 最终汇总阶段

所有项目的两个正式文件完成后，再写轮次总览和跨项目汇总：

```text
docs/IPK/reference_project_review/round-1-overview.zh-CN.md
docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md
```

其中 `round-1-overview.zh-CN.md` 必须至少回答：

- 这一轮实际审阅了哪些项目。
- 当前目录里每类文件分别承担什么作用。
- 每个项目最重要的一句话结论是什么。
- 从所有正式分析里提炼出的跨项目关键结论是什么。
- 新读者如果想最快抓住全貌，应该先看哪些文件。

汇总不按项目复述，而按问题组织：

- 用户真正需要什么。
- 用户自适应系统和记忆系统应怎样分边界。
- 哪些流程是高星项目反复采用的。
- 哪些架构是 Aether 需要认真考虑推翻的。
- 哪些设计适合 Aether 继续保留。
- 当前 Aether / 现在这个项目在参照外部项目之后，哪些点值得保留。
- 当前 Aether / 现在这个项目在参照外部项目之后，哪些点可能需要更改。
- 哪些问题还缺真实用户实验。

只有到这个阶段，才考虑回写：

- `user-adaptation-system-implementation-decisions.zh-CN.md`
- `user-adaptation-system-open-questions.zh-CN.md`
- `ipk-and-adaptation-storage-access-contract.zh-CN.md`
- 其它权威设计文档

## 7. 长期问题驱动复审

初次全局审阅完成后，这些参考项目不应被视为一次性材料，而应作为 Aether 设计的长期现实参照系。

当用户之后对设计方向、设计理念、用户需求、系统边界或架构取舍产生疑问时，应启动：

- [question-focused-batch-review-workflow.zh-CN.md](./question-focused-batch-review-workflow.zh-CN.md)

典型问题包括：

- 用户自适应系统和记忆系统是否应该分成两个系统，或者应该分开多远。
- 用户画像是否应该作为 memory 的一种，还是独立真源。
- session recall、IPK、用户偏好、agent 经验是否应该混存。
- 用户是否真的需要复杂的 scope / proposal review / scratch 机制。
- 高星项目为什么有些不做强用户画像。

问题驱动复审必须自动覆盖默认项目范围，不要求用户逐个项目开启对话框。输出应放在独立的 `question_reviews/<date-question>/` 文件夹中，避免污染单项目基础审阅。
