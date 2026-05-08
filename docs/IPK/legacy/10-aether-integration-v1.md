# Aether 集成设计导航

这份文档现在只作为导航页使用。

因为 `IPK 内容系统` 和 `用户适配系统` 已经明确拆成两个独立系统，所以对应的 Aether 落地设计也分别拆开，不再混写在同一份文档里。

## 两份独立的集成设计

- [ipk-system/10-aether-ipk-integration-v1.md](/home/bzz/Aether/docs/IPK/ipk-system/10-aether-ipk-integration-v1.md)
  只讨论 `idea + knowledge` 内容系统在当前 Aether 项目中的挂载方式

- [user-adaptation-system/10-aether-adaptation-integration-v1.md](/home/bzz/Aether/docs/IPK/user-adaptation-system/10-aether-adaptation-integration-v1.md)
  只讨论“逐渐熟悉用户”的系统在当前 Aether 项目中的挂载方式

## 当前原则

- `IPK system`
  负责内容、piece、surface、地图、入库和检索导航
- `User adaptation system`
  负责 signals、summaries、profile、policy 以及对未来回答方式的调节

这两套系统会协作，但文档上不再混写。
