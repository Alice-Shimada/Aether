# zep：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/zep`  
> 阅读日期：`2026-04-18`  
> 主要关注：context engineering、时间图谱、user summary

## 0. 一句话定位

`zep` 主要想解决的是：生产环境 agent 不缺“模型能力”，缺的是“在正确时间拿到正确上下文”，所以它把聊天、业务数据、文档和事件统一进一个可低延迟召回的 context engineering 平台。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| context engineering | 为 agent 组装恰到好处的上下文 | 上下文编译层 |
| thread | 一条用户会话线程 | session |
| user context | 面向当前 thread 的用户上下文块 | 用户相关上下文包 |
| user summary instructions | 永远要有答案的用户问题模板 | 强约束用户画像摘要 |
| temporal knowledge graph | 带时间有效性的关系图谱 | 长期记忆 / 关系记忆 |
| episodes / nodes / edges | 图谱中的事件、实体、关系 | episodic / semantic memory |

## 2. 主要用户流程

```text
业务系统创建 user 与 thread -> 持续写入聊天、业务数据、文档、事件 ->
Zep 自动抽关系、维护时间图谱和用户摘要 ->
业务系统在每轮前取 get_user_context() 或 graph.search() ->
拿到 context block 后喂给 agent -> 输出更稳、更知道用户和历史变化
```

## 3. 主要程序流程

```text
chat/business data/events -> Zep 图谱与摘要层 ->
thread.get_user_context / graph.search ->
返回关系感知 context ->
应用自己组 prompt ->
必要时继续写入新消息或结构化数据
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 当前产品定位、三步工作流、Graphiti 关系 | read |
| `examples/python/simple.py` | 最小用户/线程/消息写入流程 | read |
| `examples/python/chat_history/memory.py` | `get_user_context()` 与 thread memory 样例 | read |
| `examples/python/user-summary-instructions-example/README.md` | 用户摘要指令的产品心智最清楚 | read |
| `examples/python/agent-memory-full-example/README.md` | 完整 agent memory demo 的检索方式 | read |
| `examples/go/user_graph.go` | episodes/nodes/edges 与 graph search 的真实调用 | read |
| `legacy/src/store/sessionstore_ce.go` | 旧开源 CE 中 session 与 graph 的绑定方式 | read |
| `legacy/src/main.go` | 旧服务主入口 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 它把“上下文”当成独立工程问题，而不只是向量检索问题。
- 对“偏好会变化”这件事非常敏感，时间图谱思路很强。
- `user summary instructions` 给了一个很实用的中间层：不是全靠检索，也不是全靠固定 profile。

## 7. 初步顾虑

- 当前开源仓库主要是 examples / integrations，核心 cloud 后端并不完全开放，很多实现细节只能部分推断。
- 产品很强，但治理面更多依赖平台配置和业务方设计。
- 图谱和上下文层较强，可能让轻量场景的接入门槛变高。

## 8. 待继续验证的问题

- Graphiti 独立仓库还值得在后续批次联动细读。
- context templates、openai-agents-sdk 示例可在跨项目阶段补读。
