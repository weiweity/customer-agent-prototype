# TODOS

> **复核：** 2026-09-10。四项 P3 窄分支已在 `codex/macos-p3-narrow-tests` 补齐自动化覆盖；它们仍属于 Menokin `PILOT-S0` 合成基线验证，不构成 G0 / Ddev 或正式 DEV-M0 授权。登录残留红字由独立切片处理。

## Follow-up

### Login residual invalid banner

**What:** After a successful synthetic login, Query still shows a residual red invalid-style prompt (user-reported 「合成登录…」). `sessionAction` in `apps/desktop/src/renderer/QueryApp.tsx` currently sets `invalidMessage` to 「合成登录成功，请确认平台和商品后查询」 on success. Register only; do not fix in this test-coverage PR.

**Why:** Login success should not reuse the invalid/error banner. Independent of D1–D5 closeout and of Windows packaging.

**Context:** User-reported during the Mac synthetic observation. Not a Windows-device finding. Tracked in `codex/macos-m2-login-status`.

**Effort:** S
**Priority:** P3
**Depends on:** None
**Status:** OPEN

## Completed

### Cover the unavailable WindowContext branch

**What:** Handler-level test for `GET_WINDOW_CONTEXT` when the overlay controller is unavailable.

**Why:** Preserve the typed fail-closed response at the Main IPC boundary.

**Context:** Added in `apps/desktop/tests/unit/overlay-ipc-handlers.test.ts` next to the trusted and untrusted sender cases.

**Effort:** S
**Priority:** P3
**Status:** DONE

### Cover a rejected renderer WindowContext request

**What:** Query component test in which `getWindowContext()` rejects and the manual search interaction remains usable.

**Why:** Prove renderer startup degrades safely when the context request itself fails.

**Context:** Added in `apps/desktop/tests/component/QueryApp.test.tsx`.

**Effort:** S
**Priority:** P3
**Status:** DONE

### Cover simultaneous shortcut and error banners

**What:** Query layout test for the shortcut warning and the `ERROR` result banner being visible together.

**Why:** Lock the shared banner measurement owner against future height-accounting drift.

**Context:** Reused the EMPTY layout fixture in `apps/desktop/tests/component/QueryApp.test.tsx` with a copy-failure ERROR result.

**Effort:** S
**Priority:** P3
**Status:** DONE

### Cover the test harness without a Fox window

**What:** Unit test for `attachTestHarness()` when no Fox `BrowserWindow` is present.

**Why:** Keep the optional E2E provenance helper fail-closed without expanding production behavior.

**Context:** Added in `apps/desktop/tests/unit/overlay-test-harness.test.ts` with a fake Main-process fixture.

**Effort:** S
**Priority:** P3
**Status:** DONE
