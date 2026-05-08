# RecBole：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`它进一步支持“用户适应 ≠ 对话记忆”；很多个性化结构其实沉在数据格式、序列建模和模型参数里。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/RecBole/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/RecBole/README.md`、`docs/source/get_started/quick_start.rst`
- 本轮补读代码/配置：`reference_project/RecBole/recbole/model/abstract_recommender.py`、`recbole/data/dataset/dataset.py`、`data/dataset/sequential_dataset.py`、`docs/source/user_guide/model/sequential/*.rst`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `反证` | 它不是 agent 产品，核心是推荐数据与模型框架。 |
| 2. 用户偏好是否直接作为 memory 保存 | `反证` | 用户偏好被编码进 `history_item_matrix`、embedding、序列特征与上下文特征。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `反证` | 不涉及 user-assistant 对话。 |
| 4. 检索结果是否直接改写 agent 行为 | `反证` | 适配来自预测分数与排序，不是通过 memory recall 改变说话方式。 |
| 5. 是否单独提供稳定 profile 层 | `反证` | 没有 agent 风格 profile 结构。 |
| 6. 是否有防污染机制 | `有证据` | sequential、context-aware、knowledge-based 等模型类型天然在区分不同信息来源。 |
| 7. 治理是共用还是分开 | `无证据` | 重点不在用户可审计治理。 |

## 2. 本项目对问题的回答

RecBole 比 Recommenders 更像一个研究框架型反证：

- 它不断提醒“长期偏好”“短期序列”“上下文特征”“知识增强”最好分型建模。
- 这和“把所有用户信息记成一层 profile 或一层 memory”是两种完全不同的思路。

所以它对你的问题的启发是：

- 即使习惯可以被视作一种记忆，也不代表实现上应该只保留一个统一对象。
- 有时更合理的是把不同时间尺度、不同来源的信息分型处理。

## 3. 对 Aether 的启发或挑战

- 对 Aether 来说，RecBole 不是实现模板，而是建模提醒：
  - 长期习惯；
  - 最近状态；
  - 上下文条件；
  - 一般事实；
  很可能不该压成同一种记忆。

## 4. 仍需继续验证

- 无本轮关键阻塞点；其结论已足够稳定。
