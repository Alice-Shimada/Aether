# 用户自适应系统：实施前可交接性复核（2026-04-12）

本文用于在正式生成 `user-adaptation-v1-implementation-guide/` 前，最后检查当前设计文档是否已经足够交给新的 AI 分步实现。

当前正式实施指南已经生成：

- [user-adaptation-v1-implementation-guide/README.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/README.zh-CN.md)

因此本文主要保留为历史复核记录和设计依据；实际实施应优先阅读正式 guide。

它不替代权威设计文档。涉及已经拍板的约束时，以：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
- [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
- [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)
- [user-adaptation-system-scope-mechanics-v1.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-scope-mechanics-v1.zh-CN.md)

为准。

## 1. open-questions skill / 规则检查结论

### 1.1 检查前状态

原有 `ipk-doc-sync` skill 能做到：

- 要求 IPK 相关代码变更必须同步 `/docs/IPK`。
- 要求 open-questions 只保存未决问题。
- 要求最终报告列出 remaining open questions。
- 支持中文输出模板。

但它原本没有明确要求：

- 每次文档或代码变化后重新扫描 open-questions。
- 删除已经解决的问题。
- 把部分解决的问题拆分成“已定部分”和“剩余未定部分”。
- 把过时问题改写成 vNext / tuning 项。
- 在同步报告中单独说明 open-questions 清理结果。

因此，原规则只能防止一部分“已拍板内容继续新增到 open-questions”，不能可靠阻止 open-questions 长期堆积。

### 1.2 本次已补齐的规则

已经补齐三处：

- repo `AGENTS.md`
- repo 内 `.opencode/skills/ipk-doc-sync/SKILL.md`
- 用户级 `/home/bzz/.codex/skills/ipk-doc-sync/SKILL.md`

新增要求是：

- 每次规划、设计文档、implementation guide 或 IPK / adaptation 行为变更后，都必须审计相关 open-questions。
- 已解决条目删除或改写。
- 部分解决条目把已定部分移入权威文档，只保留未决部分。
- 过时条目删除，或改写成明确 vNext / tuning。
- 新引入的不确定性同步加入 open-questions。
- 最终报告必须说明 open-questions cleanup 结果。

### 1.3 仍然需要注意的限制

这仍然主要是 agent workflow 规则，不是强制型静态检查器。

它能明显改善 AI 行为，但不能 100% 防止遗漏。未来如果 open-questions 继续变大，建议新增一个轻量审计脚本：

```text
pairs changed docs/code
  -> scan related open-questions
  -> flag entries whose wording contains 已拍板 / 当前倾向 / 已确认 / resolved-like phrases
  -> require agent to classify keep / rewrite / remove
```

这个审计脚本是否进入 v1，可放在后续工具化改进中，不阻塞用户自适应系统第一版。

## 2. 当前总体实现准备度

结论：当前设计已经足够进入“正式分步实施指南编写阶段”，但还不应直接让新 AI 开始全量编码。

原因是：

- 存储真源、权限边界、session db 角色、JSON / Markdown 双视图、proposal 确认、scope matching / read / promotion 的方向已经拍板。
- 但 route、最小 schema、UI 最小入口、索引文件格式、prompt 文件组织和测试验收还需要在 implementation guide 中拆成明确步骤。

换句话说，现在缺的不是“继续讨论大方向”，而是把工程实现钉子逐阶段落地。

## 3. 会阻碍新 AI 实现的地方

下面这些如果不在 implementation guide 中写清楚，会让新 AI 容易发散或过度实现。

### 3.1 v1 最小闭环需要明确切片

当前文档里设计对象很多。正式实施指南必须明确 v1 最小闭环只做：

- `MemoryPath.adaptationRoot()` 下的长期真源读写。
- `global / subject / initiative / task_scope / artifact` 五层内部 schema。
- session db 只保存绑定、引用、快照。
- query time 的轻量 `scope matching + scope read + context_packet`。
- 明确 signal extraction。
- pending proposal queue、merge / deduplicate、confirm / reject / defer。
- JSON 真源写入后渲染 Markdown 镜像。
- 最小 UI：当前区域习惯摘要 + proposal inbox + 手动整理当前对话入口。

v1 不应顺手实现：

- 完整 `workflow_profile` / `pattern_profile`。
- 完整的跨 worktree / 跨 Aether project 显式 binding UI（路由 classifier 自身在 v1 已能解决 initiative 归属，无需依赖硬绑定）。
- embedding / vector search。
- 高级图形化习惯地图。
- 自动 demotion / scope narrowing。
- 双向同步或项目目录导出。

### 3.2 endpoint 和 service 契约还需要具体化

当前集成文档只给出推荐路由方向：

```text
/adaptation/global
/adaptation/subjects
/adaptation/proposals
/adaptation/promotions
/task-scope
/artifact
```

implementation guide 必须补齐：

- 每个 endpoint 的方法。
- request / response schema。
- 错误码。
- 路径安全校验。
- 原子写入或锁策略。
- proposal confirm 后写入目标对象的事务边界。
- indexes / cache 的失效和重建时机。

尤其要避免让模型通过通用 write/edit 工具直接维护 memory root 真源。

### 3.3 `adaptation_project_id` 绑定服务必须单独成章

**v1 已决定不建立 project ↔ initiative 默认绑定**（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)）。但 Aether 工作区侧仍然需要稳定的 `project_id` 作为工作区引用层身份（用于索引 sessions、记录 project-guidance meta），因此绑定服务仍需成章说明：

- 从哪里读取 Aether project / worktree 信息。
- 如何生成稳定 `project_id`（slug / hash 选型）。
- session db 怎样保存 `session_id -> project_id`。
- 禁止：不得在此流程里自动创建 `initiative_id` 或做 project→initiative 派生映射；initiative 归属只能由路由 classifier 决定。
- 用户手动改绑时怎样处理旧绑定。
- 同一目录、monorepo、fork、remote workspace 先怎样保守降级。

如果这一层模糊，后续 `project-guidance.json`、task_scope、artifact_contract 等对象都会写错位置。`project_suppression` 是当时讨论中的中间方案，已被后续决策删除。

### 3.4 派生索引的 v1 schema 还没有足够工程化

当前已经决定需要：

```text
scope-map.json
habit-index.jsonl
trigger-index.json
path-index.json
subject-index.json
task-scope-index.json
conflict-index.json
habit surface
```

但这些还停留在机制说明层。实施指南必须给出 v1 最小 schema，例如：

- index 文件是否允许缺失。
- 启动时怎样重建。
- 每次 confirmed record 写入后怎样标记 dirty。
- `habit surface` 是独立 JSONL 记录，还是嵌入 `habit-index.jsonl`。
- `path-index` 如何处理 glob、相对路径、重命名。
- `trigger-index` 的 request_type 枚举放在哪里。

如果不钉牢，新 AI 可能直接全量扫描所有 JSON，违背渐进披露设计。

### 3.5 prompt contract 需要变成可实现资产

当前文档已有 prompt contract，但 exact prompt 未拍板。

这不阻塞 v1，但 implementation guide 应明确：

- v1 先用 contract 级 prompt，不追求极致效果。
- prompt 是否放在代码常量、模板文件，还是模型配置中。
- prompt 输入字段必须有限，不能把 memory root 全塞进去。
- prompt 输出必须 JSON schema 校验。
- prompt 失败时不写长期真源。

### 3.6 Markdown 镜像模板需要最小版

已经拍板：JSON 是真源，Markdown 是渲染镜像。

但 implementation guide 需要补齐每类对象的最小 Markdown 模板：

- `global-guidance.md`
- `subject profile.md`
- `project-guidance.md`
- `scope.md`
- `artifact_contract.md`
- proposal review 文案

不需要一开始很漂亮，但必须稳定、可读、可重生成。

### 3.7 UI 最小入口需要收敛

当前 UI 有多个候选方向。实施指南应先固定 v1 最小 UI：

- 一个 adaptation 管理入口。
- 一个当前 session / project 的“正在使用哪些习惯”检查入口。
- 一个 proposal inbox。
- 一个“整理当前对话习惯”的显式入口。

不要第一版就实现完整五层可视化、习惯地图或高级设置。

## 4. 当前 open-questions 是否有明显阻碍

本次复核中发现一处应收敛的旧问题：

- 原 Q14 仍写成“`global_guidance` 是否进入 v1？”。

这与当前决策“v1 可以实现最小 `global_guidance`，但所有写入必须确认”已经不完全一致。

本次已改写为：

- “`global_guidance` 在 v1 中做到什么程度？”

剩余未决项大多属于合理的 vNext、阈值调优或 UI 体验问题，不应阻止生成实施指南。

真正需要在实施指南里处理的，是 Q18 中列出的工程钉子，而不是继续反复讨论存储根、session db 真源、五层作用域是否存在这类已经拍板的问题。

## 5. 推荐的实施指南拆分方向

后续可以新建类似 IPK 的文件夹：

```text
docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/
  README.zh-CN.md
  00-implementation-contract.zh-CN.md
  01-phase-1-storage-and-types.zh-CN.md
  02-phase-2-bindings-and-scope-matching.zh-CN.md
  03-phase-3-scope-read-and-context-packet.zh-CN.md
  04-phase-4-signal-extraction-and-summary.zh-CN.md
  05-phase-5-proposal-inbox-and-promotion.zh-CN.md
  06-phase-6-ui-and-user-review.zh-CN.md
  07-phase-7-indexes-hardening-and-fixtures.zh-CN.md
```

建议每一阶段都写清：

- 本阶段目标。
- 明确不做什么。
- 涉及文件。
- 后端对象和路由。
- 前端入口。
- 权限和路径安全。
- 文档同步点。
- 验收检查。

## 6. 最终判断

当前文档已经具备实施指南的设计基础。

下一步不应该继续无限扩展概念，而应该把 v1 收敛成：

```text
长期真源
  + 五层内部 schema
  + query-time matching/read
  + 慢速更新/proposal
  + 最小 UI 检查入口
  + 派生索引防平铺扫描
```

其余跨 project 复用、workflow_profile、embedding、可视化地图、demotion 和高级自动化等级，都应明确放到 open-questions / vNext。
