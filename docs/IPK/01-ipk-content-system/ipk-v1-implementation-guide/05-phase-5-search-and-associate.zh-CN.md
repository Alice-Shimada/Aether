# 阶段 5：显式 `搜索` 与 `联想`

## 目标

在不自动侵入普通对话的前提下，把 `IPK` 的两条运行时能力做出来：

- `搜索`
- `联想`

这两条能力必须拆开，不能混成一个“随便搜一下”的黑箱。

## 必做项

### 1. 明确两条不同服务

后端至少拆成两个服务：

- `ipk/search.ts`
- `ipk/associate.ts`

语义固定为：

- `搜索`
  - 先准
  - 再尽量全
  - 允许保守收缩
- `联想`
  - 更广泛
  - 返回数量可控
  - 不能无限发散

### 2. 候选收缩 + LLM 判断

两条链都不要只靠关键词。

推荐结构：

1. 先用结构字段、词表、别名、索引缩小候选
2. 再用 LLM 判断和排序

其中：

- `搜索` 重点读 `catalog + retrieve`
- `联想` 重点读 `catalog + associate + link_glimpse + graph_links`

### 3. 明确 API

实现：

- `POST /ipk/search`
- `POST /ipk/associate`

并分别返回：

- `SearchHit[]`
- `AssociateHit[]`

不要返回原始 `surface.json` 给前端自己拼。

### 4. 词表归一

这一阶段至少要让 `taxonomy/` 真正参与候选归一。

最少支持：

- `domains`
- `methods`
- `projects`
- `contexts`

要求：

- 如果已有规范词，就用它
- 如果没有合适词，允许新增规范词
- 中英混合表达至少要靠 `aliases` 跑通基本召回

### 5. 不自动接入普通问答

这一阶段虽然在做运行时能力，但仍然必须遵守：

- 第一版不自动挂进普通问答主链
- 不默认修改 [packages/opencode/src/session/prompt.ts](/home/bzz/Aether/packages/opencode/src/session/prompt.ts) 的正常行为

如果确实需要一个显式入口，优先顺序是：

1. 显式 route / tool
2. 显式 skill
3. 明确的用户指令触发

不要偷偷做自动注入。

## 推荐文件

建议新增或修改这些文件：

- [packages/opencode/src/ipk/search.ts](/home/bzz/Aether/packages/opencode/src/ipk/search.ts)
- [packages/opencode/src/ipk/associate.ts](/home/bzz/Aether/packages/opencode/src/ipk/associate.ts)
- [packages/opencode/src/ipk/taxonomy.ts](/home/bzz/Aether/packages/opencode/src/ipk/taxonomy.ts)
- [packages/opencode/src/server/routes/ipk.ts](/home/bzz/Aether/packages/opencode/src/server/routes/ipk.ts)

如果你决定补显式 skill，再新增相应 skill 文件，但不要因此阻塞主实现。

## 阶段完成标准

- `POST /ipk/search` 可用
- `POST /ipk/associate` 可用
- 两条链返回的是稳定读模型，不是裸磁盘结构
- `搜索` 能做到“准优先”
- `联想` 能做到“广但可控”
- 中英混合术语能利用词表和别名跑通基本召回
- 没有自动侵入普通问答主链
- `packages/opencode` 能通过 `bun typecheck`

## 这一阶段不要做什么

- 不把 `IPK` 自动挂进普通问答
- 不做“大而全”的统一 runtime 黑箱
- 不让 `搜索` 和 `联想` 共用同一套无差别提示词
