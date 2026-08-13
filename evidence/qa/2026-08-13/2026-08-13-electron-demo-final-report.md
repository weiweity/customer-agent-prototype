# 客服话术工作台 Electron Demo 最终验收报告

- 日期：2026-08-13
- 范围：本仓独立本地合成 Demo
- 证据等级：本机 Node 24 静态检查、单元/组件测试、真实 Electron E2E、截图视觉测量
- 不代表：正式客服 Agent 产品代码、G0/Ddev/DEV-M0 放行、Windows 安装包、生产安全认证

## 结论

**PASS（独立本地 Demo 可运行、可演示）**。

应用只验证：客户问题 → 本地合成 fixture 检索 → 稳定 Top 3 → 人工选择 → 系统剪贴板原文复制 → 本进程脱敏近期事实。

## 独立实跑

环境：Node `24.19.0`，pnpm `11.19.0`。

| 检查 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS，7 files / 26 tests |
| `pnpm build` | PASS |
| `pnpm test:e2e` | PASS，真实 Electron 1/1 |
| `pnpm audit --prod --audit-level high --registry=https://registry.npmjs.org` | PASS，0 known vulnerabilities |
| `git diff --check` | PASS |

## 关键闭环

- Electron：`contextIsolation=true`、`sandbox=true`、`nodeIntegration=false`；禁止新窗口和导航。
- preload 只暴露类型化 `copyText` 与 `getPlatform`，renderer 无 Node 权限。
- 应用源码无网络请求、数据库、模型、分析 SDK、浏览器/磁盘持久化或 shell。
- fixture 为 10 条显式合成数据，覆盖产品、活动、售前、售后；不含正式 Excel/飞书原文。
- 复制写入系统剪贴板的内容逐字等于 fixture `answerText`，包括尾部空格/换行；E2E 从主进程读取真实系统剪贴板校验，并在结束后恢复原剪贴板。
- 近期记录仅为 React 内存事实；E2E 关闭并重启 Electron 后验证为空。
- 搜索相同输入连续 20 次顺序与分数完全一致，最多 3 条；阈值下明确 no-hit，不伪造候选。
- 搜索和复制均有同步 in-flight guard，连续快捷键/按钮不会并发重入或重复写事实。
- 客户问题上限 2000 字；DOM、UI 入口和搜索服务三层 fail-closed，超限不运行算法、不写近期事实。
- 结果态收敛为单行问题摘要；在 520×760 与 480×640 下，前两张卡的风险、答案摘要与复制入口均完整位于底栏上方。
- Toast 不参与结果列表布局，显示/关闭不改变卡片坐标或 `scrollTop`；关闭后焦点回复制按钮。
- renderer 构建从约 13MB / 451 个资源收敛到约 278KB / 3 个资源，使用系统字体，不联网加载字库。

## 视觉证据

- `screenshots/520x760-results.png`
- `screenshots/520x760-copied.png`
- `screenshots/480x640-results.png`
- `screenshots/480x640-copied.png`
- `screenshots/480x640-recent-after-restart.png`
- `screenshots/480x640-no-hit.png`

## 非阻断观察

1. Toast 为顶部全宽浮层，会短暂覆盖产品标题/离线状态；不遮挡结果和复制入口。正式视觉精修可改为右上角短 Toast。
2. Windows NSIS x64 配置已存在，但未在 Windows 实机生成、安装或签名。
3. 本次验收时尚未 commit/push，也未配置远程仓库；这是验收时点记录，不限制后续经用户明确授权的首次提交。
4. `evidence/qa/2026-08-13/` 中的最终报告、基线和 6 张合成数据截图作为私有仓验收证据保留；`.gstack/` 运行输出和内部返修提示词不纳入版本库。

## 启动

```bash
cd customer-agent-prototype
# 使用 nvm、fnm、Volta 或公司统一工具切换到 Node 24.x
export NODE_OPTIONS=--use-system-ca
pnpm install --frozen-lockfile
pnpm dev
```

若企业 CA 未进入系统信任库，应使用 `NODE_EXTRA_CA_CERTS=/absolute/path/to/company-ca.pem`；禁止关闭 TLS 校验。
