# 本机接真飞书登录

本页让 **Mac 开发机** 在不放宽 `127.0.0.1` 绑定的前提下，把点「飞书登录」接到飞书官方授权页。不是办公机交付，也不是打开公网监听。

相关：`apps/api/src/feishu-identity-provider.ts`、[登录与身份设计](plans/2026-09-17-login-identity-design.md)、[登录窗](plans/2026-09-18-login-environment-and-ui.md)。

## 已经具备

- 契约登录链不变：`createLoginRequest` → 系统浏览器打开 `authorize_url` → 飞书回调 **服务端** `/v1/auth/callback` → `exchange` 拿产品会话。
- `AUTH_MODE=feishu` 在配齐 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` / `FEISHU_REDIRECT_URI`（必须是 `https://…/v1/auth/callback`）时可以启动。缺凭据仍拒启。
- API 仍然只绑 `127.0.0.1`。飞书控制台不允许把 `http://127.0.0.1/…` 登记成回调，所以要用 **本机 HTTPS 隧道** 把公网 `https://…/v1/auth/callback` 转到 `http://127.0.0.1:43100/v1/auth/callback`。
- 未知 `open_id` 不会自动建号：`complete_callback` 要求 `subject_bindings` 里已有对应 `binding_id`。

## 你需要准备

1. 飞书开放平台应用：App ID（`cli_…`）、App Secret。
2. 权限：`auth:user.id:read`（取 `open_id`）。
3. 重定向 URL：登记 **精确** `https://<隧道主机>/v1/auth/callback`，与 `feishu.env` 里一致。
4. 允许登录的人的飞书 `open_id`（`ou_…`）。通讯录或开放平台用户信息里能看到。没预置的人登录会 `CAPABILITY_DENIED`。
5. 本机隧道，例如 `cloudflared tunnel --url http://127.0.0.1:43100`（把打印出的 `https://….trycloudflare.com` 配进控制台和 env）。不要让 API 去听 `0.0.0.0`。

不要把 App Secret 发到聊天或写进 git。

## 本机文件

路径：`~/.customer-agent-synthetic-stack/feishu.env`（`chmod 600`）。有这个文件时，`stack.ts start` 把 API 设成 `AUTH_MODE=feishu`，**不再**起合成 identity。

```
AUTH_MODE=feishu
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=你的secret
FEISHU_REDIRECT_URI=https://你的隧道主机/v1/auth/callback
FEISHU_BINDINGS=ou_你的open_id:agent
```

`FEISHU_BINDINGS` 是逗号分隔的 `ou_…:agent|coach|owner`。可多个人。

## 启动顺序

1. 写好 `feishu.env`，隧道已转到 `43100`。
2. **先停** 当前 mock 栈（`node scripts/synthetic-stack/stack.ts stop`），再 `start`。不要叠两套 API。
3. `stack.ts status` 应看到 `AUTH_MODE=feishu` 和 app id，**没有** identity `/health`。
4. 桌面仍用 loopback：`CUSTOMER_AGENT_DESKTOP_API_ORIGIN=http://127.0.0.1:43100`。点「飞书登录」应打开系统浏览器到 `accounts.feishu.cn`。
5. 「账号」段在真飞书模式下没有合成 `/password`，会失败。这是预期。

## 明确不做

- 不把 API 绑到非 loopback
- 不把飞书 token 写入 `product-session.enc` 或 renderer
- 不自动给未知 `open_id` 建号
- 不在默认 `stack start`（没有 `feishu.env`）时打开 feishu 门
