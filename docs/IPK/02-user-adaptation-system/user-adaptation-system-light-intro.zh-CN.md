# 用户自适应系统轻量介绍

## 一句话定义

Aether 的用户自适应系统，不是一层普通的“聊天记忆”，也不是简单的“用户偏好列表”。

它是一套长期习惯系统。  
它的目标是让 AI 在持续协作中，逐渐理解：

- 这个用户通常喜欢怎样被解释
- 在不同 subject 里，这个用户已经掌握到哪里
- 在某个长期事项或具体任务里，哪些习惯与规则真正稳定成立
- 当前这个 session 里，哪些习惯应该真的生效

所以它关心的不是“记住更多话”，而是“形成可长期复用、且在运行时可控的理解”。

## 它想解决什么问题

很多 AI 系统都会遇到一个共同问题：

- 它知道很多一般知识
- 但它不了解这个具体的人
- 也不了解这个长期任务现在做到哪里

这会导致几类常见失配：

- 解释失配  
  AI 讲得太浅、太重、太跳，或者不符合用户熟悉的表达方式。

- 任务连续性失配  
  AI 不知道这个长期事项已经决定过什么、形成了哪些稳定习惯。

- 工作流失配  
  AI 不知道这个用户在某类任务里通常怎样组织、怎样执行、怎样更新产物。

因此，这套系统的目的不是让 AI 更“会记住聊天内容”，而是让 AI 更像一个能长期理解用户与任务的助手。

## 它不是什么

为了快速抓住边界，可以直接这样理解：

- 它不是普通聊天记忆。
- 它不是把所有历史对话都塞进 prompt。
- 它不是一张扁平用户画像。
- 它也不是 IPK 内容库。

它更像一个“长期习惯层”：

- IPK 负责长期内容和知识对象。
- 用户自适应系统负责长期习惯、偏好、规则和运行时引用。

## 核心结构

当前正式结构可以直接理解成三块。

### 1. 独立习惯库：长期真源

这是系统里唯一保存“习惯正文真源”的地方。  
所有真正被确认的长期习惯，都应该进入这里。

它内部有五个平行 scope：

- `global`
- `subject`
- `initiative`
- `task_scope`
- `artifact`

这五层是平行的，不是树状从属关系。

比如：

- `subject` 不是 `global` 的子层
- `initiative` 不是工作区 `project`
- `artifact` 也不是 `task_scope` 的孩子

它们表达的只是：

> 这条习惯适合在哪个范围被引用。

### 2. 工作区 guidance 层：轻量背景 + refs

这一层包括：

- `global_guidance`
- `project_guidance`

它们的职责只有一个：  
给 session 提供 guidance，也就是“轻量背景 + refs”。

它们负责帮助系统缩小候选范围，比如告诉系统：

- 当前更可能相关的是哪些 `subject`
- 哪些 `task_scope` 值得优先看
- 哪些已确认习惯或内容对象可能相关

但它们**不保存习惯正文真源**，也**不直接让某条习惯自动生效**。

### 3. Session 运行时层：当前真的生效什么

这一层包括：

- `session binding`
- `scratch habits`

这里最重要的理解是：

`session binding` 表示的是“当前 session 的实际挂载状态”，不是候选池，也不是历史累计袋子。

而 `scratch habits` 则表示：

- 当前 session 中新出现
- 尚未正式入库
- 但可能已经在本 session 生效

所以，真正影响当前这一轮行为的，不是整个习惯库，而是 session 运行时层里当前挂上的那一小部分内容。

## 这套系统是怎么工作的

如果把它写成最简流程，可以理解成：

```text
当前 session 的交流
  -> signal
  -> summary
  -> proposal
  -> confirmed habit
  -> 以后再被新的 session 引用
```

也就是说：

- 当前对话先产生局部证据
- 系统把这些证据整理成较稳定的候选理解
- 高影响内容不会直接静默写入长期层
- 而是先经过 proposal / review
- 真正确认后，再进入习惯库，供未来 session 引用

这让系统既能持续学习，又不会因为单次会话就把长期习惯写坏。

## Human in the Loop 为什么重要

这套系统不是完全自动记忆系统。

它默认承认一件事：

> 用户通常比 AI 更知道哪些习惯是真正长期成立的，哪些只是当前一轮的局部要求。

所以 Aether 的设计不是“让 AI 自己随便记”，而是：

- AI 负责提取 signal、整理 summary、生成 proposal、做匹配和索引
- 用户负责决定哪些高影响习惯值得真正固定下来

尤其是更高影响的东西，比如：

- 更广 scope 的长期规则
- 未来默认工作方式
- 文件写入规则
- 工具选择偏好

都不应该由 AI 静默决定。

## 它和工作区 project 的关系

这里有一个非常容易混淆、但很重要的点：

- 工作区里的 `project`
  是 Aether 的工作区对象
- 习惯库里的 `initiative`
  是长期事项 scope

它们不是同一个东西，也不默认一对一绑定。

这意味着：

- 一个 project 里可以服务多个 initiative
- 多个 project 也可以服务同一个 initiative

这也是为什么 `project_guidance` 只做 guidance，而不直接等同于长期习惯真源。

## 它和 IPK 的关系

这两套系统彼此相关，但职责不同：

- 用户自适应系统
  负责“这个用户通常怎样工作、哪些习惯应该生效”
- IPK
  负责“有哪些长期内容对象可以被存储、检索、关联和再次使用”

一个更直白的说法是：

- 用户自适应系统偏“怎么做”
- IPK 偏“内容是什么”

它们可以互相引用，但不应该混成一个库。

## 这套设计最重要的价值

这套系统最重要的价值，不是让 AI 更“聪明”，而是让 AI 更“贴近这个具体用户与这个具体任务”。

它想做到的是：

- 不只是回答当前问题
- 还要延续长期协作
- 不只是保留临时要求
- 还要形成结构化的长期习惯
- 不只是把东西存起来
- 还要保证真正进入运行时的是一个小而准的集合

这就是为什么它不是一个普通 memory 功能，而是一套独立的长期系统。

## 如果第一次继续往下读，建议看什么

如果看完这份轻量介绍之后，想继续深入，建议按这个顺序读：

1. [user-adaptation-system-overview.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md)
2. [user-adaptation-system-implementation-decisions.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md)
3. [user-adaptation-system-details.zh-CN.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-details.zh-CN.md)
