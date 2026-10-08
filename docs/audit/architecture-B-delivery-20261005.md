# 架构 B 本地交付 — 2026-10-05

STATUS：READY_TO_STAGE（仅表示代码可审阅，未暂存/提交）。已完成 IngestJob 链路的最小可靠性实现与隔离验收；未启用正式 Worker、未进行发布切换、无新 schema/migration。C 由父线程继续模块职责/依赖边界小卡，不把本结果扩张为所有历史后台流程已收口。

## CHANGED

- 新 queue-producer 复用既有 BullMQ 队列，Web 采集/整理/蒸馏生产入口不再加载消费处理器。IngestJob 消息 ID 由任务类型、workspace、业务 jobId、dispatchRevision 决定，不使用时间戳；保留有界完成/失败 receipt，最终业务状态仍由数据库判定。
- 已提交的 IngestJob 本身作为持久任务意图。采集、整理、转写、蒸馏入队失败保留 QUEUED/DISPATCH_PENDING，不覆盖已开始/完成状态。Worker 启动及每30秒限量补入队，默认50、上限100；稳定游标避免旧等待任务占满前50条造成后续任务饥饿。
- 按 workspace/jobId 的 PostgreSQL advisory transaction lock 串行化同一业务任务；不同任务可并行。消费前重新核对完整消息 scope、账号停用、空间停用和成员角色。旧重试代数、不合法消息及失败回写不会改写当前任务。
- 采集 Idempotency-Key（UUID）按 workspace/user 隔离，事务内持久查重；同 key 不同内容409。已有 URL canonical 去重保留。调用方必须保留同一 key；无 key 的独立 TEXT 提交不会自动按文本内容合并。
- 失败采集显式重试创建新 dispatchRevision 并原子校验 FAILED/未归档，整理/蒸馏由各自请求服务重试，不误送采集处理器。新增取消 API 保留资料，只允许可取消任务；正在外部处理时返回409。运行中的本地文本处理在成功/失败落库时再次核对取消和归档。
- Worker 模式 disabled/independent/embedded 明确化。独立/embedded 入口共享同 Redis/prefix 的租约，Redis TIME 为统一时钟；同模式多实例允许，跨模式拒绝，死亡实例租约过期可恢复。FREE_WORKER_MODE=true 仅保留 embedded 的既有兼容。daily/review/build 强制 disabled，继承环境不能开启 Worker。
- 当前 Vitest 排除 output/**，避免把 A 的隔离构建快照当成当前代码测试。没有更改 Next 根配置或业务方向。

## VERIFICATION

58个不同 Vitest case 得到当前代码定向验证：9文件全量56/56通过后，新增 URL 重放的 Web HTTP 契约7/7通过，最后补偿分页/归档收口的 Worker 故障测试21/21通过。不是单次58项全跑的表述。另 Node profile/build隔离16/16通过。Worker/Web typecheck与相关lint通过，git diff --check通过（仅CRLF提示）。

实际故障包含：事务提交未入队、队列接受但响应丢失、Redis不可达、两消费者、同业务重复消息、结果/模拟usage提交后重放、真实子进程kill/重启、本地处理取消后返回/报错、外部结果未知禁止重放、停用空间/撤销成员、跨workspace、旧代数失败回写、模式冲突与死亡租约过期、限量扫描公平性。外部真实模型/采集调用0；模拟usage唯一性不是外部收费 exactly-once 的承诺。

所有写入测试硬限制55436的 architecture-b-* 新测试空间；新Redis只监听127.0.0.1:56381，不接触默认历史队列。fixture已清理，测试Redis停止但容器保留，无原库卷/目录删除。

首次 Redis 故障验证暴露无限等待，已改为生产连接有限重试而消费者保留重连；首次请求锁验证暴露 Prisma void 结果问题，改用参数化 executeRaw。失败日志保留。多文件筛选曾扫描旧产物测试，已排除，结果不算当前验收。

## BOUNDARY / 正式现状

原入口仍127.0.0.1:3000，原进程74600；3010/3017/3020/3030无监听。未停止/重启daily，未启动原任务。正式库只读：27 users，1启用/26停用，32 SourceItem，44项目，72任务，305usage；62有效已应用迁移，3条历史回滚记录（表总行65）、0未完成。没有读取/改写真密码、password hash、session token、角色或原成员关系；本轮不替代本人登录验收。

原3000 HTTP：live200、login200、匿名任务GET401。ready503为configuration=false：A readiness只接受生产发布profile，保留的daily开发进程没有LOCAL_RELEASE_PROFILE，尚未执行该端点DB/存储探针；不是DB/存储故障结论。Docker只读DB正常、原MinIO ready200。未修改日常配置来取得ready200。

A已有生产候选在B源码修改前复测后已关闭：review3030冷匿名projects1245ms，热9/11ms，均401；live200/32ms、ready200/6ms。此前19.3秒及一次20秒超时没有被当作性能通过。生产artifact不进行请求时编译；API在无session时不调用Project业务查询，本地已安装Better Auth无cookie分支直接返回null。倾向首次路由依赖加载/认证初始化（推断），尚未精确拆分磁盘缓存/模块初始化/认证初始化，未验证登录或负载性能。

## RISKS / CURRENT IMPLEMENTATION GAP

- 外部调用已开始而结果未知的 RUNNING 任务标记 RECOVERY_REVIEW_REQUIRED，人工核对后重试；不自动重复收费。DB幂等无法替代外部provider的幂等键/收费确认。
- 每个执行任务额外占用一个DB连接，advisory事务预算15分钟，实例并发和数据库连接池需配套。超过该预算的任务、遗留处理器自行覆盖业务状态的路径仍需专门验证，不宣称无限时长可靠。
- BenchmarkStudy/BenchmarkCollectionRun 独立表仍用原入队/处理路径，未纳入此 IngestJob 恢复器；其时间戳ID保留为已登记GAP，不扩写历史产品中心。
- 采集成功后 autoTranscribe 创建后续任务之前的崩溃窗口尚未覆盖；已创建的 TRANSCRIBE 意图可恢复。外部处理中通过其他历史归档入口的完整生命周期未宣称验收。
- daily后台处理仍禁用，保存的任务不会因为这次代码交付自动开始执行。已有源码已改变，A旧artifact仅为旧版证据；不能用它代表B/C，后续完成C需重新离线构建并审阅，正式启用/切换仍需单独授权。
- 不新增邮件、业务功能方向、云部署、付费模型开关；C先梳理模块职责、旧流程去留与依赖边界测试。

## GIT / 回退 / 证据

HEAD ae3ff0879029394cec99ccb2f00d012e1e8a52ed不变；无add/commit/push，原大量未提交工作保留。回退只针对B hunk/新增文件，不能git restore整文件或覆盖后续用户修改。初始12个真实before快照与A源清单一致，14个额外路径从同一已验证pre-B源快照补齐，另有Vitest修改前快照。

证据位于 output/architecture-upgrade-20261005/B/：source-before.json、supplemental-before.json、before/、verification-record.json、source-and-evidence.json、test-latest.log（最后21项）、profile-tests.log、formal-readonly-state.json、formal-migration-state.log、fixture-cleanup.json、daily-readonly-http.json、final-listeners.json。父线程checkpoint与失败日志保留。详细模式/隔离复验见 architecture-B-worker-runbook-20261005.md。
