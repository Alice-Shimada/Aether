# memos：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/memos/memos`  
> 阅读日期：`2026-04-18`  
> 主要关注：用户自有知识资产、笔记真源、是否存在用户自适应

## 0. 一句话定位

`memos` 主要想解决的是：让用户能极低摩擦地记录、整理和保有自己的 Markdown 笔记与关系数据，而不是帮 agent 自动学习用户画像。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| memo | 用户写下的一条笔记 | 用户内容资产 |
| user setting | 用户自己的界面与默认偏好 | 显式设置，不是隐式适配 |
| instance setting | 站点级配置 | 系统配置 |
| payload | 从 memo 内容计算出的结构化属性 | 派生索引 |
| relation | memo 与 memo 的显式关系 | 内容关联 |

## 2. 主要用户流程

```text
打开时间线 -> 快速写下一条 memo ->
系统按权限、关系、附件和 payload 存储 ->
之后通过时间线、过滤和关联再次找到它 ->
需要时分享、评论、引用或继续编辑
```

## 3. 主要程序流程

```text
用户创建/更新 memo ->
store 层写 memo 真源 ->
API 层按 creator/visibility/filter 列出 memo ->
批量补 attachments / relations / reactions ->
前端展示和继续编辑
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 产品定位：quick capture、Markdown-native、data ownership | read |
| `server/server.go` | 服务入口、API、SSE、MCP、前端注册 | read |
| `store/memo.go` | memo 真源结构与 CRUD | read |
| `store/user_setting.go` | 用户显式设置的存取 | read |
| `proto/store/user_setting.proto` | 主题、语言、默认可见性等用户设置结构 | read |
| `proto/store/instance_setting.proto` | 实例 AI 与 memo 相关配置 | read |
| `server/router/api/v1/user_service.go` | 用户设置更新逻辑 | read |
| `server/router/api/v1/memo_service.go` | memo 列表和权限过滤主链路 | read |
| `server/router/api/v1/ai_service.go` | AI 功能目前主要是转录，而非画像适配 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 产品边界非常清楚：重点是用户自己的笔记资产。
- 用户偏好和笔记内容分得很开，不乱混。
- 数据所有权和可迁移性被摆在很高优先级。

## 7. 初步顾虑

- 对“agent 记忆”或“自动适配”提供的直接启发较少。
- AI 能力目前更多是辅助输入，不是帮助理解用户长期状态。
- 如果拿它来启发 Aether，需要避免把“笔记工具逻辑”误当“agent 记忆逻辑”。

## 8. 待继续验证的问题

- `memopayload` 与前端关系编辑细节可在后续横向比较时补读。
- 如果后面要看“用户可审计记忆 UI”，`memos` 可能是很好的反例样本。
