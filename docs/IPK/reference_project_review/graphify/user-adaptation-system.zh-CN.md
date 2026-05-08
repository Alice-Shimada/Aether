# graphify：用户自适应系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/graphify`  
> 输出文件：`docs/IPK/reference_project_review/graphify/user-adaptation-system.zh-CN.md`

## 0. 先给结论

这个项目是否有明确用户自适应系统：

> `几乎没有，这不是它的重点`

一句话说明：

> graphify 主要在适配“语料和平台”，不是适配“某个终端用户的长期偏好”；它关心的是 assistant 怎样更聪明地导航项目，而不是怎样学会用户习惯。

## 1. 项目自己的用户需求判断

这个项目似乎认为用户真正需要：

- AI coding assistant 能更快理解代码库和混合语料。
- assistant 别老从头 grep，而要先看结构。
- 使用者需要知道图谱里哪些关系是直接发现的，哪些是推断的。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 直接说 “Understand a codebase faster. Find the why behind architectural decisions.” |
| 文档证据 | `README.md` | 强调 persistent across sessions、71.5x fewer tokens per query。 |
| 代码证据 | `graphify/__main__.py` | 对多种 assistant 平台写入 always-on 规则与 hooks。 |
| 代码证据 | `tests/test_claude_md.py` | 验证安装后 assistant 会先读 `GRAPH_REPORT.md`。 |
| 推断 | 基于产品整体结构 | 它适配的是 assistant 的工作流，不是单个人类用户画像。 |

## 2. 它把用户自适应叫什么

| 项目术语 | 含义 | 是否等同 Aether 的用户画像 / 习惯 |
| --- | --- | --- |
| platform install | 适配 Claude/Codex/OpenCode 等平台 | 不是用户画像 |
| always-on hook | 在工具调用前提醒先读图谱摘要 | 不是用户画像 |
| graphify skill | assistant 的工作流技能 | 更像 agent workflow |

## 3. 用户信息从哪里来

| 来源 | 是否用户显式提供 | 是否模型自动提取 | 是否有证据保存 | 风险 |
| --- | --- | --- | --- | --- |
| 用户选择的根目录/语料 | 是 | 否 | 是，进入 graphify-out | 选错范围会污染图 |
| 用户问题 | 是 | 否 | 临时用于查询图 | 不形成长期用户画像 |
| 平台类型（Claude/Codex 等） | 是/隐式由安装命令指定 | 否 | 是，写入平台规则 | 这是平台适配，不是用户适配 |

## 4. 用户信息怎样影响行为

```text
用户指定语料目录 ->
graphify 建图 ->
assistant 被安装 rules/hook ->
每次问架构问题前先读 GRAPH_REPORT.md ->
再按 query/path/explain 查询局部图
```

说明：

- 这里真正被“适配”的对象是 assistant 的导航流程。
- 用户自己的长期偏好、能力状态、沟通风格并不进入图谱主链路。
- 最终改变的是 assistant 怎样读项目，而不是怎样理解某个具体人。

## 5. 写入、更新、纠正和删除

| 动作 | 触发条件 | 用户是否确认 | 关键代码 / 文档 | 评价 |
| --- | --- | --- | --- | --- |
| 写入 | 运行 `/graphify` | 是，用户显式执行 | `README.md`、`tests/test_pipeline.py` | 写入对象是项目语料图，不是用户画像 |
| 更新 | `--update` / watch / hooks | 是 | `README.md`、`watch.py` 相关说明 | 更新的是图谱，不是用户习惯 |
| 纠正 | 重新建图或补充语料 | 是 | README 的 query/update 流程 | 没有用户画像纠正流程 |
| 删除 | 删除 `graphify-out` 或重建 | 是 | 推断自输出目录结构 | 治理对象是图文件，不是 profile |

## 6. 作用域和边界

它是否区分：

- 全局用户偏好：没有
- 项目级偏好：间接有，体现在项目级图谱
- 会话内临时偏好：几乎没有
- 外部知识内容：是核心
- agent 自己的经验：部分有，体现在 always-on graph workflow

结论：

> graphify 的边界很清楚：它做“外部语料结构化导航”，不做“用户长期适配”。如果硬把它当用户自适应系统，会看错重点。

## 7. 优点

- 克制，不把一切都往“用户画像”上套。
- 真正改善的是 assistant 对项目的理解效率。
- 平台安装和 hook 让结构上下文能长期发挥作用。

## 8. 顾虑

- 对 Aether 用户自适应系统的直接启发有限。
- 容易让人误以为“assistant 更懂项目”就等于“assistant 更懂用户”。
- 若照搬其平台 hook 思路，需要注意 Aether 的本地规则体系和安全边界。

## 9. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 所有长期上下文都应该归入用户自适应讨论 | 挑战 | graphify 提醒我们，项目/语料结构记忆是另一类东西。 |
| 用户适配一定是最重要的长期信号 | 补充 | 在代码助手场景，项目结构往往比用户习惯更先决定回答质量。 |

## 10. 对 Aether 的可能改变

### 10.1 用户需求理解的改变

- Aether 需要把“理解用户”与“理解项目/语料”分成两类不同需求。

### 10.2 产品流程的改变

- 对工程类场景，先给 agent 一层项目结构摘要，可能比先做用户画像更值。

### 10.3 程序架构的改变

- 可以考虑引入“项目结构记忆层”，不要把它混进 adaptation memory。

### 10.4 只适合保留为启发的点

- 平台级 always-on graph reminder 值得借鉴，但不等于用户适配机制。

## 11. 仍需继续读的文件

- `graphify/skill-codex.md`：后续看它怎样引导 Codex 使用图谱。
- `worked/*/GRAPH_REPORT.md`：后续看输出形态的可用性。
