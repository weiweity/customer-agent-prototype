# 飞书 user_info 跳转超时

> **状态：** 已实现（`feat/fix-feishu-userinfo-redirect`）。  
> **不包含：** 改 beian、把打包清单勾成已观察。

## 拍板

1. token / user_info 使用 `redirect: follow`，最终 host 只允许 `open.feishu.cn` 与 `accounts.feishu.cn`。
2. 写 `operator-display-names.json` 失败不得让登录失败。
3. 不在日志里写 token / 授权码。运输失败只记 Error.name / code；`identity provider exchange failed` 只记 reason。
4. 飞书 `code` / `state` 一次性。失败后必须重新点「飞书」，不能刷新 callback URL。
