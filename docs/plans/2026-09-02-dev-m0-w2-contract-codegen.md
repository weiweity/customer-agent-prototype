# DEV-M0-W2 合同 codegen 与 runtime validation 执行记录

> **文档状态：** `EXECUTION RECORD`
> **切片状态：** `IMPLEMENTED · VERIFIED · COMMITTED LOCALLY · NOT PUSHED`
> **开工输入：** 用户于 2026-09-02 明确给出“DEV-M0 合同开发与 codegen/runtime validation 开工授权”
> **提交输入：** 用户于 2026-09-02 明确给出“产品仓 DEV-M0-W2 提交授权（当前头 6c759c6）”
> **基线：** `origin/main` / `6c759c6b317d9382787dcec200f3e828b7a5007d`
> **分支：** `codex/dev-m0-contract-codegen-validation`

## 1. 本切片边界

W2 只关闭 DEV-M0 的合同编译子项：从已验证且不可变的 OpenAPI 1.11.0 快照生成 TypeScript 类型，并提供可由后续 API / adapter 调用的 component runtime validation。

明确不做：不创建 Fastify host、配置包、DB 包或 migration；不执行 PostgreSQL；不接 renderer/main/preload；不读取真实数据或飞书；不把消费锁改成已激活；不提交、推送、创建 PR、合并或部署。

两个边界方案中采用独立 `packages/contracts`，不把 codegen 继续塞入 intake 脚本。原因是接收器拥有“验证并保存不可变来源”，合同包拥有“编译产品资产并校验进出边界”，两者生命周期和失败恢复不同。

## 2. 实现事实

- `scripts/customer-agent-contract-set.mjs` 继续只负责来源 commit、成员、字节数与 OpenAPI / DDL 双哈希；旧快照未修改。
- `packages/contracts/scripts/generate-contracts.mjs` 每次先调用 intake verifier，再解析 OpenAPI 3.1；外部 `$ref`、版本漂移或生成物字节漂移均失败关闭。
- 生成 `bundle.generated.yaml`、完整 OpenAPI TypeScript 类型、JSON Schema 2020-12 component 文档、provenance 与 codegen manifest；所有产物绑定同一 contract set、来源 SHA、双哈希和精确工具版本。
- 运行时模块在加载时编译全部 132 个 component schema；`validateContractSchema` 返回封闭结果，`parseContractSchema` 在严格边界抛出不携带原始 payload 的类型化错误。
- OpenAPI 的说明、示例、vendor extension 与 discriminator 只作为非验证注解从 runtime schema 中剥离；`oneOf/allOf/const/required/additionalProperties/format` 等验证语义保留。
- 根 `typecheck`、`test`、`build` 已纳入合同包；新增 `contracts:generate`、`contracts:codegen:check` 与 `test:contract`。
- 桌面 main/preload/renderer 没有变化，当前应用仍为合成、无后端模式。

## 3. 当前证据

运行环境：Node.js `v24.19.0`、pnpm `11.19.0`。

| 命令 | 当前结果 |
| --- | --- |
| `pnpm contracts:generate` | PASS；生成 5 类受控产物、132 个 component schema，`runtime_activated=false` |
| `pnpm contracts:codegen:check` | PASS；字节级 `GENERATED_MATCH` |
| `pnpm test:contract` | PASS；1 file / 8 tests，覆盖 closed schema、父链形状、商品上下文、adoption union 与错误脱敏 |
| `pnpm install --frozen-lockfile` | PASS；lockfile 与 package manifests 一致 |
| `pnpm lint` | PASS；合同包与桌面仓统一 lint |
| `pnpm typecheck` | PASS；合同包与桌面包均通过 |
| `pnpm test` | PASS；合同包 1 file / 8 tests，桌面包 51 files / 507 tests |
| `pnpm build` | PASS；合同生成漂移检查、合同编译与 Electron 三入口构建均通过 |
| `pnpm workspace:check` | PASS；workspace 策略通过，受控源文件 6.59 MiB / 32.0 MiB |
| `pnpm contracts:verify` | PASS；来源 commit、成员、字节数与 OpenAPI / DDL 双哈希一致 |
| `git diff --check` | PASS |

本切片没有桌面行为、原生窗口、renderer 或 preload 变化，因此未重复 Electron E2E；没有执行数据库、真实 API、打包、签名、公证、部署或真实数据验证，这些结果不得由本记录推断。

## 4. 尚未关闭

- DEV-M0 的 Fastify 空宿主、config 拒启矩阵、immutable migration、PG15 clean install、ACL、SQLSTATE、N/N-1 与失败回滚仍未开始。
- component validator 尚未接到任何 HTTP 或桌面 adapter；这正是 `runtime_activated=false` 的含义。
- W2 尚未获得推送、PR 或合并授权。
