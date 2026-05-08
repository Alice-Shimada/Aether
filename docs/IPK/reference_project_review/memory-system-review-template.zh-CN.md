# <项目名>：记忆系统审阅

> 状态：调研草稿  
> 项目路径：`/home/bzz/Aether/reference_project/<project-name>`  
> 输出文件：`docs/IPK/reference_project_review/<project-name>/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `<长期记忆 / 短期记忆 / 知识库 / 图谱 / session recall / 推荐系统 / 其它>`

一句话说明：

> `<先讲它解决什么问题，不要先套 Aether 的 IPK 或 adaptation 术语。>`

## 1. 项目自己的记忆需求判断

这个项目似乎认为记忆系统需要解决：

- `<需求 1>`
- `<需求 2>`
- `<需求 3>`

这些判断来自：

| 证据 | 位置 | 说明 |
| --- | --- | --- |
| 文档 / 代码 / 测试 | `<path>` | `<说明>` |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否知识内容 |
| --- | --- | --- | --- | --- |
| `<memory type>` | `<content>` | `<short/long>` | `<yes/no>` | `<yes/no>` |

## 3. 读写流程

### 3.1 写入流程

```text
<事件 -> 提取 -> 存储 -> 索引 -> 审核/后台任务>
```

### 3.2 读取流程

```text
<请求 -> 检索 -> 排序 -> 上下文组装 -> 模型调用>
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 删除方式 |
| --- | --- | --- | --- | --- |
| `<data>` | `<path/db>` | `<index/cache>` | `<yes/no>` | `<delete/tombstone/replace>` |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| `<stage>` | `<method>` | `<timeout/cache/top K>` | `<rerank/filter>` | `<path>` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary
- memory consolidation
- short-term to long-term promotion
- graph extraction
- embedding refresh
- duplicate merge
- stale memory cleanup

## 7. 优点

先写项目自己的优点。

- `<优点 1>`
- `<优点 2>`
- `<优点 3>`

## 8. 顾虑

- `<顾虑 1>`
- `<顾虑 2>`
- `<顾虑 3>`

## 9. 与用户自适应系统的边界

这个项目中：

- 用户画像是否只是 memory 的一种。
- 用户偏好是否和知识内容混存。
- session history 是否会影响长期用户画像。
- agent 经验是否和用户习惯混在一起。

结论：

> `<说明边界清不清楚，以及为什么。>`

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| `<old assumption>` | `<supported/challenged/expanded>` | `<reason>` |

## 11. 对 Aether 的可能改变

### 11.1 IPK / 知识库方向

- `<change>`

### 11.2 session recall 方向

- `<change>`

### 11.3 adaptation memory 方向

- `<change>`

### 11.4 只适合保留为启发的点

- `<point>`

## 12. 仍需继续读的文件

- `<path>`：`<为什么还要读>`
