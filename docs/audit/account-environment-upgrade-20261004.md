# 账号与环境升级第一批（2026-10-04）

> 2026-10-04 正式执行更新：原55432已按明确授权原位升级55→62，原附件卷恢复，唯一日常入口 http://localhost:3000；3017/3020页面已停止，所有旧库卷保留。本文原“未批准/未执行”表述为历史状态；最新实际验收、回退位置及本人登录待办见 [正式切换交付](database-cutover-delivery-20261004.md)。

本轮在 `内容生产中心-integration` / `feat/web-integration-release` / `ae3ff087` 加既有本地修改上实施。正式数据仍以原工作区的 55432 为准；未批准正式切换。

## 唯一入口与用途

| 环境 | 网页 | 数据 | 用途 |
| --- | --- | --- | --- |
| 原环境 | 原工作区既有入口；本轮未改 | 55432 / content_center | 原账号与业务数据，未迁移 |
| 本轮升级验收 | http://localhost:3020 | 55436 / content_center_upgrade_review | 从原库备份恢复的副本，可验证账号及旧数据兼容，不能当作日常业务库 |
| 旧集成预览 | 3017 | 55435 | 历史研究测试数据，不是原用户账号库；本轮不替换其数据 |

在集成目录执行 `pnpm review:check` 核对，再用 `pnpm dev:review` 启动。也可直接 `node scripts/local-web.mjs review`。旧 `dev` / `dev:real` / `dev:web` / `dev:worker` / `db:migrate` 的 LOCAL_REAL 入口拒绝继续，`dev:up` 已移除自动迁移及启动 Worker 路径。正式切换批准前不会自动回退到其他库。

验收使用独立 Cookie、编译缓存和对象服务（127.0.0.1:19000），对象数据也是原卷副本。Worker 关闭；队列地址固定不可用的本机端口，避免误投原队列；模型与凭据提供者调用在服务端拒绝。账号、资料和配置中仍有私人信息，整个 `output/account-upgrade-private` 被 Git 忽略，仅留本机，不上传。

## 数据保留与恢复证据

- 原 PostgreSQL 只读 `pg_dump -Fc` 备份，独立新卷恢复。备份 SHA256 和迁移日志留在私有目录。
- 副本成功执行 6 个已有迁移：研究会话、对象偏好、成果来源及兼容来源、账号空间状态、Web Search 枚举。
- 测试清理后，27 用户、18 凭据记录、26 空间、27 成员、32 资料、44 项目、0 Artifact 的数量与原库一致；用户及资料 ID 校验一致。没有读取或输出密码值。
- 原对象卷只读备份并恢复独立对象卷。17 个数据库引用的已存储对象全部在原卷找到，也全部通过副本 S3 HEAD 读取验证。
- 原卷、旧 worktree、旧数据、备份均未删除或替换。回退本批代码可使用私有 `baseline` 中文件快照；不要用整树覆盖或 git reset。

## 当前验证

- 防误连 Node 测试：4 项通过（原库、旧集成库、远程库、错误名称/端口、Cookie、外部存储、队列及 Worker 标志）。
- 账号相关测试：5 文件、19 项通过，仅在 55436 执行；含登录、用户停用拒绝、退出与会话过期、跨空间读取/修改拒绝、角色越权拒绝、直接注册关闭。
- 外部调用拦截：1 项通过，拒绝发生在 DNS/网络调用之前。
- Web 和 providers 类型检查及受影响文件 lint 通过。
- 隔离浏览器：服务 503、凭据 401、网络中断、双提交只发送一次、重新登录文案、真实无会话访问 dashboard 跳回登录均通过。全部登录提交被模拟拦截，未使用真实用户密码。
- 仅重启本轮创建的验收 Web，之后浏览器检查仍通过；未停其他服务。
- 未验证用户本人成功登录；密码由其自己恢复/输入。没有邮件重置后端，页面只提供真实恢复指引，未新增公开重置接口。

## 本轮清债及保留条件

| 事项 | 本轮处理 | 保留/替换条件 |
| --- | --- | --- |
| 自动迁移并启动 Worker 的旧 dev:up | 移除集成目录旧实现，保留原目录与本地快照 | 正式环境启停方案另行批准 |
| 重复手写 dotenv 解析 | runtime-env 改用 Node 24 内置 parseEnv，与新入口一致 | Node >=24 已是项目要求 |
| 登录路由测试别名不能解析 | 改为与同文件一致的相对导入 | 当前相关测试通过 |
| 测试 Cookie 名称写死且断言可能打印会话值 | 跟随隔离前缀，布尔断言避免输出 Cookie | 每种环境必须保留独立前缀 |
| 测试邮箱大小写导致残留 | 生成时标准化，仅清除本轮副本新增的已识别残留 | 复测后数据校验一致 |
| 旧/新版研究路径与历史数据 | 保留，本批不做研究 UI 改造 | 下一研究批次依据引用与兼容范围处理 |
| 原库到 schema 的外键/索引漂移 | 首批仅记录；后续已新增对齐迁移并仅在 55436 验收通过 | 9 个研究外键及 6 个索引名已对齐，原 55432 未执行；正式切换仍另行批准 |

## 正式切换前必须复核

1. 用户本人在副本登录与真实资料浏览；核对未配置外部服务时的提示。
2. 收口 schema 漂移，验证约束、迁移回滚/恢复和所有相关模块，再形成正式切换脚本。
3. 确认最终应用部署方式、日常网址、数据权威来源、对象服务、后台队列和凭据使用策略。
4. 切换前重新备份、检查原库新增数据，确认副本与原库不能双写；明确恢复路径和用户停机影响。

本报告不表示正式库升级或交付生产已完成。平台 SYSTEM_ADMIN 的全局管理策略未改变；跨客户验证指已有 Workspace 成员与业务服务隔离。

最终补充：资料、附件元数据及项目的完整行在数据库内计算摘要，原库与副本均一致（content-equivalence.json）。原库未变；测试清理后副本数量与标识复核一致。

## 本批修改文件

- 入口/配置：package.json、.gitignore、scripts/local-profile.mjs、scripts/local-profile.test.mjs、scripts/local-web.mjs、scripts/runtime-env.mjs、scripts/dev-up.ps1、apps/web/next.config.ts。
- 账号体验：apps/web/lib/auth.ts、apps/web/app/(auth)/layout.tsx、apps/web/app/api/auth/[...all]/route.ts、apps/web/components/auth-form.tsx。先前已有登录错误分类和会话失效跳转保留。
- 验收离线保护：apps/web/server/ai/llm-runtime.ts、packages/providers/src/provider-fetch.ts、packages/providers/src/openai-compatible/errors.ts。
- 回归：apps/web/tests/account-space.test.ts、apps/web/tests/auth.integration.test.ts、apps/web/tests/internal-signup.test.ts、packages/providers/src/provider-fetch-review.test.ts。
- 本报告。未修改研究 UI、原工作区源码、真实账号凭据或权限。

## 离线边界及账号验收补充（2026-10-04）

本节是首批后的实际增量，不能将上面的首批计数当作最终状态。提交 HEAD 仍为 `ae3ff087`；验收针对该 HEAD 加本地未提交代码。记录时已跟踪改动 49 项、未跟踪条目 102 项（目录条目不等于文件数），未 commit / push / deploy。3020 独立进程树已重启，启动器 PID 18528；3017、原库及密码恢复终端未动。

### 外部调用及探测

- Providers 增加统一验收离线判定：LOCAL_REVIEW 身份或 LOCAL_REVIEW_OFFLINE=true 任一成立均阻断。ASR health/install/transcribe 在 fetch 前拒绝；网页正文与 Provider 在 DNS/HTTP 前拒绝；F2 默认及注入采集器在数据库读取/子进程前拒绝。
- 数据库包初始化校验 55436 / content_center_upgrade_review、离线及 Worker 标志，拒绝继承来源不一致的缓存客户端。直接启动 Next 不能绕过显式 review 身份的目标校验。
- 3020 启动器只继承必要 OS 变量，不继承 F2、ASR、代理或 NODE_OPTIONS。
- 系统服务与 Runtime 的两处普通 ASR 探测在验收模式返回 DISABLED_FOR_REVIEW，页面显示“验收禁用”；正常模式仍执行实际探测。转录 HTTP 入口在创建任务前拒绝，不让任务留在队列。
- 上批定向 37 项通过（providers 20、DB 8、Web 边界 4、启动器 5）；本轮 HTTP 与探测 2 文件 / 6 项通过。最新 Web typecheck、受影响文件 lint 通过；此前 DB/providers typecheck 通过。没有执行全仓 build 或生产验收。

### 真实 HTTP 与两个客户空间

- 使用两个可丢弃 USER 身份，各自只有独立 fixture Workspace 的 OWNER；没有 SYSTEM_ADMIN。通过临时 fixture 密码建立 Cookie，不使用用户密码，不输出密码或 Cookie。
- 实际 38 次 HTTP 检查：8 次本人资源读取成功；26 次双向跨空间读取/修改、附件替换 ID、研究保存/启动、成果修改均拒绝（403/404）；ASR 初始化、转录、F2 采集均返回 409 / LOCAL_REVIEW_OFFLINE，ASR 状态明确禁用。
- 任务及 Provider 用量数量未增加；所有 fixture 身份、空间及级联对象清理已核对。网络/子进程“零调用”由定向 spy 测试证明，HTTP 部分证明真实入口拒绝与任务/用量无变化；没有声称做过全进程抓包。

### 本机备份、附件与迁移

- original-20261004.dump 的既存 SHA256 一致，恢复到新建 content-center-upgrade-db-restore-check 空卷成功。该容器 network=none，无主机端口。恢复后 27 用户、18 凭据记录、26 空间、27 成员、32 资料、44 项目、0 Artifact 与备份基线一致。
- 原对象卷归档再次恢复到独立 content-center-upgrade-restore-check-object-data 卷，MinIO 使用内部 Docker 网络。宿主端口在内部网络不可达，因此通过容器既有 curl 读取其自身 loopback；签名经 stdin 传入，不进入进程参数或输出。
- 17/17 附件逐对象流式 SHA256 与 19000 验收副本全部一致，总计 361721426 字节。这比首批 HEAD 检查更强，但比较的是备份恢复副本与验收副本，不代表当前原服务后来新增内容。
- 20261004143000_research_fk_index_alignment 已完成；重复 migrate deploy 两次均无 pending，schema diff 无语句。首批 6 个新增迁移加本次对齐迁移共 7 个；没有编辑旧迁移。
- ResearchRun_one_active_per_session 与 BenchmarkCollectionRun_one_active_per_account_key 两个 active 部分唯一索引均在；定义核对前后一致。新增研究/偏好关系的孤儿及跨项目/会话空间计数均为 0。第二个 active 研究请求触发唯一约束；演练全部 ROLLBACK，临时身份无残留。
- HTTP 清理后再核对：原库未变、副本数据保留一致。原卷、现有副本、备份和工作树未删除或覆盖。

最小本机证据（均在 Git 忽略的 output/account-upgrade-private，不上传）：http-isolation-evidence.json、database-restore-drill.json、object-content-hash-drill.json、migration-constraint-verification.json、preservation.json、schema-drift.sql。修改前文件快照另存 offline-guard-baseline / http-review-baseline。

剩余：本人真实登录、真实媒体/模型/平台调用、正式库切换仍未验收；这些不阻断隔离副本上的研究开发。正式切换前仍须重新备份、核对原库新增数据和验证所有相关模块，不能双写。
