# Gate summary — Ocean restoration

GATE_SUMMARY_COMPLETE

Generated from recorded evidence at 2026-11-01T01:03:41.458Z. No tests are executed by this summary script.

| Gate | Result | Scope | Evidence |
|---|---|---|---|
| unit | PASS | 128/128; 19 files | [evidence](../../artifacts/ocean-restore/unit-results.json) |
| typecheck | PASS | exit 0 | [evidence](../../artifacts/ocean-restore/typecheck.log) |
| build | PASS | Some chunks >500 kB | [evidence](../../artifacts/ocean-restore/build.log) |
| test:ui | PASS | 10 groups | [evidence](../../artifacts/ocean-restore/flow/results.json) |
| test:ui:edges | PASS | 8 groups | [evidence](../../artifacts/ocean-restore/edges/results.json) |
| test:ui:followup | PASS | 119 role/page visits | [evidence](../../artifacts/ocean-restore/menu-results.json) |
| test:ui:login | PASS | 5 roles × 2 activation modes; reload and logout persisted | [evidence](../../artifacts/ocean-restore/login/ui-login-results.json) |

Additional browser check: **unified Chrome login FAIL**, [raw evidence](../../artifacts/ocean-restore/login-investigation/final-script-chrome/ui-login-results.json). This is an open runner limitation, not a PASS of that browser mode. The required login gate above uses shell.

Application/config files are byte-identical to the prior 31/10–01/11 restoration gates. Only login/browser test scripts changed; the login gate was rerun on those changes. The new summary script reads evidence only. Typecheck/build exit codes come from the preserved [prior verification record](../../artifacts/ocean-restore/login-investigation/prior-verification-summary.json), with raw logs linked above.

Source manifest: [source-manifest.json](../../artifacts/ocean-restore/source-manifest.json); SHA256 **06bd3a8a9f72ed6e3fd978745cb7d2f9ae45f9b193032e794a633d2ea83a99ee**. Application SHA256: **cfef42dacec5fb201abdf3779e98cb2e0f693074e8dcda2e896ba18df7668af3**. Evidence HEAD c52cf87 is the backup parent, not the restoration commit. The containing Git commit and remote branch identify this packaged result.

## Login investigation

The original timeout was reproduced with unified Chrome/156.0.8078.47 on Windows. Trusted key/click events did not reach the logout button after reload. Focus alone, password-bubble flags, fresh pages/browsers and larger virtual screens did not resolve it. A DOM-click probe exercised the application handler only; it is explicitly diagnostic and is never counted as UAT acceptance.

The same native-input probe on the already-installed chrome-headless-shell delivered trusted keyboard/click events and removed the session. Login UAT now selects that supported Puppeteer mode and waits for actual DOM/session outcomes. All five roles run sequentially on one browser/page, with pointer and keyboard logout, including signed-out reload. All failed runs remain unchanged in login-investigation. Exact internal Chromium cause is not established; unified-headless coverage remains a runner limitation. See [investigation](LOGIN_UAT_INVESTIGATION.md).

## Open issues and limits

- Bundle warning >500 kB; Linux build and real backend/platform/payment integrations not run.
- Full Maker/Checker manual payout, exchange/warranty, every advanced-module action and mobile form are not accepted by these tests.
- Browser claim-paid compensation selection and multi-tab/DB concurrency remain unverified.
- Finance/Viewer remain disabled from the prior backup; CS has no role definition. Proposals only: [role review](OCEAN_ROLE_REVIEW.md).
- Some original analytics remain illustrative prototype data.

Git-normalized source hash: **b477c9377252afebc2d8df31af4cb5510528617ce844614eba968c8163d32884**; each manifest entry also contains its Git blob ID for independent verification across LF/CRLF checkouts.

## Review app

Server: http://127.0.0.1:5174/app. Six original screens: dashboard, fulfillment, returns, syncMonitor, marketingAnalytics, auditTrail. See [before/after gallery](../../artifacts/ocean-restore/comparison.html). No layout/function expansion was made during gate/login closure. Publication is restricted to codex/restore-ocean-role-flows; no main merge or deployment.
