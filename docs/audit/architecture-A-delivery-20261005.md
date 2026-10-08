# 架构A批实施交付 — 2026-10-05

STATUS：总计划/逐批卡及A批实际实现、生产build和隔离启动验证完成；B/C未施工，由父线程按卡接续。未切换正式3000，未部署、迁移、暂存/提交/push；不把本批写成全部架构债已解决。

## 交付与范围

- [总计划及A/B/C执行卡](architecture-upgrade-plan-20261005.md)：目标、事实/假设、允许路径、非目标、数据/权限、验收、回退及下一批条件齐全，含每批必带执行提示词。
- [本地生产运行手册](local-production-runbook-20261005.md)：配置字段、构建与运行职责、维护升级、候选预检、故障退出与回退。
- root build/release:build进入scripts/local-release.mjs，而非绕开旧LOCAL_REAL保护；旧build:legacy仍受原保护。build不读取运行.env、不安装、迁移、seed或bootstrap；只用明确非运行占位和不可连接的127.0.0.1:1数据库。
- 独立源码工作目录和.next-production。已安装workspace依赖以junction只读复用，不覆盖日常.next/review目录；这仍是依赖当前checkout的本地候选，不是便携安装包。
- strict daily/review配置预检；现有凭证由进程读取但不输出、不另存到候选；缺项/错误DB/旧55435/远程/构建占位、端口冲突、变更源码或产物均拒绝。production review派生3030与独立Cookie，Worker/外调/自动体验和注册明确关闭。
- /api/health/live仅活性；/api/health/ready只做明确release配置、DB SELECT 1和固定本机MinIO ready，无租户数据、URL或secret。启动未就绪45秒内拒绝退出，无备用库。正常停止清理自身锁；强杀残留按手册确认进程退出后只清理自己的锁。
- render.yaml和render.free.yaml标LEGACY COMPATIBILITY，移除自动迁移/账号bootstrap与启动耦合；保历史staging入口，明确不是客户正式方案。健康模板仅使用live，不能把活性当全部依赖就绪。

实际代码路径：package.json；scripts/local-release.mjs、local-release-profile.mjs、release-build-network.mjs、release-profile.test.mjs；apps/web/server/runtime/readiness.ts；apps/web/app/api/health/live/route.ts、ready/route.ts；apps/web/tests/release-readiness.test.ts；render.yaml、render.free.yaml。

## 本轮实际验证

成功产物：release-20261005T060130Z-244d397f，私有receipt/build.log在output/architecture-upgrade-20261005/releases/<id>/。

| 验证 | 实际结果 |
| --- | --- |
| 完整Next production build | exit0，编译4.3分钟、TypeScript31.3秒、生成阶段101/101、优化和trace完成 |
| 构建隔离 | networkDenied=0；liveFilesUnchanged=true、sourceUnchanged=true；没有加载正式凭证、原数据库或运行迁移 |
| 配置/预加载 | Node9项通过：继承污染隔离、Windows实际file URL、HTTP/fetch/TCP拒绝、错误目标/配置、旧LOCAL_REAL仍阻止 |
| 就绪故障 | Vitest8项通过：缺配置不探测、DB/存储失败、异常安全返回、不可信目标、健康成功。依赖失败用注入，不停实际DB/MinIO |
| production候选预检 | review/3030/55436/19000通过，固定回环；不启Worker/外调 |
| production真实HTTP | live200、ready200、登录页200、匿名项目API401、production开发健康404；端口冲突预检退出1 |
| 真实监督器故障 | 注入未就绪响应，退出1、自身子进程结束、运行锁清理；不隐式换库 |
| 产物拒绝实跑 | BUILD_ID、产物文件、源码hash三个篡改场景全拒绝；精确恢复自身文件后无变更 |
| lint / diff | 本批定向lint、diff --check均通过 |
| 收口端口 | 3030候选正常退出0并清理锁；3017/3020/3030/3010无监听，只有127.0.0.1:3000，PID74600 |

中间失败保留，没有借用历史结果：副本依赖链接/根Vitest配置遗漏、Windows预加载绝对路径、无必要的加密占位格式问题均已修复。加密构建阻塞通过省去build加密配置解决，复用现有未配置构造行为，没有伪造有效密钥、修改共享IntegrationService或放松运行校验；179编译API路由加载预检通过。

第一次HTTP验证5秒超时，验证控制器退出并导致自身锁残留；确认锁记录PID已退出且3030无监听后只移除该候选锁。改进控制器日志/关闭事件记录与20秒超时、显式IPv4后实际HTTP通过。最终匿名项目API首次响应19.323秒，其余live33ms、ready8ms、login66ms、dev健康15ms；冷启动长延迟是待诊断风险，不能写成性能验收通过，后续B/C检查路由依赖加载与运行初始化。

## 正式数据与日常服务

显式只读事务核对：27用户/1启用、32材料、44项目、62迁移、72IngestJob、305ApiUsage保持；未选择password hash/token，没有真实密码登录或成员/角色/归属修改。正式Worker、模型和采集继续关闭；原MinIO和全部旧库/卷保留。

施工开始编辑根Next配置曾触发开发监视器自动重载、改变PID。这不是正式production切换，但不得声称全程无重载。已精确撤回本批hunk，根Next配置与批前快照一致；后续仅修改副本配置，最终3000登录仍200。构建本身未改日常next-env.d.ts/tsconfig或覆盖.next。

## 证据、回退与下一批

本地忽略证据：output/architecture-upgrade-20261005/；before修改前快照、各次失败产物/build.log、成功receipt、release-profile-tests.log、readiness-tests.log、lint.log、candidate-smoke.json/log、candidate-failure.json/log、artifact-rejection.json、formal-readonly-state.json、final-listeners.json、source-and-evidence.json。没有上传。

代码回退仅本批hunk/新文件；不得整树覆盖已存在成果。停止候选即可保留原日常服务，没有数据库恢复需求；不得覆盖用户后续数据。源码变更后需重新build，不能拿过期receipt冒充匹配。

B进入条件已具备：build及安全启动/退出路径实跑完成，候选关闭、数据边界保持；父线程核对此证据后按B卡继续任务遗失窗口、业务幂等和明确Worker模式。C随后按模块逐步收拢，不将正常多消费者当bug、不强迫SSR绕HTTP、不删旧数据链路。

尚未验证：正式3000 production切换、真实本人密码/production登录Cookie、HTTPS/代理、生产负载/冷启动性能、跨机器便携发行、完整升级与灾难恢复、真实邮件/模型/采集/任务运行。邮件渠道仍未接入。正式运行切换/迁移和外部服务启用仍须另行批准。本轮不实施License/Desktop或全部Tool/Research Runtime。
