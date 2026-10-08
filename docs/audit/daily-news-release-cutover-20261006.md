# Formal daily news release cutover — 2026-10-06

STATUS: DAILY_DEPLOYED

The user explicitly authorized final closeout and formal3000 switch after the parent issued the save-edits notice. Only the project's identified3000 processes were replaced. The final previously verified build release-20261006T152431Z-e439c607 passed exact source/artifact validation, including package/lock state. An isolated temporary3001 instance with the existing daily configuration and news timer disabled passed configuration/database/storage readiness before the actual switch.

## Results

Production3000 is running on127.0.0.1, PID15720 / launcher24596. Readiness200, login200, anonymous news401, anonymous research307. The existing user browser session displayed both formal news and official October6 daily; no password or authentication token was read or substituted.

Before/after read-only original DB counts:27 users,44 projects,32 source items,31 source assets,2 research sessions,6 research runs,1 object preference,3 auth sessions. Migration count62 unchanged. Exactly one active system administrator is the authorized local account;26 other accounts disabled and no other enabled account. No migration, owner/schema or credential/account mutation occurred.

OriginalMinIO9000:157 objects /361723106 bytes fully read and SHA256-compared before/after, all unchanged. The original volume was not replaced.

Daily public cache:109 records,168 official dates and2026-10-06 report. It was bootstrapped from the anonymous authorized source; no review database, preferences, session or cache snapshot was imported. One transient daily-fetch timeout recovered via scheduled backoff. Last successful sync2026-10-06T16:13:37.530Z; next due2026-10-06T17:13:37.530Z. Controlled same-build restart kept cache bytes, mtime and due time identical. Dedicated public news permission persists in the approved daily launcher; generic external calls/Worker/system providers/signup remain disabled.

## Startup conflict and retained environments

The first production launch stopped at RELEASE_RUNTIME_LOCK_EXISTS because3030 held the same artifact's live single-instance lock. Under the explicit conflict exception, only the verified3030 owner was stopped; its normal exit released the lock. No active lock was deleted or guard disabled.3030 is now stopped; its artifact, review DB and cache remain preserved.3040 and personal4175/4176/18820 remain running, untouched. Temporary3001 was stopped after preflight.

## Recovery and evidence

Protected configuration/database backups are in D:\Documents\ChatGPT\内容生产中心-integration\output\research-news-private\daily-cutover-20261006. The latest dump's inventory was readable (754 entries). A dump represents its consistent snapshot time and must not overwrite later writes. Service rollback is to the former development startup mode with the existing configuration, without database or attachment restoration; see the explicit operational steps in E:/codex1/2026-10-04/task-4/daily-news-cutover-20261006/FINAL.md.

Evidence: E:/codex1/2026-10-04/task-4/daily-news-cutover-20261006/FINAL-EVIDENCE.json. Actual formal browser captures: formal-news-user-browser.png and formal-daily-user-browser.png in that directory. The prior final build,34 related tests,17 browser acceptance groups, typecheck and lint passed. No long future-hour observation, cloud/serverless operation or reference-image fidelity claim is made.

HEAD ae3ff0879029394cec99ccb2f00d012e1e8a52ed and dirty work are protected. No Git staging/commit/push, cloud deployment, new OS autostart, paid-model calls or broader collectors. A rejected attempt to output old private helper scripts was abandoned; existing validated launchers and non-secret metadata supplied the required checks instead.
