> Current status as of 2026-10-06T16:23:06.017Z: DAILY_DEPLOYED at http://localhost:3000/research, build release-20261006T152431Z-e439c607. Formal cutover evidence: [daily-news-release-cutover-20261006.md](daily-news-release-cutover-20261006.md). The earlier pending-switch statements below are historical checkpoints.3030 is stopped due to the artifact's single-instance lock; data/build/cache retained.

# 2026-10-06 正式研究资讯集成审计

当前 STATUS：READY_FOR_DAILY_SWITCH_NOTICE。最终构建与浏览器验收完成；正式3000未切换。下文保留施工检查点历史，最终证据与切换条件见文末。
这是已授权任务的中间检查点，尚未切换正式运行服务，不是交付完成声明。

## 实际落点
- apps/web/server/research/news/contracts.ts：真实 v1 资讯、同步与日刊契约、UTC+8日期、安全链接。
- transport.ts：固定 https://aihot.news/api/v1 GET 专用通道，默认禁用；禁止任意URL/重定向/携带私密请求信息，10秒/4MB上限。
- store.ts：本机32MB上限原子缓存、暂停控制、进程锁。
- sync.ts：完整 selected snapshot + changes，409重建、明确remove、分页失败回滚缓存与cursor、小时TTL、Retry-After与退避、ETag/304；最少1100ms请求间隔。
- runtime.ts + instrumentation.ts：只有专用 AIHOT_PUBLIC_NEWS_ENABLED 才启动调度；通用Worker与其他外调不变，重启/睡眠仅按持久化due补一次。
- access.ts/service.ts + /api/research/news：有效Workspace成员、未禁用指定管理员本人鉴权，读缓存/暂停/同步/历史日刊。
- research/preferences.ts及原preferences API：NEWS/NEWS_LATER复用已有ResearchObjectPreference，仅本人Workspace/User记录，不能越权借旧端点绕过。NEWS写操作检查Origin。
- /research/page.tsx + research-news.tsx/css：工作台共享Button/Input及现有design tokens；真实资讯列表、搜索/来源/日期/分类、未读/收藏/稍后读、站内dialog详情、真实官方日刊窗口和历史选择。
- /research/sources/page.tsx：原已保存来源列表原样保留并修正入口，未当作新资讯或早报。
- research-shell.tsx：补已保存来源入口，资讯入口更名；旧作品、对标、趋势、研究历史仍在。

## 数据方案
无需Schema/Migration。公共摘要、cursor、日刊、同步状态仅本机output/research-news-private/{daily|review}目录（Git忽略）；个人偏好复用现有表，不扩权限、不迁移/改写旧资料。新任务逐文件施工前备份在本目录before/。
正式运行的专用开关/固定缓存路径尚未启用，也未读取或编辑daily.env。未操作正式数据库、MinIO或用户登录会话。

## 当前验证
- 55436安全测试入口 scripts/local-web.mjs review test research-news：13/13 PASS。测试用本机临时缓存与明确桩，仅测试框架目标为55436，无正式写入。
- 全apps/web typecheck --noEmit --incremental false：PASS。
- 专用通道本机真实只读GET /dailies?limit=3：HTTP200、ETag存在，真实日期2026-10-06/05/04，未保存正文。这说明本机免费公开API通道可达，不只是3040样例。
- 定向eslint首次仅一个未使用type import，已修正，复查另列。
- 实时监听仍3000 PID68104、3020 PID85736、3040 PID90012，全127.0.0.1；无正式重启。

## 尚未完成
1. 日刊/全snapshot+changes真实免费接口端到端采集及账号隔离相关回归；当前仅真实日刊index直连已核。
2. 独立review实际页面与工作台同屏、390窄屏、dialog焦点/失败/收藏持久化浏览器证据。
3. 正式启用的日常launcher专用AIHOT开关与固定daily缓存路径配置，不能改变全局外调/Worker安全flags。
4. 最终隔离build与切换前完整报告。3000发布重启需先向父线程回报，以便提醒用户保存当前工作；目前没有执行。
5. 无迁移或额外迁移批准需求。未Git暂存/提交/推送，未触碰个人站点。

## 第二阶段实测更新
- 全快照真实10页，共4662条公开selected记录；本机近7天保留114条，日期未知2条。官方日刊索引168期，最新2026-10-06正文已读取。历史selected记录分类可为null，原样保留且显示未分类，不主观归类。
- 真实changes HTTP200 / count0，日刊索引及详情ETag304成功。仅隔离公共缓存时钟为验证推进，不声称已等待一小时周期运行。
- 31项隔离测试全通过；后追加完整撤回批次不受日刊失败回滚的测试后14项同步测试通过，累计32项相关测试。
- 日常launcher专用开关true、固定daily缓存路径代码已准备；review默认false，显式--approved-public-news只用于授权候选验收。全局EXTERNAL_CALLS_DISABLED true、Worker disabled保持。
- 当前新建output/research-news-private目录ACL已收紧到当前Windows用户、Administrators、SYSTEM；子review目录验证同样权限。后续daily目录继承此受控父目录；0600不是Windows ACL证明。权限前值仅保存在本次任务cache-acl-before.txt。
- 生产隔离构建正在执行，浏览器尚待候选构建完成。正式3000/3020/3040无重启。

## 浏览器首轮与最终候选
真实workbench chrome下12组浏览器检查通过，页面错误/浏览器第三方请求/模型请求均0，55436临时会话、workspace及其他测试账号清理验证完成；没有使用真实密码。桌面资料库与资讯页同屏对照已保存，390窄屏无横向溢出；真实个人偏好刷新后保留，历史2026-10-05官方日刊已读。
首个production build成功（无网络、无源目录改写）。截图发现dialog默认布局偏左已显式margin:auto修复；daily详情现在只对已缓存对应article显示可确认的发布日期，其他仅显示官方日刊窗口；近期旧研究列表明确排除NEWS种类以免挤掉历史趋势/账号。最终修订候选正在重新构建，尚未向正式3000发布。


# Research news integration: ready for coordinated daily cutover
Updated: 2026-10-06. STATUS: READY_FOR_DAILY_SWITCH_NOTICE. Formal 3000 has NOT been restarted.

## Deliverable
Research /research now contains real AIHOT selected news and official dailies inside the actual workbench shell; uses shared Button/Input, existing tokens/font/navigation, source search/category/date/history filters, in-site detail dialog, personal favorite/read-later/read state, empty/loading/error feedback and original-source links. Original material inbox remains /research/sources; other research/works/history routes remain.
No schema or migration. No original-business-data copying, reset, seed, owner restructuring, credential change, auth bypass, paid model, worker/collector enabling, Git staging/commit/push, or OS autostart registration.

## Actual public API proof
- Complete selected snapshot: 10 pages, 4662 source rows, fixed watermark retained privately.
- Initial local retention: latest 7 days 114 public items; default models/products/industry 83. Published date unknown: 2, never counted as today's news.
- Official daily index: 168 actual dates; latest 2026-10-06 official body and historical 2026-10-05 body read successfully. Official 08:00-to-08:00 window stays separate from calendar-day news.
- Real changes HTTP200/count0; dailies index and cached detail conditional GET HTTP304.
- Captures are local and Git-ignored; no source fulltext mirrored. Attribution/canonical/original links preserved.
- Historical snapshot category can be null; retain it unchanged. No guessed category/event grouping.
- Real source had no removal event in this sample; remove/409/partial-page rollback paths are tested with explicitly controlled isolated fixtures, not misreported as observed real withdrawals.

## Verification
- 32 direct/research-regression tests PASS (14 synchronization, 2 scheduler/lifecycle, 5 auth/preferences, 4 old research API, 7 old research sessions).
- 20 local/release launcher tests PASS; original target/cookie/safety flags preserved; review default public-news permission OFF.
- 12 real browser check groups PASS on FINAL production candidate; actual authenticated app chrome, desktop library/news comparison, 390px reading+dialog, safe failure retaining content, personal preferences persisted through reload, anonymous401/other-system-admin403, true daily index/history.
- Browser page errors 0, browser third-party requests 0, model requests 0. Disposable signed sessions/workspace/other fixture user existed only on 55436 and were fully cleaned. Real user password was neither used nor verified.
- Global Web typecheck and targeted eslint PASS. Client-boundary checker PASS.
- FINAL isolated production artifact: release-20261006T122754Z-815a1b2f, BUILT, exit0, networkDenied0, liveFilesUnchanged=true, sourceUnchanged=true. No runtime secrets/database used during build.
- Workbench UI screenshots visually reviewed; final dialog centered, mobile no overflow.
- Original formal 3000 PID68104 unchanged. Existing 3020 PID85736 and 3040 PID90012 unchanged. Final candidate3030 PID79772, all loopback127.0.0.1.
- Generic CLI log "backgroundTasks:disabled"/"external:disabled" refers to existing general Worker/provider settings. Dedicated AIHOT permission is separately ON for this explicitly approved candidate; UI/API status and scheduler tests verify that exception. Do not interpret old generic log label as disabling news.

## Storage/concurrency/retention
Existing ResearchObjectPreference string kind uses NEWS/NEWS_LATER without migration; every news API authorizes current active named admin and workspace membership; preference identity remains workspace+user+kind+item. No personal preference file/localStorage.
Public file cache: output/research-news-private/{review|daily}, absolute fixed launcher path. Atomic temporary-write/rename, 32MB hard ceiling (stop rather than silently discard old records), process lock with nonce/pid ownership and stale-dead-owner check. Completed snapshot only may authoritatively remove absent content; changes omissions do not remove. Known complete news withdrawal batch commits even if separate daily revalidation fails. Withdrawn summary disappears; ID tombstone and personal status remain. Retention/history differ from initial seven-day collection window.
Current Windows parent cache ACL is protected and allows only current Windows user, Administrators and SYSTEM; review child verified same; new daily child inherits. Prior cache ACL preserved in cache-acl-before.txt in task backup directory. File mode0600 alone is NOT offered as Windows privacy evidence.

## Hourly lifecycle and narrow permission
Dedicated fixed-origin GET only https://aihot.news/api/v1 selected snapshot/changes, dailies/index/date. No local cookies/auth/context/query/private data. Redirect denied, timeout10s, response4MB, identity encoding, header16KB, serialized requests at least1100ms apart. ETag/304, Retry-After, persisted exponential cooldown, transactional page/cursor updates, in-process coalescing and filesystem mutual exclusion.
One process-owned timer checks persisted due time each minute, performs upstream synchronization at most hourly after success (bounded recovery checks after failure), honors durable pause. Restart/sleep catch-up once, not per missed hour. This was simulated and tested; we did NOT wait an hour or claim a completed periodic live cycle. Browser may close while service keeps running. Exit/shutdown stops all news scheduling; no OS/cloud autostart.
Daily launcher code sets AIHOT_PUBLIC_NEWS_ENABLED=true and fixed daily cache path, retains EXTERNAL_CALLS_DISABLED=true, WORKER_MODE=disabled, FREE_WORKER_MODE=false and other existing safety flags. Review default OFF; --approved-public-news opt-in is only for isolated candidate. Existing daily.env never edited.

## Coordinated formal switch condition
Parent should first tell the currently logged-in user: "研究资讯页已验收，接下来需要短暂重启工作台，请先保存当前项目或资料的编辑内容。原资料、项目、附件和登录配置都会保留。"
Only after that coordination stop the EXACT existing formal web process/supervisor (record recoverable original launcher/cwd first), never PostgreSQL/MinIO or unrelated processes.
Prepared new start command from repository:
node scripts/local-release.mjs start daily release-20261006T122754Z-815a1b2f --approved-daily-switch
Use the already installed Node executable. Host remains127.0.0.1, port3000, DB55432/original MinIO9000. No new env/credentials and no migrations. Do not overwrite a preexisting daily public cache; first launch may briefly show preparation while initial real sync runs.
Then verify ready/liveness, anonymous permission denial, cache/sync actual success and read-only original business counts; user personally opens http://localhost:3000/research and validates their session/password if re-login is required. We have NOT claimed that password verification.
This task stops at ready-for-switch coordination, per parent's explicit instruction. Candidate3030 remains available for further read-only inspection. Older review/prototype entries remain non-daily and all old data/volumes stay preserved.

## Rollback / boundaries
No database restore is needed for a runtime-only news switch and none is authorized by this delivery. Record and preserve old running formal launcher/artifact so it can be restarted with unchanged private daily configuration if the new runtime fails; never restore the October4 DB backup over later writes. Old-revision CLI source-hash checks may intentionally reject mismatched current source, so preserve the actual old launcher rather than reset the repository to make it pass.
Task per-file original-content backups: E:\codex1\2026-10-04\task-4\research-news-integration-20261006\before.
Repo audit: docs/audit/research-news-integration-20261006.md.
Evidence: actual-bootstrap-evidence.json, actual-changes-evidence.json, final-browser-evidence.json, final-release-evidence.json, screenshots/ in this task directory.
HEAD remains ae3ff087; user's preexisting work remains unstaged.


## Existing service recovery 2026-10-06T14:41:52.862Z

Recovered the same approved review artifact on localhost:3030 and the existing read-only standalone preview on localhost:3040 after disconnection. Review readiness 200 (configuration/database/storage true); anonymous news API 401. Browser address confirmed localhost:3030/research and window restored. Review control remained paused=false; no control, database, credential or session writes were made by this recovery. Original localhost:3000 process 68104 remained running and was not replaced; its readiness endpoint returned configuration=false/503 and skipped dependency probes. Original PostgreSQL accepts connections and original MinIO readiness returns 200. Therefore original release readiness is unresolved, not a proven database/storage outage. Legacy 3020 remains stopped. Reference materialization remains blocked; no layout changes or restricted download retries. Evidence: E:/codex1/2026-10-04/task-4/service-recovery-20261006/evidence.json.


## Current candidate supersedes historical launch examples

As of 2026-10-06T15:31:54.190Z, the current verified candidate is release-20261006T152431Z-e439c607, available at http://localhost:3030/research. The old815a1b2f and intermediate2a31b1e4 remain historical build evidence; do not use their earlier launch examples for the updated source tree. Current layout/interaction acceptance is documented in research-news-interactions-layout-20261006.md. Formal3000 is still not restarted or switched. A formal save/readiness notice must precede any separately approved switch using the current candidate.
