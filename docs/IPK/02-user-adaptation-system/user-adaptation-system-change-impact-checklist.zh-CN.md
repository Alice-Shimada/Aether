# 用户自适应系统改动影响检查表

日期：2026-04-17  
用途：每次要改用户自适应系统的非局部行为前，用这份表先判断会牵动哪里。

## 0. 使用规则

小文案、小样式、单个按钮位置调整可以不填完整表。

只要改动涉及下面任意一类，就应先做影响分析：

- 数据结构或 schema。
- 存储目录、文件名、id、scope。
- 习惯提取、合并、冲突、入库、提升。
- context packet / prompt 注入。
- 后端 routes 或前端 context。
- 用户审阅 UI。
- LLM 调用和模型设置。

## 1. 影响分析模板

```md
## <改动名称> 影响分析

### 本次想达到什么效果

- <用用户的话写，不写底层函数名。>

### 用户已确认的逻辑

- <已经拍板的时机、条件、输入、输出、边界。>

### 不能脑补的逻辑

- <用户还没说清楚，不能直接实现成默认行为。>

### 直接修改文件

- `<path>`：<为什么改>

### 间接受影响文件

- `<path>`：<为什么可能受影响>

### 受影响模块契约

- <例如 scratch、session binding、context compile、proposal、frontend context>

### 用户可见行为变化

- <用户会看到什么不同，或者 AI 行为会怎么变。>

### 风险

- <用直白中文写，例如“旧习惯可能压过用户当前要求”。>

### 需要用户拍板的问题

1. <效果层面的选择，不问函数怎么写。>

### 验证

- Typecheck:
- Tests:
- SDK:
- UI/manual:
- IPK docs:
- Model routing guard:
```

如果“不能脑补的逻辑”里有阻塞项，不要实现这部分行为。

## 2. 常见改动的默认检查范围

### 改 scratch 快链路

直接检查：

- `packages/opencode/src/adaptation/scratch.ts`
- `packages/opencode/src/adaptation/llm.ts`
- `packages/opencode/src/adaptation/types.ts`
- `packages/opencode/src/adaptation/index.ts`
- `packages/opencode/src/server/routes/adaptation.ts`

间接检查：

- `packages/opencode/src/context/compile.ts`
- `packages/opencode/src/context/packet.ts`
- `packages/app/src/context/adaptation.tsx`
- `packages/app/src/components/adaptation-scratch-dialog.tsx`
- `packages/app/src/components/adaptation-current-context-dialog.tsx`
- `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`
- `packages/app/src/pages/session/message-timeline.tsx`

文档检查：

- [user-adaptation-system-top-level-constraint.zh-CN.md](./user-adaptation-system-top-level-constraint.zh-CN.md)
- [new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md](./new_habits_get/session-scratch-merge-and-new-habit-extraction-plan.zh-CN.md)
- [user-adaptation-system-schema-v1.md](./user-adaptation-system-schema-v1.md)
- [user-adaptation-system-open-questions.zh-CN.md](./user-adaptation-system-open-questions.zh-CN.md)

### 改 confirmed 习惯库或五层 scope

直接检查：

- `packages/opencode/src/adaptation/types.ts`
- `packages/opencode/src/adaptation/storage.ts`
- `packages/opencode/src/adaptation/profile.ts`
- `packages/opencode/src/adaptation/proposal.ts`
- `packages/opencode/src/adaptation/indexes.ts`

间接检查：

- `packages/opencode/src/adaptation/session.ts`
- `packages/opencode/src/context/compile.ts`
- `packages/opencode/src/server/routes/adaptation.ts`
- `packages/app/src/context/adaptation.tsx`

文档检查：

- [user-adaptation-system-top-level-constraint.zh-CN.md](./user-adaptation-system-top-level-constraint.zh-CN.md)
- [../ipk-and-adaptation-storage-access-contract.zh-CN.md](../ipk-and-adaptation-storage-access-contract.zh-CN.md)
- [user-adaptation-system-implementation-decisions.zh-CN.md](./user-adaptation-system-implementation-decisions.zh-CN.md)
- [user-adaptation-system-schema-v1.md](./user-adaptation-system-schema-v1.md)

### 改运行时 context 注入

直接检查：

- `packages/opencode/src/context/compile.ts`
- `packages/opencode/src/context/packet.ts`
- `packages/opencode/src/session/prompt.ts`

间接检查：

- `packages/opencode/src/adaptation/session.ts`
- `packages/opencode/src/adaptation/habit.ts`
- `packages/opencode/src/adaptation/scratch.ts`
- `packages/app/src/components/adaptation-current-context-dialog.tsx`

必须确认：

- 当前用户消息和系统/仓库规则仍优先于旧习惯。
- imported active habits 和 scratch active habits 都能进入候选。
- pending proposal / pending scratch 不会作为 active rule 注入。

### 改前端审阅体验

直接检查：

- `packages/app/src/context/adaptation.tsx`
- `packages/app/src/components/adaptation-current-context-dialog.tsx`
- `packages/app/src/components/adaptation-scratch-dialog.tsx`
- `packages/app/src/components/adaptation-proposal-inbox-dialog.tsx`
- `packages/app/src/components/adaptation-menu.tsx`

间接检查：

- `packages/opencode/src/server/routes/adaptation.ts`
- `packages/opencode/src/adaptation/types.ts`
- SDK 生成文件。

必须确认：

- 用户看到的是“效果和选择”，不是内部 id 和工程黑话。
- confirm / reject / defer / promote / dismiss / resolve 的语义和后端一致。

## 3. 验证命令建议

按改动范围选择，不要机械全跑：

- 后端 adaptation 类型或逻辑：
  - `cd packages/opencode && bun typecheck`
  - 相关 `bun test` 文件。
- 前端 UI 或 context：
  - `cd packages/app && bun typecheck`
  - 需要时跑 e2e 或手动浏览器检查。
- API 或 SDK 变化：
  - `./packages/sdk/js/script/build.ts`
- LLM 调用、模型设置或 prompt：
  - `python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether`
- IPK / adaptation 文档：
  - `python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict`

## 4. 最终报告最低要求

完成非局部改动后，最终报告应说明：

- 直接改了哪些文件。
- 间接检查了哪些文件。
- 哪些模块契约受影响。
- 哪些用户可见行为变化。
- 有没有未拍板、不能脑补的逻辑。
- 跑了哪些验证，哪些没跑以及原因。
