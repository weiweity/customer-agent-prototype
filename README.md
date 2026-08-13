# 客服话术工作台 · Demo

独立本地原型，只验证坐席主链：

`粘贴客户问题 → 本地合成 fixture 检索 → Top 3 原文 → 人工选择 → 安全复制`

这不是正式产品仓，也不是 `DEV-M0` 的开始。

## 仓库与工作台

- 本目录应作为独立 Git 仓和独立 Codex 工作台打开，不与正式立项文档仓混在同一个工作台。
- 首次提交后，`codex/customer-agent-demo` 才会成为可正常浏览、切换的实际分支；首次提交前 Git 只会显示 unborn branch。
- 建议先使用公司 Git 平台的私有仓；在公司平台和权限方案确定前，不推送到公开仓。
- 首次提交保留 `evidence/qa/2026-08-13/` 下的最终 QA 报告与 6 张合成数据截图，排除内部返修提示词、依赖、构建产物和测试临时目录。

## 启动

需要 **Node.js 24.x** 与 **pnpm**。仓内 `.nvmrc` 为 `24`。pnpm 11 已在 `pnpm-workspace.yaml` 批准 `electron` / `esbuild` / `electron-winstaller` 的构建脚本。

默认安装：

```bash
cd customer-agent-prototype
export NODE_OPTIONS=--use-system-ca
pnpm install --frozen-lockfile
pnpm dev
```

若企业根证书不在系统信任库，改为显式指定绝对路径，例如：

```bash
export NODE_EXTRA_CA_CERTS=/absolute/path/to/company-ca.pem
pnpm install --frozen-lockfile
```

禁止关闭 TLS 验证，不要设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`。证书问题只应用系统 CA 或额外企业 CA 解决。应用运行时不访问网络。

窗口标题为「客服话术工作台 · Demo」，默认尺寸 `520 × 760`。请用上述命令启动 Electron，不要只用浏览器打开 renderer。

## Demo 边界

- 只使用仓内合成话术，不读取飞书、Excel、客户数据、凭证或 token。
- 不接 PostgreSQL、OAuth、外部模型、线上 API、埋点或自动学习。
- renderer 无 Node 权限；复制只能走 preload 白名单 IPC。
- 复制成功只表示「已复制到剪贴板」，不表示已发送、已采纳或回答正确。
- 近期记录只留在本次进程内存，重启即清空。
- 字体使用系统回退栈，不联网加载。
- 客户问题最多 2000 字；超长输入会 fail-closed，不检索、不写近期记录。

页面会持续显示 `DEMO` / `MOCK AUTH` / `SYNTHETIC DATA`。

## 键盘操作

| 操作 | 快捷键 |
| --- | --- |
| 查找话术 | `⌘/Ctrl + Enter` |
| 复制第 1/2/3 条 | `1` / `2` / `3`（仅结果视图，且焦点不在输入框、按钮、链接等交互控件） |
| 关闭临时提示 | `Esc`（不会清空输入，也不改变结果列表滚动） |

主按钮文案是「查找话术」。结果态输入区会收成「当前问题」摘要，可用「修改问题 / 重新查找」回到编辑并保留原文。每张结果卡都有「复制话术」，默认展示关键摘要，可展开阅读全文；复制始终是完整原文。

## 测试命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` 覆盖检索稳定性、阈值、原文不改写、脱敏截断、复制文案和快捷键边界。`pnpm test:e2e` 会先 build，再启动 Electron：读取系统剪贴板、验证重启后近期记录清空，并在本机忽略的 `.gstack/qa-reports/screenshots/` 下生成最新截图。首次验收的冻结证据位于 `evidence/qa/2026-08-13/`。

## Windows 打包现状

已配置 `pnpm package:win`（electron-builder NSIS，x64）。本轮只在 macOS 上开发验证，**未产出也未验收** Windows 安装包或签名。

## 下一步（不在本 Demo）

正式 OAuth / RBAC、PostgreSQL、内容导入发布、真实飞书源、向量检索、LLM、自动发送、自动学习和生产签名更新都不在本仓范围。
