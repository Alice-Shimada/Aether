# letta：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/letta`  
> 输出文件：`docs/IPK/reference_project_review/letta/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `有，而且是产品核心卖点之一`

一句话说明：

> Letta 把用户自适应主要做成“始终在 prompt 里的 core memory + 可搜索的历史/长期记忆”组合，而不是另起一套独立画像引擎。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- agent 能长期记住“我是谁、我们是什么关系、之前说过什么”。
- 用户事实不能只靠最新上下文硬塞，必须有稳定且可持续调用的记忆层。
- agent 不只是检索过去，还要自己更新和整理对人的理解。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 首页直接强调 advanced memory、stateful agent、memory blocks。 |
| 代码证据 | `letta/schemas/block.py` | `Human` 与 `Persona` 是正式 block 类型。 |
| 代码证据 | `letta/constants.py` | 默认 block 描述明确说 `human` 用来保存关于交谈对象的关键信息。 |
| 代码证据 | `letta/functions/function_sets/base.py` | agent 可直接 `core_memory_append/replace`、`conversation_search`、`archival_memory_search`。 |
| 文档/模板证据 | `letta/templates/summary_request_text.j2` | 对 compact 的要求是“不要把关于 human 的重要事实丢掉”。 |
| 推断 | 基于工具与 prompt 组合 | 它相信用户关系本身就是 agent 能力的一部分，不应该只做外围插件。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| human block | 关于当前用户的重要事实 | 很接近用户画像核心区 |
| persona block | agent 自身身份与行为风格 | 不等同用户画像，但会影响适配结果 |
| core memory | 始终在场的高优先级记忆 | 接近“始终加载的适配上下文” |
| recall memory | 可检索的对话历史 | 更像会话召回 |
| archival memory | 跨会话长期存档 | 更像长期用户/项目记忆 |
| sleeptime | 背景整理记忆的模式 | 类似记忆巩固与后处理 |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| 创建 agent 时传入 `memory_blocks` | 是 | 否 | 是，保存为 blocks | 初始设定若不准会长期污染 |
| 对话历史 | 是 | 否，检索时召回 | 是，存在消息历史中 | 临时表达和长期偏好可能混淆 |
| core memory 编辑工具 | 否，可由模型主动调用 | 是 | 是，直接改 block | 模型可能过度自信地改写人设/用户事实 |
| archival memory 插入 | 否，可由模型主动调用 | 是 | 是，进入 archive | 容易把单次事件升级成长期知识 |
| compact 摘要 | 否 | 是 | 是，形成 summary message | 压缩时可能放大某些用户特征 |

## 4. 用户信息怎样影响行为

```text
用户/应用先把 human block 写进 core memory ->
系统 prompt 渲染 core memory ->
模型回答时始终看到 human/persona ->
若上下文不够，模型或系统再检索 conversation / archival memory ->
必要时模型修改 core memory 或写入 archival memory ->
后续回答持续被这些记忆影响
```

说明：

- Letta 的第一层适配不是检索，而是“human block 永远在 prompt 里”。
- 第二层适配来自 `conversation_search` 和 `archival_memory_search`。
- 第三层适配来自模型主动编辑记忆，所以它不是纯只读用户画像。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 初始写入 | 创建 agent 时传 `memory_blocks` | 通常是应用/用户显式决定 | `README.md`、`schemas/agent.py` | 非常直接 |
| 追加/替换 core memory | 模型调用 `core_memory_append/replace` 或 `memory_*` | 默认不需要确认 | `functions/function_sets/base.py` | 适配很强，但治理偏弱 |
| 查询历史 | 模型调用 `conversation_search` | 否 | `functions/function_sets/base.py` | 让适配不只依赖当前窗口 |
| 写入长期记忆 | 模型调用 `archival_memory_insert` | 默认不需要确认 | `functions/function_sets/base.py`、`services/archive_manager.py` | 长期化能力强 |
| 防止丢失 | context 压力触发 compact | 否 | `services/summarizer/compact.py`、`summary_request_text.j2` | 会主动保住用户事实 |
| 结构化审计 | git-backed memory | 取决于部署是否开启 | `schemas/memory.py`、`server/server.py` | 给人工审计提供更强抓手 |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：可以，主要落在 `human` block 和 archival memory
- 当前会话信息：message history / recall memory
- agent 自身行为风格：`persona` block
- 长期项目事实：archive 或其它 block
- 后台巩固结果：sleeptime / compact

结论：

> Letta 没把“用户自适应”和“记忆系统”硬拆开。它的真实做法更像是：用户自适应就是记忆系统里最重要的一条产品线，其中 `human block` 是最高优先级层。

## 7. 优点

- `human` 这个概念很直观，产品语言清楚。
- “始终在 prompt 的 block”和“按需检索的长期记忆”层次分明。
- compact 明确把保住用户关键信息当成目标，而不是只压 token。
- git-backed memory 说明它开始认真面对可审计、可版本化的适配记忆。

## 8. 顾虑

- 模型可直接编辑用户相关记忆，默认确认门槛偏低。
- `human`、`persona`、summary、archival 叠加后，真实冲突解决并不简单。
- 它很适合长期关系型 agent，但对高度任务化、低人格化产品可能过重。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 用户自适应最好先做成独立 subsystem | 挑战 | Letta 更像把它做成 memory substrate 的核心用途。 |
| 用户信息主要通过检索进入 prompt | 挑战 | Letta 先让 `human` 常驻，再叠加检索。 |
| 用户画像应该尽量静态、谨慎更新 | 挑战 | Letta 允许 agent 在对话中持续改写 core memory。 |
| 只有会话历史就足够支撑适配 | 挑战 | 它坚持还要有 archival memory 和 compact 机制。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 应更重视“长期协作关系感”，不只是临时偏好命中。

### 10.2 产品流程的改变

- 也许要有一层“始终在场的用户事实区”，而不是全部都靠召回。

### 10.3 程序架构的改变

- 可以考虑把用户适配拆成：
  - 常驻核心区；
  - 可搜索历史区；
  - 可晋升/可更正的长期区。

### 10.4 只适合保留为启发的点

- 不一定要照搬 `human/persona` 的人格化命名，但“常驻块 + 可检索块”这个分层非常值得学。

## 11. 仍需继续读的文件

- `letta/agents/letta_agent_v2.py`
- `letta/agents/letta_agent_v3.py`
- `letta/services/block_manager_git.py`
- `letta/groups/sleeptime_multi_agent_v4.py`
