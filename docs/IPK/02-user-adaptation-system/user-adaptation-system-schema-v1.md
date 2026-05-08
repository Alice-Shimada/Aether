# 用户自适应系统 Schema（更新版）

这个文件名仍然保留 `v1`，但内容已经更新到当前这套更完整的实用草案。

这份文档不再只覆盖：

- `signals`
- `summaries`
- `profile`
- `policy`

它现在覆盖当前最推荐的一组核心对象：

- `signal`
- `summary`
- `proposal`
- `global_guidance`
- `subject_profile`
- `policy`
- `task_scope`
- `artifact_contract`
- `session_scratch_habit`
- `session_scratch_conflict`
- `context_packet`

当前运行时代码还额外包含：

- `session scratch habits`
- `scratch conflicts`
- `context_packet.scratch_ids`

## 1. 顶层设计

当前推荐的总体链路是：

```text
会话、长期工作与执行
  -> signal
  -> summary
  -> proposal
  -> confirmed records
  -> context_packet
```

其中 `confirmed records` 主要包括：

- `global_guidance`
- `subject_profile`
- `task_scope`
- `artifact_contract`
- 分层 `policy`

## 2. `signal`

```json
{
  "id": "sig_20260407_001",
  "session_id": "ses_xxx",
  "created_at": "2026-04-07T20:10:00+08:00",
  "scope": {
    "level": "subject",
    "target": "statistical-mechanics"
  },
  "kind": "prefers_rg_language",
  "polarity": "positive",
  "confidence": 0.78,
  "evidence": [
    {
      "source": "user_message",
      "ref": "msg_123",
      "quote": "尽量先用我熟悉的统计物理语言来讲。"
    }
  ],
  "note": "用户再次强调在这个学科里优先使用熟悉语言。"
}
```

推荐设计要求：

- 必须带证据
- 不直接改写长期层
- 当前 v1 的自动提取快链路先只读取当前 session 的用户消息；assistant 文本不作为 habit evidence，文件改动、工具操作和更广证据来源留待后续版本评估
- 应允许记录工作顺序、记录习惯、工具选择和操作方法相关证据
- `scope.level` 推荐允许：
  - `global`
  - `subject`
  - `initiative`
  - `task_scope`
  - `artifact`

## 3. `summary`

```json
{
  "id": "sum_scope_statmech_course_20260407",
  "window": {
    "start": "2026-04-01T00:00:00+08:00",
    "end": "2026-04-07T23:59:59+08:00"
  },
  "scope": {
    "level": "task_scope",
    "target": "scope_statmech_course_2026"
  },
  "session_ids": ["ses_a", "ses_b", "ses_c"],
  "highlights": [
    "最近多次讨论都强调从熟悉统计物理语言切入。",
    "本任务已经从普通问答演化成课程笔记整理任务。"
  ],
  "patterns": [
    {
      "kind": "prefers_start_from_known_knowledge",
      "strength": 0.82,
      "evidence_count": 5
    }
  ],
  "recommendations": [
    "后续回答中优先从已有知识 anchor 出发。"
  ]
}
```

## 4. `proposal`

```json
{
  "id": "prop_20260407_001",
  "created_at": "2026-04-07T20:30:00+08:00",
  "updated_at": "2026-04-07T20:35:00+08:00",
  "scope": {
    "level": "task_scope",
    "target": "scope_statmech_course_2026"
  },
  "kind": "task_principle",
  "merge_key": "task_scope:scope_statmech_course_2026:task_principle:user_controls_habit_scope",
  "summary": "用户希望自己决定习惯边界和高影响默认，AI 负责底层记录、组织与检索。",
  "impact": "high",
  "confidence": 0.83,
  "evidence_refs": ["sig_20260407_011", "sig_20260407_014"],
  "merged_from": ["prop_20260407_000"],
  "promotion": {
    "source_scope": {
      "level": "session",
      "target": "ses_a"
    },
    "target_scope": {
      "level": "task_scope",
      "target": "scope_statmech_course_2026"
    },
    "kind": "scope_promotion",
    "reason": "同类信号在本任务中重复出现，且会影响后续默认工作方式。"
  },
  "scope_choice": {
    "suggested": {
      "level": "task_scope",
      "target": "scope_statmech_course_2026"
    },
    "selected": {
      "level": "task_scope",
      "target": "scope_statmech_course_2026"
    },
    "decided_by": "user",
    "reason": "用户在习惯审查中确认了建议作用域。"
  },
  "relations": [
    {
      "kind": "derived_from",
      "from": {
        "level": "session",
        "target": "ses_a"
      },
      "to": {
        "level": "task_scope",
        "target": "scope_statmech_course_2026"
      },
      "ref": "prop_20260407_001",
      "note": "用户确认时改变或确认作用域。",
      "created_at": "2026-04-07T20:35:00+08:00"
    }
  ],
  "session_review": {
    "session_id": "ses_a",
    "mode": "suggest_add",
    "habit_id": "habit_global_python",
    "habit_scope": {
      "level": "global",
      "target": "user"
    },
    "reason": "本轮请求命中了这条已确认习惯，但它尚未进入当前 session。"
  },
  "target_patch": {
    "object": "task_scope",
    "id": "scope_statmech_course_2026",
    "fields": ["principles", "workflow_habits"]
  },
  "status": "pending"
}
```

推荐字段补充：

- `review_note`
- `merge_key`
- `merged_from`
- `session_review`
- `target_patch`
- `promotion`
- `scope_choice`
- `relations`
- `deferred_at`
- `confirmed_at`
- `rejected_at`

第一版 proposal 应支持同类合并与统一审阅：

- `merge_key` 用于辅助同类 proposal 合并。
- `merged_from` 保留被合并的候选 proposal。
- `session_review` 用于表示“是否把某条已确认 habit 加入/移出当前 session”。这类 proposal 不一定有 `target_patch`，因为它们改变的是 session binding 的 `habit_ids`，而不是长期真源。
- `target_patch` 用于告诉用户确认后会改哪个长期对象和字段；长期 proposal 通常有它，session review proposal 可以没有。
- `promotion` 用于表达低层证据是否要提升到更高层级，例如从 session 提升到 task_scope，或从 task_scope 提升到 initiative / subject / global。
- `scope_choice` 用于同时保留 LLM 建议作用域和用户最终选择的作用域；如果二者不一致，UI 应展示差异和 future impact。
- `relations` 用于在习惯升降级时维护引用完整性，不应因为确认新作用域就默认删除旧记录。
- `pending` 表示已经进入待处理队列，但尚未执行确认动作。
- `deferred` 表示用户暂缓处理。

用于跨层级传递的 proposal 应额外说明：

- `source_scope`
  候选习惯最初来自哪个层级。
- `target_scope`
  确认后将写入哪个更高或更稳定的层级。
- `kind`
  是否属于 `scope_promotion`、`policy_promotion`、`profile_promotion` 或 `workflow_promotion`。
- `reason`
  为什么认为它不应只停留在原始层级。

用户主导快通道中的 proposal 也应复用这些字段。区别是 `scope_choice.selected` 可能来自用户在审核 UI 中选择的“当前任务 / 当前项目 / 这个主题 / 所有场景”，而不是由慢晋升阈值自动推出。当前实现已经支持确认时选择 `task_scope / initiative / subject / global`，`session` 和更完整的撤销 / tombstone 流程留给后续版本。

第一版中，AI 可以自动生成和合并 promotion proposal，但不能静默确认更高作用域的习惯提升。

第一版状态枚举：

- `pending`
- `confirmed`
- `rejected`
- `deferred`

推荐状态流转：

```text
pending
  -> confirmed / rejected / deferred
```

其中：

- `confirmed` 表示用户确认后已经写入目标长期对象。
- `rejected` 表示用户拒绝，应保留拒绝记录以避免短期重复打扰。
- `archived` 表示该 proposal 已不再作为活跃待处理项展示。

## 5. `global_guidance`

说明：本 schema 中出现的 `guidance / profile / policy / contract` 是对象职责分工，不代表额外的 scope 层级。习惯库 scope 仍只有 `global / subject / initiative / task_scope / artifact` 五层；`global_guidance` 与 `project_guidance` 属于工作区引用层，不在这五层之内。

`global_guidance` 保存 Aether 工作区 global 侧的轻量背景和引用关系。  
它的职责是给 session 的 habit 检索与 scope matching 提供跨项目、跨任务的缩圈参考，而不是保存习惯正文真源。真正的全局 confirmed habit 正文仍应进入习惯库 global 层真源。

```json
{
  "version": "v1",
  "updated_at": "2026-04-07T21:00:00+08:00",
  "summary": "用户当前主要在理论物理研究与 Aether 工程之间切换。",
  "stable_context": [
    "默认希望 session 先缩小相关主题与任务范围，再检索习惯真源。",
    "跨项目稳定成立的信息应以轻量背景 + refs 的方式提供给 session 参考。"
  ],
  "subject_ids": ["theoretical-physics", "user-adaptation-system", "ipk"],
  "task_scope_refs": [],
  "artifact_refs": [],
  "ipk_piece_refs": []
}
```

## 6. `subject_profile`

```json
{
  "subject_id": "statistical-mechanics",
  "version": "v1",
  "updated_at": "2026-04-07T21:10:00+08:00",
  "summary": "用户在统计物理里偏好先给直觉图像，再进入正式推导。",
  "aliases": ["statmech", "统计物理"],
  "known_anchors": [
    "Ising model",
    "配分函数",
    "RG 直觉"
  ],
  "preferred_formalisms": [
    "statistical-mechanics-language"
  ],
  "response_preferences": {
    "prefer_familiar_language_first": 0.88,
    "prefer_bridge_to_new_formalism": 0.72
  },
  "confidence": 0.78,
  "derived_from": ["sum_subject_statmech_20260407"]
}
```

## 7. `project_guidance`

`project_guidance` 保存 Aether 工作区 project 级稳定背景和引用关系。  
它不保存项目正文，不替代 artifact、task_scope 或 IPK piece。
它也不是纯索引表：v1 允许保存极短的项目背景与稳定上下文，帮助当前 project 下的新 session 更快获得正确工作语境；但这些字段不能演化成独立习惯正文或内容正文。

这里的 `project_guidance` 属于 Aether 工作区引用层，不是习惯库五层 scope 里的 `initiative`。**v1 不建立任何默认的 Aether project ↔ initiative 绑定**（详见 [docs/decisions/project-initiative-decoupling-and-routing.md](../../decisions/project-initiative-decoupling-and-routing.md)）；`project_guidance` 不持有任何 `initiative_id` 字段。一个 project 可以关联多个 initiative 引用（经路由 classifier 决定），一个 initiative 也可以被多个 project 的 session 引用。

```json
{
  "version": "v1",
  "project_id": "proj_aether",
  "updated_at": "2026-04-12T00:00:00+08:00",
  "summary": "Aether 当前基于 opencode 开发，正在实现 IPK 与用户自适应系统。",
  "stable_context": [
    "当前项目仍处于 opencode 兼容期，不应做全项目 opencode -> Aether 重命名。",
    "docs/IPK 是 IPK 与用户自适应系统的重要交接文档。"
  ],
  "subject_ids": [
    "aether-architecture",
    "ipk",
    "user-adaptation-system"
  ],
  "task_scope_refs": [
    "scope_ipk_v1",
    "scope_user_adaptation_v1"
  ],
  "artifact_refs": [
    "docs/IPK"
  ],
  "ipk_piece_refs": []
}
```

推荐字段：

- `version`
- `project_id`
- `updated_at`
- `summary`
- `stable_context`
- `subject_ids`
- `task_scope_refs`
- `artifact_refs`
- `ipk_piece_refs`

设计边界：

- `summary` / `stable_context` 只承载轻量项目背景，不承载“以后默认怎么做”的长期习惯正文。
- 影响未来默认行为的规则正文应进入习惯库五层真源，而不是继续堆进 `project_guidance`。
- 需要长篇展开的项目内容应进入 artifact / task_scope / IPK，而不是写进 `project_guidance`。

## 8. `initiative_policy`

`initiative_policy` 保存习惯库里 initiative 层的默认回应策略和操作策略。它是 confirmed initiative habits 的真源；Aether 工作区 project 不再拥有独立 `project_policy` 对象。

高影响条目必须由 proposal 确认后写入。

```json
{
  "version": "v1",
  "initiative_id": "ini_aether_main",
  "updated_at": "2026-04-12T00:00:00+08:00",
  "response_policy": [
    {
      "id": "pol_resp_ipk_docs_first",
      "text": "讨论 IPK / adaptation 设计时，优先对齐存储契约和 implementation-decisions。",
      "impact": "medium",
      "source": "proposal_confirmed"
    }
  ],
  "operation_policy": [
    {
      "id": "pol_op_ipk_doc_sync",
      "text": "修改 IPK 相关代码后，必须同步审计 /docs/IPK。",
      "impact": "high",
      "source": "proposal_confirmed"
    },
    {
      "id": "pol_op_planning_doc_sync",
      "text": "项目规划讨论中，用户确认的决策应写入 implementation-decisions；未决或未来方向应写入 open-questions。",
      "impact": "high",
      "source": "proposal_confirmed"
    }
  ]
}
```

## 8a. `habit_relation` / tombstone

习惯晋升、降级、合并或废弃时，不应默认物理删除旧记录。第一版至少应为后续实现预留关系字段。

推荐关系：

```json
{
  "habit_id": "habit_project_python_preference",
  "scope": {
    "level": "global",
    "target": "user"
  },
  "status": "active",
  "relations": {
    "promotes_from": ["habit_task_python_preference"],
    "supersedes": ["habit_project_python_preference_v1"],
    "derived_from": ["sig_20260413_001", "prop_20260413_002"],
    "redirects_to": []
  },
  "tombstone": null
}
```

废弃旧记录时：

```json
{
  "habit_id": "habit_task_python_preference",
  "status": "superseded",
  "relations": {
    "redirects_to": ["habit_project_python_preference"]
  },
  "tombstone": {
    "reason": "promoted_to_global",
    "created_at": "2026-04-13T20:00:00+08:00"
  }
}
```

推荐规则：

- `active` 记录可被 context compiler 读取。
- `superseded` 记录默认不注入，但可作为 evidence / audit / redirect 保留。
- `disabled` 记录保留真源但不注入。
- `deleted` 只在用户明确选择从真源删除时使用，并应尽量保留最小 tombstone，避免引用断裂。
- 后续独立 habit graph 中的 relation edge 应额外保留 `confidence`、`confidence_score`、`source_ref`、`created_by` 和 `review_status`。推荐 `review_status` 至少区分 `confirmed`、`inferred`、`ambiguous`。
- `inferred` / `ambiguous` edge 只能帮助 matching、解释或 proposal 生成；高影响习惯的扩大生效范围仍必须由用户确认。
- 多个习惯共同构成一个 workflow 时，可以用 bundle / hyperedge 表示组关系；bundle 也应带 `source_ref` 与 `review_status`，不能替代单条 habit 真源。

## 8b. `project_guidance` 的维护边界

当前 v1 不再保留独立 `project_suppression` 对象。

project 侧的重复候选降噪与缩圈沉淀，统一改由：

- `project_guidance`
- `global_guidance`
- proposal merge
- 后续 routing / classifier

共同承担。

边界要求：

- `project_guidance` 仍然只保存轻量背景 + refs，不保存习惯正文真源。
- 当前 project 中重复出现的高置信线索，应优先沉淀为 `subject_ids / task_scope_refs / artifact_refs / ipk_piece_refs` 或极短稳定背景。
- 不再为“真源保留，但当前 project 不采用”维护独立 project-local suppression 规则表。

## 9. `policy`

```json
{
  "scope": {
    "level": "task_scope",
    "target": "scope_adaptation_docs_2026"
  },
  "response_policy": {
    "start_mode": "from_known_context",
    "depth": "progressive",
    "emphasize": ["core_principles", "implementation_tradeoffs"]
  },
  "operation_policy": {
    "preferred_sequence": [
      "discuss",
      "extract_principles",
      "update_overview",
      "update_details"
    ],
    "record_update_mode": "paired_artifacts",
    "preferred_resource_order": [
      "project_local_files",
      "project_skills",
      "existing_programs"
    ],
    "tool_selection_rule": "prefer_existing_project_resources_when_equivalent"
  }
}
```

### policy 覆盖顺序

长期 policy 的推荐覆盖顺序：

```text
artifact_contract
  > task_scope policy
  > initiative policy
  > subject policy
  > global policy
```

安全边界：

- adaptation policy 不能覆盖系统 / developer 指令。
- adaptation policy 不能绕过权限、安全确认或危险操作判断。
- adaptation policy 不能覆盖当前用户在本轮中的明确要求。
- adaptation policy 不能静默覆盖 repo 内 `AGENTS.md` 这类项目级 agent 指令。
- `project_guidance` / `global_guidance` 只能作为缩圈 guidance，不能静默替代习惯库真源或 session 当前挂载状态。

## 10. `task_scope`

`task_scope` 保存任务级习惯、轻量状态、维护规则和引用。

它不应保存具体内容正文，也不应替代 artifact 或 IPK piece。  
例如，open-questions 的完整内容应以真实 open-questions 文件或 IPK piece 为准，`task_scope` 只记录维护规则、简短摘要和引用。

```json
{
  "id": "scope_adaptation_docs_2026",
  "project_id": "proj_xxx",
  "title": "用户自适应系统文档设计",
  "kind": "design",
  "goal": "持续完善用户自适应系统文档，并维护 overview 与 details 两份记录文件。",
  "active_subjects": ["user-adaptation-system", "aether-architecture"],
  "principles": [
    "用户决定习惯作用范围和高影响默认，AI 负责底层组织、记录、匹配与执行编排。"
  ],
  "status_summary": "当前正在扩展系统，使其既适配讲解，也适配工作与操作习惯。",
  "workflow_habits": {
    "recording_pattern": "maintain paired overview/details docs",
    "preferred_sequence": [
      "discuss",
      "extract_principles",
      "update_overview",
      "update_details"
    ],
    "setup_style": "prefer_existing_project_structure"
  },
  "resource_preferences": [
    {
      "when": "update_record_files",
      "prefer_roles": ["overview", "details"],
      "method": "update_overview_first"
    },
    {
      "when": "equivalent_tools_available",
      "prefer": "reuse_project_local_resources_first"
    }
  ],
  "done": [
    "完成一轮 overview / details / schema / integration 文档重写。"
  ],
  "decisions": [
    "记录默认本地私有保存。",
    "记录性文档保留 overview 与 details 双文档结构。"
  ],
  "open_questions": [
    "如何稳定提取并确认操作习惯与工具偏好。"
  ],
  "open_question_refs": [
    {
      "artifact_id": "artifact_adaptation_open_questions_zh",
      "path": "docs/IPK/02-user-adaptation-system/user-adaptation-system-open-questions.zh-CN.md",
      "note": "具体问题正文以该文件为准。"
    }
  ],
  "linked_pieces": ["piece_20260407_001"],
  "artifacts": [
    "artifact_adaptation_overview_zh",
    "artifact_adaptation_details_zh"
  ],
  "confidence": 0.84
}
```

## 11. `artifact_contract`

```json
{
  "id": "artifact_adaptation_overview_zh",
  "task_scope_id": "scope_adaptation_docs_2026",
  "role": "overview",
  "bundle_id": "adaptation_docs_zh",
  "path": "docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md",
  "format": "markdown",
  "write_mode": "revise_in_place",
  "update_triggers": [
    "on_major_direction_change",
    "on_user_request_update_record_docs"
  ],
  "style_focus": [
    "vision",
    "motivation",
    "main_architecture",
    "roadmap"
  ],
  "partner_artifacts": ["artifact_adaptation_details_zh"],
  "protected_regions": [
    "# 用户自适应系统总览"
  ]
}
```

## 12. `context_packet`

```json
{
  "request_id": "req_xxx",
  "session_id": "ses_xxx",
  "task_scope_id": "scope_adaptation_docs_2026",
  "artifact_ids": [
    "artifact_adaptation_overview_zh",
    "artifact_adaptation_details_zh"
  ],
  "subject_ids": ["user-adaptation-system", "aether-architecture"],
  "sections": [
    {
      "kind": "global_guidance",
      "text": "用户通常希望从已有知识切入。"
    },
    {
      "kind": "task_scope",
      "text": "当前任务默认维护 overview 与 details 双文档，并先更新展示稿。"
    },
    {
      "kind": "artifact_contract",
      "text": "当用户要求更新记录文件时，应先改 overview，再同步检查 details。"
    },
    {
      "kind": "operation_policy",
      "text": "同类资源可选时，优先复用当前 project 内已有文件、skills 与程序。"
    }
  ]
}
```

`context_packet` 是 query time 编译结果，不是长期 profile / policy / task_scope 的替代真源。

第一版存储规则：

- session db 可以保存 `context_packet_snapshot`，用于审计、调试和 UI 检查。
- session db 可以保存 `context_packet_id`，引用一次编译结果。
- 如果需要保存完整 context packet 文件，应放入 `MemoryPath.cacheRoot()/adaptation/context-packets/`。
- cache 中的 context packet 可以被清理或重建，不应成为长期用户习惯的唯一真源。

## 12a. `session_scratch_habit`

`session_scratch_habit` 是当前 session 的临时习惯，不是独立习惯库真源。

```json
{
  "id": "scratch_xxx",
  "project_id": "当前 Aether project 绑定分区",
  "session_id": "当前 session",
  "candidate_id": "msg_xxx:local_1",
  "state": "pending | active | superseded | invalidated | promoted | discarded",
  "kind": "workflow_preference",
  "summary": "用户希望规划讨论后把已确认内容写入 decisions，未决内容写入 open-questions。",
  "canonical_text": "当前 session 的规划讨论默认要把已确认内容写入 decisions，未决内容写入 open-questions。",
  "text": "当前用于运行时比较的规范化正文",
  "text_norm": "规范化文本",
  "impact": "low | medium | high",
  "explicit": true,
  "temporary": true,
  "confidence": 0.94,
  "scope_hint": "session",
  "traits": ["workflow:planning_doc_sync"],
  "capture_confidence": "low | medium | high",
  "capture_reason": "用户用了明确指令语气，适合直接作为当前 session 生效的暂存习惯。",
  "evidence": [
    {
      "evidence_id": "msg_xxx:local_1:ev_1",
      "session_id": "当前 session",
      "message_id": "对应消息",
      "quote": "短证据摘录",
      "reason": "为什么这段原文支持这条习惯",
      "source": "user_message",
      "source_role": "user",
      "jump_scope": "session_local",
      "start_offset": 12,
      "end_offset": 28,
      "created_at": "2026-04-17T00:00:00.000Z"
    }
  ],
  "merged_from": [],
  "shadow_ids": ["habit_global_python"],
  "conflicts": [],
  "superseded_by": "scratch_yyy",
  "created_at": "2026-04-14T00:00:00.000Z",
  "updated_at": "2026-04-14T00:00:00.000Z"
}
```

状态语义：

- `pending`
  低置信暂存习惯，只在 session 暂存区可见，不注入当前上下文，也不进入入库审查。
- `active`
  当前 session 生效的暂存习惯，会进入 `context_packet.scratch_ids`，并可在审查入口确认入库。
- `superseded / invalidated`
  被更新要求覆盖或判定不再适用，不物理删除。
- `promoted`
  已经被用户确认写入正式习惯库，或作为相似项随同一正式习惯标记为已处理。
- `discarded`
  用户明确丢弃。

审查聚合视图可以派生：

```json
{
  "similar_count": 3,
  "similar_session_count": 2
}
```

这两个字段不是 scratch 真源必填字段，而是审查接口根据所有 scratch 记录实时计算的用户提示。

补充：

- `shadow_ids`
  表示这条 active scratch 在当前 session 中覆盖了哪些 imported habit refs。真正的 imported 真源不改写，只在 context compile 时过滤。
- `superseded_by`
  用于保留被覆盖链路；`superseded` 条目继续可见，但不进入 prompt 与后续匹配。

## 12b. `session_scratch_conflict_review`

当前实现把 imported / scratch 冲突批量审阅写成按 candidate 分组的 review batch：

```json
{
  "id": "scratch_review_xxx",
  "project_id": "当前 Aether project 绑定分区",
  "session_id": "当前 session",
  "kind": "imported_conflict | scratch_conflict",
  "candidate": {
    "candidate_id": "msg_xxx:local_1",
    "summary": "这次先别用 Python。",
    "canonical_text": "当前 session 先不要用 Python。",
    "state_suggestion": "pending",
    "kind": "tool_preference",
    "impact": "high",
    "explicit": true,
    "temporary": true,
    "confidence": 0.93,
    "scope_hint": "session",
    "traits": [],
    "evidence": []
  },
  "scratch_id": "scratch_pending_xxx",
  "targets": [
    {
      "target_kind": "imported",
      "target_id": "habit_global_python",
      "target_number": 1,
      "conflict_kind": "partial",
      "comparison_summary": "当前用户要求与已注入正式习惯会让模型不知道该按哪条执行。"
    }
  ],
  "status": "pending | resolved_keep_existing | resolved_adopt_candidate | resolved_adopt_custom",
  "resolution_note": "用户在冲突审阅中采用了新的 session 要求。",
  "resolution_text": "这次先用 TypeScript，不要用 Python。",
  "resolved_scratch_id": "scratch_active_xxx",
  "created_at": "2026-04-17T00:00:00.000Z",
  "updated_at": "2026-04-17T00:00:00.000Z"
}
```

## 12c. `imported_habit_hit`

imported overlap 当前只静默记录结构化 hit event，不创建 scratch：

```json
{
  "id": "scratch_hit_xxx",
  "session_id": "当前 session",
  "habit_id": "habit_global_python",
  "candidate_id": "msg_xxx:local_1",
  "summary": "规划讨论后同步维护 decisions 与 open-questions。",
  "canonical_text": "当前 session 的规划讨论默认同步维护 decisions 与 open-questions。",
  "evidence": [],
  "comparison_summary": "新候选与当前 imported habit 语义重合。",
  "created_at": "2026-04-17T00:00:00.000Z"
}
```

## 13. 推荐本地文件布局

第一版推荐通过独立 `MemoryRootResolver` 获取用户自适应系统根目录。  
业务代码不应直接硬编码 `${Global.Path.config}`、`${Global.Path.data}` 或 `<worktree>/.opencode/adaptation/`。

用户自适应系统的长期真源是习惯库，而不是 Aether 工作区记录文档。`global_guidance`、`project_guidance` 与 `session binding` 这三类工作区对象只保存**轻量背景 + refs**：背景部分仅用于 session 缩圈，refs 部分可包含 habit id、关系、排序、分块、禁用和解释等信息；它们不能复制习惯正文并成为第二真源。

习惯库内部保留 `global / subject / initiative / task_scope / artifact` 五个 scope 标签，但它们是平行存储层，不是树状父子关系。schema 设计不能要求某条 `task_scope` 习惯只能属于一个 `initiative` 或一个 `subject`；跨层和同层关系应通过 relation / index / map 表达。

逻辑根：

```text
MemoryPath.adaptationRoot()
```

完整目录树的唯一权威来源是：

- [ipk-and-adaptation-storage-access-contract.zh-CN.md section 4.2](/home/bzz/Aether/docs/IPK/ipk-and-adaptation-storage-access-contract.zh-CN.md)

本文件不再重复完整目录树，避免 schema 文档和存储契约产生漂移。实现 schema 时至少要遵守以下锚点：

- global 级记录放在 `MemoryPath.adaptationRoot()/global/`。
- subject 级记录放在 `MemoryPath.adaptationRoot()/subjects/<subject_id>/`。
- v1 中 initiative 级记录放在 `MemoryPath.adaptationRoot()/initiatives/<initiative_id>/`。
- v1 中 task_scope 级记录放在 `MemoryPath.adaptationRoot()/task-scopes/<scope_id>/`。
- v1 中 artifact 级记录放在 `MemoryPath.adaptationRoot()/artifacts/<artifact_id>/`。
- `projects/<project_id>/` 只保留 Aether 工作区引用层记录，不再承载 task_scope / artifact 真源。
- signals、summaries、proposals、bindings、indexes 的完整位置以存储契约为准。
- 派生 context packet 如果落盘，放在 `MemoryPath.cacheRoot()/adaptation/context-packets/`。

JSON / Markdown 双视图规则：

- `.json` 是结构化真源。
- `.md` 是从 `.json` 渲染的人类可读审阅镜像。
- 第一版不支持把手工编辑的 `.md` 反向解析回 `.json`。
- 如果两者冲突，以 `.json` 为准并重新生成 `.md`。

`project_id` 由 Aether 的 project/worktree/session 绑定层提供。  
第一版不默认把这些真源写入 `<worktree>/.opencode/adaptation/`，也不导出或同步到 `<worktree>/.aether/adaptation/`。  
项目目录内记录以后只能按 `pointer -> explicit export -> one-way sync -> two-way sync` 的顺序逐步评估。

### session db 只保存过程绑定

session db 第一版只能保存下列过程数据：

- `session_id -> project_id`
- `session_id -> initiative_id`
- `session_id -> task_scope_id`
- `session_id -> subject_ids`
- `session_id -> artifact_ids`
- `session_id -> habit_ids`
- `session_id -> signal_ids`
- `session_id -> proposal_ids`
- `session_id -> context_packet_id`
- `session_id -> context_packet_snapshot`
- `session_id -> match_snapshot`

`habit_ids` 表示已经引入当前 session、应在每轮模型请求中被注意的习惯引用。它不是长期习惯真源，也不表示这些习惯只属于该 session。

`initiative_id / task_scope_id / subject_ids / artifact_ids` 表示当前 session 的实际挂载状态，而不是系统暂时猜到的全部候选范围。

session db 不能成为这些对象的唯一长期真源：

- `workspace/global-guidance.json`
- `global/global-policy.json`
- `subject-profile.json`
- `workspace/projects/<project_id>/project-guidance.json`
- `initiative-policy.json`
- `task-scope.json`
- `artifact-contract.json`
- `IPK piece`

### 派生缓存

```text
MemoryPath.cacheRoot()/adaptation/
```

## 14. 当前最重要的 schema 结论

1. `proposal` 是必须新增的对象。
2. `profile` 至少要分 `global` 和 `subject`。
3. `project_guidance` / `initiative_profile` / `initiative_policy` 进入 v1 最小版。
4. `policy` 应同时覆盖 `response_policy` 与 `operation_policy`。
5. 长期 policy 覆盖顺序为 `artifact > task_scope > initiative_policy > subject > global`。
6. 跨层级习惯传递必须通过 `scope promotion` / promotion proposal 表达。
7. `task_scope` 必须独立存在，不能塞进扁平 profile。
8. `artifact_contract` 必须独立存在，不能塞进 profile 或 task state。
9. `context_packet` 是 query time 的核心对象。
10. 系统必须学习“怎么做事”，而不只是“怎么回答”。
11. v1 当前只保留 `remove-source` 这一条已确认习惯管理动作；重复候选降噪由 guidance 维护和 proposal merge 承担。
12. `session_scratch_habit` 是 session 临时层；只有 `active` scratch 会注入上下文和进入入库审查，`pending` scratch 只等待用户确认生效。
