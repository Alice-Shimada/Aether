# 发给下一个 AI 的 Prompt

下面这段话可以直接发给一个全新的 AI。

---

你现在在仓库 `/home/bzz/Aether` 中工作。

你的任务不是继续讨论方案，而是**按照已经定稿的用户自适应系统 v1 文档，分阶段实现第一版用户自适应系统，并接到 Aether Web UI 上**。

先不要自己重新设计一套方案。

请先严格按顺序阅读：

1. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/README.zh-CN.md`
2. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md`
3. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/01-phase-1-storage-and-types.zh-CN.md`
4. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/02-phase-2-bindings-and-scope-matching.zh-CN.md`
5. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/03-phase-3-scope-read-and-context-packet.zh-CN.md`
6. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/04-phase-4-signal-extraction-and-summary.zh-CN.md`
7. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/05-phase-5-proposal-inbox-and-promotion.zh-CN.md`
8. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/06-phase-6-ui-and-user-review.zh-CN.md`
9. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/07-phase-7-indexes-hardening-and-fixtures.zh-CN.md`

如果 01-07 阶段已经完成，并且用户明确要求继续做 Graphify 借鉴下的 habit graph / report / explain 能力，再阅读：

10. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-habit-library-graphify-execution-plan.zh-CN.md`

这份补充文档只能作为 v1.1 / vNext 增强执行，不能覆盖 v1 的硬边界：Aether 工作区和习惯库仍是不连通区域，工作区只保存轻量背景 + refs（如 habit id / 引用 / 禁用 / 排序 / 解释路径），不保存习惯正文真源。

如果实现过程中需要回看权威源文档，优先级固定为：

1. `/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md`
2. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md`
3. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md`
4. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md`
5. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-aether-integration-v1.md`
6. `/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md`

必须遵守这些硬约束：

- 不要全项目 `opencode -> Aether` 重命名。
- 不要直接修改底层 `Global.Path` 的 app namespace。
- 不要把长期用户习惯真源塞进 session db。
- 不要默认写入 `<worktree>/.opencode/adaptation/` 或 `<worktree>/.aether/adaptation/`。
- 不要导出或同步到项目目录。
- 不要扫描整个 home、根目录、C 盘或任意项目目录。
- 不要让通用 write/edit 工具直接维护 memory root 真源。
- 用户自适应业务代码只能通过 `MemoryPath.adaptationRoot()` 获取长期真源。
- 派生 context packet 只能作为 cache / snapshot，不是长期真源。
- 高影响用户习惯必须进入 proposal，用户确认后才能写入长期 profile / policy。
- 所有写入 `global_guidance` 的内容都必须由用户确认。
- pending / rejected / deferred proposal 不能作为已确认规则注入模型。
- context compiler 每次模型请求前轻量运行，但不能把所有长期记忆塞进 prompt。
- 至少在 v1 中，AI 根据聊天内容新匹配到的任意层级 habit，都必须先经用户确认后才能加入当前 session。
- 至少在 v1 中，AI 不能自动删除或移出当前 session 已有 habit；它只能生成提醒或待确认项，等待用户确认。
- AI 必须持续扫描新增聊天，并在寻找新 habits 的同时复核当前 session 已有 habits 是否需要更新，但这个 audit loop 不能静默改写 `habit_ids`。
- scope matching 和 scope read 可以自动做；scope promotion 扩大长期影响时必须走 proposal。
- IPK 负责内容库；用户自适应系统负责习惯、偏好、策略、profile、policy、task_scope、artifact_contract。

必须按阶段推进：

1. 阶段 1：存储、安全路径与基础类型
2. 阶段 2：绑定、initiative 路由与 scope matching
3. 阶段 3：scope read、context packet 与模型注入
4. 阶段 4：signal extraction 与 summary window
5. 阶段 5：proposal inbox、合并去重与 scope promotion
6. 阶段 6：Web UI、当前区域习惯检查与用户审阅
7. 阶段 7：派生索引、基线验收与收尾加固

不要一次性写一个超大补丁把所有阶段糊在一起。

每完成一个阶段，至少运行：

```bash
cd /home/bzz/Aether/packages/opencode && bun typecheck
cd /home/bzz/Aether/packages/app && bun typecheck
python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
```

如果某阶段只改后端，可以先只跑 `packages/opencode` typecheck，但最终阶段必须三项都通过。

实现过程中必须同步维护文档：

- 如果代码和 guide 冲突，优先让代码符合 guide。
- 如果 guide 确实需要改，必须同步更新权威文档、guide 和 open-questions。
- 已解决的 open question 必须删除或改写。
- 不要让 open-questions 只增不减。

最终交付时必须明确汇报：

1. 完成了哪些阶段
2. 修改了哪些后端文件
3. 修改了哪些前端文件
4. 哪些 route 和 UI 入口已经落地
5. 长期真源是否只通过 `MemoryPath.adaptationRoot()` 获取
6. session db 是否只保存绑定、引用、快照和过程数据
7. proposal confirm / reject / defer 是否可用
8. context packet 是否可检查
9. 派生索引是否可重建
10. typecheck 和 doc audit 是否通过
11. 是否还剩 open-questions 中允许保留的开放项

不要再先输出一大段方案讨论。

直接开始实现，按阶段推进，直到用户自适应系统 v1 的整套指南内容都落实完。

---
