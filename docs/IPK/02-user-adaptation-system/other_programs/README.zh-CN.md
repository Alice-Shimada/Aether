# 外部项目调研记录

> 兼容入口：这套 reference_project 审阅已经提升到 [../../reference_project_review/README.zh-CN.md](../../reference_project_review/README.zh-CN.md)。  
> 旧目录只保留给已有链接使用；新的全量审阅、问题驱动复审和项目分析输出都应写入 `docs/IPK/reference_project_review/`。

这个文件夹用于保存用户自适应系统和记忆系统相关外部项目的阅读记录。

这里的“用户自适应系统”可以在不同项目里有不同名字，例如：

- 用户画像
- user profile
- memory
- persona
- preference learning
- adaptive context
- agent memory
- skill / workflow memory

调研时不要求对方项目使用 Aether 的术语。重点是先判断它自己在解决什么真实问题，再回头判断 Aether 应该保留、修改还是推翻哪些旧设计。

批量审阅 `/home/bzz/Aether/reference_project` 时，先遵守：

- [../../reference_project_review/reference-project-review-start-prompts-and-lock.zh-CN.md](../../reference_project_review/reference-project-review-start-prompts-and-lock.zh-CN.md)
- [../../reference_project_review/batch-reference-project-review-workflow.zh-CN.md](../../reference_project_review/batch-reference-project-review-workflow.zh-CN.md)
- [../../reference_project_review/question-focused-batch-review-workflow.zh-CN.md](../../reference_project_review/question-focused-batch-review-workflow.zh-CN.md)

## 目录规则

每个被研究的项目都放在一个同名文件夹里：

```text
docs/IPK/reference_project_review/<project-name>/
```

项目名优先使用仓库名；如果仓库名不清楚，使用用户在对话里给出的项目名。文件夹名应尽量稳定，后续同一项目的多轮讨论都继续写入同一文件夹。

本轮批量审阅中，每个项目至少包含两个正式分析文件：

```text
README.zh-CN.md
user-adaptation-system.zh-CN.md
memory-system.zh-CN.md
```

即使某个项目明显只偏向知识库、图谱、推荐或记忆，也仍然保留这两个文件；缺失的一侧要说明“为什么它不是重点”，不能直接跳过。

可选辅助文件：

```text
code-reading-log.zh-CN.md
aether-implications.zh-CN.md
```

## 单项目记录内容

每个项目至少回答这些共同问题：

| 问题 | 记录重点 |
| --- | --- |
| 它把“用户自适应”叫什么 | 例如用户画像、memory、persona、profile、skill、workflow。 |
| 它在产品流程里何时读用户信息 | session 开始、每轮前、工具调用前、回复后、后台任务中。 |
| 它何时写入或更新用户信息 | 用户显式要求、模型自动提取、任务结束总结、人工 review 后确认。 |
| 它保存哪些类型的信息 | 偏好、事实、能力状态、工作习惯、项目经验、工具经验、短期状态。 |
| 它怎样决定适用范围 | 全局、项目、会话、文件、任务、主题，或纯检索命中。 |
| 它怎样检索和注入 | 常驻 prompt、关键词检索、语义检索、图谱、缓存、top K、timeout。 |
| 它怎样避免错误 | 用户确认、来源限制、冲突检测、删除/替换、置信度、审计日志。 |
| 它的优势是什么 | 对 Aether 有直接启发的能力。 |
| 它的顾虑是什么 | 隐私、误记、过度自动化、作用域污染、延迟、不可解释。 |
| Aether 旧设计被怎样挑战 | 可以是实现方式，也可以是用户需求理解或根架构。 |

两份正式文件使用：

- [../../reference_project_review/user-adaptation-review-template.zh-CN.md](../../reference_project_review/user-adaptation-review-template.zh-CN.md)
- [../../reference_project_review/memory-system-review-template.zh-CN.md](../../reference_project_review/memory-system-review-template.zh-CN.md)

## 阅读顺序

先用较少文件确认系统入口：

1. 找 README、docs、architecture、memory、profile、persona、prompt、context、agent lifecycle 等关键词。
2. 找运行时入口：session 初始化、message loop、context building、tool calling、post-turn hooks。
3. 找存储入口：用户文件、数据库表、memory store、index、cache、vector store。
4. 找写入入口：memory update、profile update、summarize、extract、consolidate、review。
5. 找测试或示例：它们通常暴露真实产品行为。

然后先按项目自己的问题意识整理，再按 Aether 关心的问题反向分析。不要按对方代码目录机械复述。

## 与 Aether 文档的同步规则

单项目调研结论先保存在该项目同名文件夹中。所有项目读完前，先避免过早写总架构结论。

后续如果用户围绕某个设计疑问重新批量复审所有参考项目，输出保存在：

```text
docs/IPK/reference_project_review/question_reviews/<YYYY-MM-DD>-<question-slug>/
```

这类复审使用 [../../reference_project_review/question-focused-review-template.zh-CN.md](../../reference_project_review/question-focused-review-template.zh-CN.md)，并且必须在报告中说明哪些结论来自代码证据、哪些来自文档证据、哪些只是推断。

如果结论已经足够确定，再同步到：

- [../user-adaptation-external-systems-five-details-comparison.zh-CN.md](../user-adaptation-external-systems-five-details-comparison.zh-CN.md)：跨项目对比。
- [../user-adaptation-system-implementation-decisions.zh-CN.md](../user-adaptation-system-implementation-decisions.zh-CN.md)：已经拍板、会影响实现的 Aether 决策。
- [../user-adaptation-system-open-questions.zh-CN.md](../user-adaptation-system-open-questions.zh-CN.md)：仍未确定、需要继续比较或留到 vNext 的问题。
- [../user-adaptation-system-navigation-map.zh-CN.md](../user-adaptation-system-navigation-map.zh-CN.md)：如果调研改变了后续 Codex 应先读哪些文件。

不要把外部项目的做法直接写成 Aether 约束。必须先说明：

- 它解决了什么真实问题。
- 它依赖哪些前提。
- Aether 当前是否有相同前提。
- 照搬后会改变哪些用户可见行为。
- 是否需要用户确认。

## 输出风格

调研文档应先讲系统流程和行为，再讲文件、函数和类型。用户不需要先理解代码细节，才能知道这个项目有什么值得学。

推荐结构：

1. 一句话定位
2. 用户信息的读写流程
3. 架构拆解
4. 关键技巧
5. 优势
6. 顾虑和风险
7. 对 Aether 的可迁移结论
8. 待继续验证的问题
