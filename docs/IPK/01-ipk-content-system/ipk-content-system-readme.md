# IPK 内容系统

这个文件夹现在只讨论一套独立功能：

如何把用户的想法、知识、讨论、反思和项目相关片段，整理成一个可以长期保存、长期调用、长期发展的内容系统。

这里不讨论用户风格、回答偏好、长期互动策略。  
那套功能已经完全独立到：

- [user-adaptation-system-readme.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-readme.md)

## 文档结构

- [ipk-terms-glossary.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-terms-glossary.zh-CN.md)
  统一术语表。第一次阅读 `overview` 或专题稿时，建议先配合它一起看。

- [ipk-content-system-overview.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-overview.zh-CN.md)
  面向中文讲解的总览稿。
- [ipk-content-system-overview.en.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-overview.en.md)
  面向英文讲解的总览稿。
- [ipk-content-system-details.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-details.zh-CN.md)
  中文细节总稿，把 piece、surface、links、地图、入库和运行时调用统一收束到一份参考里。
- [ipk-content-system-details.en.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-details.en.md)
  英文细节总稿。
- [ipk-content-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-implementation-decisions.zh-CN.md)
  当前已经拍板的实现决策记录。用于固定实现选择，不替代总览、schema 和 workflow 文档。
- [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)
  第一版物理根目录与磁盘布局规范。用于固定隐藏全局库的组织方式。
- [ipk-content-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-open-questions.zh-CN.md)
  记录“第一版先这样做，但以后可能继续调整”的问题与延期字段。
- [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md)
  第一版建议使用的回归基线样例，便于持续验证 IPK 的实现效果。
- [ipk-content-system-vision.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-vision.md)
  这套系统的目标、痛点与方向。
- [ipk-content-system-piece-and-retrieval.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-and-retrieval.md)
  `piece`、存储与分级检索设计草案。
- [ipk-content-system-piece-and-map-explainer.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-and-map-explainer.zh-CN.md)
  面向讲解与展示的 `piece` / `map` 核心说明稿。
- [ipk-content-system-piece-schema-and-surface.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-schema-and-surface.md)
  `piece` 字段表与 `surface` 暴露层设计。
- [ipk-content-system-ingestion-and-indexes.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-and-indexes.md)
  自动生成 `piece`、用户审核边界与第一版索引。
- [ipk-content-system-map-quality-and-routing.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-map-quality-and-routing.md)
  地图质量、`surface` 质量与路由规划。
- [ipk-content-system-surface-schema-and-quality.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-surface-schema-and-quality.md)
  三层 `surface` 的正式 schema 与字段质量标准。
- [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
  `meta.json`、`surface.json`、`links.json` 第一版正式 schema。
- [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
  入库流程规范。
- [ipk-content-system-multi-layer-maps-and-navigation.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-multi-layer-maps-and-navigation.md)
  多层地图与导航结构。
- [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
  这套系统在当前 Aether 项目中的落地方向。
- [ipk-v1-implementation-guide/README.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/README.zh-CN.md)
  交给全新 AI 的分步实现指南文件夹。用于把已定稿的 `IPK v1` 方案按阶段落成实际代码。

## 一句话说明

`IPK` 内容系统的目标不是“多存一些笔记”，而是把原本会散掉的研究与学习材料，变成一个真正能再次被 AI 找到、理解、组织和使用的长期内容库。

## V1 阅读顺序

如果是为了实现 `v1`，建议优先按下面顺序读：

1. [ipk-content-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-implementation-decisions.zh-CN.md)
2. [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
3. [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
4. [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
5. [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)
6. [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md)
7. 其他总览稿、细节稿和讲解稿

如果不同文档暂时出现冲突：

- 以更具体、更新、直接面向 `v1` 落地的文档为准
- 以 `implementation-decisions` 中记录的最新方案为准
