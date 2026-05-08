# memos：代码阅读记录

> 状态：首轮完成  
> 项目路径：`/home/bzz/Aether/reference_project/memos/memos`

## 0. 阅读目标

- 判断它到底是不是“记忆系统”，还是“用户自己的内容资产系统”。
- 找它是否做 agent 用户自适应。
- 找清楚 memo 真源、派生 payload、用户设置三者边界。

## 1. 已读文档入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 文档证据 | `README.md` | quick capture、self-hosted、markdown-native、data ownership |

## 2. 已读代码入口

| 类型 | 路径 | 关注点 |
| --- | --- | --- |
| 代码证据 | `server/server.go` | 运行时入口与 API/MCP/SSE 注册 |
| 代码证据 | `store/memo.go` | memo 真源结构 |
| 代码证据 | `store/user_setting.go` | 用户设置存取和缓存 |
| 代码证据 | `proto/store/user_setting.proto` | `theme`、`locale`、`memo_visibility` |
| 代码证据 | `proto/store/instance_setting.proto` | 实例级 memo/AI 配置 |
| 代码证据 | `server/router/api/v1/user_service.go` | 用户只能更新自己的 settings |
| 代码证据 | `server/router/api/v1/memo_service.go` | 列表、过滤、权限与分页主链路 |
| 代码证据 | `server/router/api/v1/ai_service.go` | 当前 AI 能力主要是音频转录 |

## 3. 当前已确认的主链路

### 3.1 写入

```text
用户创建/编辑 memo ->
store.CreateMemo / UpdateMemo ->
memo 内容作为真源保存 ->
relations / attachments / reactions 分开关联
```

### 3.2 读取

```text
ListMemos ->
按当前用户、权限、过滤条件取 memo ->
批量补 reactions / attachments / relations ->
返回时间线
```

### 3.3 用户设置

```text
UpdateUserSetting ->
只允许当前用户改自己的 general settings ->
可改 memo_visibility / theme / locale
```

## 4. 第一轮最重要发现

1. `memos` 的“memory”不是 agent memory，而是用户自己写的 memo 资产。
2. 用户偏好是显式 settings，不是模型推断的画像。
3. memo 内容和用户设置边界很清楚，没有把偏好自动混进知识库。
4. AI 目前主要帮助输入转录，不主导长期记忆建模。

## 5. 仍可补读但不阻塞首轮结论的区域

- `server/runner/memopayload/runner.go`
- 前端 relation / link memo 组件
- `server/router/mcp/`

## 6. 当前推断

- 推断：`memos` 给 Aether 的最大启发不在“怎么自动学会用户”，而在“用户自己的长期知识资产应该怎样保持清楚、可编辑、可审计”。
