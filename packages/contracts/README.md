# `@customer-agent/contracts`

本包只负责把已经通过 `contracts:intake` 验证的不可变 OpenAPI 快照编译为三个产品仓资产：

- `openapi/bundle.generated.yaml`：确定性 bundle；
- `src/generated/openapi.generated.ts`：编译期 TypeScript 类型；
- `src/generated/runtime-schema.generated.ts`：不读取 YAML 的 JSON Schema 2020-12 运行时校验输入。

`src/runtime.ts` 提供封闭的 component schema 校验 API。校验失败只返回路径、关键字和合同消息，不回显被校验数据。

```bash
pnpm contracts:verify
pnpm contracts:generate
pnpm contracts:codegen:check
pnpm test:contract
```

生成物只能由 `scripts/generate-contracts.mjs` 更新，禁止手改。本包没有 HTTP 服务、数据库、renderer 接线或真实数据；当前消费锁继续保持 `VERIFIED_NOT_ACTIVATED`、`runtime_activated=false`。生成校验器不等于正式 runtime 已激活，也不构成 DEV-M0 全部退出证据。
