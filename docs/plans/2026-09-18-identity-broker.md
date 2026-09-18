# 身份代理（方案 B）

> **状态：** 开工。产品只做 RP；飞书与账号都接到同一个 OIDC 代理。  
> **取代：** #129 把合成口令拼进飞书 `exchange` 的补丁路径，不合并为正路。  
> **依据：** NIST SP 800-63C-4（RP 可接多个 IdP）；Logto 官方 Feishu 连接器 + 用户名密码；飞书网页登录是 OAuth，不是产品自建口令。

## 拍板

1. 客服 Agent **不当密码银行、不直连飞书 token 接口**。`createLoginRequest` 的 `authorize_url` 指向代理的 `/oidc/auth`。
2. 代理（本机 Logto）有两个连接：**Feishu 社交**、**用户名密码**。飞书 App ID/Secret 只配在代理里。
3. 飞书控制台的重定向 URL 是 **代理的** `https://<隧道>/callback/<connector_id>`，不是产品 `/v1/auth/callback`。产品回调仍是 loopback：`http://127.0.0.1:43100/v1/auth/callback`。
4. 桌面选择器仍写 **飞书 / 账号**，两颗按钮都 `openExternal` 打开代理授权页（RFC 8252，口令也不嵌在 Electron 里）。
5. 产品用 OIDC `sub` 当 `subject_bindings.binding_id`。未知主体仍 `CAPABILITY_DENIED`。
6. API 仍只绑 `127.0.0.1`。`AUTH_MODE=feishu` 表示本部署接了飞书能力（经代理），不是「每个人都用飞书账号登」。

## 明确不做

- 不把 `synthetic-password` 当外包生产口令
- 不用 `synthetic_` 前缀猜 callback code
- 不放宽 API 非 loopback 监听
- 不改冻结契约加密码 API
- 登录 UI 不写内部/外包
