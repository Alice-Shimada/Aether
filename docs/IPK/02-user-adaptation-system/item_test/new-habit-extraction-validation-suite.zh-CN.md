# 提取新习惯验证集 v1

本文是“提取新习惯”链路的固定验证集，服务于两类对象：

1. 权威记录文档
- [session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md)
- [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
- [user-adaptation-session-scratch-habits-execution-plan.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-session-scratch-habits-execution-plan.zh-CN.md)
- [00-implementation-contract.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/00-implementation-contract.zh-CN.md)
- [03-phase-3-scope-read-and-context-packet.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/03-phase-3-scope-read-and-context-packet.zh-CN.md)
- [04-phase-4-signal-extraction-and-summary.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/04-phase-4-signal-extraction-and-summary.zh-CN.md)
- [06-phase-6-ui-and-user-review.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-v1-implementation-guide/06-phase-6-ui-and-user-review.zh-CN.md)
- [user-adaptation-system-schema-v1.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-schema-v1.md)

2. 当前程序设计与实现检查面
- `packages/opencode/src/adaptation/llm.ts`
- `packages/opencode/src/adaptation/signal.ts`
- `packages/opencode/src/adaptation/scratch.ts`
- `packages/opencode/src/context/compile.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/server/routes/adaptation.ts`
- `packages/app/src/context/adaptation.tsx`
- `packages/app/src/components/adaptation-scratch-dialog.tsx`

## 1. 使用说明

- 本文不是单元测试代码，而是功能验收与回归测试的固定题库。
- 当权威文档或程序设计调整时，应先更新权威文档，再同步修订这里。
- 当验证题本身发现缺口、歧义或遗漏时，应优先在这里修正题面和预期，再决定是否补代码测试。
- 本文默认覆盖“用户消息 -> 多 candidate 提取 -> imported / scratch comparator -> merge / review -> prompt / UI”全链路。

## 2. 基线约束

- habit evidence 真源只来自用户消息。
- 快链路只读取用户消息，不读取 assistant 文本。
- assistant 文本最多只作为理解用户在同意或纠正什么的上下文，不作为 habit evidence。
- v1 不实现 regex / 关键词线索层；当前运行时应保持用户习惯提取为 LLM-only。未来若引入，也不能直接生成 scratch、signal 或 processed 标记。
- 当前轮 assistant 回答不等待提取、查重、合并或冲突弹窗完成。
- 当前轮 prompt 只注入当前用户消息之前已生效的 imported habits 和 active scratch habits。
- 当前用户消息若与已注入习惯冲突，本轮回答以当前用户要求为准。

## 3. 验证项

### A. 触发与时效

1. 用户消息写入后触发 `after_user_message`。
预期：当前轮回答不等待提取完成。

2. 当前轮 prompt 不回灌本条消息刚提取出来的 scratch。
预期：本轮只能直接依赖当前用户消息本身。

3. 当前用户消息与 imported / active scratch 冲突。
预期：本轮回答优先遵守当前用户消息。

4. 提取 LLM、comparator LLM、review UI 任一环节慢或失败。
预期：不阻塞本轮回答。

### B. 证据来源

5. 用户明确说“以后默认先给结论再展开”。
预期：可提取 habit candidate。

6. assistant 先说“以后我先给结论再展开”，用户回复“对，以后都这样”。
预期：evidence 落在用户确认消息，不落在 assistant 消息。

7. assistant 单独提出一条规则，用户没有确认。
预期：不能生成 habit evidence。

8. 用户执行了某个工具、改了文件，但消息里没表达偏好。
预期：快链路不因此生成 habit evidence。

### C. 多 candidate 提取

9. 一条消息里同时说“先给结论，再附详细推导；代码默认用 Python”。
预期：提取两个原子 candidate。

10. 一条消息里用两种近义说法重复强调同一要求。
预期：合并成一个 candidate，但 evidence 保留多条。

11. 一条消息里没有可靠习惯候选。
预期：返回空 candidates，不报错，不产生 scratch。

12. 每个 candidate 必须包含 `candidate_id / summary / canonical_text / state_suggestion / kind / impact / explicit / temporary / confidence / scope_hint / traits / evidence[]`。

13. 每条 evidence 必须包含 `evidence_id / session_id / message_id / quote / reason / source / created_at`，并预留 `start_offset / end_offset`。

### D. LLM-only 与 regex 参考层

14. 用户用非常规表达提出要求，不命中任何关键词。
预期：只要 LLM 判为有效，仍应捕获。

15. v1 当前不实现 regex 线索层。
预期：运行时行为不依赖 regex 命中与否；LLM 不可用时直接跳过并等待重试。

16. LLM 输出整体不可解析。
预期：本轮不写 scratch / signal，不标 processed。

17. LLM 只解析成功部分消息、部分消息结构损坏。
预期：损坏的那部分消息不能被当成“无候选已处理”。

18. 同一批消息第一次结构损坏，自动重跑后恢复正常。
预期：允许继续写入；只有恢复后才标 processed。

19. 同一批消息持续结构损坏，但按单条消息重跑后恢复正常。
预期：整批不会被直接判死；应允许按消息级恢复。

20. 单条消息在有限次数重跑后仍结构损坏。
预期：不写 scratch / signal，不标 processed，等待后续重试。

### E. candidate vs imported

18. candidate 与 imported habit 语义重合。
预期：只记 hit event，不创建 scratch，不弹窗。

19. candidate 与 imported habit 冲突。
预期：只创建 review batch，不立即暂停 imported，不立即写 active scratch。

20. candidate 同时与多条 imported 冲突。
预期：合并成一个按 candidate 分组的 review batch。

21. candidate 只有在所有 imported 比较后都无 overlap/conflict 时，才进入 scratch comparator。

### F. candidate vs scratch 与 merge matrix

22. 新 active + 旧 active overlap。
预期：合并到旧 active，追加 evidence，保持 active。

23. 新 active + 旧 pending overlap。
预期：旧 pending 升为 active。

24. 新 active + 旧 active conflict。
预期：新 active 生效，旧 scratch 标记 `superseded`。

25. 新 pending + 旧 active overlap。
预期：合并 evidence，旧 active 保持 active。

26. 新 pending + 旧 pending overlap。
预期：合并 evidence，保持 pending。

27. 新 pending + 旧 active conflict。
预期：保留旧 active；新 pending 只作为带冲突标记的 pending review item，不进 prompt。

28. 新 pending + 旧 pending conflict。
预期：双方都保留 pending，互相记录 conflict marker，不弹窗。

### G. review / batch resolve

29. imported conflict review 选择“保留现有要求”。
预期：candidate 不进入 active scratch。

30. imported conflict review 选择“采用新候选”。
预期：生成 active scratch，并对相关 imported refs 建立 `shadow_ids`。

31. review 中输入新的局部解决要求。
预期：直接生成一条覆盖当前冲突组的 active scratch，不做复杂拆分。

32. scratch conflict review 采用新要求。
预期：旧 scratch 标记 `superseded` 或 `invalidated`，新条目生效。

### H. superseded / prompt / compile

33. `superseded` 条目在暂存区可见。
预期：显示“已被覆盖”之类用户可读状态。

34. `superseded` 条目不进入 prompt。

35. `superseded` 条目不参与后续 active/pending 匹配。

36. active scratch 的 `shadow_ids` 覆盖 imported refs。
预期：compile 时过滤对应 imported habit，不改正式真源。

37. pending scratch 不进入 prompt，不进入入库审查。

### I. evidence 与 UI

38. scratch evidence 逐条展示 `quote + reason`。

39. evidence 至少支持按 `session_id + message_id` 跳回原消息。

40. 没有 `start_offset / end_offset` 时，message jump 仍可工作。

41. imported hit 暂不要求完整 UI，但接口要可返回结构化 hit records。

### J. processed 索引与重试

42. LLM 成功解析并完成整条链路。
预期：对应用户消息才标记 processed。

43. comparator LLM 不可用。
预期：本轮不写 scratch / signal，不标 processed。

44. review 未处理。
预期：不影响已完成的后台提取结果保存；但 review 保持 pending。

45. 某条消息上次因 LLM 不可用而跳过，后续模型恢复。
预期：该消息可被再次提取，不因旧失败状态被永久跳过。

## 4. 建议映射到自动化测试的分层

- 单元测试：候选结构、merge matrix、review resolve、processed 行为。
- 集成测试：`after_user_message`、context compile、route 返回结构。
- UI 测试：scratch dialog、review batch、evidence jump、superseded 展示。
- 回归测试：imported overlap hit-only、imported conflict review-first、pending 不注入、shadow_ids 过滤。

## 5. 维护要求

- 新增字段、状态机、review 动作或 prompt 优先级时，必须同步补充本文。
- 任何与本文预期不一致的程序行为，都应先判定是代码 bug、文档 bug，还是验证题面过时。
- 若后续真的引入 regex 参考层或兜底触发层，也必须满足本文基线：regex 不能直接产出 habit record，只能服务复核、重试或诊断。
