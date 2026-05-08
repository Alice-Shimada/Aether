# recommenders：代码阅读日志

> 状态：首轮主链路已阅读  
> 项目路径：`/home/bzz/Aether/reference_project/recommenders`

## 1. 本轮阅读目标

- 判断它的“用户自适应”到底是指什么，是不是和 Aether 这种对话系统是同一种问题。
- 判断它有没有独立的记忆系统，还是只有数据集、矩阵和序列特征。
- 找到它在项目视角下最核心的主链路，而不是淹没在大量 notebook 里。

## 2. 已阅读文件

### 2.1 项目定位与场景

- `README.md`
- `scenarios/README.md`
- `scenarios/news/README.md`

### 2.2 代表性模型

- `recommenders/models/sar/sar_singlenode.py`
- `recommenders/models/sasrec/model.py`

### 2.3 数据与切分

- `recommenders/datasets/sparse.py`
- `recommenders/datasets/python_splitters.py`

### 2.4 评估

- `recommenders/evaluation/python_evaluation.py`

## 3. 当前确认的关键事实

| 类型 | 位置 | 结论 |
| --- | --- | --- |
| 文档证据 | `README.md` | 项目是 recommendation systems toolkit，覆盖 data/model/evaluate/operationalize。 |
| 文档证据 | `scenarios/news/README.md` | 个性化在这里主要指根据阅读历史、内容特征和生产指标做推荐。 |
| 代码证据 | `models/sar/sar_singlenode.py` | 个性化推荐被实现为 user affinity + item similarity 的组合。 |
| 代码证据 | `models/sasrec/model.py` | 序列推荐把用户最近行为序列当成关键输入。 |
| 代码证据 | `datasets/sparse.py` | 核心数据表示之一是 user-item affinity matrix。 |
| 代码证据 | `datasets/python_splitters.py` | 数据切分强调按用户局部比例保持交互分布。 |
| 代码证据 | `evaluation/python_evaluation.py` | 项目把推荐结果是否有效主要放在离线指标比较上。 |
| 推断 | 基于整体结构 | 这里的“用户自适应”本质是统计推荐与排序，不是会话式 agent 的在线用户建模。 |

## 4. 当前未深读区域

- `recommenders/models/newsrec/*`
- `recommenders/models/deeprec/*`
- `examples/*`
- `examples/05_operationalize/*`

这些区域会影响进一步判断：

- 更复杂模型怎样利用用户序列与上下文；
- 生产环境里如何接收在线反馈；
- 冷启动和实时更新是否有更具体的工程策略。

## 5. 目前最重要的判断

- 这是推荐系统研究与工程 toolkit，不是 agent memory 产品。
- 它确实非常重视用户个性化，但个性化的载体是交互数据和模型参数，不是显式用户记忆。
- 这里所谓“history”通常是训练特征或序列输入，而不是可直接审计的长期记忆层。
