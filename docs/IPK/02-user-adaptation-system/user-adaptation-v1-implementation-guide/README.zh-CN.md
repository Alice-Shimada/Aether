# 用户自适应系统 v1 分步实现指南

这个文件夹不是新的设计稿。

它的用途只有一个：

- 把已经拍板的用户自适应系统 v1 方案，整理成一个可以直接交给全新 AI 连续实现的执行包

这套指南默认建立在已经清理过冲突的正式文档之上，尤其是：

1. [user-adaptation-system-top-level-constraint.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-top-level-constraint.zh-CN.md) — 最高架构约束
2. [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
3. [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
4. [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)
5. [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)
6. [user-adaptation-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-aether-integration-v1.md)
7. [user-adaptation-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md)

## 怎么使用这个文件夹

新的 AI 不应该一上来就“把整套用户自适应系统一次性做完”。

正确方式是：

1. 先读 [00-implementation-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md)
2. 再按阶段顺序读 `01 -> 07`
3. 每做完一个阶段，就完成该阶段要求的最小验收
4. 只有前一阶段稳定后，才进入下一阶段
5. 每个阶段如果触碰 IPK / adaptation 文档或行为，必须同步运行 `ipk-doc-sync` 审计

如果 01-07 阶段已经完成，并且要继续实现 Graphify 借鉴下的 habit graph / report / explain 能力，再读：

- [user-adaptation-habit-library-graphify-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-habit-library-graphify-execution-plan.zh-CN.md)

这份补充文档只允许作为 v1.1 / vNext 增强执行，不能反过来覆盖 v1 的独立习惯库和工作区引用边界。

## 本文件夹内部阅读顺序

1. [00-implementation-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md)
2. [01-phase-1-storage-and-types.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/01-phase-1-storage-and-types.zh-CN.md)
3. [02-phase-2-bindings-and-scope-matching.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/02-phase-2-bindings-and-scope-matching.zh-CN.md)
4. [03-phase-3-scope-read-and-context-packet.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/03-phase-3-scope-read-and-context-packet.zh-CN.md)
5. [04-phase-4-signal-extraction-and-summary.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/04-phase-4-signal-extraction-and-summary.zh-CN.md)
6. [05-phase-5-proposal-inbox-and-promotion.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/05-phase-5-proposal-inbox-and-promotion.zh-CN.md)
7. [06-phase-6-ui-and-user-review.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/06-phase-6-ui-and-user-review.zh-CN.md)
8. [07-phase-7-indexes-hardening-and-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/07-phase-7-indexes-hardening-and-fixtures.zh-CN.md)
9. 可选增强：[user-adaptation-habit-library-graphify-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-habit-library-graphify-execution-plan.zh-CN.md)
10. [99-new-ai-prompt.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/99-new-ai-prompt.zh-CN.md)

## 这套指南覆盖什么

- 用户自适应长期真源读写
- `global / subject / initiative / task_scope / artifact` 五层内部 schema
- session 到 initiative / task_scope / subject / artifact 的绑定引用
- query time 的 `scope matching`
- query time 的 `scope read`
- `context_packet` 编译与快照
- 明确 signal extraction
- summary window 的 v1 最小入口
- pending proposal queue
- proposal merge / deduplicate
- scope promotion proposal
- proposal confirm / reject / defer
- JSON 真源到 Markdown 审阅镜像
- Web UI 中的当前区域习惯摘要、proposal inbox、手动整理当前对话入口
- 派生索引、habit surface、基线样例和安全加固

## 这套指南故意不要求什么

- 完整 `workflow_profile` / `pattern_profile`
- 跨 worktree 或跨 Aether project 复用同一个 initiative
- embedding / vector search
- 高级图形化习惯地图
- 自动 demotion / scope narrowing
- 用户自定义所有阈值
- 双向同步
- 默认写入 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`
- memory root UI 设置入口
- 让通用 write/edit 工具直接维护长期记忆真源

## 成功标准

如果一个全新的 AI 严格按本文件夹执行，最终应能产出一套满足下面条件的用户自适应系统 v1：

- 长期真源只通过 `MemoryPath.adaptationRoot()` 获取
- session db 只保存绑定、引用、快照和过程数据
- 每次模型请求前能轻量匹配并读取相关习惯，生成短小 `context_packet`
- 明确 signal 能被提取、存储、汇总，并进入 proposal 候选
- 高影响或跨层级习惯必须进入 proposal inbox，用户确认后才写入长期对象
- 用户能在 Web UI 中查看当前区域正在使用哪些习惯
- 用户能统一处理 pending proposals
- JSON 真源和 Markdown 镜像能保持一致
- 派生索引能避免每轮平铺扫描所有长期习惯
- 文档中已经延期的开放项不会被提前乱做
