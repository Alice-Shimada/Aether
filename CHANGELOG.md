# CHANGELOG

本文件记录项目已交付的模块级变更。

## Unreleased

- 初始化 CHANGELOG 工作流：以后每次完成一个功能模块，都必须同步更新本文件。
- 2026-04-14：用户拍板 **Project ↔ Initiative 完全解绑 + 习惯库分层路由/分区机制**。v1 不再默认做 project→initiative 1:1 绑定；新 confirmed 习惯的 bucket 归属由 AI classifier + review gate 决定（高置信度可自动处置，merge 进 v1，split 延后）。决策文档：[docs/decisions/project-initiative-decoupling-and-routing.md](docs/decisions/project-initiative-decoupling-and-routing.md)。同步修订了 15+ 处存量文档以消除 1:1 绑定的旧表述；代码侧对应的 V1–V10 审计项将在后续提交中逐项落地。
