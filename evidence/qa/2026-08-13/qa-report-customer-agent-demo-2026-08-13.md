# QA Report — customer-agent-demo

- Date: 2026-08-13
- Mode: full local Electron QA
- Framework: Electron 37 + React 18 + TypeScript 5.9 + Playwright
- Pages/views: search, results, copied, no-hit, recent-empty-after-restart
- Screenshots: 6
- Final health score: **99.7 / 100**

## Summary

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |

Result: **PASS for the isolated local synthetic Demo**. This is not a production, Windows installer, G0, Ddev, or DEV-M0 certification.

## Category scores

| Category | Score |
| --- | ---: |
| Console | 100 |
| Links | 100 |
| Visual | 97 |
| Functional | 100 |
| UX | 100 |
| Performance | 100 |
| Content | 100 |
| Accessibility | 100 |

Weighted score: `99.7`.

## Evidence

- Node 24.19.0 / pnpm 11.19.0 frozen install: PASS.
- ESLint and TypeScript: PASS.
- Vitest: 7 files / 26 tests PASS.
- Real Electron Playwright: 1/1 PASS.
- Production dependency audit against npmjs.org: 0 known vulnerabilities.
- Real main-process clipboard was read and compared byte-for-byte with fixture text, including trailing spaces/newlines; the prior clipboard was restored.
- Electron was closed and relaunched; recent facts were empty after restart.
- 520×760 and 480×640 measurements show the first two cards and both copy actions above the fixed footer.
- Toast appearance/dismissal does not change result-card coordinates or result-pane scroll position.
- Oversized 2001-character input fail-closes before search; 2000 characters are accepted by the length boundary.
- Concurrent search/copy attempts are rejected by synchronous in-flight guards and deferred-promise tests.

## Issue

### ISSUE-001 — Full-width Toast temporarily covers the header

- Severity: Low
- Category: Visual
- Repro: Search, copy the first result, observe the success Toast at the top edge.
- Result: The Toast temporarily covers the product title and offline status, but does not cover either result card or copy action and causes no layout/scroll movement.
- Suggested future refinement: use a shorter top-right Toast in the formal Windows client.
- Evidence: `screenshots/480x640-copied.png`, `screenshots/520x760-copied.png`.

## Top 3 things to fix later

1. Refine the Toast to a shorter top-right overlay.
2. Produce and install the NSIS x64 package on a real Windows test machine.
3. Keep the final reports, baseline, and six synthetic-data screenshots as private QA evidence; keep internal Grok repair prompts local only.

## Console health

No application console error was observed in the acceptance path. Test output contained only Playwright's benign `NO_COLOR` / `FORCE_COLOR` warning.

## Detailed handoff

See `2026-08-13-electron-demo-final-report.md` for security, data-boundary, build-size, command, and scope details.
