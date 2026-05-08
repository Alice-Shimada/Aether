# reference_project 审阅启动 prompt 与修改口令

> 状态：可直接复制使用  
> 日期：2026-04-18  
> 适用场景：启动 `/home/bzz/Aether/reference_project` 中参考项目的第一次全量审阅；或启动后续针对某个问题的批量复审。

## 0. 最短启动口令

如果当前对话已经有足够上下文，可以直接说：

```text
请现在启动 reference_project 第一次全量审阅。
严格按照 docs/IPK/reference_project_review/batch-reference-project-review-workflow.zh-CN.md 执行。
排除 /home/bzz/Aether/reference_project/andrej-karpathy-skills 和 /home/bzz/Aether/reference_project/darwin_skill。
对其余每个项目建立同名文件夹，并分别写 user-adaptation-system.zh-CN.md 和 memory-system.zh-CN.md。
所有项目审阅完成后，再写 round-1-overview.zh-CN.md 和 cross-project-synthesis.zh-CN.md。
```

## 1. 完整启动 prompt

如果是新对话，建议直接复制下面这段：

```text
请现在启动 reference_project 第一次全量审阅。

本地项目目录是：

/home/bzz/Aether/reference_project

请排除：

/home/bzz/Aether/reference_project/andrej-karpathy-skills
/home/bzz/Aether/reference_project/darwin_skill
/home/bzz/Aether/reference_project/docs

其余项目都需要仔细阅读。

请严格按照这个工作流执行：

/home/bzz/Aether/docs/IPK/reference_project_review/batch-reference-project-review-workflow.zh-CN.md

核心要求：

1. 先从独立研究者视角理解每个项目，不要被 Aether 现有架构、五层 scope、session scratch、proposal review 或已有权威文档束缚。
2. 先说明每个项目自己认为用户有什么真实需求、它的产品流程是什么、它为什么这样实现、它的优点和风险是什么。
3. 再从 Aether 开发者视角分析它对 Aether 用户自适应系统和记忆系统的启发、挑战和可能推翻的旧前提。
4. 用户自适应系统和记忆系统必须分开写。每个项目至少输出两个正式文件：
   - docs/IPK/reference_project_review/<project-name>/user-adaptation-system.zh-CN.md
   - docs/IPK/reference_project_review/<project-name>/memory-system.zh-CN.md
5. 即使某个项目只是知识库、图谱、推荐系统或通用 agent 框架，也要按同一流程审阅；缺失的一侧要说明为什么不是它的重点，不要直接跳过。
6. 每个正式分析必须区分代码证据、文档证据和推断。
7. 不要在所有项目读完前急着改写 Aether 权威设计文档。
8. 所有项目审阅完成后，再写：
   - docs/IPK/reference_project_review/round-1-overview.zh-CN.md
   - docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md
9. 其中 round-1-overview.zh-CN.md 必须是简略总览，至少说明：审阅了哪些项目、目录里各类文件分别是什么、各项目和跨项目最重要的结论合集。
10. 在最终的 cross-project-synthesis.zh-CN.md 里，必须明确写出：当前 Aether / 现在这个项目在参照外部项目之后，哪些点值得保留，哪些点可能需要更改。
11. 如果你按轮次分批推进，轮次只是内部批处理单位，不是停点。每轮结束后更新进度文档并自动进入下一轮；只有在真实阻塞时才停下来问我。

请自动扫描项目清单、创建输出文件夹、分批完成所有项目的阅读和写作。
如果一次回复完成不了，请在同一对话中持续推进，并用文档记录进度，不要要求我逐个项目开启新对话。
```

## 2. 针对某个问题批量复审的启动 prompt

如果第一次全量审阅已经做过，之后想围绕某个具体问题重新检查所有项目，可以复制下面这段，把 `<你的问题>` 换成实际问题：

```text
请现在启动 reference_project 问题驱动批量复审。

本次问题是：

<你的问题>

本地项目目录是：

/home/bzz/Aether/reference_project

请排除：

/home/bzz/Aether/reference_project/andrej-karpathy-skills
/home/bzz/Aether/reference_project/darwin_skill
/home/bzz/Aether/reference_project/docs

请严格按照这个工作流执行：

/home/bzz/Aether/docs/IPK/reference_project_review/question-focused-batch-review-workflow.zh-CN.md

核心要求：

1. 自动扫描项目清单，不要要求我逐个指定项目。
2. 先把我的问题拆成 4 到 8 个可审阅的问题轴。
3. 对每个项目先复用已有审阅文件，再围绕本次问题补读代码和文档。
4. 每个项目都要给出“有证据 / 无证据 / 反证 / 仍不确定”的明确判断。
5. 输出到：
   - docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/review-brief.zh-CN.md
   - docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/per-project-findings/<project-name>.zh-CN.md
   - docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/comparative-report.zh-CN.md
   - docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/aether-impact.zh-CN.md
   - docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/open-questions-cleanup.zh-CN.md
6. 不要因为一次回复写不完就停止；请在同一对话里分批推进，并用文档记录进度。
```

## 3. 修改审阅工作流的严格口令

这套审阅工作流本身不应被轻易修改。

如果用户只是要求启动第一次全量审阅或问题驱动批量复审，不需要口令。

如果用户要求修改以下对象，必须明确说出口令：

- `docs/IPK/reference_project_review/` 下的审阅工作流、模板、启动 prompt、输出规则。
- 未来若把这套流程升级成 Codex skill，该 skill 的触发规则、项目范围、输出结构或质量标准。
- 旧兼容路径 `docs/IPK/02-user-adaptation-system/other_programs/` 中与这套审阅流程有关的入口文件。

这个口令的作用域只限于 **reference_project 审阅流程本身**。

它不会拦截：

- 其它独立的设计讨论流程。
- 其它独立 skill 的修改。
- 其它文件存储习惯、讨论习惯或项目协作流程的修改。
- Aether 其它架构治理口令各自负责的范围。

严格口令是：

```text
AETHER-REFERENCE-REVIEW-WORKFLOW-CHANGE-LOCK-2026-04-18
```

修改请求必须包含下面这句完整文字，才允许继续：

```text
我确认使用口令 AETHER-REFERENCE-REVIEW-WORKFLOW-CHANGE-LOCK-2026-04-18，允许修改 reference_project 审阅工作流。
```

如果用户没有说出完整口令，Codex 只能解释当前工作流、启动审阅或新增普通审阅报告，不能修改 **reference_project 审阅流程本身**；但这条限制不应拦截其它独立 skill 或流程的修改，它们应按各自的口令或规则处理。

## 4. 第一次全量审阅的默认项目清单

当前扫描到的项目如下。

需要审阅：

| 项目 | 路径 |
| --- | --- |
| graphify | `/home/bzz/Aether/reference_project/graphify` |
| graphiti | `/home/bzz/Aether/reference_project/graphiti` |
| hermes | `/home/bzz/Aether/reference_project/hermes` |
| langgraph | `/home/bzz/Aether/reference_project/langgraph` |
| letta | `/home/bzz/Aether/reference_project/letta` |
| mem0 | `/home/bzz/Aether/reference_project/mem0` |
| memos | `/home/bzz/Aether/reference_project/memos` |
| openclaw | `/home/bzz/Aether/reference_project/openclaw` |
| RecBole | `/home/bzz/Aether/reference_project/RecBole` |
| recommenders | `/home/bzz/Aether/reference_project/recommenders` |
| zep | `/home/bzz/Aether/reference_project/zep` |

排除：

| 项目 | 路径 |
| --- | --- |
| andrej-karpathy-skills | `/home/bzz/Aether/reference_project/andrej-karpathy-skills` |
| darwin_skill | `/home/bzz/Aether/reference_project/darwin_skill` |
| docs | `/home/bzz/Aether/reference_project/docs` |

正式执行时仍应重新扫描目录，避免项目清单变化后漏读。

## 5. 输出检查

第一次全量审阅完成后，至少应存在：

```text
docs/IPK/reference_project_review/<project-name>/README.zh-CN.md
docs/IPK/reference_project_review/<project-name>/user-adaptation-system.zh-CN.md
docs/IPK/reference_project_review/<project-name>/memory-system.zh-CN.md
docs/IPK/reference_project_review/round-1-overview.zh-CN.md
docs/IPK/reference_project_review/round-1-progress.zh-CN.md
docs/IPK/reference_project_review/cross-project-synthesis.zh-CN.md
```

可选但推荐：

```text
docs/IPK/reference_project_review/<project-name>/code-reading-log.zh-CN.md
```
