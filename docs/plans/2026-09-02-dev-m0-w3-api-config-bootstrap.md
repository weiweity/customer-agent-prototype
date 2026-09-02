# DEV-M0-W3 Application API / config bootstrap 执行记录

> **文档状态：** `EXECUTION RECORD`
> **切片状态：** `COMMIT AUTHORIZED · VALIDATED · NOT PUSHED`
> **开工输入：** 用户于 2026-09-02 在 W2 Review、合并、分支清理与“进入下一开发切片”的有序步骤后明确表示“都授权了”
> **提交输入：** 用户于 2026-09-02 明确给出“产品仓 DEV-M0-W3 提交授权（当前头 1a77297）”
> **基线：** `origin/main` / `1a77297d51ce3cf3a0a551290675c60c941be4b6`
> **分支：** `codex/dev-m0-api-config-bootstrap`
> **隔离工作树：** 仓库同级的 `customer-agent-api-config-bootstrap`
> **Git 边界：** W3 本地实现、验证与本次提交已分别授权；不据此推送、创建 PR、合并或部署

## 1. 目标与不变量

W3 只建立正式服务最小可运行骨架：一个拥有启动生命周期的 `apps/api`、一个失败关闭的命名 profile 配置边界，以及合同有效的 `GET /health`。它证明“服务可以安全地不启动”与“受控本机模式可以启动”，不证明任何业务端口或生产依赖已就绪。

保持以下不变量：

- `runtime_activated=false`，不修改合同消费锁。
- 不注册 `/ready`、mock-login 或九业务端口。
- 不创建 DB 包、migration、storage、OAuth、真实 provider 或桌面 adapter。
- 不改 `apps/desktop` 的 main/preload/renderer 行为与合成 fixture。
- 不读取真实飞书、客户数据、凭证、URL 或 token。
- 只允许 loopback；部署型 profile 在监听前拒启。

## 2. 边界方案

| 方案 | 结果 | 原因 |
| --- | --- | --- |
| A：由 `apps/api/src/runtime-config.ts` 拥有当前唯一 API 配置消费者 | **采用** | 一个模块隐藏 profile、auth、bind、port 与错误脱敏；没有额外转发层 |
| B：立即创建 `packages/config` 再由 API 转发 | 不采用 | 当前只有一个消费者，先抽共享包会形成浅模块；等 worker/DB 出现第二个真实消费者再评估 |

## 3. 实现面

- `apps/api/src/runtime-config.ts`：精确 profile/auth/bind/port/version 解析；配置拒启使用稳定 `CONFIG_INVALID`，其它启动故障使用 `STARTUP_FAILED`，两者都不回显输入值或原始异常。
- `apps/api/src/app.ts`：只构造 Fastify 和 `/health`；响应先过 `HealthResponse` runtime validator。
- `apps/api/src/server.ts`：配置先于 Fastify 构造和 socket bind；监听失败保留根错误并关闭半初始化实例；公共包入口只返回 `address/config/close`，不暴露 Fastify 实例或测试 factory。
- `apps/api/src/main.ts`：命令行入口和 SIGINT/SIGTERM 关闭；关闭失败输出脱敏 `SHUTDOWN_FAILED`，不静默吞错。
- `apps/api/tests/`：拒启矩阵、敏感值不回显、未注册路由、Fastify inject、真实 ephemeral loopback 与编译包入口。
- 根 workspace：将 API 纳入 lint/typecheck/test/build、卫生门和精确清理边界。

## 4. 验证

| 命令 | 当前结果 |
| --- | --- |
| `pnpm install --lockfile-only` + `pnpm install --frozen-lockfile` | PASS；Node.js 24.19.0 / pnpm 11.19.0，4 个 workspace package，锁文件与清单一致 |
| `pnpm test:api` | PASS；最终定向复核为 2 files / 13 tests + 1 compiled-package Node smoke；无弃用警告 |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS；contracts、API、desktop 三包 |
| `pnpm test` | PASS；全量运行时 contracts 16、API 11、desktop 508，共 535 个 Vitest tests，另有 2 个 compiled-package Node smoke；最终 Review 新增 2 个 API 失败/关闭边界测试并由 13-test API 套件定向复核，workspace cleanup 的 23-test 文件也单独通过，未重复运行未受影响的其余桌面套件 |
| `pnpm build` | PASS；contracts 生成物匹配，API TypeScript 与 desktop Electron/Vite 均构建成功 |
| `pnpm workspace:check` | PASS；root policy PASS，source budget remainder 7.00 MiB / 32.0 MiB |
| `pnpm contracts:verify` | PASS；`VERIFIED_NOT_ACTIVATED`，`ddev_authorized=false`、`runtime_activated=false` |
| `pnpm contracts:codegen:check` | PASS；132 schemas，`GENERATED_MATCH` |
| `pnpm audit --prod --audit-level high` | PASS；无已知生产依赖漏洞 |
| gstack secret / PII diff scan | REVIEWED；HIGH 0；2 条 MEDIUM 是预期 loopback 文档 URL，1 条是 `pnpm-lock.yaml` 的 SHA-512 integrity 被误识别为钱包地址，均非秘密或业务数据 |
| gstack `/review` | CLEAN；三路 specialist 完成，4 个文档/清理/关闭诊断 finding 与 4 个本地主审 finding 均已 auto-fix，剩余 critical/informational 为 0，quality score 10 |
| `git diff --check` | PASS |
| `pnpm dev:api` + formal-dev 实际进程 | PASS；先构建 contracts/API，只监听 `127.0.0.1:31977`；`GET /health` 为 HTTP 200 + `no-store`，`HEAD /health` 为 404；SIGINT 后无残留 listener |
| production / external bind / invalid version 拒启 | PASS；退出码 1，Fastify 未监听，只输出字段名、稳定 reason 与 Diagnostic |
| 同端口二次启动 | PASS；退出码 1，稳定归一为 `STARTUP_FAILED / listen_address_in_use`，未输出原始异常 |

不运行 Electron E2E、桌面打包、数据库或设备验证；本切片不改变桌面行为，也不存在 DB/生产实现可验。

## 5. 后续切片

W3 本地实现与验证已经完成，本次提交已获单独授权；提交完成后的下一道 Git 门是 W3 推送。W3 落地后，DEV-M0 下一片应建立不可变 migration/DB 深模块：锁定 DDL 来源、提供 `status → plan → apply → verify`、PG15 clean install、ACL/SQLSTATE、N-only/N-1 兼容与失败回滚证据。该后续范围不由本记录自动开工。
