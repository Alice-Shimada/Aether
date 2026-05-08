# mem0：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/mem0`  
> 阅读日期：`2026-04-18`  
> 主要关注：memory layer、用户个性化、检索与更正边界

## 0. 一句话定位

`mem0` 主要想解决的是：让开发者给 agent 补上一层可持续召回的 memory，让助手能跨轮记住用户偏好、会话状态和 agent 经验，而不是每次都靠长上下文硬撑。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| user memory | 持久化的用户偏好和事实 | 用户长期记忆 |
| session memory | 当前任务或当前 run 的短期上下文 | 会话级 recall |
| agent memory | 面向 agent 的状态或经验 | agent 经验 / procedural layer |
| procedural memory | 通过专门 prompt 生成的操作性记忆 | agent 工作法总结 |
| memory layer | 供业务应用搜索和注入的统一记忆层 | 记忆服务层 |

## 2. 主要用户流程

```text
应用把多轮消息交给 mem0 -> mem0 从消息里抽取值得记住的事实 -> 按 user_id / agent_id / run_id 存下来 ->
应用下一轮先按 query 检索 -> 把相关记忆拼回 prompt -> 继续对话 ->
必要时显式 update / delete / feedback
```

## 3. 主要程序流程

```text
messages -> add() -> 抽取/去重/向量化/实体链接 -> vector store + history/messages sqlite ->
search() -> 过滤 + 检索 + 可选 rerank -> 返回 results ->
业务应用自己负责注入模型 prompt
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位、v3 算法与多层 memory 主张 | read |
| `docs/core-concepts/memory-types.mdx` | 项目怎样定义 conversation/session/user/org 四层 | read |
| `docs/core-concepts/memory-operations/add.mdx` | 官方写入流程与冲突处理说法 | read |
| `docs/core-concepts/memory-operations/search.mdx` | 官方检索流程与 filters/rerank 说法 | read |
| `mem0/memory/main.py` | `add/search/update/delete/reset` 主链路 | read |
| `mem0/memory/storage.py` | history/messages 的本地真源与审计结构 | read |
| `mem0/client/main.py` | 托管 API 的 update/delete/feedback 接口 | read |
| `tests/test_client_feedback.py` | feedback 真实调用形态 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- API 很朴素，开发者容易接入。
- 用 `user_id / agent_id / run_id` 直接表达作用域，比很多抽象名词更清楚。
- 把历史审计、短期消息缓存、向量检索、实体增强放进同一套流水线里，工程上很务实。

## 7. 初步顾虑

- 文档里仍保留“冲突解决、最新真相获胜”的表述，但 README 和代码主线已经转向 add-only，外部读者容易误判。
- 用户自适应并没有独立真源，很多偏好只是 memory 命中结果，长期治理比较弱。
- 记忆是否真的进入最终 prompt 取决于业务方，产品闭环并不完整。

## 8. 待继续验证的问题

- 托管版 graph 与 OSS 版 entity store 的职责边界还可以继续读。
- `openmemory` 与 `server` 子目录值得在后续横向比较时补读。
