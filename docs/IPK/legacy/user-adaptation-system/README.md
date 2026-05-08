# User Adaptation System 文档导航

这个子目录只讨论“逐渐熟悉用户”的系统，不再混入 `piece`、地图、surface 和入库流程本身。

它回答的问题包括：

- 如何从长期对话中提取风格信号
- 如何避免系统过于敏感
- 如何形成稳定的用户画像
- 如何让系统在适应用户的同时保留适度纠偏

## 文档列表

- [08-profile-and-adaptation-system.md](/home/bzz/Aether/docs/IPK/user-adaptation-system/08-profile-and-adaptation-system.md)
  用户风格画像与自适应助手系统的总体设计
- [09-adaptation-schema-v1.md](/home/bzz/Aether/docs/IPK/user-adaptation-system/09-adaptation-schema-v1.md)
  `signals / summaries / profile / policy` 第一版 schema
- [10-aether-adaptation-integration-v1.md](/home/bzz/Aether/docs/IPK/user-adaptation-system/10-aether-adaptation-integration-v1.md)
  用户适配系统在当前 Aether 项目中的落地方式

## 一句话总结

这一组文档讨论的是：  
如何让系统不只是记住用户说过什么，而是逐渐理解用户更适合怎样被帮助，并把这种理解稳定地反馈到未来回答中。
