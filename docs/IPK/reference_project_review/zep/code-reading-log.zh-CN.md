# zep：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/zep`

## 0. 阅读目标

- 判断 `zep` 是把自己当 memory 系统、图谱系统，还是 context assembly 系统。
- 看它如何处理“长期偏好”和“当前线程上下文”的关系。
- 找它是否真的做用户自适应，以及怎样避免只靠 top K 检索。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | 当前产品定位是 end-to-end context engineering |
| 文档证据 | `examples/python/user-summary-instructions-example/README.md` | user summary instructions 的产品心智 |
| 文档证据 | `examples/python/agent-memory-full-example/README.md` | 完整 agent memory demo |

## 2. 已读代码 / 示例入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `examples/python/simple.py` | user、thread、messages 的基础写入 |
| 代码证据 | `examples/python/chat_history/memory.py` | `get_user_context()` 的最小读取路径 |
| 代码证据 | `examples/python/advanced.py` | 自定义 ontology 与复杂关系写入 |
| 代码证据 | `examples/go/user_graph.go` | nodes / edges / episodes / graph search |
| 代码证据 | `legacy/src/store/sessionstore_ce.go` | session 创建后向 graph 添加 user node |
| 代码证据 | `legacy/src/main.go` | 旧服务主入口，确认曾有完整 CE 运行时 |

## 3. 当前已确认的主链路

### 3.1 写入

```text
先创建 user 和 thread ->
thread.add_messages() 写入对话 ->
graph.add() 可额外写入 JSON / text / message ->
平台抽取关系并更新 temporal graph / user summary
```

### 3.2 读取

```text
thread.get_user_context(thread_id) ->
返回 context block（可含 user summary） ->
应用放进 system prompt

或：

graph.search(query, user_id, center node, scope) ->
返回 edges / nodes / graph context
```

## 4. 第一轮最重要发现

1. `zep` 首先把自己描述成 context engineering platform，而不是单纯 memory DB。
2. 它认为“总该带上的用户事实”不能完全交给语义检索，于是引入 user summary instructions。
3. 它把“偏好变化”做成时间图谱问题，而不是简单覆盖字符串。
4. 当前开源仓库重心是 examples/integrations，很多底层实现只能借 legacy 代码和产品文档反推。

## 5. 仍可补读但不阻塞首轮结论的区域

- `examples/python/context-templates-example/`
- `examples/python/zep-quickstart-dashboard/`
- `mcp/zep-mcp-server/`

## 6. 当前推断

- 推断：`zep` 真正的产品野心不是“替你存记忆”，而是“替你决定每轮该给模型什么上下文块”。
- 推断：它把用户自适应视为 context assembly contract 的一部分，而不是单独偏好数据库。
