# 架构收口实施总计划与执行卡 — 2026-10-05

STATUS：A、B、C1、R1 已完成有界交付，共同技术底座在当前批准范围收口。以下执行卡与历史假设保留追溯；C1仅四契约/既有只读输入服务，B仅代表IngestJob，不等于全架构完成。旧研究兼容保留，研究业务重构与R2暂缓；六板块方案撤回。最新结果见 architecture-R1-and-common-foundation-delivery-20261005.md，本计划不是Governance Update。

## 总目标与固定边界

在一个月外部客户交付目标下，建立可重复生产构建/启动/检查/回退路径，随后补任务可靠性和渐进领域边界。HEAD ae3ff087已有大量未提交成果；只精确修改本卡路径，不reset、整树覆盖、暂存、提交、push或部署。日常3000、原55432及MinIO9000保持；正式模型/采集/Worker禁用。所有写入测试只用硬校验隔离55436；不读取/输出真实密码hash/token/环境秘密，不创建凭证，不改真实账号、角色或归属。正式运行切换和新迁移应用另需明确确认。

## 执行约束提示词（每批开工必须带入）

你是当前唯一写入者。先读AGENTS、PRODUCT、ARCHITECTURE、LEGACY以及本卡和上一批实际交付。复核实时代码，先复用已有机制；目标与实现不符标CURRENT IMPLEMENTATION GAP。限定本卡允许路径，其他问题登记不顺手修。保护现有未提交hunk；修改前本地忽略快照，修改后给源文件hash和实际验收证据。不能关闭类型检查、忽略构建错误、隐藏UI/认证来通过验收。每个里程碑反馈实质结果；发现数据、权限、付费或公网范围变化立即停相关步骤。只报告本轮实际验证，不借用历史结果；声明未测生产负载。不得把计划、模拟发送或本地build写成正式上线。

## A：生产构建、启动与配置治理（已交付）

目标：构建与运行职责分开；离线生产build不读取正式配置、不访问正式数据库、不迁移/seed/初始化账号；隔离输出不覆盖3000使用的.next。提供严格启动预检、配置清单、匿名最小健康/就绪、失败退出与回退说明。
事实：日常启动脚本硬限定3000/55432并禁止Worker；旧LOCAL_REAL启动器被拦截；Next现有.next-release-check与review目录；历史render.free在启动时迁移和bootstrap。
假设待验证：全部动态业务页可在无网络生产build中编译；生产候选可在仅回环隔离端口、review配置运行；匿名健康不触发认证限流或暴露租户数据；依赖错误应503而非假就绪。
允许路径：package.json的相关脚本、scripts/local-*与新release脚本/定向Node测试、apps/web/next.config.ts及构建阻塞最小hunk、middleware或路由代理的健康放行、apps/web/app/api/health/*、server/runtime相关代码、render*.yaml危险启动耦合、docs/audit本计划与交付、.gitignore本次产物。若超出需先登记依赖证据。
非目标：切换当前3000、正式生产部署/负载压测、真实Worker或付费调用、License/Desktop实现、领域重写、新DB/schema。
数据/权限：build输入只源码和非运行占位值；网络阻断继承子进程，正式配置不参与build。启动只能显式校验daily/review；本轮生产候选仅review隔离端口。就绪只检查SELECT 1及批准的本机存储，不读业务内容、secret、provider配置；禁用依赖明确显示disabled。
验收命令/用例：node --test scripts/release*.test.mjs；node scripts/local-release.mjs build；node scripts/local-release.mjs check review <artifact>；隔离start/smoke；缺配置、错误DB、端口冲突、缺产物、依赖断开、build网络请求、失败进程退出、健康/未登录/跨环境cookie拒绝；相关typecheck/lint。命令最终以交付实际实现为准，不输出.env。
回退：只停止本轮候选进程；保留失败构建和manifest，不递归删除用户目录；精确恢复本批hunk。DB无结构/业务变更，不恢复旧库。正式切换将来停止写入并核对最新备份后独立批准，不能覆盖后续数据。
进入B条件：生产build实跑成功或精确阻塞；安全预检与故障用例通过；3000进程/源码不被build改写；候选关闭；交付hash/测试/风险由父线程核对。未做生产负载不得写全生产验收通过。

## B：任务提交恢复与业务幂等、Worker模式

目标：消除DB提交与入队之间的遗失窗口、重复业务效果；显式独立/embedded兼容模式，允许同模式正常多消费者水平扩展。
事实：现有IngestJob、BullMQ重试、terminal失败落库、部分active唯一索引存在；代表source-service在事务提交后入队并catch补偿；free-runtime串行锁仅进程内。
假设待验证：既有reconcile/重放/取消能力、各processor幂等及provider计费记录覆盖程度；先检索复用，不先造新任务系统。
允许路径：apps/worker/src任务与队列/运行入口、apps/web/server相关enqueue服务和embedded-worker/instrumentation、packages/core必要现有任务契约、相应测试/docs。新schema只在确有必要时提出影响并在55436演练，不默认正式应用。
非目标：禁止多Worker、重建数据库、迁移所有AI为新引擎、承诺外部模型exactly-once、真实计费调用。
数据/权限：所有故障测试隔离55436+隔离队列/假provider；scope保留；业务唯一key基于业务操作而非纯时间戳；不可用幂等性掩盖授权；取消不删除已保存资料。
验收：逐链路注入提交后未入队、入队后响应丢失、执行中kill/重启、超时/重试/取消、相同请求重放、同模式双消费者；验证恢复、有限重试、终态、唯一结果/计费记录、跨workspace拒绝。外部付费调用数0。
回退：停止隔离消费者，保留证据；恢复本批代码hunk，保留业务数据；schema方案另审。
进入C条件：代表任务故障用例及scope回归通过，Worker模式互斥不限制正常扩展；未覆盖链路明确列出，迁移未获批不得应用正式。

## C：技术契约与依赖边界（C1已交付，扩展仍逐卡限定）

目标：保持UI→API→服务→数据/适配器方向；共享DTO/type纯契约、server-only边界及自动检查；减少页面直Prisma和重复入口鉴权，保事务内新鲜状态校验。
事实：SSR直调服务是合法路径；客户端多为import type，少量纯函数存server目录；Project基础创建混场景编排，Material/Research/旧Studio有兼容链路。
假设待验证：直接调用方/返回DTO兼容、哪些查询可复用现有read model；客户端产物是否存在秘密模块引用（只查模块引用，禁止搜索输出真实秘密值）。
允许路径：每小卡明确一个模块的components/app/API/server契约与service，必要现有packages/core；边界lint/产物检查及相关测试。只允许下一张明确小卡的纯DTO/type、server-only依赖检查、既有服务/read model技术职责整理；不按预设业务板块安排拆分顺序。
非目标：SSR强制绕HTTP、一次全库重写、删除隐藏组件/旧路由/Studio链路、恢复原目录口播协议、改变Prompt/模型路由/Skill、研究三入口与项目交互重组、真实数据归属调整、新schema/正式迁移、全量重命名、提前统一Tool/Research Runtime或扩展FUTURE域。六板块建议已撤回；产品域与隐藏功能去留不能由技术C自行决定。
数据/权限：输出只明确DTO；全部scope/RBAC与停用保护保留；服务事务内角色校验不得因入口已检查而删除。
验收：模块定向单元/API/E2E、旧新调用方契约、跨客户拒绝、账户停用/OWNER并发、客户端依赖图禁止DB/加密/provider凭证模块、生产build产物模块引用检查。
回退：逐卡精确hunk/新纯契约文件回退，不回退数据。进入后续交付条件：每模块兼容回归与边界检查通过，未完成的权威GAP保留，最终客户发行另做V3范围验收。

## B实绩与C入口

见 architecture-B-delivery-20261005.md 与 architecture-B-worker-runbook-20261005.md。无schema/正式Worker启用，57项原定Vitest覆盖加1项分页补测、16项Node环境保护；以实际分批执行记录为准。正式业务数据与62有效迁移不变。Benchmark旧表恢复、autoTranscribe后续意图窗口、A冷请求精确profiling已登记GAP，不扩业务/无限重构。C先依据 local-mainline-and-llm-map-20261005.md 核定实际调用方，再做明确小卡的纯契约/依赖边界技术工作；业务流程去留、领域拆分暂停，独有增量全部保留。不把共享Provider或DraftBranch原语当作旧业务回流证据。账号/数据/丢稿回归需先报告定位，正式运行切换与新schema应用另行授权。

## C1实绩与剩余边界

2026-10-05 C1已完成四组20个纯type定义落位、8组件类型依赖迁移/浏览器包检查、研究首页只读查询收口到既有鉴权read model。最终隔离13项Vitest、3项Node边界、Web类型及精确lint通过。详见 architecture-C1-delivery-20261005.md。本次没有业务拆分、Prompt/选路/保存语义或正式运行变化；其他C卡未实施。ResearchRun after恢复缺口已诊断，最小修复方案见 research-run-recovery-proposal-20261005.md，执行方式/状态策略须另获具体授权。原独有UI、兼容隐藏入口、默认方法UI全部保留，不作C技术重构决定。

## A+B+C1合并回归

当前源码新production产物 release-20261005T084221Z-3b7a2b71 构建/隔离3030启动与退出通过；12文件73项Vitest、19项Node、Worker类型和61路径lint通过。68路径逐批精确diff与最终manifest保留本机。正式3000不切换，ResearchRun R1/R2未实施。实际范围、具体审批摘要及剩余架构债见 architecture-final-verification-20261005.md；不将本次有界回归称为全项目架构完成。

## R1 与共同底座最终收口

R1按明确批准只结算超过15分钟且无执行标记的QUEUED，保留记录/版本；同key不重新登记after，RUNNING不结算/自动重放。10文件50项、Web类型、九文件lint、边界3项通过，fixture清零。无迁移/付费/Worker/正式服务切换；旧production产物因源码改变已被检查拒绝，本轮未重建。旧业务与独有成果保留，R2及研究业务重构暂缓。精确9路径diff和摘要在本地忽略R1证据目录，GIT READY_TO_STAGE。

## 当前源码生产构建补验已完成

后续明确批准的安全补验已完成：release-20261005T095244Z-9fc96386隔离production构建成功，3030匿名smoke及占用拒绝通过，候选退出0/锁移除；3000原进程保持。当前1136源hash/1462产物hash与测试复用证据已关联，不再仅引用pre-R1旧build。本页此前“未重建”是R1初次交付时状态，现由 architecture-current-production-evidence-20261005.md 补充更新。没有重新执行此前55→62迁移，Git保持未暂存/未提交。
