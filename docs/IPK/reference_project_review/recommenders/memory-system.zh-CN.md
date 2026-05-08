# recommenders：记忆系统审阅

> 状态：首轮正式分析完成  
> 项目路径：`/home/bzz/Aether/reference_project/recommenders`  
> 输出文件：`docs/IPK/reference_project_review/recommenders/memory-system.zh-CN.md`

## 0. 先给结论

这个项目的记忆系统定位是：

> `没有独立 agent memory 系统，只有训练与推断所依赖的历史行为表示`

一句话说明：

> recommenders 会大量使用用户历史、序列、矩阵和特征缓存，但这些东西主要是推荐模型的数据表示与训练输入，不是像 agent 那样可单独治理的记忆子系统。

## 1. 项目自己的记忆需求判断

这个项目似乎认为“历史”需要解决：

- 用户过去做过什么，是推荐最重要的信号之一。
- 历史要能被压成矩阵、序列或特征，方便训练和离线评估。
- 系统要保留足够多的历史模式，才能预测下一项或相似项。

这些判断来自：

| 证据类型 | 位置 | 说明 |
| --- | --- | --- |
| 文档证据 | `README.md` | 项目围绕准备数据、建模、评估、上线来组织。 |
| 代码证据 | `datasets/sparse.py` | 把历史交互压成 user-item affinity matrix。 |
| 代码证据 | `datasets/python_splitters.py` | 训练/测试切分按用户局部历史比例进行。 |
| 代码证据 | `models/sar/sar_singlenode.py` | SAR 明确依赖 user transaction history 和 item co-occurrence。 |
| 代码证据 | `models/sasrec/model.py` | 序列模型将用户历史序列编码进自注意力网络。 |
| 推断 | 基于整体组织 | 历史在这里是“训练与排序输入”，不是独立记忆服务。 |

## 2. 记忆类型

| 类型 | 保存什么 | 生命周期 | 是否用户相关 | 是否真正记忆系统 |
| --- | --- | --- | --- | --- |
| affinity matrix | 用户-物品交互强度 | 中长期 | 是 | 更像训练数据表示 |
| 行为序列样本 | 用户最近交互序列 | 中长期 | 是 | 更像序列特征 |
| 模型参数 | 学到的用户/物品模式 | 训练周期内长期 | 间接相关 | 更像压缩后的统计记忆 |
| 评估切分结果 | train/test 划分 | 实验周期 | 间接相关 | 不是用户记忆 |
| 线上候选分数 | 当前排序分数 | 短期 | 是 | 临时推断结果 |

## 3. 读写流程

### 3.1 写入流程

```text
用户交互日志进入 dataframe ->
映射为 user/item 索引 ->
构建 affinity matrix 或 sequence samples ->
训练模型 ->
参数与相似度矩阵吸收历史模式
```

### 3.2 读取流程

```text
给定用户或用户最近行为 ->
读取已训练好的相似度 / 参数 / 序列编码 ->
为候选物品打分 ->
返回 top-k 推荐结果
```

## 4. 存储和真源

| 数据 | 真源位置 | 派生索引 | 是否可重建 | 备注 |
| --- | --- | --- | --- | --- |
| 原始交互日志 | 上游 dataframe / dataset | affinity matrix、sequence samples | 是 | 真正的行为真源 |
| affinity matrix | `datasets/sparse.py` 生成结果 | 相似度矩阵、推荐分数 | 可从日志重建 | 是经典协同过滤表示 |
| 用户序列 | 各 sequential 模型输入 | 序列编码结果 | 可从日志重建 | 强调近期行为 |
| 模型参数 | 训练输出 | 预测分数 | 需重训重建 | 压缩了大量历史模式 |
| 评估表 | `python_evaluation.py` 对齐后的表 | metrics | 可重算 | 是验证层 |

## 5. 检索、排序和注入

| 环节 | 做法 | 延迟控制 | 准确性控制 | 关键文件 |
| --- | --- | --- | --- | --- |
| 相似项召回 | item similarity / co-occurrence | 预计算降低在线开销 | 阈值、相似度类型 | `models/sar/sar_singlenode.py` |
| 序列推断 | 读用户最近序列做 next-item 预测 | 序列长度限制 | attention / mask / embedding | `models/sasrec/model.py` |
| train/test 切分 | 按用户局部比例切 | 保留稀疏结构 | 避免分布失真 | `datasets/python_splitters.py` |
| 指标评估 | merge truth/pred 后算 RMSE/MRR 等 | 离线批处理 | 明确对齐 user/item 键 | `evaluation/python_evaluation.py` |

## 6. 压缩、总结和提升

记录它是否有：

- session summary：没有
- memory consolidation：有，但表现为训练把历史压进模型参数
- short-term to long-term promotion：没有显式 promotion 机制
- graph extraction：不是主线
- duplicate merge：主要在数据清洗和去重阶段
- stale memory cleanup：项目本身不提供面向用户的长期记忆治理

## 7. 优点

- 把“历史信号怎样进入推荐”这件事做得很清楚。
- 序列模型提醒我们近期行为本身就是一种短期状态。
- 离线评估链路完整，便于判断“记住历史”到底有没有带来更好结果。

## 8. 顾虑

- 这里没有用户可审计、可撤销的显式记忆层。
- 一旦历史被吸进模型参数，就很难逐条解释或修改。
- 它的“memory”概念不适合直接迁移到 agent 对话系统。

## 9. 与用户自适应系统的边界

这个项目中：

- 用户自适应是核心。
- 但“记忆系统”不是独立产品层，只是其数据基础。
- 所谓长期信息，大多存在交互日志、特征表和训练后的模型参数里。

结论：

> recommenders 告诉我们，有些系统的用户适配非常强，但几乎不会把“记忆系统”单独命名出来。这恰好提醒 Aether，不要把所有适配都误解成显式 memory product。

## 10. 对 Aether 旧设计的挑战

| Aether 旧前提 | 是否被支持 / 挑战 / 补充 | 说明 |
| --- | --- | --- |
| 记忆必须是可直接检索的条目 | 挑战 | 推荐系统里大量历史最终沉淀成参数和相似度。 |
| 短期与长期历史可以不分 | 挑战 | 序列推荐明确区分 recent sequence 与长期共现模式。 |
| 没有独立 memory service 就不算利用历史 | 挑战 | 这里完全依靠数据表示和模型训练来“记住”。 |

## 11. 对 Aether 的可能改变

### 11.1 记忆定义

- Aether 也许需要承认：有些“记住用户”的方式不是存条目，而是存统计结构或摘要状态。

### 11.2 短期状态建模

- 某些近期行为，也许更适合用序列状态而不是长期档案条目表达。

### 11.3 只适合保留为启发的点

- 推荐系统的参数记忆不宜直接照搬到对话系统，但“近期行为是独立层”这一点非常值得保留。

## 12. 仍需继续读的文件

- `recommenders/models/newsrec/*`
- `recommenders/models/deeprec/io/sequential_iterator.py`
- `examples/05_operationalize/*`
