# 模型获取与连接失败诊断（2026-10-06）

## 最终交付状态（2026-10-06；模型恢复仍待确认）

STATUS：模型诊断与错误传递代码、隔离验收完成；正式模型目录／连接／生成尚未恢复。研究补改与新研究实现全部停止，本轮研究业务文件修改0。READY_TO_STAGE，未暂存／提交／推送，不删除、不回滚旧代码或数据。

根因分开说明：模型目录链路被日常外调拒绝策略拦截后原本误报502；连接测试同被拦截，却以HTTP200＋失败正文／前端通用网络提示呈现。另一个代码断点是连接测试前端catch再次丢掉真实原因。现将策略拒绝明确为EXTERNAL_CALLS_DISABLED，保留登录／角色拒绝优先；模型目录配置异常复用既有integrationApiError，区分上游目录授权失败与超时。当前不会因此放开实际调用。

CHANGED：3个代码文件——integrations/LLM/models路由、integrations/[provider]/test路由、IntegrationCard；2个新测试文件；本文。未修改profile、安全策略、模型runtime、凭据、正式业务数据或研究代码。

VERIFICATION：4个文件39项去重通过：
- integration-external-policy：19项（权限、三类离线条件、允许路径、缺配置、配置异常、上游401/403与超时），配置读取及上游请求均Mock。
- providers/review-policy：7项，真实执行策略逻辑，DNS及传输为spy，证实策略拒绝先于网络。
- integration-card-browser：1项，独立headless Chromium中真实IntegrationCard控件实际操作；加载→获取受阻提示→选择模拟目录模型→连接受阻提示→模拟成功→保存失败保留输入→重试保存→模拟重开。配置保存为内存Mock，未挂载完整Next设置页或整页样式，不能拿此截图当正式设置页视觉验收。pageerror为空、外部网络0，未接管用户浏览器标签。
- integrations/service.integration：12项，55436隔离副本上合成账号／工作空间配置的真实加密存储、重新读取、模型与服务分离、换服务凭据要求、默认拒绝缺加密key、scope隔离；不访问原库的配置或秘密，测试夹具清理完成。
- 最终Web typecheck、5文件定向lint通过；未跑全仓、正式保存、真实目录／连接／生成或新版生产构建。

这39项是独立证据组合，不是同一条完整Next页面＋真实HTTP＋数据库＋服务商的连续端到端。因此完整正式流程依然待验；不得把Mock连接或保存冒充服务商连接／正式配置保存成功。早期浏览器准备失败在补齐已安装依赖、JSX转换、框架环境与路由桩后解决；最新27项组合已成功，下面旧“浏览器未通过”段落仅为当时历史，不替代最终结果。

证据根：output/model-settings-diagnosis-20261006/iteration-1791260269062。browser-evidence.json、isolated-model-config-lifecycle.png为最终独立组件证据；service测试日志以last-test.json指向，verification-final.json汇总最终结果。browser-failure.json/png保留准备期失败，不覆盖为成功。before/与task-only.diff保留精确代码前后差异；前期verification.json及final-status.json以最新verification-final.json为准。

BOUNDARY：3000仍为既有PID68104，未重启；不读／重录正式Key、密码或.env秘密。仅复用已有隔离测试启动器，不输出其配置值。正式profile、外调、权限、凭据、数据库、MinIO、Worker及邮件未改；真实外部请求0。

### 可以一次确认的恢复选择

推荐范围：只恢复已登录用户主动的模型目录、连接测试和生成，继续关闭采集／邮件／搜索／转录／Worker／定时批量；复用既有应用配置，不代填密钥，仅受控重启3000网页进程。用户本人操作真实获取／测试／生成，助手只做本地健康检查，不主动发真实模型探测。

现有代码不存在仅手动LLM许可。EXTERNAL_CALLS_DISABLED、LOCAL_REVIEW_OFFLINE及LOCAL_REVIEW共同拒绝外调；WORKER_MODE/FREE_WORKER_MODE控制后台，但不能代替手动调用白名单。daily启动、生产runtime及readiness强制总外调关闭，不能直接翻总开关。

获确认后所需代码治理：在现有profile和provider策略中新增明确手动模型模式（建议daily-manual-llm，尚未实现）；许可仅从服务端认证过的主动操作上下文传递到模型目录／连接／生成链路，审查直接调用方，后台或缺上下文默认拒绝。调整local-profile、local-web、local-release-profile、readiness、review-policy/providerFetch、openai-compatible及llm-runtime的实际拦截边界，不新建平行ModelRouter，不以URL/Prompt/UI隐藏作权限替代。

非秘密设置范围：明确profile标记＋手动LLM操作许可（均待实现）；保持EXTERNAL_CALLS_DISABLED作为其他外调默认拒绝、review默认拒绝、Worker disabled、FREE_WORKER_MODE=false、Redis不可达。原数据库／存储／认证／加密／Cookie和Provider配置复用；不添加新凭据。先隔离验证例外作用于手动模型且不泄漏到其他provider或后台，再只重启本机3000，原库、附件及其他服务不重启，不切生产候选。

更窄选择：先仅恢复目录与连接测试，生成继续禁用；需要同样明确许可与启动治理，不是零代码的开关。无论选择哪种，正式操作尚未执行。

风险：目录向已配置服务发送带授权请求，收费情况未确认；连接测试发送固定Reply OK和最多16输出token，可能计费；用户主动生成发送其所选材料及上下文至本人配置服务商并可能计费。授权不包含自动外调、凭据改写、权限扩张或公开监听。

---
下为早期诊断／准备期记录，当前状态以本节为准。


STATUS：研究首屏三项修复暂停，未写入相关业务代码；本轮仅诊断模型设置并修正两条接口对本地安全策略的错误提示。READY_TO_STAGE，未暂存／提交／推送。

## 已确认事实与归因边界

- 用户症状为模型获取失败、连接不上；并非设置页无法渲染。
- 已有正式日志 daily-recovery.stdout.log（位于 output/research-redesign-20261005/iteration-20261005T171639889Z-cca4efa5）记录 GET /api/integrations/LLM/models 多次502，POST /api/integrations/LLM/test 多次200。连接测试200只是请求处理成功，正文可能是 ok:false；未读取用户凭证或重发这些请求。
- 3000 PID68104，启动于2026-10-05T17:47:39.7481195Z，仍为原 daily 进程。本轮未重启、未读取进程环境或.env秘密。
- daily 启动校验强制 EXTERNAL_CALLS_DISABLED=true。providers 的 providerFetch 首句执行 assertReviewExternalAllowed，策略命中抛 LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED，先于URL解析、DNS及HTTP。
- 模型列表旧路由把异常统一映射为 MODEL_LIST_UNAVAILABLE/502；连接测试旧逻辑把策略拒绝统一描述为地址／网络问题，造成症状和根因不对应。
- 本地安全策略是两条故障链路的高置信归因：已有启动约束、未换进程、两条共同拦截路径和现有HTTP记录一致。历史日志没有保留被吞掉的异常代码／响应正文，本轮未用正式凭证调用接口，不能声称已取得该次实际异常对象。
- 配置GET/PUT不经这个外调拦截器，仍受登录、workspace及OWNER/ADMIN管理权限检查。本轮未执行正式配置保存，不宣称所有配置功能已实测恢复。
- 远端连通性、服务商兼容性、密钥有效性、额度等均未证实或排除。没有根据错误猜测修改模型ID、凭证或API地址。

## 最小修复

仅在权限检查之后增加本地策略前置判断：
- GET /api/integrations/LLM/models：策略命中返回 EXTERNAL_CALLS_DISABLED/403，明确“本机已暂停外部调用，配置仍可查看和保存”。
- POST /api/integrations/LLM/test：只对LLM做相同判断，补充连接测试可能产生服务费用；在读取凭证与调用测试服务之前返回。
- 复用 isLocalReviewOffline；没有修改 providerFetch、安全策略、全局ModelRouter、配置保存逻辑或任何环境开关。不是让外调绕过暂停策略。

## 本轮验证

2文件22项通过：新增路由测试15项＋既有providers边界测试7项，互不重复。
覆盖daily外调暂停／review离线标志／review环境、未登录与VIEWER/EDITOR拒绝、策略允许时纯Mock路径、缺失配置409；provider边界验证DNS与传输均未发生。
Web typecheck、三个文件定向lint及git diff --check通过。初次typecheck发现新增测试Response可能为空，补充明确断言后重新通过；未删除失败证据或松动生产规则。
纯Mock配置不加载项目.env，不连接数据库，无真实Key、真实网络、真实模型或采集。没有测试正式保存、全局E2E、真实服务连接或研究结果页。

证据根：output/model-settings-diagnosis-20261006/iteration-1791260269062，含两路由before快照、定向差异、脱敏验证回执；原大量未提交修改继续保护。

## 待用户决定

是否恢复正式模型的真实外部调用，需明确决定；当前任务未获该授权，不改安全策略或重启3000。
若决定验证：读取模型目录会向已保存服务的 /models 发送授权请求（通常为目录请求，服务商是否计费未确认）；连接测试会向 /chat/completions 发送固定“Reply OK.”与最多16输出token，可能计费，不发送研究或项目资料。真实操作前应明确验证范围，不一并开启采集、自动任务或其他外调。
本轮不接管／刷新用户正在编辑的设置标签，也不读取或截图密钥表单。研究首页三项与其他结果页验收继续暂停，等待安排。

## 当前最终状态与一次确认的恢复方案（用户已停止研究补改）

研究区：此前三项修复仅完成代码定位，没有写入研究业务文件，没有研究回归运行；旧代码和数据保留，不删除／回滚／提交。用户要求从0设计新体验，不授权删除、重建账号或数据库；本线程不开始新研究实现。

模型诊断当前改动：两条API在鉴权后、凭证读取前返回明确策略拒绝；IntegrationCard 的连接测试 catch 原本再次丢弃接口原因，现复用现有 friendlyError 显示 EXTERNAL_CALLS_DISABLED。本轮只修通错误归因，真实获取／连接／生成仍未恢复。

### 验证范围，不能把诊断修复写成恢复完成

| 流程 | 当前证据 | 尚未验证 |
| --- | --- | --- |
| 加载配置 | 先前实际设置页可以显示已配置状态；代码保持原权限与读取链路 | 本轮没有读正式配置值或登录cookie；未完整重验当前配置服务 |
| 获取模型 | 纯Mock路由验证暂停403、权限401/403、缺配置409、允许时解析目录 | 当前服务商真实目录、网络、认证与兼容性 |
| 选择模型 | 已核对组件选择写入 apiModelId/modelDisplayName 的代码 | 当前完整浏览器操作与实际保存 |
| 测试连接 | 纯Mock路由验证本地拒绝；前端不再丢弃策略代码 | 真实连接、计费与返回模型一致性 |
| 保存／重开 | 未改配置PUT与加密持久化；代码核对保存后router.refresh且卡片以updatedAt重挂载 | 本轮未测试实际或隔离数据库保存／重开，不宣称成功 |

定向策略验收：2文件22项通过（15新路由＋7原网络边界）；后续组合运行同22项仍通过。独立浏览器测试并未通过：准备期遇到依赖引用／正则错误，修正引用后最终仍在Vite JSX解析配置阶段失败，浏览器用例未执行。保留新增 integration-card-browser.test.ts 及隔离构建样例用于后续处理，不删除失败证据，不称其为成功或完整本地体验验收。未接管用户标签，未读取或截图密钥表单。此处失败属于验收工具准备，不能据此推断真实设置页渲染失败。

### 当前开关能力与方案（仅提案，未实施）

代码现状没有“仅手动LLM”开关：EXTERNAL_CALLS_DISABLED=true 同时阻止providerFetch、网页获取与LLM runtime；LOCAL_REVIEW_OFFLINE和LOCAL_REVIEW继续默认拒绝。WORKER_MODE=disabled、FREE_WORKER_MODE=false、Redis不可达控制后台，但单纯关闭Worker并不能证明所有自动外调已禁用。现有 daily 的校验、生产runtimeEnvironment及readiness都要求总外调拒绝；不能仅翻转EXTERNAL_CALLS_DISABLED或添加未经代码支持的ALLOW_REAL_AI便称完成。

建议一次确认的范围：新增显式本机手动LLM profile（建议名称daily-manual-llm，仅提案，现不存在），复用原3000/55432/9000、原AUTH cookie和既有应用配置；保留现有daily及review不变。扩展已有本地profile、runtime校验与readiness，复用现有provider策略边界，新增仅此profile可识别的手动模型许可；许可只覆盖经过服务端登录、workspace／角色检查的模型目录、连接测试与用户主动提交的研究／创作生成。必须在调用链传递服务端认定的手动LLM操作上下文，而非靠Prompt/UI隐藏或客户端自行声明；缺上下文、review/build/后台任务均拒绝。

具体非秘密配置：仅增加明确profile标记及手动LLM许可，保留EXTERNAL_CALLS_DISABLED=true作为其他外调默认拒绝；LOCAL_REVIEW_OFFLINE=false只用于手动日常profile，review仍true。原数据库／存储／认证／加密配置复用不改，MOCK_MODE=false、SYSTEM_MANAGED_PROVIDERS=false不变；Worker disabled、FREE_WORKER_MODE=false、Redis不可达保持，采集／Exa／云转录／邮件／调度／自动批量任务继续拒绝。该方案需代码支持和隔离测试，当前不伪造已存在开关或已实现。

需要相关核对与验证的代码范围：scripts/local-profile.mjs、scripts/local-web.mjs、scripts/local-release-profile.mjs、readiness，providers/review-policy与providerFetch，openai-compatible模型边界、web/ai/llm-runtime及手动执行入口。复用ModelRouter与既有Service，不新建平行架构；审查直接调用方以证明自动任务不能继承手动例外。先隔离验证目录→选择→连接Mock→真实隔离持久化保存→重开→手动生成Mock，以及review/后台/其他provider默认拒绝。

获明确确认后，只暂停并受控重启现有3000网页进程，绑定本机；原数据库、MinIO、Worker和其他服务不重启，不启用生产候选、不外部部署。重新只读检查ready及未登录拒绝，由用户本人在页面操作。助手不主动发真实模型探测，不读取／重录Key或密码；若配置本身需更换凭证，停下由本人决定。

风险与授权说明：模型目录向已配置服务发送授权目录请求，是否收费取决于服务商；连接测试发送固定Reply OK与最多16输出token，可能计费；用户主动生成会把其选择的材料及相关上下文发往本人配置的模型服务商并可能计费。授权应仅包含该手动LLM范围，不隐含采集／联网／邮件／后台自动请求或凭证修改。此刻正式profile、安全开关及3000重启均未实施，等待用户确认。
