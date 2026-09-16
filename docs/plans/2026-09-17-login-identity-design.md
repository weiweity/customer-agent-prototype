# 登录与身份设计（飞书 + 账号密码）

> **状态：** 设计材料，**不含任何授权**。本文不批准实现、不改上游契约、不动 loopback 红线。
>
> **日期：** 2026-09-17
> **前提（已拍板）：** 办公机 Windows x64；允许出站到受控远端；首轮验完整产品会话链；接受「断网不可用」。
> **相关：** `docs/plans/2026-09-17-office-machine-delivery-path-decision.md`、`TODOS.md` P4。

## 1. 契约已经给了什么

冻结契约 `contracts/upstream/customer-agent/cs-ai-c11-openapi-1.13.0-schema-1.17-0904a0aa11f2/openapi.v1.yaml` **已经定义了一条 provider-agnostic 的登录链**，标签为 `backend-candidate`：

| 路径 | operationId | 作用 |
|---|---|---|
| `POST /v1/auth/login-requests` | `createLoginRequest` | 客户端提交 `client_challenge`（`challenge_method: S256`），服务端返回 `{login_id, authorize_url, expires_at}` |
| `GET /v1/auth/callback` | `receiveProviderCallback` | **服务端**接收身份提供方的回调（`state` 必填，`code`/`error` 二选一），返回一个固定 HTML 完成页，绝不回显提供方输入 |
| `POST /v1/auth/login-requests/{login_id}/exchange` | `exchangeLoginRequest` | 客户端提交 `client_verifier`，换回 `LoginSession{access_token(43 位), token_type:'Bearer', expires_at}`；未就绪返回 `202 LoginPending` |
| `POST /v1/auth/logout` | `logoutSession` | 登出 |

（另有 `POST /v1/auth/mock-login` 与 `GET /v1/auth/me`，是块状写法，所以用 grep 找路径时容易漏掉前四条——第一版核查就漏了。）

**关键性质：`authorize_url` 完全由服务端生成，契约不限制它的域名。** 所以「换成飞书」这件事在契约上是**零改动**的。

契约里同时有三条硬约束：

- `bearerAuth` 描述原文：「产品会话，服务端按数据库当前主体资格认证；**禁止把提供方 token、客户端角色或可本地验签的 JWT 当作产品身份**。」
- `AuthMode = "mock" | "feishu"`（示例用 `user_id: ou_8f5c2a`，即飞书 open_id 形态）。**没有第三个值。**
- `Role = "agent" | "coach" | "owner"`，描述「只允许来自服务端验签后的会话 claims」——客户端不得提交角色。

## 2. 飞书登录：接入点

整条链路的形态是「一个产品会话，两个身份提供方，回调落在服务端，桌面端不做任何重定向接收」。

1. 桌面端已有的 PKCE 式流程可以整段复用（`apps/desktop/src/main/product-session.ts`）：生成 verifier → 算 challenge → `createLoginRequest` → 打开 `authorize_url` → 轮询 `exchange` → 装会话。
2. 服务端把 `authorize_url` 拼成飞书的授权地址。
3. 用户在飞书侧完成认证，飞书回调到**服务端**的 `/v1/auth/callback`（不是 loopback、不是自定义协议）。
4. 服务端用 `client_secret` 调飞书换 `user_access_token`，再取 `open_id`，把 `open_id` 映射成 `subject_bindings.binding_id`，交给既有的 `complete_callback` 落库。
5. 桌面端轮询到 `exchange` 返回 200，拿到的是**服务端签发的不透明产品 token**。飞书 token 只在服务端内存里活到取完 `user_info` 为止。

对应的服务端改造点：把 `apps/api/src/synthetic-identity-provider.ts` 那个提供方适配器换成同一接口（`authorizeUrl` / `exchange` / `close`）的飞书实现。`apps/api/src/product-auth-service.ts:118-132` 的 `callback` 逻辑（`begin_callback` → `provider.exchange(code)` → `complete_callback`）本身与提供方无关，可以复用。

## 3. 必须打开的三道硬编码闸门

这三处是「今天接飞书一定跑不通」的直接原因，**必须一起改**：

1. **`apps/api/src/product-auth-service.ts:153`** —— `auth_mode: 'mock'` 写死。即使数据库里已经按 `provider='feishu'` 绑定，`/v1/auth/me` 仍会谎报 `mock`。
2. **`apps/desktop/src/main/product-session.ts:41`** —— 客户端硬性要求 `value.auth_mode === 'mock'`，否则抛 `ProductHttpError('UNAUTHORIZED')`。**只改服务端不改这里，表现是「登录成功但界面始终未登录」**，而且 `login()` / `restore()` / `status()` 三条路径都会中招。要改成接受 `['mock','feishu']`。
3. **`apps/desktop/src/main/product-login-window.ts:14-15`** —— `loopbackOrigin()` 要求 `http://127.0.0.1:<port>`，白名单是**精确 origin + 精确 pathname**。`https://accounts.feishu.cn/...` 会被直接拒成 `VALIDATION`。

## 4. 桌面端登录窗要从内嵌窗口改成系统浏览器

现在是内嵌 `BrowserWindow`（`product-login-window.ts:22`），并且做了不少加固：独立非持久 partition、权限请求全拒、`onBeforeRequest` 白名单、导航守卫、5 秒超时。

**但这些加固解决不了根本问题。** RFC 8252 §8.12 的原文是 native app **MUST NOT** use embedded user-agents，理由正是：宿主应用能记录用户在第三方登录页里输入的每一个键、能读取会话。加固防的是渲染进程 RCE，防不了这个。

建议改成 `shell.openExternal(authorize_url)`。额外收益：用户多半已有飞书浏览器会话，点一下就好，不用重打密码。

改造时 `shell.openExternal` 之前必须校验（照抄 Electron 安全清单第 13/15 条的形状：`new URL()` 解析后断言 protocol、origin 白名单、无 username/password/hash）。本仓 `allowedLoginUrl` 已经是这个形状，从「允许导航」改成「允许外开」几乎不用重写。**这条校验必须在客户端做**：`authorize_url` 来自服务端响应，而 `product-session.ts:107` 只校验了它是非空字符串，服务端一旦被污染就是一个任意外开原语。

## 5. 账号密码：契约里没有它的位置

- `AuthMode` 只有 `mock | feishu`，加第三个值就是改契约。
- `mock-login` 的请求体只有 `user_id + role`，**没有任何凭据字段**——它不是账号密码登录，不能扩展它的语义来用。

两条路：

- **不做**：首轮只上飞书。办公机是客服日常用机，飞书本身就是这家公司在用的身份源。
- **做，作为 break-glass**：新增一个 additive 端点 + `AuthMode` 新增一个值，服务端校验口令后走与 `exchange()` **完全相同的会话写入路径**，返回同形状的 `LoginSession`。定位是「少量管理员的紧急入口」——不做注册、不做自助重置、使用即告警。**这两处契约变更必须显式走上游确认，不能默默改。**

无论走哪条，「同一人既能飞书登录又能密码登录」都需要把 `subject_bindings` 降级为纯「外部身份/凭据」表、把 `role` 上移到 principal。可参照 Kratos 的 identity/credentials 分离模型、Keycloak 的 federated identity 规则、oneauth 的 User/Identity/Channel 三层设计。**硬规则一条：绝不按 email 自动合并账号**——攻击者可先注册未验证邮箱，等真正的主人用第三方登录时把账号接管走；冲突时必须返回结构化错误、要求先认证再显式绑定。

## 6. 可借鉴的公开实现

| 借鉴什么 | 来源 | 为什么 |
|---|---|---|
| RFC 8252 §8.12 内嵌 UA 禁令原文；§7.3 loopback 规则（用 IP 字面量不用 localhost） | https://www.rfc-editor.org/rfc/rfc8252.html | 把登录窗改成 `shell.openExternal` 的判据原文 |
| OAuth 2.0 Security BCP（RFC 9700）：public client 强制 PKCE、redirect_uri 逐字节精确匹配、禁 ROPC | https://www.rfc-editor.org/rfc/rfc9700.html | 本仓后端计划已引用过 RFC 9700，这是它的落点，可直接当飞书对接的验收清单。注意：本仓的 `client_challenge`/`client_verifier` 是「登录请求与桌面轮询的绑定凭据」，**不是 PKCE**，别混为一谈 |
| 官方 Node/TypeScript SDK，用 `withUserAccessToken` 手动传 user token | https://github.com/larksuite/node-sdk | 省掉手搓飞书 wire format 与错误码映射。**必须用 user token**，不要用它的 tenant token 缓存——tenant token 代表应用身份，与契约的 bearerAuth 禁令直接冲突 |
| 认证状态机与传输通道分成两个独立模块 | https://github.com/desktop/desktop | 本仓 `product-session.ts`（状态机）+ `product-login-window.ts`（交互）已经是这个分层，接飞书时保持住。注意 GitHub Desktop 的本地服务是 git credential helper，**不是** OAuth 回调服务器，别拿它给「知名应用都起 loopback 收 OAuth」背书 |
| 同一提供方实现多种流程并统一接口 | https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/flows.ts | 「飞书为主 + 口令兜底」的结构范本：每种流程独立成模块，对上层暴露同一个接口。抄结构，不抄它的 loopback 收码路径 |
| 官方 native app OAuth 参考实现 | https://github.com/openid/AppAuth-JS | 「为什么必须用系统浏览器」的可引用佐证。顺带说明：本仓「redirect_uri 在服务端、客户端轮询领取」的形态比 AppAuth 的 loopback **更保守**——连本地监听都不需要 |
| identity / credentials 分离模型 | https://github.com/ory/kratos | 「一人多凭据」最贴切的可抄样板，有可读的 schema 参照 |
| 反枚举两条：所有失败分支返回同一状态码同一错误；禁止 quick-exit（用户不存在时也照跑一次同参数哈希） | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | 本仓 `apps/api/src/product-auth-routes.ts:9-22` 的 `sendIdentityFailure` 会把 `failure.reason` 原样写进 `CandidateError.details.reason` 返回，等于告诉客户端「账号是否存在」「是否被停用」。加口令路径前必须先把这里收敛成单一 reason |
| Argon2id 参数档位与 scrypt 下限；或 `node:crypto` 内置 scrypt | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html | 若加口令：Windows x64 上避免原生编译风险是真实收益。scrypt 是 Node 内置、零依赖，参数取 `N=2^17, r=8, p=1` 即满足下限。哈希必须配并发信号量，否则登录端点自己变成 OOM 向量 |
| break-glass 账号的成文实践（≥2 个、凭据离线保存、使用即当安全事件、命名不可预测） | https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access | 口令登录若做，验收标准直接照它逐条映射。**前提也一并抄**：这套控制是为「极罕见使用」设计的，一旦口令账号上到几十个并用于日常登录，全部会被人绕过 |
| safeStorage 迁移期双键并存、后端变化当显式错误 | https://github.com/signalapp/Signal-Desktop/pull/6849 | 本仓 `product-session-store.ts` 已在用 safeStorage 并把 Linux `basic_text` 判为不可用，同一路子。**边界要写清**：Windows 上是 DPAPI，绑定当前 Windows 用户账户——同一用户态的其他进程可解，办公机若多人共用同一个 Windows 登录账号则基本不设防 |

## 7. 已知的坑与硬要求

- **会话 TTL 只有 15 分钟**（`sessions.expires_at <= issued_at + 15 minutes`，契约与 migration 双重限制）。真实办公场景会频繁掉线。放宽属改契约 + 改 migration，要单独决策。
- **不能为「断网续用飞书身份」往会话文件里塞飞书凭据**——`product-session-store.ts` 只存不透明产品 token，这正好与契约禁令一致。
- **飞书 `open_id` 必须先有映射落到 `subject_bindings.binding_id`**，否则 `complete_callback` 会因 `enabled` 校验失败而返回 `CAPABILITY_DENIED`。这是一个运维前置，不是代码问题。
- **登录失败原因必须收敛**：`error.details.reason` 的枚举是封闭的，新增「密码错误」之类 reason 需要改契约；应复用 `LOGIN_INVALID`。
- **`/v1/auth/callback` 由服务端处理**，桌面端不接收任何重定向——这是本设计比 loopback 收码更安全的地方，不要在改造中丢掉。

## 8. 未决问题

1. 账号密码这一半，**做还是不做**？做的话，那两处契约变更（新路径 + `AuthMode` 新增值）谁去走上游确认？
2. 15 分钟会话 TTL 是否放宽？不放宽的话办公机上的实际体验要先测。
3. 飞书应用是企业自建还是商店应用？这决定 `authorize_url` 的具体形态与权限申请路径。
4. `open_id` → `binding_id` 的映射，谁来维护、在哪里维护（运维流程，不是代码）。
