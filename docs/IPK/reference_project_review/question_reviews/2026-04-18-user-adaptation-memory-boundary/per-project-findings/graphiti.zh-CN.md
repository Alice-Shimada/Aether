# graphiti：用户自适应与记忆边界定向复审

> 状态：已完成  
> 直接答案：`更像“把用户偏好纳入统一时间图谱”，而不是单独做用户自适应系统。`

## 0. 证据基础

- 复用旧审阅：`docs/IPK/reference_project_review/graphiti/README.zh-CN.md`、`user-adaptation-system.zh-CN.md`、`memory-system.zh-CN.md`、`code-reading-log.zh-CN.md`
- 本轮补读文档：`reference_project/graphiti/README.md`
- 本轮补读配置/代码：`reference_project/graphiti/mcp_server/config/config.yaml`、`graphiti_core/search/search_utils.py`、`graphiti_core/prompts/summarize_sagas.py`

## 1. 问题轴判断

| 轴 | 判断 | 说明 |
| --- | --- | --- |
| 1. 是否显式区分用户自适应数据与通用记忆数据 | `反证` | `Preference` 只是统一图谱中的一个 entity type，不是独立 subsystem。 |
| 2. 用户偏好是否直接作为 memory 保存 | `有证据` | `config.yaml` 把 `Preference` 列为优先实体类型。 |
| 3. 是否同时吸收用户发言与 AI 输出 | `仍不确定` | 本轮确认了 episode ingestion 与 saga summary，但没有在补读样本里看到明确的 user/assistant 区分策略。 |
| 4. 检索结果是否直接改写 agent 行为 | `反证` | 更像提供事实性上下文与时间关系，而不是单独的行为控制层。 |
| 5. 是否单独提供稳定 profile 层 | `反证` | 没看到类似 profile / summary contract 的稳定用户层。 |
| 6. 是否有防污染机制 | `有证据` | `invalid_at`、episode provenance、`group_id` 隔离都在控制记忆污染和过期事实。 |
| 7. 治理是共用还是分开 | `有证据` | 治理围绕统一图谱做，不按“用户适配 vs 其他记忆”分两套治理。 |

## 2. 本项目对问题的回答

Graphiti 提供的是一种偏理论化的答案：

- 习惯、偏好、关系、事实都可以被视作同一种时间化记忆。
- 没必要单独发明一个用户画像系统，只要图谱能表达来源、时间变化和失效即可。

但它也没有替你解决全部问题，因为：

- 它没有给出像 `user summary` 或 `USER.md` 那样的“稳定行为控制面”。
- 它更擅长回答“事实如何随时间变化”，不擅长回答“哪些用户信息应该始终直接改变说话方式”。

## 3. 对 Aether 的启发或挑战

- 它支持你提出的那句“大理论”：习惯确实可以看成记忆的一种。
- 但它同时提醒 Aether：如果只停在统一记忆图谱，行为层可能还不够稳。
- 所以它更像支持“统一底层事实模型”，而不是支持“只做一个系统就够了”。

## 4. 仍需继续验证

- 官方 agent 集成样例里，graph context 是否会再上提为常驻用户摘要。
- assistant 输出在默认 ingestion 流里是否与 user 内容等权进入长期图谱。
