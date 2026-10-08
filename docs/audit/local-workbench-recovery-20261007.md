# 本地工作台恢复（2026-10-07）

STATUS：RESTORED；用户明确要求“打开失败，重启数据库”。

## 故障与恢复

最初3000 / 3030 / 55432 / 55436均未监听，Docker Linux engine命名管道不存在。原Docker Desktop未运行，docker-desktop WSL已停止；电脑并非刚重启（本次会话系统boot记录仍为9月28日）。恢复Docker后，原正式 / review数据库与MinIO容器均为Exited255状态。已证实的直接原因是Docker环境和网页进程停止；为何停止尚未确定，没有将其解释为schema或账号问题。

启动原安装Docker Desktop，然后仅启动以下原有容器，未create / remove / recreate容器或卷：
- content-center-postgres-1：55432 / content_center / content-center_postgres_data。
- content-center-upgrade-review：55436 / content_center_upgrade_review / content-center-upgrade-review-data。
- content-center-minio-1：9000 / content-center_minio_data。
- content-center-upgrade-review-minio：19000 / content-center-upgrade-review-object-data。

55435历史库、其他数据库/Redis容器未操作。原容器ID及卷映射已inspect核对；原55432端口绑定保持原样，没有新扩展监听。

## 网页版本保持

3000恢复release-20261006T152431Z-e439c607，launcher37928 / app22820。
3030恢复release-20261006T171407Z-0f54c32f，launcher89004 / app55104。
两者均仅127.0.0.1网页监听。没有将老师候选或工作区WIP部署到正式3000。

两个不可变产物全部artifact hash / BUILD_ID与BUILT收据一致，候选当前source hash也一致。正式旧版与工作区11个老师相关文件不同，正常新部署source一致性校验不能用于把旧版重新构建为正式。为恢复用户明确要求的原版本，单次E目录恢复脚本固定该已批准旧artifact，完整校验产物及原runtime profile脚本hash，使用既有validated runtimeEnvironment和原daily.env内部配置启动原产物；没有修改常规release/deploy保护、认证或任何源代码。Generic external / Worker关闭，保留原正式新闻功能配置与定时，没有额外开启付费或采集。
旧锁24596/78836的进程均确认不存在后归档；没有移除活进程锁。恢复脚本及安全日志留在E目录。

## 实际验证

两个PostgreSQL pg_isready accepting connections。
BEGIN READ ONLY数据库读取：两个库均27 users /44 projects /32 materials /31 assets /62 completed migrations。查询未读取密码hash或session token。
两个/api/health/ready均ready=true，configuration/database/storage全部true；backgroundTasks=disabled。

本人电脑原Edge真实会话验证：
1. 正式http://localhost:3000/library成功加载工作台资料库，当前工作空间显示16条资料及历史缩略图，没有登录/连接错误。
2. 同一现有Edge另开http://localhost:3030/research/benchmarks成功加载真实老师/对标页，2个历史账号及真实作品榜可见，无登录/连接错误。没有造fixture、没有启动任何研究/模型、没有点击同步/分析或写业务数据。
未读取Cookie、未代填密码、未修改权限；这里只证明现有会话可用，不等于本人密码重新登录验收。

本地截图：E:/codex1/2026-10-04/task-4/service-recovery-20261007/formal-user-library.png、candidate-user-page.png。
证据汇总同目录FINAL-EVIDENCE.json。
HEAD仍ae3ff0879029394cec99ccb2f00d012e1e8a52ed。所有资料、原卷与未提交源代码保留。未migration/reset/seed、未git add/commit/push、未开启OS自启动。
