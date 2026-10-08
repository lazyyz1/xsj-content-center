# A+B+C1 合并最终有界回归 — 2026-10-05

STATUS：本轮合并回归与精确差异复核完成，没有发现本轮引入且需进一步修改的确定源码缺陷；不表示全项目所有层已拆分或正式生产切换。本轮只补审计/证据，业务源码相对C1交付保持。

## 本次实际结果

- 新隔离production产物：release-20261005T084221Z-3b7a2b71，BUILT/exit0；完整Webpack编译3.4分钟、Web类型检查32.3秒、101静态生成完成。1135源码文件与1462产物文件有摘要。构建不加载正式运行配置、不迁移，networkDenied=0、sourceUnchanged=true、liveFilesUnchanged=true。旧A产物不再用于证明当前代码可生产构建。
- 55436/可丢弃56381：12直接相关Vitest文件73/73；覆盖就绪故障、健康队列、IngestJob提交/入队恢复、真实fixture子进程中断、并发/撤权、重试/取消、资料分析/提炼、账号空间/用户停用、C1只读输入、Artifact版本保存、研究ABC和改写边界。不是全仓测试。
- Node19/19：local/release目标与环境污染拒绝、网络预加载拒绝、纯契约与客户端边界。Worker类型检查通过；61个实际改动源码/测试路径lint通过。
- 8受影响组件独立浏览器包检查：32输入、0server输入；完整Next产物293个client JS做服务端模块名称核对，未命中Prisma/应用DB/server-only标记。两个配置名称命中分别为公共INVALID_INTEGRATION_ENCRYPTION_KEY错误代码及Better Auth通用env名称，后者chunk与A产物字节相同。仅查名称，没有搜索真实秘密值；不是整站秘密渗透测试。
- 新候选review3030：live/ready/login200、匿名projects401、生产dev-health404；端口冲突拒绝。首次匿名项目请求1087ms，其他29/6/67/16ms；这是一次冒烟计时，不是负载/延迟SLA验收。
- 正常退出0，runtime锁移除；另注入监督器就绪失败，退出1、仅自身子进程关闭和锁移除。结束后再次check review验证当前源码/产物及配置通过。
- B/C fixture用户/空间/任务计数均0；测试Redis停止并保留容器。3017/3020/3030/56381无监听。正式3000仍PID74600；MinIO9000/9001原服务回环；日常匿名live/login/MinIO200、projects401。未登录正式用户、未改原55432/密码/26停用账号/资料归属，未启真实Worker/模型或更改开发编译配置。

本轮未重做全仓Playwright、真实付费调用、真实本人登录/完整灾难恢复、生产负载；这些不借历史结果当当前通过。ResearchRun实际杀Next进程尚未演练，C1的状态用例为隔离fixture模拟。

## 精确交付与回退

output/architecture-upgrade-20261005/final：
- A-B-C1-task.diff：68实际源码路径，从每路径最早已核验的pre-A/pre-B/pre-C1快照生成；25个本系列新增路径。199057字节，避免用git HEAD大diff混入原有未提交成果。
- combined-diff-ledger.json记录每路径baseline来源与前后摘要；final-manifest.json关联当前release receipt、源码/产物、测试和环境边界。render模板等非build输入单独保留在路径台账，不冒充已由Next构建验证。
- test-latest.log、worker-latest.log、lint-latest.log、fixture-latest.log、candidate-smoke.json/log、candidate-failure.json/log、production-client-marker-check.json、daily-readonly-http.json。均Git忽略、本地保管，不上传。

本轮没有git add/commit/push、合并或覆盖；源码回退只按本批hunk，禁止整树恢复快照或回滚用户后续数据。生产候选当前停止，仅保留产物供下一步批准后使用；正式3000仍开发daily，不会自动改为production。

## ResearchRun 供集中询问的具体摘要

已证实：DB提交后after回调丢失会留下QUEUED；claim后中断可能留下RUNNING且外部效果未知。15分钟读取显示FAILED，持久行仍可能QUEUED/RUNNING；同requestKey早返回created=false不再调度，新requestKey才结算旧行并建立v2。

推荐先批准R1实施+隔离验证：
1. 保持现有15分钟createdAt政策；用户状态读取或同key重放时，仅对仍QUEUED且过期的记录按workspace/user/session完整scope持久结算FAILED/INTERRUPTED；ID/requestKey/历史版本保留。
2. 同key返回原失败记录/created=false，不自动新建版本或重发模型；只有用户主动新请求重试才走既有下一版本。
3. 不无条件结算/重放RUNNING。若要同时修改“执行结果待确认/重试可能重复费用”提示和显式重试确认，应明确批准这一用户可见行为，并核对各profile终态保护。

R1不需要新schema/migration、新后台进程或自动模型调用；解决尚未开始任务的持久状态/提示矛盾，不能声称全部崩溃恢复。正式3000应用R1代码仍需具体运行切换授权，不包含在本轮回归。

R2专属持久消费者另审：自动恢复未开始QUEUED意图会按原请求调用模型，可能产生费用；执行方式需批准，不能将ResearchRun塞入IngestJob或混Benchmark旧表。RUNNING绝不因超时自动重发。snapshot/heartbeat是否需新列应先按profile实证，若需schema先提migration/演练，不提前执行。详见 research-run-recovery-proposal-20261005.md；本轮未实施R1/R2。

## 尚未完成的架构债清单

| 项目 | 当前状态与下一步 |
| --- | --- |
| ResearchRun after持久恢复 | GAP；上面的R1/R2具体审批。现有IngestJob恢复不覆盖它 |
| BenchmarkStudy / CollectionRun旧表 | 仍有旧恢复/时间戳delivery链，不在B代表IngestJob收口；先独立诊断，不能误接新研究 |
| autoTranscribe后续任务窗口 | 主任务SUCCEEDED到后续意图创建之间仍有窗口；另卡补故障演练与最小持久意图方案 |
| 外部Provider效果幂等 | 不承诺exactly-once；长任务超过现有15分钟锁/timeout范围与外部结果未知处理未全面验证 |
| 全项目client/server/DTO服务边界 | C1只处理四组类型、8组件及研究首页；其他模块仍需按实际依赖逐卡，不做六板块重组 |
| source请求nonce前端覆盖 | 后端可选request key已收口；不是所有前端都接入，无key文本按现语义可建立不同材料 |
| 兼容/独有业务三项 | 原目录独有UI、Canvas/母稿兼容入口、默认方法面板继续保留待业务确认；不恢复/删除/修改隐藏链 |
| 客户正式发行 | 当前仍本地开发daily。production切换、HTTPS/代理、本人登录、邮件渠道、负载、跨机器发行、完整升级/灾难恢复等尚未交付 |
| FUTURE能力 | License/Desktop/统一Tool或Research Runtime等不因文档出现获提前施工许可 |

以上是有界清单，不是全仓审计结论。每个下一卡须写直接调用者、不变量、数据边界和实际验证，不用继续架构重写替代具体交付。

## 后续 R1 源码变化提示

以上 production 产物与73/19回归是 R1 前实际证据。R1已改动研究状态服务与相关测试，当前 check review 返回 RELEASE_SOURCE_CHANGED_REBUILD_REQUIRED；本页不能证明当前源码已production构建。本轮 R1 的50项/type/lint/边界、运行只读状态及保留/暂缓范围见 architecture-R1-and-common-foundation-delivery-20261005.md。

## 当前源码生产构建补验已完成

后续明确批准的安全补验已完成：release-20261005T095244Z-9fc96386隔离production构建成功，3030匿名smoke及占用拒绝通过，候选退出0/锁移除；3000原进程保持。当前1136源hash/1462产物hash与测试复用证据已关联，不再仅引用pre-R1旧build。本页此前“未重建”是R1初次交付时状态，现由 architecture-current-production-evidence-20261005.md 补充更新。没有重新执行此前55→62迁移，Git保持未暂存/未提交。
