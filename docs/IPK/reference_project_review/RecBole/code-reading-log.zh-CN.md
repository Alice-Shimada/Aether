# RecBole：代码阅读日志

> 状态：首轮主链路已阅读  
> 项目路径：`/home/bzz/Aether/reference_project/RecBole`

## 1. 本轮阅读目标

- 判断它的“用户自适应”是不是推荐框架意义上的用户建模。
- 判断它有没有独立记忆系统，还是只有历史交互矩阵和序列增强。
- 先抓主链路：配置、数据、训练、评估。

## 2. 已阅读文件

### 2.1 项目定位

- `README.md`
- `docs/source/get_started/quick_start.rst`

### 2.2 运行主链路

- `recbole/quick_start/quick_start.py`
- `recbole/config/configurator.py`
- `recbole/trainer/trainer.py`
- `recbole/properties/overall.yaml`

### 2.3 数据与历史表示

- `recbole/data/utils.py`
- `recbole/data/dataset/sequential_dataset.py`
- `recbole/data/dataset/dataset.py`（`build`、`history_item_matrix` 局部）

### 2.4 模型抽象

- `recbole/model/abstract_recommender.py`

## 3. 当前确认的关键事实

| 类型 | 位置 | 结论 |
| --- | --- | --- |
| 文档证据 | `README.md` | RecBole 是统一、全面、面向研究的推荐框架。 |
| 代码证据 | `quick_start/quick_start.py` | `run_recbole()` 负责完整训练测试流程。 |
| 代码证据 | `config/configurator.py` | 配置优先级和内部默认参数是框架核心。 |
| 代码证据 | `data/utils.py` | 数据集创建、切分、采样器和 dataloader 统一由框架控制。 |
| 代码证据 | `data/dataset/sequential_dataset.py` | 序列推荐靠数据增强把用户历史序列展开成监督样本。 |
| 代码证据 | `data/dataset/dataset.py` | 支持 `history_item_matrix()`、按用户 group_by 的 split、time-based split。 |
| 代码证据 | `model/abstract_recommender.py` | General / Sequential / Context / Knowledge 四类模型各有统一抽象。 |
| 代码证据 | `trainer/trainer.py` | 训练、早停、验证、测试是标准化流程。 |
| 推断 | 基于框架结构 | 用户适配在这里是“利用用户历史进行推荐”的研究问题，不是对话式长期画像管理问题。 |

## 4. 当前未深读区域

- 具体模型实现文件（如 `BPR`、`SASRec` 等）的大量细节
- `sampler/sampler.py`
- 评估器与 collector 细节
- `RecBole2.0` 扩展生态

## 5. 目前最重要的判断

- 这是推荐 benchmark framework，不是通用 agent framework。
- 它对“用户历史”的使用很强，但主要体现在数据结构、采样、训练与评估协议里。
- 所谓“记忆”在这里更像数据表示和统计压缩，不是独立 subsystem。
