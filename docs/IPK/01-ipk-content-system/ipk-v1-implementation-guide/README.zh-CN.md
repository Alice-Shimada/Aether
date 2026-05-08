# IPK v1 分步实现指南

这个文件夹不是新的设计稿。

它的用途只有一个：

- 把已经拍板的 `IPK v1` 方案，整理成一个可以直接交给全新 AI 连续实现的执行包

这套指南默认建立在已经清理过冲突的正式文档之上，尤其是：

1. [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
2. [ipk-content-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-implementation-decisions.zh-CN.md)
3. [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
4. [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
5. [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
6. [ipk-content-system-storage-layout-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md)
7. [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md)

## 怎么使用这个文件夹

新的 AI 不应该一上来就“把整套 IPK 一次性做完”。

正确方式是：

1. 先读 [00-implementation-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/00-implementation-contract.zh-CN.md)
2. 再按阶段顺序读 `01 -> 06`
3. 每做完一个阶段，就完成该阶段要求的最小验收
4. 只有前一阶段稳定后，才进入下一阶段

## 本文件夹内部阅读顺序

1. [00-implementation-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/00-implementation-contract.zh-CN.md)
2. [01-phase-1-backend-foundation.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/01-phase-1-backend-foundation.zh-CN.md)
3. [02-phase-2-session-summary-and-review.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/02-phase-2-session-summary-and-review.zh-CN.md)
4. [03-phase-3-stash-and-edit-entry.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/03-phase-3-stash-and-edit-entry.zh-CN.md)
5. [04-phase-4-commit-reindex-and-events.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/04-phase-4-commit-reindex-and-events.zh-CN.md)
6. [05-phase-5-search-and-associate.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/05-phase-5-search-and-associate.zh-CN.md)
7. [06-phase-6-baseline-and-hardening.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/06-phase-6-baseline-and-hardening.zh-CN.md)
8. [99-new-ai-prompt.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/99-new-ai-prompt.zh-CN.md)

## 这套指南覆盖什么

- 后端 `ipk/` 独立模块
- 隐藏全局库与物理存储
- session 内显式“总结 -> 选消息 -> 开始总结”
- review 弹窗
- `暂存`
- `IPK库 -> 审查暂存`
- `IPK库 -> 编辑pieces`
- `IPK库 -> 设置模型`
- `commit -> reindex -> 轻量事件`
- 显式 `搜索 / 联想`

## 这套指南故意不要求什么

- 第一版普通问答自动调用 `IPK`
- 完整 IPK 库浏览页
- 图谱可视化
- 自动把新总结并入旧 piece
- 回写旧 piece 的 `links.json`
- 一开始就做 typed client / SDK 接入

## 成功标准

如果一个全新的 AI 严格按本文件夹执行，最终应能产出一套满足下面条件的 `IPK v1`：

- 工程上作为独立模块接入 Aether
- 前端可以在 Web UI 中完成总结、review、暂存、重开和编辑
- 后端可以把正式 piece 写入隐藏全局库
- reindex 后新 piece 进入后续搜索与联想候选范围
- 文档中已经延期的开放项不会被提前乱做
