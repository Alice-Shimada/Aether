# zep：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/zep`  
> 输出文件：`docs/IPK/reference_project_review/zep/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `部分有，而且比普通 memory 产品更强`

一句话说明：

> `zep` 的用户自适应不是“学点偏好就好”，而是明确回答一个问题：哪些关于这个用户的事实，应该在很多轮里都始终可用，不能只靠偶然检索命中。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- agent 始终带着正确的用户背景工作，而不是每轮重新猜。
- 用户偏好和关系会变化，系统要理解“曾经如此、现在不是了”。
- 某些关键用户事实必须被稳定带入上下文，不能完全交给语义相似度。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 强调 right information at the right time，relationship-aware retrieval。 |
| 文档证据 | `examples/python/user-summary-instructions-example/README.md` | 直接说预算、卧室数、必须特征应当“always included”。 |
| 代码证据 | `examples/python/chat_history/memory.py` | `thread.get_user_context(thread_id)` 是用户上下文读取入口。 |
| 代码证据 | `examples/python/advanced.py` | 通过 ontology 定义人物、目的地、关系，说明系统想理解用户关系网而不只是文本片段。 |
| 推断 | 基于示例设计 | `zep` 把“用户自适应”视为一个被产品明确设计的问题，而不是检索副产物。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| user | 平台中的用户实体 | 部分相似 |
| user context | 当前线程可用的用户上下文块 | 更接近可注入画像摘要 |
| user summary instructions | 规定“始终要回答哪些用户问题” | 很接近强约束画像模板 |
| temporal knowledge graph | 随时间演化的用户与世界关系图 | 比静态画像更强 |
| thread | 用户的一条会话线 | 会话上下文，不等同画像 |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| `user.add(...)` 的基础信息 | 是 | 否 | 是 | 粒度较浅，只是 identity 起点 |
| thread 消息 | 是 | 是 | 是，进入 thread/graph/context | 错误说法也可能被图谱化 |
| 结构化业务数据 / JSON | 可能是业务系统提供 | 否或部分是 | 是 | 容易把 CRM / 业务状态与用户偏好混在一起 |
| user summary instructions | 不是用户提供，而是产品侧配置 | 否 | 是，作为摘要 contract | 产品方选错问题会把摘要做偏 |
| 新消息中的“偏好变化” | 是 | 是 | 是，时间图谱可表达变化 | 需要好的时序理解，否则摘要会漂移 |

## 4. 用户信息怎样影响行为

```text
创建 user + thread ->
持续写入聊天与结构化数据 ->
Zep 抽取关系、事件和用户摘要 ->
thread.get_user_context() 返回带用户摘要的 context block ->
应用把 context block 放入 system prompt ->
agent 的回答、推荐和工具决策围绕用户当前情况调整
```

说明：

- `zep` 在每轮前读取用户信息，而不是只在写入时做一次抽取。
- 用户信息既进入图谱，也进入更稳定的 user summary。
- 最终改变的是回答内容、推荐方向、信息优先级和对变化事实的解释方式。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 写入 | `thread.add_messages()` / `graph.add()` | 否 | `examples/python/simple.py`、`examples/go/user_graph.go` | 写入路径顺滑，适合生产事件流 |
| 更新 | 用户新消息或 `user.update(...)` | 否 | `examples/python/user_example.py` | 更像持续演化，不是手工 patch 画像 |
| 纠正 | 通过新的对话事实改写当前状态 | 否 | `examples/python/advanced.py`、`user-summary-instructions-example/README.md` | 很强调“新状态进入图谱”，但用户显式审核弱 |
| 删除 | `user.delete(...)`、thread 删除 | 取决于业务方 | `examples/python/user_example.py` | 有账号级擦除入口，但摘要级治理细节对开源读者不够透明 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：有，user summary / user graph
- 项目级偏好：在示例中更多由项目设置与 ontology 决定
- 会话内临时偏好：有，thread
- 外部知识内容：有，business data / documents / app events
- agent 自己的经验：不作为主要重点

结论：

> `zep` 的边界很清楚：thread 负责会话线，user summary 负责“总该知道的用户事实”，graph 负责关系和时间变化。它不是把一切都塞进一个向量检索池里。

## 7. 优点

- 把“用户适配需要持续稳定地进 prompt”说得非常明确。
- 对偏好变化、关系变化的时间性处理更成熟。
- user summary instructions 给出了很实用的产品控制面。

## 8. 顾虑

- user summary instructions 的定义权主要在产品方，不一定真反映用户自己想保留什么。
- 当前开源仓库主要是 examples，很多后台治理细节看不全。
- 图谱和摘要层很强，但轻场景可能会觉得系统偏重。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户画像主要靠被动检索命中即可 | 挑战 | `zep` 明确表明有些用户事实应该始终在场。 |
| 用户自适应只要知道静态偏好就行 | 挑战 | 它把偏好变化和关系变化作为一等公民。 |
| 用户自适应与上下文编排可以一起讨论 | 补充 | `zep` 显示两者紧密相关，但最好通过 contract 化摘要层连接。 |
| 会话历史和长期用户状态可以靠一个池子统一召回 | 挑战 | 它明确拆出 thread、user summary、graph。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 需要认真问：哪些用户事实是“始终该带上”的，而不是“有需要时再检索”。

### 10.2 产品流程的改变

- 可以考虑引入“用户摘要问题清单”这类产品契约，让适配信息进入 prompt 更稳定。

### 10.3 程序架构的改变

- 可能需要把 thread recall、用户摘要、关系图谱拆成三个职责不同但可组合的层。

### 10.4 只适合保留为启发的点

- 不宜未经验证就引入重型图谱；但“变化是时间问题”这个观念很值得保留。

## 11. 仍需继续读的文件

- `examples/python/context-templates-example/README.md`：继续看它怎样把摘要和模板组合。
- Graphiti 独立仓库：后续作为强相关项目联读。
