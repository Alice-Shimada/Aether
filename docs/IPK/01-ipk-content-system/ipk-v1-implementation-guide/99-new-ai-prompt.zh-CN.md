# 发给下一个 AI 的 Prompt

下面这段话可以直接发给一个全新的 AI。

---

你现在在仓库 `/home/bzz/Aether` 中工作。  
你的任务不是继续讨论方案，而是**按照已经定稿的 IPK v1 文档，完整实现第一版 IPK 模块，并接到 Aether Web UI 上**。

先不要自己重新设计一套方案。  
先严格阅读下面这些文件，并且**按顺序**执行：

1. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/README.zh-CN.md`
2. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/00-implementation-contract.zh-CN.md`
3. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/01-phase-1-backend-foundation.zh-CN.md`
4. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/02-phase-2-session-summary-and-review.zh-CN.md`
5. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/03-phase-3-stash-and-edit-entry.zh-CN.md`
6. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/04-phase-4-commit-reindex-and-events.zh-CN.md`
7. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/05-phase-5-search-and-associate.zh-CN.md`
8. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-v1-implementation-guide/06-phase-6-baseline-and-hardening.zh-CN.md`

在实现过程中，如果你需要回看权威源文档，优先顺序固定为：

1. `/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md`
2. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-implementation-decisions.zh-CN.md`
3. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md`
4. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md`
5. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md`
6. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-storage-layout-v1.zh-CN.md`
7. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md`
8. `/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-open-questions.zh-CN.md`

必须遵守这些硬约束：

- `IPK` 必须作为独立模块实现，不混进 `reading-mode`
- 不要修改 Aether/opencode 的底层命名空间，不要全局重命名 opencode
- `MemoryRootResolver` 第一版采用默认平台路径 + 环境变量覆盖，不做 memory root UI 设置入口
- 通过 `AppIdentity` / build identity 集中注入 `productName`、`envPrefix`、`memoryNamespace` 和 `legacyStorageNames`
- 第一版数据根通过 `MemoryPath.ipkRoot()` 获取
- 当前兼容实现可以把 `MemoryPath.ipkRoot()` 解析到 `Global.Path.data/ipk/`
- `Global.Path.data/ipk/` 只能在 resolver 内部作为兼容默认或 legacy candidate；IPK storage、route、UI 文案和测试不得把它当协议
- memory resolver 文件应集中在 `packages/opencode/src/memory/identity.ts`、`packages/opencode/src/memory/path.ts`、`packages/opencode/src/memory/manifest.ts`
- 不要在业务模块、route、UI 或测试中硬编码 `Aether`、`opencode`、`/home/bzz` 或平台绝对路径来决定存储位置
- 旧路径导入只能 copy，不 move、不 delete；如果新旧 root 都有数据，不自动合并
- 第一版不要导出或同步到 `.opencode/adaptation/` 或 `.aether/adaptation/`
- 正式内容真源是文件：`piece.md / meta.json / surface.json / links.json`
- `surface.human.body_summary` 是当前结构真源
- 第一版入库必须是显式“总结 -> 选消息 -> 开始总结”
- review 弹窗只有三个主按钮：`入库 / 改进 / 暂存`
- `discard` 只能是隐式状态，不是第四个按钮
- 必须有右侧 `IPK库` 入口，且第一版包含 `审查暂存 / 编辑pieces / 设置模型`
- 第一版不自动接入普通问答
- 第一版不做 `type: project`
- 第一版不自动并入已有 piece
- 第一版不回写旧 piece 的 `links.json`
- 第一版前端先直接 `fetch("/ipk/*")`，不要先做 typed client / SDK

你的工作方式也必须满足下面要求：

- 不要一次性写一个超大补丁把所有阶段糊在一起
- 必须按阶段顺序推进
- 每完成一个阶段，就做该阶段要求的最小验收
- 每完成一个阶段，至少运行：
  - `cd /home/bzz/Aether/packages/opencode && bun typecheck`
  - `cd /home/bzz/Aether/packages/app && bun typecheck`
- 不要从仓库根目录直接跑测试
- 如果你为了更快推进而先放了临时实现，后续阶段必须把临时实现收敛成最终形态

最终交付时，你必须明确汇报：

1. 你完成了哪些阶段
2. 哪些接口、前端入口和文件已经落地
3. 哪些 baseline 已通过
4. 是否还剩下 `open-questions` 文档里允许保留的开放项

不要再先输出一大段方案讨论。  
直接开始实现，按阶段推进，直到 `IPK v1` 的整套指南内容都落实完。

---
