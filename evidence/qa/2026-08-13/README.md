# 2026-08-13 Demo 验收证据

本目录冻结首版本地合成 Demo 的验收结果，供私有仓复核：

- `2026-08-13-electron-demo-final-report.md`：范围、安全边界、实跑命令和结论；
- `qa-report-customer-agent-demo-2026-08-13.md`：视觉与交互 QA 汇总；
- `baseline.json`：机器可读的分数与遗留项；
- `screenshots/`：520×760 与 480×640 的 6 张合成数据界面截图。

这些证据只证明独立本地 Demo，不证明正式产品、DEV-M0、Windows 安装包或生产安全认证。

日常 `pnpm test:e2e` 的最新截图仍写入被 Git 忽略的 `.gstack/qa-reports/screenshots/`。只有需要冻结新的验收基线时，才应在明确复核后更新本目录。
