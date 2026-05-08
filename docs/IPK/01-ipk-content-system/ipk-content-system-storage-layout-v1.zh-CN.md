# IPK 内容系统：根目录与物理存储规范（第一版）

这份文档只回答一个问题：

- 在 `Aether` 当前方案下，`IPK` 的隐藏全局库在磁盘上应该怎么组织

它讨论的是物理目录规范，不替代：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)
- `schema-v1`
- `ingestion-workflow-v1`
- `implementation-decisions`

## 1. 根路径

第一版逻辑根路径：

```text
MemoryPath.ipkRoot()
```

当前兼容实现可以解析到：

```text
Global.Path.data/ipk/
```

但新的 `IPK` 业务代码不应直接硬编码 `Global.Path.data/ipk/`。  
路径必须通过 `MemoryRootResolver` / `MemoryPath.ipkRoot()` 获取，以避免 `IPK` 存储卷入底层 `opencode -> Aether` 改名工程。

第一版 resolver 策略：

- 默认平台路径 + 环境变量覆盖。
- 不做 memory root UI 设置入口。
- 环境变量名、memory namespace、产品名由 `AppIdentity` / resolver 集中管理；当前实现由 `AppIdentity.envPrefix` 生成 `<ENV_PREFIX>_MEMORY_HOME`。
- 旧路径导入只 copy，不 move、不 delete；新旧 root 都有数据时不自动合并。
- 当前实现中，`Global.Path.data/ipk/` 只允许作为 resolver 内部兼容默认或 known legacy candidate，不允许出现在 IPK 业务写入逻辑或 UI 文案中作为协议。

设计原则：

- 不放在当前 workspace 可见目录
- 不按 project 或目录拆成多套库
- 所有正式 piece、draft、taxonomy、indexes、maps 都进入同一套全局隐藏库

## 2. 第一版建议目录树

```text
ipk/
  model.json                        ← 模型配置（设置模型入口持久化）
  pieces/
    idea/
      2026/
        piece_xxx/
          piece.md
          meta.json
          surface.json
          links.json
    knowledge/
    thread/
    review/
    plan/
  drafts/
    draft_xxx/
      draft.json
  indexes/
    by_project.json
    by_time.json
    by_domain.json
    by_method.json
    open_questions.json
    graph_links.json
  maps/
    ...
  taxonomy/
    contexts.json
    domains/
      index.json
      items/
        statistical-physics.json
    methods/
      index.json
      items/
        rg.json
    projects/
      index.json
      items/
        anisotropic-ising.json
  events/                           ← 预留：事件日志
  locks/                            ← 预留：写入锁
  exports/                          ← 预留：导出产物
```

注意：`events/`、`locks/`、`exports/` 是预留目录，第一版不要求实现，但已在 `storage-access-contract` 的推荐目录树中列出。如果第一版需要写入锁机制，可以先使用 `<AetherMemoryRoot>/state/locks/` 或 `ipk/locks/`，由实现者按需选择。

同一 memory root（即 `<AetherMemoryRoot>/manifest.json`，不是 `ipk/manifest.json`）下还应有 `manifest.json`，由 resolver / manifest 层维护，用于记录 identity、root 信息和未来 copy-only 导入记录。IPK 业务层不应绕过 `MemoryPath.ipkRoot()` 直接维护 memory root。

## 3. `pieces/`

`pieces/` 只保存正式入库后的长期对象。

第一版建议按下面两层分桶：

- `type`
- `created_at` 的年份

例如：

```text
pieces/idea/2026/piece_xxx/
```

其中：

- `piece_xxx`
  - 只是示意写法
  - 实际 ID 应遵守当前 `Identifier` 风格，而不是日期流水号风格

每条正式 piece 目录里至少有：

- `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

## 4. `drafts/`

`drafts/` 保存工作草稿，而不是正式 piece。

第一版每个工作草稿都应有稳定的 `draft_id`，例如：

```text
drafts/draft_xxx/
  draft.json
```

`draft.json` 第一版至少应能承载：

- `draft_id`
- `mode`
  - `new`
  - `edit`
- `piece_id`
  - 仅在 `edit` 模式下存在
- `session_id`
  - `new` 模式：触发总结的会话 ID
  - `edit` 模式：触发 `edit-start` 的当前会话 ID
- `message_ids`
  - `new` 模式：用户勾选的消息 ID 列表
  - `edit` 模式：空数组或 `null`（编辑已有 piece 时没有选择消息）
- `draft`
  - `title`
  - `body_summary`
  - `body`
- `meta`
- `surface`
- `links`
- `state`

这里的 `draft.body_summary` 是 review 阶段的工作字段。
正式 commit 后，`surface.human.body_summary` 作为结构真源，`piece.md` 的 `Summary` 段由它渲染生成。

## 5. `edit-start`

第一版不直接在原 piece 上开改。

而是：

1. 用户从 `编辑pieces` 入口选择某条 piece
2. 系统执行 `edit-start`
3. 生成一个新的 `edit` 模式工作草稿
4. 再回到统一的 review 流程

这意味着：

- `编辑pieces` 不直接写正式文件
- 它先生成工作 draft
- 最终仍然通过 review -> commit -> reindex 完成更新

## 6. `indexes/`

`indexes/` 是派生索引层，不是正式真源层。

第一版至少保留：

- `by_project.json`
- `by_time.json`
- `by_domain.json`
- `by_method.json`
- `open_questions.json`
- `graph_links.json`

这些文件应能整体重编译。

## 7. `maps/`

`maps/` 是地图编译产物目录。

第一版目录内部组织允许后续继续调整，但至少要满足：

- 与 `pieces/` 分离
- 与 `indexes/` 分离
- 可以整体重编译
- 不回写正式 piece 源文件

## 8. `taxonomy/`

`taxonomy/` 保存受控词表。

第一版采用“按类别分目录 + 目录内索引文件 + 可选单词文件”的折中方案：

- `contexts.json`
  - 更像枚举，直接集中维护
- `domains/index.json`
- `methods/index.json`
- `projects/index.json`
- `items/<slug>.json`
  - 只在某个词需要更丰富说明时出现

## 9. 一句话规则

第一版可以压成一句：

> 正式内容进 `pieces/`，工作过程进 `drafts/`，导航与检索产物进 `indexes/` 和 `maps/`，词表进 `taxonomy/`，所有内容都放在 `MemoryPath.ipkRoot()` 下；当前兼容实现可以把它解析到 `Global.Path.data/ipk/`。
