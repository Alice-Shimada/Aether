# memos：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/memos/memos`  
> 输出文件：`docs/IPK/reference_project_review/memos/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `用户自有笔记与知识资产系统`

一句话说明：

> `memos` 里的“memory”本质上是用户自己写下来的 memo，不是 agent 自动沉淀出的隐式记忆；它更像一个可编辑、可分享、可迁移的长期知识库。

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- 让用户快速捕捉和回看自己的想法与资料。
- 保持内容真源清晰，长期可保有和迁移。
- 让关系、附件、分享和权限围绕 memo 真源展开。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 强调 timeline-first、Markdown、ownership、self-hosted。 |
| 代码证据 | `store/memo.go` | `Memo` 结构是核心真源，`Create/List/Update/DeleteMemo` 围绕它展开。 |
| 代码证据 | `server/router/api/v1/memo_service.go` | 读取主链路围绕 memo、attachments、relations、reactions。 |
| 推断 | 基于整体结构 | 它优化的是“用户写什么、怎样找回和关联”，不是“agent 学到了什么”。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否知识内容 |
| --- | --- | --- | --- | --- |
| memo | 用户写的 Markdown 内容 | 长期 | 是 | 是 |
| memo payload | 从内容计算出的结构化属性 | 长期派生 | 是 | 是 |
| memo relations | memo 与 memo 的显式关系 | 长期 | 是 | 是 |
| attachments | 附件 | 长期 | 是 | 是 |
| reactions / shares / inbox | 社交与访问相关数据 | 中长期 | 是 | 不是主要知识内容 |
| user settings | 用户设置 | 长期 | 是 | 否 |

## 3. 读写流程

### 3.1 写入流程

```text
用户创建或编辑 memo ->
store.CreateMemo / UpdateMemo ->
memo 内容作为真源持久化 ->
relations / attachments 分开维护 ->
必要时后台重建 payload
```

### 3.2 读取流程

```text
ListMemos ->
按 currentUser、visibility、filter、分页取 memo ->
批量补 reactions / attachments / relations ->
返回前端时间线或引用列表
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 删除方式 |
| --- | --- | --- | --- | --- |
| memo 内容 | `store/memo.go` 对应的底层 driver 表 | payload、snippet、过滤条件 | 是，派生项可重建 | `DeleteMemo` |
| memo payload | `Memo.Payload` | 无 | 可由内容重建 | 更新 memo 或重建 payload |
| relations | relation 存储 | 无 | 不能从纯文本完全可靠重建 | relation 删除 |
| attachments | attachment 存储 | 无 | 取决于文件保留 | attachment 删除 |
| user settings | user settings 存储 | 缓存 | 可由设置重建 | 覆盖更新 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 列表读取 | `ListMemos` + 分页 | page size / token | 权限与 visibility 过滤 | `memo_service.go` |
| 条件过滤 | filter 表达式 | 服务端过滤 | creator/visibility/filter 校验 | `memo_service.go` |
| 关系补全 | 批量加载 relations/attachments/reactions | 批量查询避免 N+1 | 明确按 memo ID 关联 | `memo_service.go` |
| AI 辅助 | 音频转录到文本 | 文件大小与 provider 校验 | content type / provider 校验 | `ai_service.go` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有
- memory consolidation：没有 agent 式 consolidation
- short-term to long-term promotion：没有自动提升；用户直接写长期 memo
- graph extraction：没有作为核心
- embedding refresh：没有作为核心
- duplicate merge：没有自动合并机制
- stale memory cleanup：靠用户编辑/删除

## 7. 优点

- 真源非常清楚，用户内容就是用户内容。
- 数据所有权和可迁移性强，利于审计。
- 关系、分享、附件都围绕 memo 真源展开，不搞黑盒式自动记忆。

## 8. 顾虑

- 对 agent 长期记忆、自动回忆、上下文注入的启发有限。
- 没有内建“从会话自动沉淀结构化长期记忆”的能力。
- 如果 Aether 直接照搬，会把 agent 产品做成笔记产品。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户画像不是 memory 的一种核心形式。
- 用户偏好和知识内容没有混存。
- session history 不会自动影响长期用户画像。
- agent 经验不存在于核心模型里。

结论：

> `memos` 的边界极其鲜明：memo 是用户知识资产，user settings 是显式设置，二者都不是 agent 自己推断出来的长期人物模型。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆系统天然应自动化 | 挑战 | `memos` 证明长期记忆也可以完全由用户手写。 |
| 记忆与知识库可以不做强区分 | 挑战 | 这里更像知识资产库，而不是 agent memory。 |
| 用户内容和用户偏好可以存在同一真源 | 挑战 | 这里明确分开。 |

## 11. 对 Aether 的可能改变

### 11.1 IPK / 知识库方向

- Aether 需要更清楚地区分“用户自己维护的内容真源”和“系统自动抽取的适配记忆”。

### 11.2 session recall 方向

- 不是所有长期可回看的东西都应该从会话里自动提炼；有些就该是用户直接写下来的内容。

### 11.3 adaptation memory 方向

- 可以把 adaptation memory 看成不同于 memo/IPK 内容的另一类数据，不要混真源。

### 11.4 只适合保留为启发的点

- `memos` 更适合启发“可审计、可编辑、可迁移的内容系统”，不适合直接作为自动记忆引擎模板。

## 12. 仍需继续读的文件

- `server/runner/memopayload/runner.go`
- `web/src/components/MemoMetadata/Relation/*`
