# 客服 Agent 首版 Demo — 开发任务包

## 1. 目标与边界

在本仓完成一个可运行、可测试、可视觉验收的 Electron 桌面 Demo，验证唯一核心路径：

```text
粘贴客户问题
  → 本地合成 fixture 检索
  → 返回稳定 Top 3 原文话术
  → 坐席人工选择
  → 通过安全 preload IPC 复制
  → 记录本进程内的可证明事实
```

本仓是原型隔离区。它不代表 G0、Ddev、DEV-M0 或正式产品代码已经开始；正式立项与设计文档仓只可作为只读需求参考。

## 2. 本次必须完成

### 2.1 桌面应用

- Electron + React + TypeScript。
- Windows 优先窗口体验，同时能在当前 macOS 上用 `pnpm dev` 运行。
- 默认 520×760；标题使用“客服话术工作台 · Demo”。
- renderer 安全基线：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`。
- preload 只暴露类型化的：
  - `copyText(text): Promise<{ ok: true } | { ok: false; message: string }>`；
  - 可选只读 `getPlatform()`。
- IPC channel 明确白名单；不得暴露 `ipcRenderer.send/on`、文件系统、shell 或任意调用。

### 2.2 搜索纵向切片

- 自建至少 8 条**合成**话术 fixture，覆盖产品、活动、售前、售后四个领域；使用明显虚构的产品名/活动名，不复用正式 Excel 原文。
- 每条最小字段：`scriptId`、`domain`、`questionVariants`、`answerText`、`platform`、`scopeLabel`、`riskLevel`、`effectiveFrom`、`effectiveTo`。
- 实现确定性的本地评分：规范化文本后 exact/substring/token 或 bigram 加权，稳定排序并返回最多 3 条。
- 不命中时不得硬返回低质量候选；进入明确 no-hit 状态。
- 答案展示和复制必须是 fixture 中的原始 `answerText`，搜索不能改写正文。

### 2.3 交互

- 多行输入、清空、搜索、示例问题快速填充。
- `⌘/Ctrl + Enter` 搜索。
- 结果出来后，焦点不在输入控件时按 `1/2/3` 复制对应话术。
- 卡片按钮复制，成功显示 `已复制到剪贴板`。
- 复制失败可见且可重试，不得静默失败。
- 两个视图：`话术浮窗`、`近期记录`。

### 2.4 近期记录的数据边界

- 仅在 renderer 内存保存，重启清空。
- 事件最小字段：时间、脱敏 query preview、结果数量、所选排名或 no-hit、scriptId。
- 不保存完整 answerText、最终发送内容或“是否正确/是否采纳”等推断字段。
- query preview 至少掩码手机号、邮箱，并截断为 32 个字符。

### 2.5 UI 状态

严格实现 `DESIGN.md`：初始、搜索中、Top 3、无命中、复制成功、复制失败、近期记录空/非空。页面始终显示 `DEMO / MOCK AUTH / SYNTHETIC DATA`。

## 3. 建议目录（可做等价微调，但职责要保留）

```text
src/
  main/
    main.ts
    clipboard-ipc.ts
  preload/
    index.ts
    global.d.ts
  shared/
    contracts.ts
  renderer/
    App.tsx
    main.tsx
    features/search/
    features/recent/
    data/synthetic-scripts.ts
    styles/
tests/
  unit/
  component/
  e2e/
```

避免为了形式拆出空包；但搜索、事件事实、IPC 合同和 UI 组件不能全部堆在一个文件。

## 4. 数据流与信任边界

```text
[Renderer input]
      |
      v
[local deterministic search] ---> [synthetic fixture only]
      |
      +--> [Top 3 original answers]
      |
      +--> [in-memory fact events] ---> [Recent view]
      |
      +-- copy request --> [typed preload API] --> [Main clipboard]
```

- renderer 不得直接访问 Node/Electron API。
- fixture 静态打包，不发网络请求。
- 禁止 `localStorage`、IndexedDB、文件落盘或分析 SDK。
- CSP 至少限制 `default-src 'self'`，开发模式如需 Vite 例外应局部、可解释。

## 5. 工具链与脚本

- `packageManager` 锁定 pnpm；提交 `pnpm-lock.yaml`。
- 推荐 electron-vite 或等价的轻量方案。
- 必须提供：
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm test:e2e`（至少 1 个 Electron smoke；若当前环境阻塞，保留测试并给出精确证据）
- 添加 Windows 打包配置与命令 `pnpm package:win`，但本轮不要求在 macOS 产出或签名 Windows 安装包。

## 6. 最低测试矩阵

1. 搜索相同输入结果与排序稳定，最多 3 条。
2. 匹配阈值以下返回 no-hit。
3. exact 命中优先于弱 token/bigram 命中。
4. Top 3 展示的是原始 `answerText`，搜索服务不改写。
5. 手机号、邮箱在 recent preview 中被掩码，长度被截断。
6. recent event 不含完整 answerText、最终发送文本、正确/采纳推断。
7. 复制按钮调用 preload 白名单；成功文案是“已复制到剪贴板”，页面不出现“已发送”。
8. 快捷键 `1/2/3` 在输入框聚焦时不触发复制。
9. no-hit 有明确升级说明，无伪造候选。
10. Electron 启动 smoke：窗口打开、环境徽标可见、输入一次可得到结果并复制。

## 7. 完成定义

- 当前 macOS 使用 Node 24 + pnpm 能安装并运行 Demo。
- lint、typecheck、unit/component test、build 全部实际通过。
- Electron smoke 尽量实际通过；若环境限制，不能把“测试文件存在”写成 PASS。
- 无真实数据、凭证、飞书链接、远端 API、数据库或模型调用。
- README 用中文写清启动命令、Demo 边界、键盘操作、测试命令、Windows 打包现状和下一步。
- 不 commit、不 push。

## 8. 明确不做

- 正式 OAuth/RBAC、PostgreSQL、Fastify 服务、内容导入/发布、Dashboard BI、真实埋点。
- 向量库、Embedding、LLM、自动发送、自动学习或训练。
- 生产签名、自动更新、真实 Windows 安装验收。
- 从正式文档仓复制真实话术正文或任何受控证据。
