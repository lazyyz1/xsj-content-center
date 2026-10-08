# 正式本地数据库切换交付（2026-10-04）

STATUS：已按产品负责人明确授权执行正式切换；原 55432 原位升级完成，唯一日常入口为 http://localhost:3000。用户本人新密码登录仍待本人验收。本记录替代切换建议和前期升级记录中的“未批准/未执行”当前状态，保留原文作为历史证据。

## 实际实施

- HEAD 仍为 ae3ff0879029394cec99ccb2f00d012e1e8a52ed；保护所有既有未提交改动，未 reset、整树覆盖、暂存、提交或推送。精确修改前文件保存于本次私有 code-before。
- 3017 已从启动脚本独立确认连接 55435/content_center_agent_test_integration；仅停止本项目 3017/3020 进程树，未关闭无关应用或当前任务。
- 暂停后确认原库没有其他连接，重新备份原库、旧集成库及原附件卷。备份在改密成功之后产生；回退不使用早期 original-20261004.dump 或 review 副本覆盖原库。
- 全新 network=none PostgreSQL 容器恢复本次原库备份，恢复后既有非凭证字段摘要一致；预演相同七项 SQL 成功。新增列按原字段口径比对，其余既有业务字段逐表排序摘要比对。凭证秘密值未查询或输出；完整备份仅本地保管。
- 七迁移与副本实际应用的 checksum 一致（允许 Prisma 支持的 CRLF/LF 差异）；55 项已应用迁移也核对一致，未修改历史迁移。不存在额外 pending migration 或表/列/数据删除操作。前六项为新增表/列/索引/枚举；最后一项在显式事务中重建 FK、重命名索引。正式 migrate deploy 成功，仅应用批准七项，55→62。
- ResearchRun_one_active_per_session 和 BenchmarkCollectionRun_one_active_per_account_key 两条 active 唯一索引完整保留。正式 schema 与本次演练 schema 相同，当前 Prisma datamodel schema diff 为空。
- 原 content-center_minio_data 使用原凭证启动；旧停止容器保留为 content-center-minio-1-precutover-20261004。新日常容器仍名 content-center-minio-1，仅绑定 127.0.0.1:9000/9001，没有沿用旧 0.0.0.0 映射。
- 本次附件备份恢复到全新卷后实际 GET；17/17 原历史附件与本次恢复卷的流式 SHA256 一致，共 361721426 字节。

## 原库数据核对

| 对象 | 切换前新备份基线 | 七迁移后 |
| --- | ---: | ---: |
| User | 27 | 27 |
| Account | 18 | 18 |
| Workspace | 26 | 26 |
| WorkspaceMember | 27 | 27 |
| SourceItem | 32 | 32 |
| Transcript | 21 | 21 |
| SourceAsset | 31 | 31 |
| ContentProject | 44 | 44 |
| DraftBranch | 44 | 44 |
| Artifact | 0 | 0 |
| AuditLog | 1174 | 1174 |

截至 2026-10-04T15:05:45.162Z，正式 HTTP 验收后全部既有非凭证业务摘要仍与迁移后快照一致。账号 2629194738@qq.com 的改密成功审计仍为 2026-10-04T09:58:30.141Z，Account.updatedAt 仍为 09:58:30.112Z，账号未禁用、旧会话 0；未更改密码或权限，未代输密码。该元数据保持不等于本人登录成功。

## 日常与旧环境

| 环境 | 最终状态 | 用途 |
| --- | --- | --- |
| 3000 / 原55432 / 原9000 | 正在运行，Web 和 MinIO 仅本机监听 | 唯一日常业务入口 |
| 3017 / 55435旧集成库 | 页面停止，库与卷保留 | 有独有数据，不自动合并或删除 |
| 3020 / 55436review / 19000 | 页面停止，库和对象副本保留 | 隔离验证副本，非日常 |
| 本次全新恢复演练 | 验证后容器停止，卷保留 | 数据和附件回退演练证据 |
| 原Redis与后台Worker | 继续停止 | 未开启批处理、付费模型或采集 |

日常启动：在 integration 仓库运行 pnpm daily:check，再运行 pnpm dev:daily；复用 Git 忽略的 output/account-upgrade-private/formal-cutover-20261004/daily.env。当前后台启动无新可见窗口。review 配置另存 review.env，不得互换。旧通用 LOCAL_REAL 启动/迁移入口继续拒绝，提示转入 dev:daily，避免隐式启动 Worker 或自动迁移。

AUTH_SECRET、INTEGRATION_ENCRYPTION_KEY、S3 凭证从原环境复用；没有新造凭证或 admin。日常 Cookie 前缀 content-center-local-daily 与 review 隔离。EXTERNAL_CALLS_DISABLED=true 复用已有服务端 provider/DNS/ASR/采集拒绝边界；日常模型与采集页面显示“当前环境禁用”。保留历史错误/状态代码 LOCAL_REVIEW_OFFLINE / DISABLED_FOR_REVIEW，以兼容既有调用方。Redis 健康显示 UNREACHABLE、Worker 显示 MISSING 是按授权关闭的实际状态；需要后台处理的导入/转写/模型能力仍未交付可用。

## 本次验证

- 启动目标与环境清洗：Node 7/7。
- providers 外部边界：2 文件 8/8；日常标志拒绝 DNS/HTTP/ASR。
- Web 外部边界及服务状态：2 文件 10/10；日常标志下采集无子进程、ASR 无配置读取或请求。
- 55436隔离账号验证：4 文件 15/15。
- 隔离真实 HTTP：38 项，26 项跨客户拒绝；fixture 清理 true；任务和 provider usage 数量未增加。
- 正式真实 HTTP：13 项通过，含健康目标、登录页面、未登录读写拒绝和 review Cookie 拒绝；正式业务只读验收，无用户密码或已认证会话测试。
- Web/providers typecheck 通过；本次直接改动文件 lint 通过。未运行全仓 build、全量测试或真实付费 AI/采集验收。
- 首次脚本 lint 报告 Node 全局变量未声明；改为显式 node:url/node:process/node:console 导入后，本次定向 lint 与 7 项启动测试均通过。
- 首次根目录 vitest 收集误扫历史备份测试副本导致两套导入失败；随后限定 providers 模块真实源文件运行，2 文件 8 项全通过，未改历史备份消除错误。

原 PostgreSQL 55432 的既有 0.0.0.0 / IPv6 映射未在本次任务中变更；这是切换前已存在的监听配置。本次新启动 Web、MinIO 和临时附件演练均仅本机监听，没有新增公开监听。

## 回退位置和边界

私有回退目录：output/account-upgrade-private/formal-cutover-20261004（Git 忽略、不上传）。

- original-after-password.dump：d7d1fb318edb7f349fd085a36a11fb4b13bda6d9e62e6d97b50d690b6dcab7c7
- original-attachments.tar：d145e879a705223a27c2aaaa5f884174871cc3797a4d87e2095f987f4ffe00d7
- old-integration-preserved.dump：b26f696db110dcaad3f76e079bd879f9bc5399fdcac0121c36f34253fae973ea
- backup-manifest.json、restore-drill.json、drill/original-attachment-hashes.json、formal-migrate.log、formal-migrations.json、active-indexes.json、final-verification.json、daily-health.json、daily-http.json、http-isolation-evidence.json 与 code-before 记录回退点和实际验证。

恢复动作未执行。应用失败优先停止本项目 daily 进程并恢复必要配置；不要自动降级或删表。若需恢复数据库或附件，必须重新暂停写入并核对全部最新数据是否仍被该备份覆盖；任何切换后用户新增数据都使本备份不能直接覆盖。出现后续写入或需不可恢复覆盖时先报告，不丢弃用户数据，不使用旧副本替代原库。

## 待本人验收及任务整理

本人访问 http://localhost:3000/login，用已修改密码登录，核对自己的材料、项目和历史附件；未要求提供密码，也未宣称验证本人登录。

已授权阶段任务归档的入口核对：当前工具集合没有 Codex 会话归档 API，也没有 computer-use 技能要求的 node_repl 工具，无法从正式工具或可见 UI 核对任务 ID，因此未归档任何会话。未修改内部会话数据库/状态文件、未删项目目录或 worktree、未结束当前任务。三个已完成任务（01a10066-dc3f-743b-b616-5e10b41fb00f、01a10550-f70d-702a-9ee0-54c3d8a500ff、01a1060c-41ee-730e-9451-33ce727f20a5）可由有正式入口的父线程核对后归档；01a105e5-ea0d-7390-9055-c70be68d40e1 等交接验收后再归档。

## 后续已批准账号停用

切换后用户另行明确批准仅保留李俊恒启用、可恢复停用其余26账号并撤销其会话；资料、归属和凭证均保留。最新结果、19会话撤销和定向恢复说明见 [账号停用交付](account-disable-delivery-20261004.md)。

## 2026-10-05 宿主恢复后的实时复核

本轮实时发现Docker宿主与原3000进程均已停止；仅恢复本项目既有原PostgreSQL、原MinIO及既有日常入口，未重放迁移或覆盖数据。原库只读仍27用户（26停用）、32材料、44项目、62已完成迁移、0未完成迁移，active研究唯一索引保留。17附件361721426字节再次只读GET并与本次切换恢复SHA256一致；三项正式回退备份SHA256也未变。3000 live/login为200、未登录projects为401、9000 ready为200；3000 ready仍503，为后续代码现有配置检查缺口，不把历史健康验收当作当前完整可用。本人密码未代输，真实登录仍由本人验收。具体证据及研究样板验收见 [研究页面首批可见交付](research-redesign-delivery-20261005.md)。


## 2026-10-05 18:58 UTC 后续只读复核

正式库仍27用户、32材料、44项目、62完成迁移、0未完成迁移；原卷和改密后备份保留，未重放升级/恢复。日常3000 live/login200、未登录projects401、ready503。只读诊断确认daily启动路径缺LOCAL_RELEASE_PROFILE，readiness提前返回，根本未探测数据库/存储；三处代码与研究改版前一致。本轮诊断未改正式配置/秘密、未重启正式依赖，不将页面可访问等同完整就绪。账号/趋势后续界面与隔离证据见research-redesign-delivery-20261005.md。本人密码尚待本人登录验证。


## 2026-10-05 19:50 UTC 最终代码/隔离验收补记

dailyEnvironment在validateDaily之后显式设置LOCAL_RELEASE_PROFILE=daily，严格校验不变；19项profile和15项readiness回归通过，原研究及扩展浏览器组合13文件58项通过（总14文件73项）。最新production候选release-20261005T193349Z-edeedc4b的3030实际烟测通过并退出。用户3000未重启，原PID68104启动于17:47:39UTC，故当前实际ready仍503；代码修复不等于运行配置已生效。正式库只读仍27用户32材料44项目62完成迁移0未完成，两条active部分唯一索引保留。未改正式.env/凭据/库/卷/权限，无迁移或恢复。下一步受控网页重启和本人登录未执行。完整证据见research-redesign-delivery-20261005.md。
