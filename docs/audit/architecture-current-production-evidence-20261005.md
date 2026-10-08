最终候选更新（2026-10-05 19:50 UTC）：release-20261005T193349Z-edeedc4b，BUILT/exit0/networkDenied0/sourceUnchanged=true/liveFilesUnchanged=true；3030 live/ready/login200、projects401、dev runtime404，端口冲突拒绝、退出0、锁清除、退出后check0。最终组合14文件73项及Node profile19项通过，Web types/lint通过。daily启动代码最小标记修复已完成，但正式3000原进程未重启，实际ready仍503；不得将review生产通过写成daily已恢复。证据：output/research-account-trend-20261005/iteration-20261005T190628959Z-74bbda71/production-20261005T193950790Z-59563e31/candidate-smoke.json及研究交付审计。以下为此前历史候选记录。

当前候选更新（2026-10-05 18:58 UTC）：release-20261005T184905Z-787793cd，1148源文件/1472产物，BUILT/exit0/networkDenied0/sourceUnchanged=true/liveFilesUnchanged=true；隔离3030 live/ready/login200、projects401、dev runtime404，冲突拒绝，自动退出0、锁清除、退出后check0。未切换日常3000；其既有ready503未被生产review通过消除。完整证据见研究交付文档及 output/research-account-trend-20261005/iteration-20261005T183158652Z-3edccec6/production-20261005T1855-787793cd/candidate-smoke.json。以下为此前历史候选记录。

> 当前研究体验批证据（本页最新）：最新生产候选 release-20261005T154506Z-48591579：BUILT/exit0，1147源文件、1472产物文件，networkDenied=0、sourceUnchanged=true、liveFilesUnchanged=true。仅3030/55436/review19000隔离smoke：live/ready/login200（ready三项依赖true）、匿名projects401、开发诊断404；占用预检拒绝、候选退出0、锁移除，停止后再次check review exit0。最终3000仍PID74600，3017/3020/3030无监听，原库/旧库/原MinIO/review卷入口保留。生产未切换至日常3000。 定向10文件48项、web type/lint、客户端边界3项通过，证据与边界见 [研究体验交付](research-experience-delivery-20261005.md)。下文此前“当前”状态均为历史批次，不代替本次验收。

> 2026-10-05 研究页面首批最终更新：最新源码生产候选为 **release-20261005T180812Z-01d8d09f**，BUILT / exit0，1147 sources / 1472 artifacts，网络拒绝记录0、source/live files未变。3030 live/ready/login200、projects401、dev404，端口冲突拒绝，退出0清锁及post-stop check0；已停止3030及3020。12文件51项相关回归、最新类型检查和定向lint通过。实际根证据output/research-redesign-20261005/iteration-20261005T171639889Z-cca4efa5；见[研究首批可见交付](research-redesign-delivery-20261005.md)。以下早期候选均为历史证据。原日常3000仍dev运行且ready503配置检查缺口未关闭，本次没有切换正式生产入口。


## 此前阶段历史证据

> 最终阶段当前证据：release-20261005T133106Z-ac691dde 已完成最新源码的 BUILT / sourceUnchanged / liveFilesUnchanged / networkDenied=0；隔离3030 live/ready/login200、匿名projects401、开发诊断404，候选关闭及再次check通过。最终34项、type/lint与证据边界见 [阶段最终验收](workbench-stage-final-acceptance-20261005.md)。以下F1 stale和W2/R1结果保留为各阶段历史，不能代替本次结果。日常3000仍原开发进程，未切换production。

# 当前 A+B+C1+R1 生产构建与候选补验 — 2026-10-05

> 当前源码状态（F1收尾）：release-20261005T121559Z-f9a985ab已STALE_SOURCE_CHANGED，check明确RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED。本批未重build；历史构建/候选结果均不能代表当前production通过。当前定向31项/type/lint证据见workbench-W2-followup-delivery-20261005.md。

> 当前证据更新（W2）：release-20261005T121559Z-f9a985ab，包含W1/W2当前源码，BUILT、1140源码/1464产物校验，3030候选健康/认证边界及关闭复核通过。详见 [W2交付](workbench-W2-delivery-20261005.md)。下文旧release及旧批次统计保留为历史证据，不能代替当前源码验收。

STATUS：当前源码已完成隔离 production build 与安全候选冒烟，READY_TO_STAGE。共同底座按已批准范围可验收；日常3000没有切换为该production产物，全部架构债没有清零。

## 当前源码的实际构建

新产物 release-20261005T095244Z-9fc96386：BUILT、exit0。沿用A原安全流程复制到 Git 忽略的独立 workspace/.next-production，依赖只读复用；不加载正式运行凭证，数据库构建目标为不可达回环port1；不执行迁移、seed或账号初始化。Webpack编译3.5分钟、TypeScript53秒、101页静态生成完成。receipt记录1136源文件和1462产物文件摘要，networkDenied=0、sourceUnchanged=true、liveFilesUnchanged=true。原Next编译配置/日常.next未被此构建覆盖。工具连接曾短暂断开，构建进程持续运行并最终返回成功，未将断线当构建通过。

旧 release-20261005T084221Z-3b7a2b71 已因R1源码改变正确失效。当前结论来自上述新产物与本次实际运行，不借用旧build成功。候选退出后再次check review通过当前全部源/产物摘要与配置预检。

## 3030 真实匿名冒烟与停止

只用隔离55436/review19000既有配置，3030绑定127.0.0.1，Worker与外调均禁用。
- live200/29ms、ready200/8ms（configuration/database/storage为true，backgroundTasks disabled）。
- /login200/68ms、匿名/api/projects401/1166ms、生产/api/dev/runtime-health404/18ms。
- 同时第二预检遇端口占用退出1且拒绝启动。
- 候选正常退出0、runtime.lock移除；最终3030无监听。3000仍PID74600，原MinIO9000/9001回环保持；3017/3020/56381无监听。
- 候选结束后日常live、/login、MinIO200，匿名projects401。本轮没有本人登录、密码代输、正式业务写入或服务切换。这些计时只是一轮冒烟，不代表负载SLA。

生产浏览器293个JS名称核对未命中应用DB/Prisma/server-only/DATABASE_URL。两个名称命中：公开 INVALID_INTEGRATION_ENCRYPTION_KEY 错误码（当前chunk名随编译变化），BetterAuth通用AUTH_SECRET getter（chunk与已核实pre-R1产物字节一致）。没有读取或搜索真实秘密值；不等于整站渗透测试。

## R1 测试证据复用与安全边界

R1九路径摘要与最终50项通过时完全一致，本轮构建无源码修复，因此复用10文件50项、Web类型、九文件lint、Node边界3项及fixture清零证据；不重复数据库写入/外部动作。构建自身又完成当前生产Web类型检查。

覆盖：同key POST created=false/after0；显式新key after1（回调不执行）；startedAt/finishedAt/aiRunId非空QUEUED不结算；跨owner/workspace与停用成员/用户/空间在读路径拒绝；真实PG行锁下fixture QUEUED变RUNNING后，等待的条件结算重新检查且保留RUNNING；并发状态/同key/session读取只保留同一历史行。代码核对runner claim仍要求完整scope、QUEUED、createdAt新鲜且三个执行标记全空。这是并发行条件保护，未声称已经跑真实研究进程kill/恢复或真实provider计费测试。

R1只结算超时且明确未开始的QUEUED，RUNNING未知外部效果保留并提示核查；读触发结算已批准，未批量扫原55432。R2/自动持久消费者、schema/heartbeat/input snapshot、研究业务重构未实施；原研究兼容链/历史成果/独有UI与默认方法保留。B的BenchmarkStudy/CollectionRun旧执行链、autoTranscribe后续意图窗口、全前端nonce及长时Provider外部效果仍是CURRENT IMPLEMENTATION GAP。C1只覆盖已交付纯契约/客户端类型与只读输入，不是全部领域分层。

未做：全仓Playwright/视觉验收、真实模型/Worker、本人登录、生产切换/负载/HTTPS/跨机灾备。此前55→62数据库迁移是历史已完成，**本轮没有再次执行或记为新成果**。

## 精确交付证据

本地忽略目录 output/architecture-upgrade-20261005/R1/production：
- final-manifest.json：当前1136源hash、产物/receipt/build日志摘要、75路径精确合并台账、复用测试证明、候选/最终监听与未完成边界。
- A-B-C1-R1-task.diff、combined-diff-ledger.json：逐路径最早核验快照，保护HEAD ae3ff087既有未提交成果；不将混合整仓diff当本轮改动。
- source-hashes.json、reused-test-evidence.json、candidate-smoke.json/log、production-client-marker-check.json、daily-readonly-http.json、final-listeners.json。
- receipt/build.log在 releases/release-20261005T095244Z-9fc96386；不上传备份或秘密。本轮无新增应用源码hunk，只有审计与忽略证据。Git未暂存/提交/推送。

用户额外明确请求的Windows时区已由Dateline Standard Time设为Singapore Standard Time，回读显示“(UTC+08:00) 吉隆坡，新加坡”、偏移+08:00；只设时区，未手动改系统时刻/NTP。单独证据timezone-change.json。

回退仍只按已核验精确hunk并核对后续变化；不整树覆盖、不回滚已保存研究历史或恢复旧库。候选已关闭，正式日常服务无需回退。
