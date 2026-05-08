# 问题驱动批量复审工作流

> 状态：长期复用工作流  
> 日期：2026-04-18  
> 适用范围：当用户对用户自适应系统、记忆系统、用户需求、设计理念、架构边界或产品流程产生新疑问时，重新批量审阅 `/home/bzz/Aether/reference_project` 中的参考项目。  
> 目标：让外部项目长期作为 Aether 的现实参照系，而不是只做一次性调研。

## 0. 触发方式

用户可以直接提出一个问题，例如：

```text
我现在对用户记忆系统和用户自适应系统是否要分开成两个系统，或者应该分开多远有疑问。
请你仔细检查 /home/bzz/Aether/reference_project 中的所有项目，分析后给我一个报告。
```

遇到这类请求时，Codex 应自动执行本工作流。

除非问题本身缺少方向到无法开始，否则不要要求用户逐个指定项目，也不要要求用户为每个项目单独开一个对话框。

## 1. 与初次全局审阅的关系

初次全局审阅负责建立项目基础地图：

- 每个项目是什么。
- 它是否涉及用户自适应。
- 它是否涉及记忆系统。
- 它的核心流程、架构和证据入口在哪里。

问题驱动复审负责围绕一个新的设计疑问重新查看所有项目：

- 这个疑问在每个项目里有没有对应证据。
- 不同项目给出哪些相同或相反的答案。
- Aether 旧设计中哪些前提被支持、挑战或需要改写。
- 哪些问题仍然缺少真实用户实验。

如果初次全局审阅已经完成，复审应优先利用已有单项目文件，再按问题补读代码和文档。

如果初次全局审阅尚未完成，也可以直接启动问题驱动复审；此时必须边读边补足必要的项目定位，不得因为没有基础地图就拒绝执行。

## 2. 默认项目范围

默认审阅：

```text
/home/bzz/Aether/reference_project
```

默认排除：

```text
/home/bzz/Aether/reference_project/andrej-karpathy-skills
/home/bzz/Aether/reference_project/darwin_skill
/home/bzz/Aether/reference_project/docs
```

如果后续用户新增项目，Codex 应重新扫描目录，而不是只依赖旧清单。

## 3. 输出位置

每次问题驱动复审创建一个独立文件夹：

```text
docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/
```

建议文件结构：

```text
review-brief.zh-CN.md
per-project-findings/
  <project-name>.zh-CN.md
comparative-report.zh-CN.md
aether-impact.zh-CN.md
open-questions-cleanup.zh-CN.md
```

说明：

- `review-brief.zh-CN.md` 记录用户问题、审阅轴、项目范围、排除项和判断标准。
- `per-project-findings/<project-name>.zh-CN.md` 记录该问题下每个项目的证据和判断。
- `comparative-report.zh-CN.md` 给出跨项目比较，不按项目机械复述。
- `aether-impact.zh-CN.md` 专门写对 Aether 现有设计、权威文档和后续实验的影响。
- `open-questions-cleanup.zh-CN.md` 记录本次复审是否解决、改写或新增了 open questions。

如果复审结论已经稳定，并且会改变 Aether 正式设计，再回写对应权威文档。不要在单项目证据不足时提前改写 Aether 架构约束。

## 4. 复审步骤

### 4.1 固化问题

先把用户问题改写成可审阅的问题轴，例如：

```text
主题：用户自适应系统和记忆系统应分开多远？

问题轴：
1. 项目是否区分 user profile / preferences 与 general memory？
2. 用户偏好是否作为 memory 的一种保存？
3. session history 是否会进入长期用户画像？
4. 记忆检索是否直接改变 agent 行为，还是只提供事实上下文？
5. 用户能否审计、删除或纠正这两类数据？
6. 如果二者混在一起，项目用什么机制防止污染？
```

如果用户问题很宽，Codex 可以自己拆成 4 到 8 个问题轴。只有当问题会导致完全不同的产品方向且无法合理假设时，才向用户问一个简短澄清问题。

### 4.2 建立项目清单

运行目录扫描，拿到最新项目清单。

必须记录：

- 本次包含哪些项目。
- 本次排除哪些项目。
- 是否发现新项目或缺失项目。

### 4.3 每个项目做定向阅读

对每个项目，先读已有调研文件：

```text
docs/IPK/reference_project_review/<project-name>/README.zh-CN.md
docs/IPK/reference_project_review/<project-name>/user-adaptation-system.zh-CN.md
docs/IPK/reference_project_review/<project-name>/memory-system.zh-CN.md
docs/IPK/reference_project_review/<project-name>/code-reading-log.zh-CN.md
```

然后回到项目代码库，围绕本次问题补读：

- README / docs / examples
- runtime entry
- context builder
- memory store
- profile / persona / preference 相关文件
- retrieval / ranking / graph / summary 相关文件
- deletion / correction / review 相关文件

不是每个项目都必须读同样数量的文件。重点是每个项目都必须给出“有证据 / 无证据 / 反证 / 仍不确定”的明确判断。

### 4.4 每项目写短报告

每个项目的定向报告必须包含：

- 本项目对该问题的直接答案。
- 支持该答案的代码或文档证据。
- 如果没有相关能力，说明这是项目定位导致的缺失，还是代码中没有找到。
- 对 Aether 的启发或挑战。
- 本项目仍需继续验证的文件或问题。

### 4.5 写跨项目比较

跨项目报告按问题轴组织，不按项目目录组织。

每个问题轴至少给出：

- 多数项目的共同模式。
- 少数项目的不同做法。
- 高价值反例。
- Aether 当前设计的位置。
- 暂时不能下结论的原因。

### 4.6 写 Aether 影响报告

这一份单独写，因为它会影响后续设计决策。

必须区分：

| 结论类型 | 处理方式 |
| --- | --- |
| 可以立即吸收的实现技巧 | 写入后续实现建议或具体计划。 |
| 需要重新讨论的产品假设 | 写入 open questions。 |
| 已经足够稳定的设计变化 | 回写 implementation decisions 或其它权威文档。 |
| 需要实验验证的问题 | 写成实验设计或用户反馈问题。 |
| 不适合 Aether 的外部做法 | 明确说明不适合的前提差异。 |

此外必须单列：

- 当前 Aether / 现在这个项目在这个问题上，哪些点值得保留。
- 当前 Aether / 现在这个项目在这个问题上，哪些点可能需要更改。

## 5. 长期复用要求

问题驱动复审必须支持反复运行。

每次运行都应：

- 自动扫描最新项目目录。
- 优先复用已有项目分析。
- 只围绕本次问题补读必要文件。
- 输出一个独立问题文件夹，避免覆盖旧报告。
- 在最终报告中列出读过哪些项目、跳过哪些项目、哪些项目证据不足。
- 不要求用户手动逐个开启项目审阅。

如果一次复审太大，Codex 应继续在同一对话中分批完成，并使用中间文件记录进度；不要让用户重新开多个对话框。

## 6. 常设关注点

以下关注点来自用户已确认的调研原则，所有初次全局审阅和问题驱动复审都要保留。

### 6.1 高星不等于正确答案

高星说明项目打中了某种开发者需求，但不代表它适合 Aether。要判断它解决的是谁的痛点，以及这些痛点是否和 Aether 的用户一致。

### 6.2 看默认路径，不只看能力清单

一个项目“支持 memory / profile / agent context”不够重要。更重要的是：

- 默认什么时候读。
- 默认什么时候写。
- 是否自动写。
- 用户能不能发现、纠正和删除。
- 错误记忆会不会长期污染行为。

### 6.3 区分真实产品需求和工程方便

有些结构是为了用户体验，有些结构只是为了实现简单、降低延迟或方便部署。二者都可学习，但不能混为同一种产品结论。

### 6.4 记录负面证据

如果一个优秀项目几乎不做用户画像，也必须记录。这可能说明：

- 它的用户场景不需要强个性化。
- 用户画像的风险大于收益。
- 该项目把问题转移给了 memory、workflow、prompt 或人工配置。
- Aether 当前可能把用户自适应的重要性估得过高。

### 6.5 优先分析失败模式

重点记录：

- 记错用户。
- 过度个性化。
- 旧记忆污染新任务。
- 召回不可解释。
- 删除不彻底。
- 自动总结丢失关键细节。
- 用户纠正后系统仍反复犯错。

这些失败模式比功能清单更能指导 Aether v1。

### 6.6 最后再做总架构判断

单项目发现可以先记录，但不要过早把一次发现写成 Aether 总架构结论。跨项目共性、反例和失败模式都看完后，再决定是否改权威文档。
