# RecBole：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/RecBole`  
> 输出文件：`docs/IPK/reference_project_review/RecBole/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `没有独立 agent-style 记忆系统，主要是历史交互与序列状态的数据表示体系`

一句话说明：

> RecBole 会大量处理用户历史、序列列表、交互矩阵、保存后的数据集与模型检查点，但这些东西服务的是推荐训练与复现实验，而不是像 agent 那样提供独立的读写记忆子系统。

## 1. 项目自己的记忆需求判断

这个项目似乎认为“历史”需要解决：

- 推荐模型必须保留用户过去交互，才能学习偏好。
- 不同任务需要不同历史表示：矩阵、序列、上下文特征、知识图谱连接。
- 为了可复现，数据切分和保存也必须标准化。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 代码证据 | `data/dataset/dataset.py` | 提供 `history_item_matrix()`、`history_user_matrix()`。 |
| 代码证据 | `data/dataset/sequential_dataset.py` | 把用户历史行为展开成 item 序列样本。 |
| 代码证据 | `data/utils.py` | 支持保存 dataset 与 dataloaders，强调可复现。 |
| 代码证据 | `model/abstract_recommender.py` | AutoEncoderMixin 直接读取 `history_item_matrix()`。 |
| 文档/配置证据 | `properties/overall.yaml` | split、group_by、order 默认值都围绕历史交互定义。 |
| 推断 | 基于整体流程 | 历史在这里是推荐训练真源，而不是对话式长期记忆。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否真正记忆系统 |
| --- | --- | --- | --- | --- |
| 历史交互矩阵 | 用户过往交互 item 列表与值 | 中长期 | 是 | 更像训练特征真源 |
| 序列增强样本 | 最近行为序列到下一项预测样本 | 中长期 | 是 | 更像短期状态表示 |
| 切分后的 dataset/dataloader | train/valid/test 视图 | 实验周期 | 间接相关 | 可复现实验产物 |
| 模型 checkpoint | 已训练参数 | 中长期 | 间接相关 | 压缩后的统计历史 |
| eval protocol | split/group_by/order/mode | 中长期 | 间接相关 | 不是记忆内容，但决定历史如何被消费 |

## 3. 读写流程

### 3.1 写入流程

```text
读入原始交互数据 ->
create_dataset() 选择数据集类型 ->
必要时形成 history_item_matrix 或 sequence augmentation ->
按 eval_args 切分 train/valid/test ->
训练模型并保存 checkpoint / dataset / dataloaders
```

### 3.2 读取流程

```text
加载 dataset 或 dataloaders ->
模型读取历史矩阵或行为序列 ->
trainer 训练或评估 ->
预测阶段根据当前用户历史生成排序分数
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| 原始交互数据 | 数据集文件 | 历史矩阵、序列样本 | 是 | 推荐历史真源 |
| history_item_matrix | `dataset.py` 生成张量 | 模型输入 | 可由交互重建 | AutoEncoder 等模型直接使用 |
| 序列样本 | `SequentialDataset.data_augmentation()` 结果 | 模型输入 | 可由有序交互重建 | 服务 next-item 预测 |
| dataset / dataloader 缓存 | `data/utils.py` 保存文件 | 无 | 可重建，但为复现节省时间 | 实验工件 |
| 模型 checkpoint | trainer 保存文件 | 推断输出 | 需重训重建 | 压缩了大量历史统计模式 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 数据集构建 | 按 model type 选 Dataset / SequentialDataset | 可缓存 dataset | 配置一致性检查 | `data/utils.py` |
| 历史矩阵读取 | `history_item_matrix()` | 张量化便于批处理 | 补零与长度控制 | `dataset.py` |
| 序列增强 | 对每个用户按时间生成监督样本 | 限制 `MAX_ITEM_LIST_LENGTH` | 强制按时间序排序 | `sequential_dataset.py` |
| 训练与评估 | `Trainer.fit/evaluate` | batch、early stopping | 标准 metric + split protocol | `trainer/trainer.py` |
| split protocol | RS / LS / TS + group_by user | 可重复/可缓存 | 避免历史泄漏 | `dataset.py`、`overall.yaml` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有
- memory consolidation：有，主要体现在训练把历史压缩进参数
- short-term to long-term promotion：没有显式机制
- graph extraction：仅 knowledge-based 任务会使用图谱关系，但不是统一记忆层
- duplicate merge：更多是数据清洗和过滤
- stale memory cleanup：依赖重建数据集/重训，不是独立记忆治理

## 7. 优点

- 清楚地区分了原始交互、序列增强、切分协议和训练结果。
- `history_item_matrix()` 这类接口很直白，能看出模型到底吃的是什么历史。
- 对短期序列状态的处理非常正式，不是临时 feature hack。

## 8. 顾虑

- 没有用户能直接检查和修正的记忆界面。
- 历史一旦被压进模型参数，解释性和删除治理都不容易。
- 这套“记忆”概念更适合离线学习系统，不适合直接照搬到 agent 上下文系统。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户自适应是主问题。
- 记忆系统不是主问题。
- 历史表示只是自适应的基础设施，而不是单独被产品化的一层。

结论：

> RecBole 很适合提醒 Aether：并不是所有强适配系统都会显式命名 memory subsystem。有时“记忆”只是被吸进数据结构、采样逻辑和模型参数里。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆层必须显式暴露给运行时读取 | 挑战 | RecBole 的很多历史最终通过模型参数间接生效。 |
| 长短期历史不必严格区分 | 挑战 | 序列数据集和历史矩阵已经说明两者不是一回事。 |
| 只要保存原始记录就够 | 补充 | 框架级的 split、cache、checkpoint 对复现与比较同样关键。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆表示

- Aether 也许需要同时考虑：
  - 可显式审计的条目记忆；
  - 为模型服务的压缩状态表示。

### 11.2 短期状态层

- 近期序列状态可以作为独立层存在，而不是自动并入长期习惯。

### 11.3 只适合保留为启发的点

- 推荐框架的训练式“记忆”不宜直接迁移，但它对历史分层和评估协议的重视很值得借鉴。

## 12. 仍需继续读的文件

- `recbole/sampler/sampler.py`
- `recbole/evaluator/*`
- `recbole/model/sequential_recommender/sasrec.py`
