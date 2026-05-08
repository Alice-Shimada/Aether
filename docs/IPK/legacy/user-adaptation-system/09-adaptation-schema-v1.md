# IPK：用户风格画像与自适应系统 Schema（第一版）

这份文档把“逐渐形成一个符合使用者胃口的 AI 助手”这条线收敛成一版独立 schema。

它和 `piece` 系统相互协作，但不属于同一层。

本系统的目标是：

- 从长期对话中提取用户偏好与认知风格信号
- 避免对单次会话过度敏感
- 通过多次证据积累形成稳定 `profile`
- 再通过 `policy` 影响未来回答与检索策略

## 1. 总体分层

第一版推荐四层对象：

- `signals`
- `summaries`
- `profile`
- `policy`

它们对应一条明确的数据流：

```text
会话结束
  -> signals 抽取
  -> 多次会话累积
  -> summaries 周期总结
  -> profile / policy 更新
  -> 后续会话自动使用
```

## 2. 系统边界

### 2.1 这个系统记录什么

- 回答风格偏好
- 论证密度偏好
- 抽象层次偏好
- 从已有知识出发的需求
- 在不同场景下对严谨 / 发散 的接受度
- 系统观察到的长期倾向与可被纠偏的方向

### 2.2 这个系统不直接记录什么

- 独立的知识内容对象
- 某次具体问题的详细推导
- 某个想法本身的正文

这些仍然属于 `piece` 系统。

## 3. `signals` schema

`signals` 是最小的风格证据事件单位。

它不直接改写长期画像，只表示：

- 在某次会话里，系统观察到一个潜在偏好或互动信号

### 3.1 建议结构

```json
{
  "id": "sig_20260403_001",
  "session_id": "ses_xxx",
  "created_at": "2026-04-03T19:20:00+08:00",
  "kind": "prefers_more_rigorous_argument",
  "scope": "research",
  "polarity": "positive",
  "confidence": 0.78,
  "evidence": [
    {
      "source": "user_message",
      "ref": "msg_123",
      "quote": "我希望你给我更多的论证，不要只是直觉。"
    }
  ],
  "note": "用户在研究型问题里再次明确要求提高论证密度。"
}
```

### 3.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 否 | `adaptation.signal` | 创建时生成 |
| `session_id` | `string` | 否 | `adaptation.signal` | 创建时生成 |
| `created_at` | `string (ISO datetime)` | 否 | `adaptation.signal` | 创建时生成 |
| `kind` | `string` | 否 | `adaptation.signal` | 创建时生成 |
| `scope` | `"general" \| "learning" \| "research" \| "writing" \| "reflection"` | 是 | `adaptation.signal` | 创建时生成 |
| `polarity` | `"positive" \| "negative" \| "mixed"` | 否 | `adaptation.signal` | 创建时生成 |
| `confidence` | `number` | 否 | `adaptation.signal` | 创建时生成；后续不改 |
| `evidence` | `Array<{ source: string, ref: string, quote: string }>` | 否 | `adaptation.signal` | 创建时生成 |
| `note` | `string` | 是 | `adaptation.signal` | 创建时生成 |

### 3.3 `kind` 第一版建议集合

第一版建议信号种类保持克制，只覆盖高价值偏好：

- `prefers_more_rigorous_argument`
- `prefers_more_intuitive_opening`
- `prefers_start_from_known_knowledge`
- `prefers_more_associative_exploration`
- `dislikes_overly_abstract_opening`
- `dislikes_excessive_length`
- `wants_clearer_boundary_conditions`
- `wants_more_step_by_step_derivation`
- `accepts_riskier_hypotheses`
- `rejects_overconfident_claims`

### 3.4 设计要求

- 单个 signal 必须有证据
- 单个 signal 不可直接改写长期 profile
- `confidence` 不应轻易给满分

## 4. `summaries` schema

`summaries` 是对一段时间 signals 的阶段性总结。

它的作用是：

- 把零散信号压缩成可以阅读和判断的中间层
- 作为 `profile / policy` 更新的依据

### 4.1 建议结构

```json
{
  "id": "adapt_summary_202604_week1",
  "window": {
    "start": "2026-03-28T00:00:00+08:00",
    "end": "2026-04-03T23:59:59+08:00"
  },
  "session_ids": ["ses_a", "ses_b", "ses_c"],
  "highlights": [
    "最近一周用户在研究型问题中多次要求更高论证密度。",
    "在学习型问题中用户反复强调希望从已有知识出发。"
  ],
  "patterns": [
    {
      "kind": "prefers_more_rigorous_argument",
      "scope": "research",
      "strength": 0.84,
      "evidence_count": 5
    },
    {
      "kind": "prefers_start_from_known_knowledge",
      "scope": "learning",
      "strength": 0.77,
      "evidence_count": 4
    }
  ],
  "recommendations": [
    "研究型回答默认提高边界说明与论证密度。",
    "学习型回答先从用户已知框架切入，再补新概念。"
  ]
}
```

### 4.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 否 | `adaptation.summary` | 创建时生成 |
| `window.start` | `string (ISO datetime)` | 否 | `adaptation.summary` | 创建时生成 |
| `window.end` | `string (ISO datetime)` | 否 | `adaptation.summary` | 创建时生成 |
| `session_ids` | `string[]` | 否 | `adaptation.summary` | 创建时生成 |
| `highlights` | `string[]` | 否 | `adaptation.summary` | 创建时生成 |
| `patterns` | `Array<{ kind: string, scope?: string, strength: number, evidence_count: number }>` | 否 | `adaptation.summary` | 创建时生成 |
| `recommendations` | `string[]` | 是 | `adaptation.summary` | 创建时生成 |

### 4.3 设计要求

- `summaries` 是中间层，不直接对用户暴露为“永久真相”
- `strength` 应基于重复出现和场景一致性
- 应优先总结稳定趋势，而不是列出所有零散 signal

## 5. `profile` schema

`profile` 是对用户较稳定认知和偏好的持久画像。

它不是一份心理画像，而是一份“帮助系统更适合地回答”的工作画像。

### 5.1 建议结构

```json
{
  "version": 3,
  "updated_at": "2026-04-03T23:10:00+08:00",
  "knowledge_start": {
    "summary": "用户在统计物理、场论语言和对偶视角方面已有较强基础。",
    "confidence": 0.81
  },
  "response_preferences": {
    "learning": {
      "start_from_known_knowledge": 0.88,
      "prefer_intuition_first": 0.72,
      "prefer_step_by_step": 0.67
    },
    "research": {
      "prefer_rigorous_argument": 0.84,
      "want_boundary_conditions": 0.8,
      "accept_associative_exploration": 0.61
    }
  },
  "language_preferences": {
    "prefer_formalism_alignment": 0.78,
    "dislike_overly_abstract_opening": 0.74
  },
  "notes": [
    "用户希望 AI 尽量从其已有知识体系出发。",
    "在研究型问题里，用户对论证密度要求明显高于学习型问题。"
  ],
  "confidence": 0.79,
  "derived_from": ["adapt_summary_202604_week1", "adapt_summary_202603_week4"]
}
```

### 5.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `version` | `number` | 否 | `adaptation.profile` | 每次正式更新时递增 |
| `updated_at` | `string (ISO datetime)` | 否 | `adaptation.profile` | 每次正式更新时刷新 |
| `knowledge_start.summary` | `string` | 是 | `adaptation.profile` | 周期更新或用户显式要求总结时更新 |
| `knowledge_start.confidence` | `number` | 是 | `adaptation.profile` | 同步更新 |
| `response_preferences` | `object` | 否 | `adaptation.profile` | 周期更新 |
| `language_preferences` | `object` | 是 | `adaptation.profile` | 周期更新 |
| `notes` | `string[]` | 是 | `adaptation.profile` | 周期更新 |
| `confidence` | `number` | 否 | `adaptation.profile` | 周期更新 |
| `derived_from` | `string[]` | 否 | `adaptation.profile` | 周期更新 |

### 5.3 设计要求

- `profile` 要求低敏感
- 未经多次证据支持的偏好不应高置信写入
- 最好按场景保存，而不是只给全局偏好

## 6. `policy` schema

`policy` 不是描述用户是什么样，而是描述系统当前应该怎样与用户互动。

这让系统可以：

- 在理解用户的同时保持适度纠偏
- 避免完全顺着用户一时的习惯走

### 6.1 建议结构

```json
{
  "version": 2,
  "updated_at": "2026-04-03T23:10:00+08:00",
  "defaults": {
    "learning": {
      "answer_order": ["known_knowledge", "intuition", "new_concept", "formalism"],
      "rigor_level": "medium",
      "association_level": "medium"
    },
    "research": {
      "answer_order": ["problem_frame", "assumptions", "argument", "expansion"],
      "rigor_level": "high",
      "association_level": "medium"
    }
  },
  "corrections": [
    "当用户在研究讨论中过度保守时，允许适度补充更开放的可能方向，但必须显式标注其 speculative 性质。"
  ],
  "derived_from_profile_version": 3,
  "confidence": 0.75
}
```

### 6.2 字段表

| 字段 | 类型 | 可空 | 自动生成来源 | 更新时机 |
| --- | --- | --- | --- | --- |
| `version` | `number` | 否 | `adaptation.policy` | 每次正式更新时递增 |
| `updated_at` | `string (ISO datetime)` | 否 | `adaptation.policy` | 每次正式更新时刷新 |
| `defaults` | `object` | 否 | `adaptation.policy` | 周期更新 |
| `corrections` | `string[]` | 是 | `adaptation.policy` | 周期更新 |
| `derived_from_profile_version` | `number` | 否 | `adaptation.policy` | 每次更新时写入 |
| `confidence` | `number` | 否 | `adaptation.policy` | 每次更新时估计 |

### 6.3 设计要求

- `policy` 可以比 `profile` 更主动
- 允许加入系统自己的策略建议
- 但不能脱离 `profile` 与 `summaries` 的证据基础

## 7. 更新触发器

### 7.1 `on_session_end`

每次会话结束后：

- 生成 `signals`
- 不直接更新 `profile`

### 7.2 `on_summary_window`

达到某个时间窗或会话数量阈值后：

- 生成新的 `summaries`

### 7.3 `on_user_request`

用户显式要求：

- “总结最近的风格和偏好”
- “更新你对我的理解”

此时可以触发：

- `summaries`
- 必要时触发 `profile / policy` 更新

### 7.4 `on_profile_rebuild`

当信号积累足够稳定时：

- 重建 `profile`
- 再派生新的 `policy`

## 8. 第一版最小实现建议

第一版不要一步做太复杂。

建议顺序：

1. 会话结束后抽取 `signals`
2. 支持按最近 N 次会话生成 `summaries`
3. 支持用户显式触发 `profile` 总结
4. 最后再让普通问答默认读 `profile / policy`

## 9. 一句话总结

这个系统的本质不是“记住用户说过什么”，而是：

- 从长期交流里提取稳定风格信号
- 用低敏感的方式更新用户画像
- 再把这种理解反馈到未来的回答策略上
