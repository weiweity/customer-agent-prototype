# 搜索否定语义修复

> 状态：`APPROVED · SYNTHETIC DEVELOPMENT / TEST ONLY`
> 用户于 2026-09-08 承接“合并 #44，然后修复 N10/N19 与 API 接入”要求开始并继续执行；随后明确允许 Codex 接手实现。沿用已授权阶段的 commit / push / PR；新 PR 合并、真实运行、T6、部署与发布另行授权。
> 起点：#44 合并提交 `1ed7b00b258752c11ac7d034a744b6c247616b0b`。历史 N 验收 21/23、失败 N10/N19，保持不变。

## 所有者与方案

已存在 `SearchBackend → judgeSearch`，无需新增 HTTP 接线。比较两种边界：A 在 API 纯判定模块内统一正文关系抽取与冲突策略，实验只读取诊断；B 将实验 SourceAnnotation/demand 管线接入 API。采用 A，避免未批准的人工来源字段及两套冲突判定。关系模块隐藏正文陈述/引用、否定与论元边界；搜索判定模块继续拥有其他冲突门、相关性和 Top3。

诊断接口只供本地合成测试，公开 API 仍为既有 `hit/no_hit`，不泄漏诊断与人工注解。实验的需求判定继续留在实验；实验澄清不能被称为新增正式 API 澄清协议。

## 实现前冻结的验收

- 原 `fixtures/cases-n.json`、来源及其他冻结题集不修改；23 条业务期望保持原样。
- N10 的“没/未/没有发生”不是正文“不能/不应”的同义事实：仅在同一关系与论元可定位、其他冲突门均通过时返回澄清，不展示候选。
- N19 整体确认句只有正文陈述覆盖同一关系与论元时才豁免对应否定词检查；断言、混合冲突、不同对象/商品、未知附加条件、正文疑问/引语/转述均不借此展示。
- round1 的 `expectedFacts` 保持历史。round2 只更新 N10/N19 的 `compatConflict=false`，新增 N10 `requiresClarification=true`、N19 `requiresClarification=false` 的诊断预期；其他诊断断言保留。
- API 合成验证使用既有候选字段和实际 `SearchBackend`，验证展示完整原文、无结果、来源失败传播、白名单投影及事务/范围门禁。不得依赖实验注解。

```text
合成输入 → 来源/平台/商品/有效期门 → SearchBackend
  → 判定：商品/对象/其他冲突 → 拒绝
         同关系否定确认 + 正文事实 → 完整原文候选
         未发生的关系、语义不足 → 内部澄清，HTTP no_hit
  → Top3 + 公开字段白名单
实验：同一判定诊断 → 仅实验的 demand → 冻结 23 题报告
```

## 验证与交付

先做 N 完整验收、接口 75 题、正文边界及搜索回归，检查实际 CLI 新报告的分母/逐项/汇总和退出码。历史 known-fail 命令明确迁移为当前 acceptance proof；保留缺失、陈旧、截断、重复、意外失败、fixture 绕过和故障注入门禁。判定所有权迁移后必须验证实验与产品纯判定一致、生成模块类型检查及 pin 漂移关闭。

完整运行 lint/typecheck/test/build、workspace/docs 检查及合成 PostgreSQL/SearchBackend 链路。新内容独立复审后交付 PR；生成报告与实验不进入正式候选包。

## 不在本次范围与后续

SourceAnnotation 的正式维护/合同、公开 clarify 协议、真实 owner-t5-007 与业务/QA/T6、正式身份内容链、桌面 adapter、试装及发布都保留后续入口。007 需要准确候选、有效新包窗口和单次运行授权；不重跑已使用的 006。
