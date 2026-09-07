# 合成搜索判定实验

状态：`SYNTHETIC` / `EXPERIMENT_NOT_RUNTIME`。不是正式能力、业务验收、007 或 T6。

产品 `apps/api/src/search-decision.ts` 仍是判定所有者。本目录用固定 SHA-256 + 最小补丁在 `.generated/` 生成诊断副本；产品文件漂移则失败关闭，不会默默对照变化的 main。不进入 `dist` 或正式候选包。

N10（没/未）与 N19（negationMismatch）保持已知失败。通过本工具不等于否定语义完成。

## 命令

在仓库根、Node 24：

```bash
pnpm test:search-decision
pnpm test:search-decision:round1
pnpm test:search-decision:acceptance
pnpm test:search-decision:known-fail
```

- `test:search-decision`：工具自身、接口题、事实诊断、正文陈述边界、S16 限定产品差异、变异门禁。成功为 0。
- `test:search-decision:acceptance`：完整 N 验收。N10/N19 必须导致非零。结果写 `.generated/reports/n-acceptance.json`。
- `test:search-decision:known-fail`：机器可读失败集合恰为 N10/N19 时为 0；任何意外失败使证明失败。
- `test:search-decision:round1`：首轮关闭范围，不含 N10/N19，成功为 0。

不要用日志关键词代替 JSON 集合。

## 边界选择

比较过两种做法：独立复制整份判定模块，或固定产品基线加最小补丁生成诊断副本。采用后者，避免产品第二真源。关系抽取与陈述门在 `relation-polar.ts`；诊断接线只存在于生成副本。
