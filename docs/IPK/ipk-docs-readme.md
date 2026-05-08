# 文档导航

这个目录现在只保留两套新的、彼此独立的功能设计文档：

- [01-ipk-content-system/ipk-content-system-readme.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-readme.md)
  `IPK` 内容系统。只讨论想法、知识、讨论与反思怎样进入一个长期可用的内容库。
- [02-user-adaptation-system/user-adaptation-system-readme.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-readme.md)
  用户适配系统。只讨论系统怎样逐渐理解用户的表达偏好、学习风格和互动习惯。

这两个文件夹现在按两套完全独立的文档体系组织：

- 各自有自己的 `README`
- 各自有自己的介绍文档
- 各自有自己的计划文档
- 各自从 `01` 开始编号

另外，这个目录也保留少量外部案例与解读文档，供设计对照时参考：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
  `IPK` 与用户自适应系统共用的独立存储、调用、权限和改名边界约束。后续交给其他 AI 做存储实现前，应优先阅读这份契约。

- [ipk-terms-glossary.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-terms-glossary.zh-CN.md)
  `IPK` 文档体系的中文术语表，解释两套系统里高频专有名词在项目中的含义与角色。

- [reference_project_review/README.zh-CN.md](/home/bzz/Aether/docs/IPK/reference_project_review/README.zh-CN.md)
  `reference_project` 外部项目审阅区。横跨 IPK 内容库、记忆系统、用户自适应系统、agent workflow、graph 和推荐系统，用于第一次全量审阅以及后续围绕具体问题的批量复审。

- [llm-wiki.md](/home/bzz/Aether/docs/IPK/llm-wiki.md)
  一个关于“由 LLM 持续维护个人 wiki”的模式文档。
- [llm-wiki-analysis.zh-CN.md](/home/bzz/Aether/docs/IPK/llm-wiki-analysis.zh-CN.md)
  对 `LLM Wiki` 的中文解读稿，包含做法说明、与 IPK 的异同，以及可借鉴与不宜照搬之处。

旧版本的混合文档、旧编号和旧命名已经全部归档到：

- [legacy](/home/bzz/Aether/docs/IPK/legacy)

如果现在要对外讲解或继续推进设计，请优先看这两个新目录；如果要做外部案例对照，再看上面的 `LLM Wiki` 相关文档。
