# 搜索候选本地验证（2026-09-07）

> 合成对照与工程链证据。不是 T6、真实验收、泛化通过或一期交付完成。

基线 `main@c61834ba8b45f6009d6239a7ff6c1998fb4ec793`。数据库继续拥有来源/发布/平台/商品/有效期门禁；`apps/api/src/search-decision.ts` 拥有相关性、唯一等长错字修复、确认/断言冲突与 Top3。事件与离线评测仍走同一 `createSearchBackend`。

冻结对照 `docs/acceptance/search-confirmation-v1.json` SHA-256 `49a775f0664ab60fe9be540cf818faa66a850e7eec62adbfa746f6077ab17da8`，与 manifest 绑定一致，未改期望。

| 验证 | 命令与结果 |
| --- | --- |
| 冻结 48 题，两次 | `pnpm --filter @customer-agent/api exec vitest run tests/search-confirmation-v1.test.ts`；两次 exit 0，48/48（27 展示 / 19 拒绝 / 2 澄清）。展示正文为来源完整原文 |
| 合成 G1a 50 题 | `CUSTOMER_AGENT_API_G1A_RUNNER=1 vitest run tests/g1a-synthetic.runner.test.ts`；50/50，`NOT_SIGNED` |
| PG15 搜索 + 事件 | `CUSTOMER_AGENT_API_PG15_INTEGRATION=1 vitest run tests/search-postgres.integration.test.ts tests/event-postgres.integration.test.ts`；两次均 26+9 通过，HTTP `/v1/search` 可回读候选原文。p95 断言 <300ms 通过；40 次混合查询墙钟约 390ms |
| 仓外 55 题 holdout | 冻结后只评估一次，输入 SHA-256 `b79cbd6e870639d0a98070e89b771753106c1536b0fb7b3691797398a42128fe`，37/55（展示 32/32，拒绝 4/21）。已见数据，未据此调参 |

未测：冷启动、真实 412 来源规模、并发、Windows/Linux、真实知识。独立业务/QA 意见与 T6 仍待实际负责人。合并本候选需单独授权。
