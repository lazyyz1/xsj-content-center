> Current status as of 2026-10-06T16:23:06.017Z: DAILY_DEPLOYED at http://localhost:3000/research, build release-20261006T152431Z-e439c607. Formal cutover evidence: [daily-news-release-cutover-20261006.md](daily-news-release-cutover-20261006.md). The earlier pending-switch statements below are historical checkpoints.3030 is stopped due to the artifact's single-instance lock; data/build/cache retained.

# News reading interactions and workbench layout

STATUS: READY_FOR_REVIEW_AND_DAILY_SAVE_NOTICE

This task implements the user's approved written layout and interaction specification as an original workbench design. The Windows agent has not seen the unavailable AIHOT reference pixels. The one newly authorized original-site visit returned HTTP567, and no workaround, repeated reference download or pixel-fidelity claim is used.

## Changes

Existing ResearchNews component and local stylesheet only: submitted search, URL persistence for keyword/category/source/range/view/sort/mode/edition, newest/oldest sorting, removable keyword/category/source conditions, native mobile filtering dialog with Escape/Tab/focus return, existing detail dialog with recorded scroll and focus restoration.

News uses one column, date groups, a modest desktop time track, compact title/summary/source controls, and mobile separators. No invented hot score, reason or article body is added. Daily reading uses actual report dates, generated timestamps, official windows, actual section counts, a real section directory, adjacent indexed editions and grouped-month history. A 224px history rail appears only when the news content container has at least1040px, leaving at least680px for reading; otherwise actual recent dates and an expandable history control remain. Workbench navigation and global styling are unchanged.

Daily lead/summary and detail summaries reuse installed ReactMarkdown/remark-gfm, skip HTML, do not load remote images, and permit credential-free HTTPS links only. Source attribution and original links remain visible.

Existing runtime now rejects ambiguous cache fallback without a known local profile and rejects relative explicit roots. A secret-free portability document describes persistent directories, process timer requirements, local-host lock limits and packaging exclusions.

## Verification checkpoint

Web typecheck PASS. Targeted ESLint PASS. Five related test files /34 tests PASS, including existing research API/session regression and two new cache-root checks. Production build is in progress. Browser and visual verification will be recorded after the candidate is available; they are not claimed complete here.

## Boundary

Original3000 PID68104 is not restarted or switched. Original databases, accounts, passwords, sessions, attachments and model/collector settings are not modified. AIHOT's previously approved narrow hourly permission remains unchanged, and the current pause control is preserved. All writable browser fixtures use isolated55436 and must be cleaned. No Git staging, commit or push.


## Final acceptance 2026-10-06T15:31:54.190Z

Final candidate release-20261006T152431Z-e439c607 is running on localhost:3030 (PID2908, launcher83192), original3000 PID68104 remains unchanged. Production build and build-time TypeScript passed; networkDenied=0, sourceUnchanged=true, liveFilesUnchanged=true. Targeted ESLint passed. Related34 unit/service tests passed. Final browser test passed 17 acceptance groups, including real directory anchors, changing editions clears obsolete anchors, real empty daily retains date/window/navigation, URL reload and chips, mobile Tab/Escape/focus, detail scroll/focus/URL return, current cache-derived counts, preference persistence, and wide-history reading width. Ephemeral isolated55436 fixtures were fully cleaned; modelRequests=0, browser foreignNetwork=0, pageErrors=0. Review readiness HTTP200 (configuration/database/storage true), anonymous news HTTP401.

The pause file hash and mtime match the pre-update baseline, paused=false. Current cache has 118 public news records and 168 indexed official dates; counts are read dynamically and no older snapshot was restored. Actual screenshots were inspected for desktop/main-shell,390px mobile, filtering panel, detail and1920px daily history. Full reference-image fidelity remains unverified; this is the approved written-specification implementation.

Evidence and per-file before snapshots: E:/codex1/2026-10-04/task-4/research-news-interactions-20261006. Portability conditions: docs/audit/research-news-portability-20261006.md. No new dependencies, global shell changes, migrations, formal credentials/session writes, staging/commit/push or cloud deployment.

## Formal entry boundary

No formal restart is performed. After the parent has reminded the user to save current edits and confirmed readiness, use this final candidate rather than the historical815a1b2f or intermediate2a31b1e4. The existing release launcher still validates exact source/artifact hashes and existing daily private configuration; a later source change requires rebuild. Do not restore old database backups over subsequent user writes.
