# 阶段 7：派生索引、基线验收与收尾加固

## 目标

把前面阶段做出的最小系统压到稳定可用，确认它不是“能跑”，而是没有明显违背设计契约。

这一阶段重点是：

- 派生索引避免平铺扫描
- habit surface 稳定生成
- storage safety 测试
- context compiler 行为基线
- proposal 流程基线
- 文档同步和 open-questions 清理

## 必做项

### 1. 派生索引目录

在：

```text
MemoryPath.adaptationRoot()/indexes/
```

实现 v1 最小索引：

- `scope-map.json`
- `habit-index.jsonl`
- `trigger-index.json`
- `path-index.json`
- `subject-index.json`
- `task-scope-index.json`
- `conflict-index.json`

这些都是派生层，不是长期习惯真源。

索引坏了可以从 profile / policy / task_scope / artifact_contract 重建。

Graphify / LLM Wiki 调研后的约束：

- v1 必须坚持“索引可重建，不是真源”。
- v1 不要求实现 `habit-graph.json`、`habit-report.md`、habit wiki 或可视化图谱。
- 如果后续加入这些文件，它们应和 `graph.json / GRAPH_REPORT.md / wiki` 类似，只作为检索、解释和管理入口；confirmed profile / policy / task_scope / artifact_contract / habit record 仍是真源。
- 如果后续实现 habit graph，边和 workflow bundle 必须带来源、置信度和 confirmed / inferred / ambiguous 状态，不能让 inferred edge 绕过 proposal。

### 2. v1 最小 schema

`scope-map.json`：

```json
{
  "version": "v1",
  "updated_at": "2026-04-12T00:00:00+08:00",
  "projects": {
    "proj_aether": {
      "task_scope_ids": ["scope_user_adaptation_v1"],
      "artifact_ids": ["artifact_open_questions"],
      "subject_ids": ["user-adaptation-system"]
    }
  }
}
```

`habit-index.jsonl` 每行：

```json
{
  "id": "habit_pol_op_planning_doc_sync",
  "scope": {
    "level": "initiative",
    "target": "ini_aether_main"
  },
  "kind": "operation_policy",
  "title": "项目规划讨论自动沉淀",
  "summary": "已确认决策写 decisions，未决方向写 open-questions。",
  "triggers": ["project_planning", "system_design"],
  "priority": 70,
  "impact": "high",
  "confidence": 0.92,
  "confirmed": true,
  "target_ref": {
    "object": "initiative_policy",
    "path": "initiatives/ini_aether_main/initiative-policy.json",
    "fields": ["operation_policy"]
  }
}
```

`trigger-index.json`：

```json
{
  "project_planning": ["habit_pol_op_planning_doc_sync"],
  "system_design": ["habit_pol_op_planning_doc_sync"],
  "documentation_design": ["habit_pol_op_planning_doc_sync"]
}
```

`path-index.json`：

```json
{
  "docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md": [
    "artifact_open_questions"
  ]
}
```

`subject-index.json`：

```json
{
  "user-adaptation-system": {
    "aliases": ["用户自适应系统", "adaptation"],
    "profile_ref": "subjects/user-adaptation-system/profile.json"
  }
}
```

`task-scope-index.json`：

```json
{
  "proj_aether": [
    {
      "id": "scope_user_adaptation_v1",
      "title": "用户自适应系统 v1 实现",
      "recent_session_ids": ["ses_xxx"],
      "artifact_ids": ["artifact_open_questions"]
    }
  ]
}
```

`conflict-index.json` 第一版可以为空对象，但文件存在：

```json
{
  "version": "v1",
  "conflicts": []
}
```

### 3. 重建策略

实现：

- startup 校验索引文件是否存在
- 不存在则重建
- confirmed record 写入后标记 index dirty
- proposal confirm 后重建相关索引
- 提供内部 `rebuildIndexes()`

不要把索引作为真源。

### 4. habit surface

每条 confirmed 可调用习惯都应生成 habit surface。

surface 可以先写入 `habit-index.jsonl`，不必另建独立文件。

query-time matching 优先读 habit surfaces。

只有 top candidates 进入 full record 读取。

### 5. 基线样例

准备最小 fixtures，至少覆盖：

1. 当前 session 在 proposal confirm 时，路由 classifier 能把候选习惯分类到正确的 initiative bucket（或新建 bucket）。
2. 当前 session 已绑定 task_scope。
3. 当前文件命中 artifact_contract。
4. 项目规划 request 命中 initiative_policy。
5. 学科 request 命中 subject_profile。
6. 普通请求只使用少量 global fallback。
7. pending proposal 不注入 context。
8. rejected proposal 冷却后不重复生成。
9. proposal confirm 后写入 initiative_policy。
10. JSON 写入后 Markdown 镜像更新。
11. 索引删除后可重建。
12. 路径穿越写入被拒绝。

### 6. 硬约束复核

必须检查：

- 没有长期真源写入 session db。
- 没有默认写入 `<worktree>/.opencode/adaptation/`。
- 没有默认写入 `<worktree>/.aether/adaptation/`。
- 没有全盘扫描。
- 没有通用 write/edit 工具直接维护 memory root。
- 没有低置信或高影响推断直接写入 profile。
- 没有 pending proposal 被当成已确认规则注入。
- 没有全量 signals / evidence 进入普通 query-time prompt。
- 没有硬编码 `/home/bzz` 或平台绝对路径决定存储位置。

### 7. 工程验证

至少执行：

```bash
cd /home/bzz/Aether/packages/opencode && bun typecheck
cd /home/bzz/Aether/packages/app && bun typecheck
python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict
```

如果增加测试，必须从包目录运行，不要从 repo root 直接跑。

### 8. 文档同步

实现过程中如果实际代码和 guide 不一致：

- 优先改代码符合 guide。
- 如果 guide 错了，必须同步更新权威文档和 guide。
- 每次更新都审计 open-questions。
- 已解决 open question 要删除或改写。

## 结束标准

只有同时满足下面几条，才能视为用户自适应系统 v1 基本完成：

- 长期真源路径正确。
- 五层内部 schema 可读写。
- session binding 可用。
- scope matching 可用。
- scope read / context packet 可用。
- signal extraction 可用。
- proposal inbox 可用。
- proposal confirm / reject / defer 可用。
- Markdown 镜像可重建。
- 派生索引可重建。
- UI 可检查当前区域习惯。
- typecheck 通过。
- doc audit 通过。

## 这一阶段不要做什么

- 不追加 vNext 大功能。
- 不做跨 worktree 自动聚合。
- 不做 workflow_profile。
- 不做 embedding。
- 不做图形化地图。
- 不做双向同步。
