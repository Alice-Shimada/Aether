# 阶段 6：基线验收与收尾加固

## 目标

把前面几阶段的实现拿基线样例真正压一遍，确认它不是“能跑”，而是“行为没有明显跑偏”。

本阶段必须以 [ipk-content-system-baseline-fixtures.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-baseline-fixtures.zh-CN.md) 为最低验收标准。

## 必做项

### 1. 准备最小样例库

尽量接近 baseline 文档要求：

- 12 到 18 条 piece
- 至少 3 个主题簇
- 至少 2 条弱桥接 piece
- 至少 2 条干扰 piece
- 至少 2 条中英混合术语 piece
- 至少 1 条二次编辑 piece

### 2. 覆盖下面 11 条基线

必须逐条过：

1. 消息选择到 review
2. 改进循环
3. 暂存与重新打开
4. 入库与派生索引更新
5. 搜索准确且尽量完整
6. 联想广泛但可控
7. 中英混合检索
8. 已入库 piece 的再次编辑
9. 普通总结默认新建 piece
10. 受控词表归一
11. 低相关问题的保守行为

### 3. 确认几个硬约束没有被破坏

必须再次检查：

- 没有 `type: project`
- 没有普通问答自动接入
- 没有自动并入旧 piece
- 没有回写旧 piece 的 `links.json`
- 没有把正式真源改成数据库
- 没有把前端依赖绑死到磁盘文件结构

### 4. 完成最小工程验证

至少执行：

1. 在 [packages/opencode](/home/bzz/Aether/packages/opencode) 运行 `bun typecheck`
2. 在 [packages/app](/home/bzz/Aether/packages/app) 运行 `bun typecheck`

如果实现过程中补了测试，也要用包目录运行，而不是仓库根目录。

## 交付时必须说明

新的 AI 最终提交时，必须明确告诉用户：

- 哪些基线已通过
- 哪些基线还存在风险
- 哪些点属于 [ipk-content-system-open-questions.zh-CN.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-open-questions.zh-CN.md) 中允许保留的开放项

## 结束标准

只有同时满足下面几条，才能视为 `IPK v1` 基本完成：

- 主流程可用
- 暂存与重开可用
- 编辑已有 piece 可用
- commit/reindex 可用
- 搜索/联想可用
- 基线样例大体通过
- 没有越界实现延期项
