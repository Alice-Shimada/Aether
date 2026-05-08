# RecBole：项目总览调研

> 状态：首轮正式分析完成  
> 代码库位置：`/home/bzz/Aether/reference_project/RecBole`  
> 阅读日期：`2026-04-18`  
> 主要关注：unified recommendation framework、dataset/config/trainer、sequential/context/knowledge tasks

## 0. 一句话定位

`RecBole` 主要想解决的是：给推荐系统研究者一套统一的数据格式、配置系统、训练评估流程和模型库，让不同推荐算法能在同一框架里复现、比较和扩展。

## 1. 项目自己的核心概念

| 名称 | 在项目里的含义 | 接近 Aether 的什么 |
| --- | --- | --- |
| Config | 统一参数入口 | 统一实验/运行配置 |
| Dataset | 统一数据抽象 | 数据真源层 |
| SequentialDataset | 面向序列推荐的增强数据集 | 短期行为序列层 |
| Trainer | 统一训练与评估器 | 运行管线 |
| General / Sequential / Context / Knowledge | 四类推荐任务 | 不同适配问题类型 |
| history_item_matrix | 用户历史交互矩阵 | 行为历史表示 |

## 2. 主要用户流程

```text
指定 model + dataset + config ->
框架创建 Dataset ->
按评估设置切分 train/valid/test ->
初始化模型与 trainer ->
训练 ->
验证与测试 ->
保存模型、数据集或 dataloader 以复现实验
```

## 3. 主要程序流程

```text
run_recbole() ->
Config() 合并内外部配置 ->
create_dataset() ->
data_preparation() ->
get_model() + get_trainer() ->
trainer.fit() ->
trainer.evaluate()
```

## 4. 关键入口文件

| 文件 | 为什么重要 | 已读状态 |
| --- | --- | --- |
| `README.md` | 项目定位、四类任务、统一框架心智 | read |
| `docs/source/get_started/quick_start.rst` | 官方标准主链路 | read |
| `recbole/quick_start/quick_start.py` | 从配置到训练/测试的真实入口 | read |
| `recbole/config/configurator.py` | 参数合并与默认配置机制 | read |
| `recbole/properties/overall.yaml` | 训练、评估、group_by、split 默认策略 | read |
| `recbole/data/utils.py` | 数据集创建、切分、dataloader 生成 | read |
| `recbole/data/dataset/sequential_dataset.py` | 行为序列增强的核心实现 | read |
| `recbole/data/dataset/dataset.py`（局部） | build/split/history_item_matrix | read |
| `recbole/model/abstract_recommender.py` | 四类推荐模型的统一抽象 | read |
| `recbole/trainer/trainer.py` | 训练与评估控制主链路 | read |

## 5. 正式分析文件

- [x] `user-adaptation-system.zh-CN.md`
- [x] `memory-system.zh-CN.md`

## 6. 初步优点

- 对推荐任务做了很强的统一抽象，便于公平比较。
- 短期序列、长期交互、上下文特征和知识图谱任务都有明确落点。
- 默认配置里就把 split/group_by/eval protocol 这些关键实验约束写明了。

## 7. 初步顾虑

- 它是 benchmark/research framework，不是上线时围绕单个用户持续学习的产品。
- 用户个性化主要体现在数据与参数里，而不是可单独审计的显式记忆层。
- 框架很强，但对终端用户纠错、偏好撤销、隐私治理的讨论不在中心。

## 8. 待继续验证的问题

- `recbole/data/dataset/dataset.py` 还有很多细节值得在复盘阶段继续读。
- `RecBole2.0` 若后续需要，可作为扩展生态再补看。
