# recommenders：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/recommenders`  
> 阅读日期：`2026-04-18`  
> 主要关注：recommendation toolkit、scenarios、user-item affinity、sequential models、evaluation

## 0. 一句话定位

`recommenders` 主要想解决的是：给研究者和工程师一套从数据准备、模型训练、评估到上线实践都比较完整的推荐系统工具箱，而不是一个现成的个体记忆或 agent 自适应产品。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| recommendation scenarios | 业务场景模板，如新闻、零售、游戏 | 用户需求场景分层 |
| user-item affinity | 用户和物品的交互强度 | 偏好信号矩阵 |
| collaborative filtering | 基于群体交互模式的推荐 | 群体行为建模 |
| sequential recommendation | 基于用户行为序列预测下一项 | 短期行为序列建模 |
| evaluation metrics | RMSE、MRR、nDCG 等 | 离线效果评估 |
| operationalize | 推荐系统上线与生产化 | 工程部署层 |

## 2. 主要用户流程

```text
准备用户-物品交互数据与特征 ->
选算法或 notebook 模板 ->
训练模型 ->
离线评估 ->
必要时调参与部署 ->
在线上用模型分数生成 personalized recommendations
```

## 3. 主要程序流程

```text
raw data / scenario data ->
splitters / affinity matrix / dataset utils ->
具体模型 fit() ->
predict / recommend_k_items ->
evaluation metrics ->
notebooks / operationalization examples
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 项目定位、任务全景、算法覆盖面 | read |
| `scenarios/README.md` | 说明它先从业务场景出发，而不只是模型出发 | read |
| `scenarios/news/README.md` | 最能体现“用户兴趣 + 内容冷启动 +生产指标”心智 | read |
| `recommenders/models/sar/sar_singlenode.py` | 典型个性化推荐主链路：user affinity + item similarity | read |
| `recommenders/models/sasrec/model.py` | 典型序列推荐主链路，体现短期行为序列 | read |
| `recommenders/datasets/sparse.py` | affinity matrix 真源表示 | read |
| `recommenders/datasets/python_splitters.py` | 按用户局部比例切分训练/测试 | read |
| `recommenders/evaluation/python_evaluation.py` | 离线评估与预测对齐方式 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 很诚实地把“推荐系统”拆成场景、数据、模型、评估、上线，而不是只吹一个算法。
- 用户适配在这里不是 prompt tricks，而是围绕用户交互历史、内容特征和上下文的统计学习。
- 对顺序行为、冷启动、业务指标这些真实问题都有比较明确的讨论。

## 7. 初步顾虑

- 它不是统一运行时框架，更像大型算法与 notebook 集合，治理边界较松。
- 用户建模很强，但用户可审计、更正、删除的产品层闭环不强。
- 所谓“memory”更多是训练特征和矩阵表示，不是独立记忆子系统。

## 8. 待继续验证的问题

- `recommenders/models/newsrec/*` 可在后续专题里补读。
- `examples/05_operationalize/*` 值得在“上线后的反馈闭环”阶段继续看。
