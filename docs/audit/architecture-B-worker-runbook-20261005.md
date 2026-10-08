# B Worker 模式与隔离复验 — 2026-10-05

CURRENT IMPLEMENTATION：正常模式通过 WORKER_MODE=independent 或 embedded 显式启用，并提供 REDIS_URL；未配置默认为disabled。FREE_WORKER_MODE=true映射embedded仅为兼容。业务生产者可保存任务意图，无Worker时不会擅自开始执行。

同Redis数据库与QUEUE_PREFIX共享 worker-mode 租约。租约不限制同模式实例数；业务执行锁只限制同workspace/jobId。不同任务可并行，正常模式没有全局单Worker限制。两个模式不能同时注册；租约丢失停止消费，死亡租约过期后可重新注册。QUEUE_PREFIX必须是1–80位字母/数字/下划线/连字符，未设置保留原bull命名空间兼容；复验绝不能用bull或原队列。

隔离复验现有容器 content-center-architecture-b-redis-20261005 已停止，无卷，端口127.0.0.1:56381。只有明确重测B时启动该容器，使用既有review.env在内存构造测试环境，DATABASE_URL必须55436，QUEUE_PREFIX为architecture-b-*，EXTERNAL_CALLS_DISABLED=true、FREE_WORKER_MODE=false。测试fixture会再校验DB/Redis端口/prefix，禁止扫描或消费历史积压。

当前本机Node位于 Codex依赖目录；output/architecture-upgrade-20261005/B-run.cjs 是本次本地证据运行器（不进入git，不输出秘密），支持 test / worker / web / lint。持久测试源码是 apps/worker/src/job-recovery.integration.test.ts 和 apps/web/tests/ingest-job-recovery.test.ts；根Vitest DB guard仍必须通过。运行完确认fixture workspace/source/job为0，再停止仅B Redis；原3000/55432与9000服务不变。

恢复器每30秒取最多50条意图，使用createdAt/id游标，扫完后从头开始。QUEUED/RUNNING且无队列receipt可补入队；活跃执行由业务锁保护。已结束receipt与非终态DB冲突要求人工复核。SUCCEEDED、CANCELLED和旧代数消息不再次执行；已开始的外部调用结果未知不会自动重放。

取消不是删除资料。可取消的QUEUED任务及运行中的本地文本任务可被停止落库；外部已在处理的任务返回409，保留历史结果/费用核对。重试先查当前权限/源状态，再生成新代数；整理、蒸馏和转写仍走各自请求服务。Idempotency-Key只用于用户/workspace内同一请求，不能代替身份鉴权。

正式原库 Worker 启用、公开监听、provider付费调用、任何 migration、production3000切换不在B授权内。不能通过移除鉴权/篡改ready/profile让检查通过。C完成后先重新构建当前源码，不能复用A旧源artifact作为新代码发布证据。

回退保留所有库卷和原入口，只停本次隔离进程并核对B-specific hunk。使用B/before与源hash进行人工差异核对，不覆盖当前工作树或用户后续变更。
