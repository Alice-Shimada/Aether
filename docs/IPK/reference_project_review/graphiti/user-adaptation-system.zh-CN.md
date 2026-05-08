# graphiti：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphiti`  
> 输出文件：`docs/IPK/reference_project_review/graphiti/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `部分有，但不是内建产品重心`

一句话说明：

> Graphiti 不是直接卖“用户画像系统”，而是提供一个足够强的时间图谱底座，让上层应用把用户、偏好、需求和历史关系都建成图谱对象，再由检索和时间逻辑产生适配效果。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- agent 能理解不断变化的人、事、关系，而不是只记静态偏好。
- 用户相关事实需要和其它事实一样有时间窗口和来源。
- 上层应用应该能按自己的领域定义用户相关类型，而不是被框架锁死。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 强调 personalized agents、facts change over time、prescribed and learned ontology。 |
| 文档证据 | `mcp_server/README.md` | 明确把 `Preference`、`Requirement` 等列为内建实体类型。 |
| 代码证据 | `mcp_server/config/config.yaml` | 默认 `Preference` 类型描述为“User preferences... PRIORITIZE”。 |
| 代码证据 | `graphiti_core/graphiti.py` | `group_id`、entity types、episode provenance 都是可定制而非写死的用户系统。 |
| 推断 | 基于框架边界 | 它更相信“把用户纳入通用图谱模型”，而不是单独做一套 profile subsystem。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| Preference | 用户偏好实体类型 | 部分相似 |
| Requirement | 用户需求/约束类型 | 部分相似 |
| group_id | 某一类图谱分区 | 更像作用域 |
| context graph | 包含用户与世界状态的总图 | 比用户画像更广 |
| episode | 产生用户事实的原始事件 | 更接近行为来源 |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| 对话消息 episode | 是 | 是 | 是，episode 是真源 | 会把随口表达结构化成长期事实 |
| JSON / structured episode | 可能由业务系统显式提供 | 否 | 是 | 业务字段可能和用户偏好边界混淆 |
| 自定义 entity types | 不是用户提供，是开发者提供 | 否 | 是 | 分类设计会影响后续适配质量 |
| `Preference` / `Requirement` 等默认类型 | 否 | 是 | 是 | 抽取质量依赖模型和 ontology 设计 |

## 4. 用户信息怎样影响行为

```text
用户消息或业务数据进入 episode ->
Graphiti 抽用户相关实体、边与时间关系 ->
这些对象进入 context graph ->
查询时可按 query + group_id + center node 做 hybrid retrieval ->
返回与用户当前状态更贴近的事实 ->
上层 agent 以这些事实为上下文来回答
```

说明：

- Graphiti 不自己输出“适配后的回答”，而是把用户相关结构事实交给上层。
- 用户信息先进入 episode，再变成 entity/edge，再经 search 进入上下文。
- 最终改变的是检索结果排序、事实覆盖范围和对“现在 vs 过去”的判断。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 写入 | `add_episode()` / MCP `add_episode` | 否 | `graphiti_core/graphiti.py`、`queue_service.py` | 以事件流为中心，自动化很强 |
| 更新 | 新 episode 进入后解析出新事实 | 否 | `graphiti_core/graphiti.py` | 倾向通过新事实失效旧事实，而不是手工改画像 |
| 纠正 | 再写入更正 episode | 否 | README 的 temporal fact management + `invalid_at` 逻辑 | 更像历史演化，不像用户直接改 profile |
| 删除 | MCP 清图、按 group 清理、删 episode/节点 | 取决于上层 | `mcp_server/README.md` | 治理入口有，但不是“用户自己改偏好”的前端体验 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：可做，但由应用自己把用户做成图中实体
- 项目/租户级偏好：`group_id`
- 会话内临时偏好：可以通过 episode 时序和 group 来表达
- 外部知识内容：是核心输入之一
- agent 自己的经验：也能进图，但不是主打

结论：

> Graphiti 的边界不是“用户画像系统 vs 记忆系统”，而是“凡是会影响 agent 决策的动态事实，都能放进同一时间图谱”。用户自适应只是这套图谱的一种应用。

## 7. 优点

- 把用户偏好当成可失效、可溯源的事实，比静态 profile 更真实。
- 不强行预设死板的用户 schema，领域可扩展。
- `group_id` 给多用户、多项目、多租户边界一个很朴素但强力的控制点。

## 8. 顾虑

- 没有内建“用户确认”层，偏好抽取可能过强自动化。
- 用户自适应需要应用方自己设计 user/thread/session 边界。
- 图谱太强时，用户相关简单需求可能被过度建模。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户画像可以主要看作静态状态 | 挑战 | Graphiti 把偏好和需求都看成会演化的时间事实。 |
| 用户自适应要先做独立产品层 | 挑战 | 这里更像在通用时间图谱上长出来。 |
| 历史变化可以被新值覆盖掉 | 挑战 | 它强调 invalidation，而不是无痕覆盖。 |
| 作用域主要靠会话或用户 ID 即可 | 补充 | `group_id` 这种更通用的图分区也很有价值。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 应更重视“用户状态会变化”，而不是只维护一份当前画像。

### 10.2 产品流程的改变

- 对某些关键偏好，也许应保留“过去怎么说、现在怎么改”的可追溯链。

### 10.3 程序架构的改变

- 可以考虑把用户相关状态建模为事件驱动、可失效的事实层，而不是只做静态表。

### 10.4 只适合保留为启发的点

- 不必直接把 Aether 变成重图谱系统，但“时间有效性”和“来源溯源”值得进入核心判断。

## 11. 仍需继续读的文件

- `examples/langgraph-agent/agent.ipynb`：更具体的个性化使用方式。
- `graphiti_core/search/search_config_recipes.py`：检索 recipe 与用户适配的耦合方式。
