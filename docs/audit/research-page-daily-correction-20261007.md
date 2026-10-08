# 研究页日常入口修正验收（2026-10-07）

## 授权与范围

用户要求直接修改现有研究页，复用现有转写，保留外层导航和产品风格。本次将此前 35 个转写/来源关联修复文件及 2 个报告版本切换相关文件精确整合回原仓库。没有整树覆盖，没有操作 Git 暂存区、提交或推送；未改模型默认值任务、数据库 Schema / migration、账号密码或权限。

## 已完成的页面变化

- 桌面详情压缩标题和指标，一句话说明后立即显示内容推进结构。
- 原文、段落作用与该段相关分析并排；原文可逐段展开；时间轴只用真实时间，没有时间码时显示段落顺序。
- 同账号作品与本人可读历史报告可切换；外工作/外用户报告返回 404。
- 创作准备改为居中对话框，先选择结构、项目和自己的观点，其他判断折叠；必须本人勾选审阅后才带入项目。不会自动发消息或保存共享成果。
- 没有报告时直接显示已有真实正文与诚实空状态，不填造拆解、指标或示例报告。

## 当前验证

隔离数据库 / Mock 提供商执行：浏览器 6 项、研究服务 6 项、界面 5 项全部通过；Web typecheck 与定向 lint 通过。浏览器覆盖实际 1440×900 首屏、390×844 移动端、逐段原文、版本/作品切换、未勾选禁止带入、明确审阅后私人交接、无消息/成果自动写入、转写编辑/任务恢复及权限拒绝。

桌面首屏检查结构区 y < 420、首段分析 y < 600；创作对话框高度 < 860 且不拉长底层页面。已实际查看视口截图，修正对话框居中和审阅勾选布局。截图是隔离测试内容，仅用于验证布局，不是用户业务报告。

证据目录：E:\codex1\2026-10-04\task-4\research-page-correction-20261007\acceptance
- report-desktop-1440x900.png
- report-mobile-390x844.png
- creation-review-1440x900.png
- creation-mobile-390x844.png
- browser-evidence.json

参考视频已从此前本地授权副本实际查看结构区帧。Library 三张图片本地下载返回 HTTP 403，未伪称下载成功，未绕过签名地址。

## 真实数据与运行交付

原库只读核对：74 条已保存作品，21 条非空转写；6 次历史研究均 FAILED，成功报告为 0。Review 库也没有成功报告。没有重复 ASR 或付费模型调用，没有写入真实业务测试数据。真实转写没有时间码时不估算段落时间。

目标日常页：
http://localhost:3000/research/benchmarks/cmtjsmw9e004pq9949rz82ux6/works/cmtjsn5920053q994sinitfr3

运行构建/切换结果见本文下一条运行记录。本人密码有效性与已登录真实内容的视觉验收仍须由用户本人完成，不代输密码或绕过登录。

## 备份与回退

逐文件备份及整合回执：
E:\codex1\2026-10-04\task-4\research-page-correction-20261007\backup-manifest.json
E:\codex1\2026-10-04\task-4\research-page-correction-20261007\original-before
E:\codex1\2026-10-04\task-4\research-page-correction-20261007\integration-receipt.json

原 HEAD 保持 ae3ff0879029394cec99ccb2f00d012e1e8a52ed；37 个目标外的全部基线文件无变化，index 空。源码回退只允许逐文件核对整合后 hash 未变化再恢复本次备份；有后续编辑须人工合并，不能覆盖。

旧日常不可变版本：release-20261006T152431Z-e439c607
已有 Web 回退启动器：
E:\codex1\2026-10-04\task-4\service-recovery-20261007\resume-original-daily.mjs
回退只停止本项目 3000 Web，不涉及数据库恢复。3030 Review、原 PostgreSQL/MinIO 及全部旧库卷保留。

## 实际运行记录

- 2026-10-07 已切换 3000 日常 Web 到 release-20261007T135423Z-39eeff11；launcher PID 98208，Web PID 80392，仅监听 127.0.0.1。
- 构建 BUILT，networkDenied=0，原 next-env/tsconfig 和构建时源码均保持不变；37 文件和运行快照 hash 一致。
- HTTP live/ready/login=200，ready=true；未登录研究 API=401，真实页面=307 正常跳转登录；3030 login=200、Web PID 26640 未改变。
- 原库切换前后数量完全一致：27 用户、32 资料、44 项目、74 作品、21 非空转写、6 历史研究（成功 0）、62 已应用迁移。无迁移执行。
- 已通过用户默认浏览器打开上方真实日常 URL；本人登录和真实内容视觉验收待本人操作。未代输密码，未创建演示账号或绕过认证。
- 运行使用原 daily 配置，后台任务与外部调用 disabled；原数据库、原 MinIO、Review 及旧环境不变。
- 完整运行回执：E:/codex1/2026-10-04/task-4/research-page-correction-20261007/daily-switch-receipt.json；HTTP 回执：E:/codex1/2026-10-04/task-4/research-page-correction-20261007/daily-http-checks.json。
- 源码精确回退脚本：E:/codex1/2026-10-04/task-4/research-page-correction-20261007/restore-task-source.mjs（未执行；检测到后续编辑会拒绝恢复）。旧 Web 回退启动器见上文。
- 首次整合命令因 Node eval 模式失败，没有改原文件；误启动的整合前构建已停止，产物未用于日常入口。
