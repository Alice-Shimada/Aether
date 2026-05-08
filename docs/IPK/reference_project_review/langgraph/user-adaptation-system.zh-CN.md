# langgraph：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/langgraph`  
> 输出文件：`docs/IPK/reference_project_review/langgraph/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `没有成品化内建系统，但提供了足够强的底层原语`

一句话说明：

> LangGraph 不替开发者直接做用户画像、偏好学习或自动适配，但它把运行时上下文、线程隔离、跨线程存储、人工中断恢复这些底层能力准备好了，因此很适合拿来承载上层用户自适应产品。

## 1. 项目自己的用户需求判断

这个项目似乎认为真实用户不是终端用户，而是开发者；开发者真正需要：

- 构建可长期运行、可恢复、可人工干预的 agent/workflow。
- 在不同 thread、不同用户、不同会话之间清楚分开状态。
- 把“适配逻辑”留给应用自己定义，而不是框架替你决定。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 核心卖点是 durable execution、human-in-the-loop、comprehensive memory。 |
| 代码证据 | `langgraph/graph/state.py` | `StateGraph` 只定义状态图和运行边界，不内置用户模型。 |
| 代码证据 | `langgraph/runtime.py` | `Runtime.context` 用于注入 `user_id` 等运行时上下文。 |
| 代码证据 | `prebuilt/chat_agent_executor.py` | 明确区分单 thread chat memory 与跨 conversations/users 的 store。 |
| 推断 | 基于 API 形态 | 它把“用户自适应”视为应用层逻辑，而不是框架层默认行为。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| context_schema / runtime.context | 当前运行可注入的上下文，例如 `user_id` | 更像运行时依赖 |
| thread | 一条连续交互历史 | 更像会话边界 |
| store | 跨 thread 的持久存储 | 可承载用户长期偏好，但不是专门画像 |
| interrupt | 人工介入点 | 可用于用户确认，不等于适配 |
| Command | 恢复 / 更新状态命令 | 是控制原语，不是画像语义 |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| `Runtime.context` | 是，由应用注入 | 否 | 取决于应用 | 只在本次 run 有效，容易和长期记忆混淆 |
| `thread_id` 对应的 checkpoint 状态 | 间接是 | 否 | 是 | 容易被误当成长期用户画像 |
| `store` 中的持久项 | 是，由应用写入 | 可由应用决定 | 是 | 如果 namespace 设计差，会把多用户数据混在一起 |
| `interrupt` 返回的人类输入 | 是 | 否 | 是，进入恢复流程 | 需要应用自己决定是否提升为长期偏好 |

## 4. 用户信息怎样影响行为

```text
应用把 user_id / role / 权限等放进 runtime.context ->
节点在运行时读取 context 和 store ->
节点据此选择工具、读取偏好、更新 state ->
graph 在当前 thread 内持续推进并 checkpoint ->
如需人工确认，用 interrupt 暂停，再用 Command(resume=...) 恢复
```

说明：

- LangGraph 自己不会说“这是用户偏好，那是长期习惯”。
- 它只负责让开发者有地方放这些信息，并保证执行过程能继续。
- 真正的适配逻辑，例如“何时改变回答风格”“何时提升成长期偏好”，都由上层应用决定。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 注入 run 上下文 | 应用启动 graph run 时 | 由应用决定 | `runtime.py`、`graph/state.py` | 很灵活 |
| 写 thread 状态 | 节点返回 state update | 默认不需要 | `graph/state.py`、`checkpoint/README.md` | 更像会话推进，不是画像更新 |
| 写长期 store | 节点调用 `store.put` / `search` 等 | 由应用决定 | `store/base/__init__.py` | 是承载适配数据的主要长期层 |
| 用户介入纠正 | `interrupt()` 后 `Command(resume=...)` | 是 | `types.py`、`prebuilt/README.md` | 人工校正能力很强 |
| 恢复或跳转 | `Command(update/goto/resume)` | 由应用决定 | `types.py` | 给复杂审批和修正流程很大空间 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：放 store，更适合
- 当前会话状态：放 thread checkpoint
- 当前 run 依赖：放 runtime.context
- 用户确认：放 interrupt / Command
- 自动用户建模：没有内建

结论：

> LangGraph 最重要的边界不是“用户画像 vs 记忆”，而是“当前 thread 状态 vs 跨 thread 持久数据 vs 本次 run 的上下文依赖”。这比直接给一套画像字段更底层，但也更清楚。

## 7. 优点

- 不替应用预设错误的用户模型，灵活度很高。
- thread、store、context 分层清楚，适合严肃系统设计。
- interrupt / Command 让“用户确认后再继续”变成正式能力，而不是旁路 hack。

## 8. 顾虑

- 对产品团队来说，框架本身不给现成适配闭环，上手门槛高。
- 如果没有明确规则，开发者很容易把 thread memory 错当 user memory。
- “有能力承载适配”不等于“已经帮你设计好了适配”。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户自适应应该先从字段/画像结构出发 | 挑战 | LangGraph 先从执行边界和存储边界出发。 |
| 会话状态与长期用户状态可以在同一层处理 | 挑战 | 这里把 thread checkpoint 和 store 明确分开。 |
| 用户确认只是 UI 层问题 | 挑战 | interrupt / Command 把它上升为执行原语。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 也许需要先更清楚地区分“本次执行依赖”“当前会话状态”“跨会话用户状态”。

### 10.2 产品流程的改变

- 某些高风险适配变更，可以设计成 interrupt 式确认，而不是自动落长期记忆。

### 10.3 程序架构的改变

- 可以考虑让用户自适应建立在更清晰的执行与持久化分层上，而不是把所有东西塞进一个 memory bucket。

### 10.4 只适合保留为启发的点

- LangGraph 提供的是底层治理框架，不会直接给出 Aether 想要的用户画像产品形态。

## 11. 仍需继续读的文件

- `libs/langgraph/langgraph/pregel/*`
- `libs/checkpoint-postgres/langgraph/checkpoint/postgres/*`
- 官方 memory / interrupts 教程对应的 examples
