# 合成搜索判定实验工具

> 状态：IMPLEMENTATION RECORD · `SYNTHETIC` / `EXPERIMENT_NOT_RUNTIME`。不是正式能力批准、T6 或 runtime 接入。
> 基线：`origin/main@0f9862adfd4a90e5416c1237f0a85c88535c9c2c`。
> 范围：仓内可复现实验/验收工具。不改变 `apps/api/src` 搜索行为。

## 交付

工具源码在 [`apps/api/experiments/search-decision/`](../../apps/api/experiments/search-decision/README.md)。命令：

- `pnpm test:search-decision` — 工具与限定范围，成功 0
- `pnpm test:search-decision:acceptance` — 完整 N 验收，N10/N19 非零
- `pnpm test:search-decision:known-fail` — 已知失败集合证明，成功 0

N10/N19 能力未实现。生成报告不入库。
