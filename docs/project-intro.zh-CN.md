# Aether 项目轻量介绍

## 一句话定义

`Aether` 是一个面向科研与复杂知识工作的 AI 助手平台。  
它基于 OpenCode 深度定制，但目标不只是“让 AI 帮你写代码”，而是让 AI 在长期协作中逐渐理解：

- 你是谁、你习惯怎样被解释
- 你正在做什么长期事项
- 你过去积累了哪些可复用的知识与材料
- 在当前这个 session 里，什么才是真正应该生效的上下文

换句话说，Aether 想做的是一个既能执行、又能积累、还能持续贴近具体用户与具体任务的研究型 agent。

## Motivation

很多通用 AI 编程工具已经能读代码、改代码、调用工具，但它们常常有三个明显短板：

- 它们擅长“处理当前问题”，不擅长“理解这个用户”
- 它们擅长“回答一次”，不擅长“延续一个长期任务”
- 它们擅长“临时检索”，不擅长“把有价值的内容沉淀成未来还能继续使用的结构”

Aether 的出发点就是补这三个缺口。

它把一个真实的长期协作过程看成三件事同时发生：

1. AI 要能在当前 session 里可靠地执行任务。
2. AI 要能逐渐形成对用户和任务的长期理解。
3. AI 要能把研究、学习、开发过程中产生的内容整理成可持续调用的知识底座。

## 核心结构

Aether 当前可以从四层来理解。

### 1. 多端交互层

项目同时支持：

- TUI 终端界面
- Web 前端
- Desktop 桌面应用

这让它既能像传统 coding agent 一样在终端里工作，也能在浏览器或桌面里提供更完整的可视化体验。

### 2. Agent 执行层

`packages/opencode` 是核心引擎。  
它负责：

- 会话与消息循环
- LLM 提供商接入
- 工具调用
- 权限控制
- 文件与命令执行
- MCP / LSP / 插件 / Skills 扩展

从运行方式上看，Aether 是一个以 `session` 为中心的系统。每次协作都是一个 session，消息、工具调用、推理过程、权限请求、todo、review 等状态都围绕 session 组织。

### 3. 用户自适应系统

这是 Aether 最有辨识度的部分之一。

它不是简单的“聊天记忆”，而是一套长期习惯系统。  
当前正式结构可以简化理解成三块：

- `global_profile / project_profile`
  只做 guidance，也就是“轻量背景 + refs”，帮助 session 缩小候选范围
- `global / subject / initiative / task_scope / artifact`
  习惯库中的 confirmed 真源，保存长期可复用的习惯与规则
- `session binding + scratch`
  运行时生效层，决定当前这个 session 实际挂载了哪些内容

这套设计的重点不是“记住越多越好”，而是把“长期真源”和“当前生效”明确分开，并保留人类审核边界。

### 4. IPK 内容系统

IPK 可以理解成 Aether 的长期内容库。

它不是普通笔记仓库，而是围绕 `piece` 构建的一套结构化内容系统。  
一条内容进入 IPK 后，不只是保存正文，还会逐步形成：

- `surface`
  面向 AI 的结构化工作面
- `links`
  与其他内容的关系
- `map`
  大规模内容上的导航层

所以 IPK 关心的不只是“存下来了没有”，而是“未来还能不能被稳定地找到、判断、关联和再次使用”。

## 这个项目和普通 AI coding agent 的差别

如果只用一句话概括，Aether 的差别在于：

> 它把“当下执行”“长期习惯”“长期知识”同时当成一等对象来设计。

普通 agent 更像一次性的执行器；Aether 更像一个持续合作的研究工作台。

它特别适合下面这类场景：

- 研究驱动的编程
- 需要反复阅读资料、写代码、整理结论的长期任务
- 同一个人跨多个 subject、initiative、task_scope 来回切换的工作流
- 希望 AI 不只会回答，还能逐渐贴合个人习惯与知识积累的使用者

## 仓库结构怎么快速看

如果第一次读这个仓库，最值得先看的部分是：

- `packages/opencode`
  核心后端、agent、session、tool、provider、adaptation、IPK 等主逻辑
- `packages/app`
  Web 前端
- `packages/desktop-electron`
  桌面端封装
- `packages/ui` / `packages/sdk/js` / `packages/util`
  共享 UI、SDK 与通用能力
- `docs/architecture.md`
  整体架构概览
- `docs/IPK/`
  Aether 最重要的两套长期系统设计文档：用户自适应系统与 IPK

如果只想最快理解“这个项目的独特之处”，优先读：

1. `docs/project-intro.zh-CN.md`
2. `docs/architecture.md`
3. `docs/IPK/02-user-adaptation-system/user-adaptation-system-overview.zh-CN.md`
4. `docs/IPK/01-ipk-content-system/ipk-content-system-overview.zh-CN.md`

## 当前阶段可以怎样理解它

Aether 已经不是一个单纯的 OpenCode fork，而是在朝一个“研究型长期协作系统”发展。

它的主线不是再堆更多工具，而是把下面三件事真正接起来：

- session 中的实时执行
- 对用户和任务的长期自适应
- 对知识与内容的长期沉淀

这也是它最值得介绍给别人的地方。
