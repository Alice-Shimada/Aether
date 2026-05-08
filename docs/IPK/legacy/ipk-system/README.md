# IPK System 文档导航

这个子目录只讨论 `idea + knowledge` 内容库本身，不再混入“用户画像 / 风格适配”的内容。

它回答的问题包括：

- piece 是什么
- piece 怎样存
- AI 怎样看 piece
- 地图和多层导航怎么工作
- 一段聊天怎样进入库
- schema 怎样定义

## 文档列表

- [01-piece-and-retrieval.md](/home/bzz/Aether/docs/IPK/ipk-system/01-piece-and-retrieval.md)
  piece、存储与分级检索设计草案
- [02-piece-schema-and-surface.md](/home/bzz/Aether/docs/IPK/ipk-system/02-piece-schema-and-surface.md)
  piece 字段表、surface 暴露层与自适应问答设计
- [03-ingestion-and-indexes.md](/home/bzz/Aether/docs/IPK/ipk-system/03-ingestion-and-indexes.md)
  自动生成 piece、用户审核边界与第一版索引
- [04-map-quality-and-routing.md](/home/bzz/Aether/docs/IPK/ipk-system/04-map-quality-and-routing.md)
  地图质量、surface 质量与路由规划
- [05-surface-schema-and-quality.md](/home/bzz/Aether/docs/IPK/ipk-system/05-surface-schema-and-quality.md)
  三层 surface 正式 schema 与字段质量标准
- [06-schema-v1.md](/home/bzz/Aether/docs/IPK/ipk-system/06-schema-v1.md)
  `meta.json` / `surface.json` / `links.json` 第一版正式 schema
- [07-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/ipk-system/07-ingestion-workflow-v1.md)
  入库流程规范
- [10-aether-ipk-integration-v1.md](/home/bzz/Aether/docs/IPK/ipk-system/10-aether-ipk-integration-v1.md)
  IPK 内容系统在当前 Aether 项目中的落地方式
- [11-multi-layer-maps-and-navigation.md](/home/bzz/Aether/docs/IPK/ipk-system/11-multi-layer-maps-and-navigation.md)
  多层地图与导航结构

## 一句话总结

这一组文档讨论的是：  
如何把用户的想法、知识、讨论和反思，整理成一个可长期保存、可多层导航、可被 AI 检索和联想的内容系统。
