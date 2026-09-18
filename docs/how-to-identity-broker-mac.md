# 本机身份代理（飞书 + 账号）

产品只做 RP。飞书 App ID/Secret 配在 **Logto**，不配进 API。账号口令也在 Logto 开户，不走合成 `synthetic-password`。

规格：[身份代理](plans/2026-09-18-identity-broker.md)。

## 1. 起 Logto

仓库里：`scripts/identity-broker/docker-compose.yml`。

```bash
docker compose -f scripts/identity-broker/docker-compose.yml up -d
```

管理台默认 `http://127.0.0.1:3002`，OIDC `http://127.0.0.1:3001`。

## 2. 在 Logto 里

1. 创建 **Traditional web** 应用（能存 client secret）。
2. Redirect URI 填 `http://127.0.0.1:43100/v1/auth/callback`。
3. 打开用户名密码登录。
4. 添加 **Feishu** 社交连接器：App ID/Secret 用你在开放平台建的应用。飞书控制台重定向 URL 填 Logto 连接器给出的 `http://127.0.0.1:3001/callback/<connector_id>`。飞书要求 https 时，把隧道打到 **3001**，不是 43100。
5. 给外包开 Logto 用户名密码账号。给内部人用飞书登录。
6. 记下每个用户的 `sub`（用户详情里的 ID），后面写入绑定。

## 3. 产品栈

`~/.customer-agent-synthetic-stack/oidc.env`（`chmod 600`）：

```
AUTH_MODE=feishu
OIDC_ISSUER=http://127.0.0.1:3001/oidc
OIDC_CLIENT_ID=Logto应用的Client ID
OIDC_CLIENT_SECRET=Logto应用的Client secret
OIDC_REDIRECT_URI=http://127.0.0.1:43100/v1/auth/callback
OIDC_BINDINGS=<logto_sub>:agent
```

然后停 mock 栈再 `stack.ts start`。桌面两颗按钮都会打开系统浏览器到 Logto。

## 明确不做

- API 不绑 `0.0.0.0`
- 飞书 token 不进桌面
- 登录窗不写内部/外包
