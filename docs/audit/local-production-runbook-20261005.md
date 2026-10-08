# 本地生产候选构建与运行手册 — 2026-10-05

本手册属于A批实现，保留Next模块化单体。它提供本地生产候选验证，不等于正式切换、云部署、便携安装包或负载验收。正在服务的3000继续用日常配置。总计划及后续卡见[实施计划](architecture-upgrade-plan-20261005.md)。

## 职责分开

- 构建：pnpm build 或 node scripts/local-release.mjs build。不读daily.env/review.env，不运行安装、迁移、seed、bootstrap；复制源码到Git忽略的output/architecture-upgrade-20261005/releases/<id>/workspace，依赖junction复用已安装目录。源码、产物hash及BUILD_ID写receipt.json；不能把带本机依赖链接的workspace当作已验证便携发行包。
- .next-production只存在于该候选自己的工作目录。根Next配置保持A批前状态；不改日常.next或现有review构建目录。
- 构建环境使用明确BUILD_ONLY非运行占位值，DB仅127.0.0.1:1/build_only；任何运行预检都拒绝占位认证值。Node ESM preload拒绝HTTP/TLS/fetch/TCP，允许子进程IPC；Prisma原生引擎只可能接触不可连接的占位地址，不持有正式数据库地址或凭证。外部Provider也显式禁用。网络拒绝记录出现即判本次build失败。
- 运行：只从固定本地私有配置读取已有值，再校验daily/review范围。没有缺项默认值，没有自动迁移和新账号初始化。
- 升级：先人工审核迁移/数据影响与备份，在维护窗口独立批准执行；A批没有应用任何正式迁移。历史render*模板不作为正式客户版，并已移除启动迁移/账号初始化耦合。
- 回退：停止本次候选，保留原daily服务、数据库和卷；无需恢复数据库。不得用切换前备份覆盖后续用户写入。

## 配置清单（仅字段名，不输出秘密）

| 类别 | 要求 |
| --- | --- |
| 环境身份 | daily严格原LOCAL_REAL、原55432/content_center；review严格LOCAL_REVIEW、55436/content_center_upgrade_review |
| URL / Cookie | daily为localhost:3000及既有daily Cookie；生产review派生localhost:3030、独立content-center-release-review Cookie，不复用日常或开发review Cookie |
| 数据库 | DATABASE_URL必须匹配明确profile；无备用URL/远程/旧55435回退 |
| 认证与加密 | AUTH_SECRET、INTEGRATION_ENCRYPTION_KEY沿用已有私有配置；禁止BUILD_ONLY值，不显示值，不生成新凭证 |
| 对象存储 | STORAGE_DRIVER=S3_COMPATIBLE；daily原9000、review19000；S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY必须存在 |
| 队列与Worker | 本批FREE_WORKER_MODE=false，队列禁用地址保持；不启动独立或embedded Worker，readiness明确backgroundTasks=disabled |
| 外调与自动入口 | EXTERNAL_CALLS_DISABLED=true；系统模型、自动体验登录、内部/公开注册和mock自动开关显式关闭 |
| 进程继承 | 只保留OS支持变量，不继承其他终端的Provider key、代理或Node注入；runtime NODE_OPTIONS由脚本固定 |
| 缺项 | 非零退出并输出固定错误码；不能在build日志/命令行打印.env或原始Provider错误载荷 |

## 命令与人工操作边界

1. node --test scripts/release-profile.test.mjs
2. node scripts/local-release.mjs build
3. 从RELEASE_RESULT取实际成功id，仅BUILT可用。失败目录保留，不执行递归删除。
4. node scripts/local-release.mjs check review <id>
5. node scripts/local-release.mjs start review <id>
6. 浏览器或只读HTTP验证http://localhost:3030；候选可验证后停止，非日常入口。
7. start daily需要另行批准正式运行切换；脚本还有--approved-daily-switch显式确认参数，不能据此自行获得授权。3000占用时检查/启动直接失败，脚本不杀旧服务、不抢端口。

生产候选启动后最多45秒等待ready；配置无效立即拒绝、依赖失败不就绪，超时关闭本次子进程，保留证据，无备用DB/开发服务回退。正常SIGINT/SIGTERM关闭候选；运行锁防止同一产物重复启动。若外部强杀导致runtime.lock残留，先确认其记录进程已退出以及3030无监听，再只清理该候选自己的锁；禁止为解锁杀未知进程或删整目录。

## 健康与验收限制

- /api/health/live：匿名200，仅进程活性，无DB、Provider或租户数据查询。
- /api/health/ready：只检查明确release配置、数据库SELECT 1与批准的本机MinIO ready；成功200，失败503，输出仅布尔状态和背景任务禁用，不显示URL/凭证/租户计数。
- 这不是模型/采集/队列可用性承诺；这些能力按授权保持关闭。原开发runtime-health在production仍404。
- 至少验证未登录业务拒绝、健康失败503、启动失败非零及无遗留候选端口、产物/源码变更拒绝、端口冲突拒绝。
- 生产认证本人密码、HTTPS/反向代理、多客户负载、完整灾难恢复与B批任务重启演练未因本地build而通过。实际结果以A批交付记录为准。
