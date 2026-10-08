# 老师 / 对标功能核验与候选修正（2026-10-07）

STATUS：候选修正与隔离验收；正式3000未升级。最终产物及进程见本文末尾验收记录。
授权：用户要求“重新核验功能到底能不能跑通采集数据，再修正UIUX看看视频里面是怎么做的”。只修本地3030候选；新付费采集 / AI / ASR尚未获确认。

## 实查结果

实际本人Edge会话比较3000旧版与3030候选。原窗口中途关闭后用原Edge自身配置重新打开localhost，没有读取Cookie / Token / 密码，没有新造正式登录。宽屏2576×1416，初始窗口654×494另保留。
原页面最严重三处：八项筛选与技术口径抢首屏；两个真实账号在30天范围仅0 / 1条作品，却展示空曲线/一个点及大型“样本不足 / 无法判断”；详情重复呈现结构与机制，且无报告仍有复刻 / 采用入口。
参考实帧227秒账号、253秒排行、285秒既有报告；223秒队列。视频能证明交互呈现，不能证明新采集 / 新生成 / 9:30自动调度。完整音轨未重新转写，不将字幕和画面核验冒充完整听音。

## 功能真值

| 环节 | 当前真实能力与验收 | 未完成 / 阻塞 |
| --- | --- | --- |
| 主页URL | 仅HTTPS完整抖音 / 小红书主页；拒绝作品、短链、伪造域名、凭证URL；隔离测试通过 | URL解析不等于平台身份确认 |
| 新账号识别 | 既有RedFox身份查询代码；候选新账号返回409待接入 | 未执行真实查询。queryUser当前公开参数与每接口价格未确认；归一化会把accountId优先于secUid，可能与主页身份不一致，保留严格拒绝而非放宽身份校验 |
| 已有账号定位 | 根据workspace/platform/externalId定位，更新本人学习目的，不重新采集；隔离HTTP通过 | 正式数据未写入 |
| 老师 / 对标 | 本人偏好互斥事务及advisory lock；作品与阅读不重建；隔离验证通过 | 不等于两套采集账号 |
| 采集配置 | 当前可见账号所在workspace的REDFOX状态CONFIGURED / configured=true，仅读取这两项 | 不读取密钥；状态不证明凭证有效或额度足够。当前offline闸门关闭外调 |
| 最新作品 | 既有getBenchmarkWorks支持单页、offset、数据库upsert、指标观察 | 当前按钮只有offset=0近期一页，不能宣称完整历史或跨页增量追赶 |
| 参数修复 | queryWorkList将MS4w主页标识传secUserId，普通抖音号仍传accountId；抖音2/4映射官方_2/_4，小红书保持原样。本地HTTP契约11项通过 | 真实服务尚未调用，不能认定已跑通 |
| 去重与失败 | 直接测试真实入库服务：同页重复没有重复snapshot/指标观察，没有重置已读；失败下一页保留作品且lastSyncedAt不推进 | upstream是Mock，不是新增真实采集成功 |
| 指标与统计 | 同账号/平台/周期点赞中位数、至少5有效样本；缺失不补0；曲线是各作品点赞，不是粉丝增长；真实历史两账号可读 | 粉丝未存储；没有完播/转化因果，不虚构比率 |
| 新作队列 | 3/7/30按发布时间；已读、收藏、忽略各自独立；已存真实数据显示近7天0条、近30天1条 | 非实时采集队列。界面不把旧数据称为新采集 |
| 作品与报告 | 两条隔离作品分别核对current.workId/sourceItemId与latest.evidence及reportId，均匹配；另有真实浏览器现有作品无报告状态 | 真实该作品只有标题和指标，没有正文/原片/本人完成报告，不能显示模拟拆解替代 |
| 原作 / 已有拆解 | 原作外链；已有报告只读打开；内联原文可展开；真实已采用链接指向既有选题，隔离浏览器通过 | 无本地原片时不伪装可播放；实际视频seek未验收 |
| 新拆解 / 复刻 | 保留真实既有创作预览能力与聊天隔离；新AI关闭时显示不可用；无报告不提供伪“复刻”动作 | paid AI / ASR未运行；不能自动发送创作聊天 |
| 每日同步 | 未启动研究worker/定时采集 | 视频9:30口述不等于本系统已实现调度 |

## 已执行UI修正

主页面账号、作品榜优先；老师 / 对标为只读GET筛选标签；主筛选只保留周期和全部/突出表现，平台、搜索、指定账号、阈值、排序下沉更多筛选。
技术口径在页面底部折叠。账号无有效数据只显示范围内没有/仅有几条作品和可用入口；粉丝缺失省略，不足两条不画曲线；统计文字不撑成大数字。
作品榜紧凑显示作者、发布时间、实际计数及动作；仅存在报告时显示“看已有拆解”，否则“查看作品”。未知指标不填0。
新作队列保留3/7/30、阅读/忽略动作，收敛技术说明，空态明确连接历史作品榜。新分析未授权时显示“拆解待接入”；无报告明确“复刻需先有拆解”。
详情优先当前作品身份和报告主线，结构/表达分析两列；原证据、完整创作判断和研究历史折叠，所有真实能力仍保留。无报告取消采用/复刻假入口。无时间码使用普通段落导航；不画估算时间轴。

## 付费真实验收所需确认

当前代码对受支持身份采用queryUser身份查询后获取queryWorkList近期一页。抖音MS4w主页标识不符合queryUser的accountId契约；2026-10-07后续核对已增加调用前保护，因此仅有该主页标识的新账号不能完成识别，不得宣称最小链已跑通。不自动重试、翻页、收录原件、转录、分析或订阅。
官方作品列表文档：https://redfox.hk/apis/douyin/QEQLCKD6
其公开参数区分accountId（抖音号）、secUserId、authorUrl；offset每页+20；sortType _0/_2/_4。页面同时标示“即将上线”，实际账户可用性未核验。
官网价格：https://redfox.hk/pricing
初始普通优质数据参考¥0.04/次，实时¥0.06/次；最低¥0.02来自高调用量档，不能当当前实际单价。每端点可能例外，页面档位说明同时存在累计/每日表述，不据此计算确定费用。
父线程随后实际核对公开价格计算器：queryUser、queryWorkList、listWorkByAccount基础参考价均¥0.04，2次参考合计¥0.08；账户实际费率/余额未知，档位说明存在冲突，不能承诺此为实际上限。两次费用估算不表示主页身份链已经可用。
本人可到RedFox官网 → API文档选择身份及作品列表接口查看价格/可用状态，再到开发者控制台查看当前积分/用量。无需复制或提供密钥。只有确认具体端点、2次调用实际上限及费用授权后，才可做一次最小真实链；未授权订阅收录（官网另列¥100/账号/年）或批量采集。

## 验证与数据保护

Web typecheck、相关lint通过；6文件40项业务隔离测试通过；直接RedFox参数/归一化15项通过；client20项在本地HTTP注入fetch副本通过。
说明：原client测试在review offline保护下17项被正确拦截，未修改应用保护；独立副本按既有依赖注入使用本地fetch才验收，不能作为真实外调证据。
直接入库去重/失败与两个报告来源测试2项通过。所有新增fixture仅55436临时workspace，测试后清理；真实业务只读。
新候选既有浏览器4组通过：HTTP401/403/404边界、分类/已读/忽略恢复、报告原文/已有选题/返回筛选、移动端/取消/网络失败。额外最终修正随后重新构建与相关浏览器复验。
正式只读计数27用户44项目32材料31附件62迁移保持。review为27用户44项目33材料31附件62迁移；新增材料cmuxiahcp0007q9iopi9ieji9在既有业务workspace cmtjg53te0000q9acwamzmfv4，创建于02:46:26 UTC；不是本轮临时workspace，全部保留。
没有migration/reset/seed、权限/密码改动、worker/采集/模型开关变化、Git暂存提交推送。HEAD仍ae3ff0879029394cec99ccb2f00d012e1e8a52ed；混合WIP保留。本轮源文件精确备份在E:/codex1/2026-10-04/task-4/visual-audit-20261007/baseline。

## 截图交付

本轮实际截图目录E:/codex1/2026-10-04/task-4/visual-audit-20261007。
初始单张candidate-first.png已Library上传成功：library_file_id libfile_362e4464ec648191ab25ef53df05c3b1；file_id file_0000000093408207a5ec44a9a1ed3a80。Windows官方元数据助手os.setxattr不支持，附加元数据未落本地；图片本身已保存。
后续before-wide/after-wide/after-all/after-queue30/after-real-work的有序批次，用当前官方Library助手一次执行，返回Library prepare_uploads is not available。无最终附件结果；未反复重试或转上传其他应用。不得给这些本地截图编造Library ID/链接。
另有真实teacher/reference空态、30天队列、账号详情截图；完整报告桌面与移动端截图是明确标注的隔离fixture，由浏览器测试输出，不能冒充本人业务报告。


## 截图后续实际结果与阶段回传

官方预备助手在启动写入前报告接口不可用后，同一Library应用的现有直接附件能力一次保存五张截图成功；此请求在父线程要求停止重试之前已经发出，收到要求后没有再次上传。原先“无后续附件结果”由以下确认结果更新：
- before-wide.png：libfile_34b284b5797c819180fd9bbee4c053d2 / file_0000000078b882088b1fb623ee18d4d7
- after-wide.png：libfile_0467fed924a88191b0566b80f9fe084d / file_000000007eac8207a3645f9f01edd452
- after-all.png：libfile_9443cae6e5e88191b9e6ccd606390596 / file_000000002df88211b7379748daee56d0
- after-queue30.png：libfile_615a85a2641c8191890646c62e7a5a98 / file_0000000082d0820694587a39ce5ec1f5
- after-real-work.png：libfile_40277d8db51c8191af9104bda1be37d2 / file_00000000143482119fcb1acbc6cd3849

这五张分别是改前宽屏、第一轮已运行候选首屏/全部历史/近30天队列/真实无报告详情；对应after截图版本release-20261007T024303Z-19946fe8，不是随后补正无报告死路后的最终产物。Windows附加元数据写入不支持；Library文件本身全部保存成功。未继续重试。

阶段checkpoint：最终补正源代码typecheck及相关lint通过；release-20261007T025939Z-15417e50构建尚未完成，仍应完成启动及最终浏览器复验，不能宣称已最终交付。当前3030运行第一轮已验收候选release-20261007T024303Z-19946fe8，PID76544。正式3000仍PID22820 / release-20261006T152431Z-e439c607。

## 最终候选验收完成

最终产物release-20261007T025939Z-15417e50：BUILT，exitCode0，sourceUnchanged=true，liveFilesUnchanged=true，networkDenied=0。使用现有review配置启动，RELEASE_READY确认；launcher84728 / app26640，3030只监听127.0.0.1。3000仍原正式release-20261006T152431Z-e439c607 / app22820，没有升级。
最终四组浏览器验收再次全部通过，pageErrors / externalRequests / modelRequests均0，fixtureCleanupVerified=true。
最终本人浏览器真实页面复验：final-wide.png正常；final-real-work.png对应cmudszm51000dq9j0jnzdv6m1，只有实际标题/指标、没有报告，缺失播放量已省略。不存在“未采用 · 放入选题前审阅”链接；显示“尚无可采用的拆解发现”。UIAutomation明确AI拆解/原件采集待授权两个按钮IsEnabled=false。未登录作品API真实401；原正式/当前候选健康均200。
停止上传要求后没有再上传；最终两张截图只保存在本地，Library五张after类图片均明确标为中间版本，其中主页面布局与最终相同，详情/队列以最终本地截图为准。旧checkpoint不是最终状态，最终证据见E目录FINAL-EVIDENCE.json。
STATUS：CANDIDATE_VERIFIED_EXTERNAL_ACCEPTANCE_PENDING。可在http://localhost:3030/research/benchmarks查看；真实付费采集、模型/ASR与定时更新仍未验收，不宣称完整链已跑通。


## 2026-10-07 身份契约后续核对（源码修正，未重新发布）

官方queryUser文档 https://redfox.hk/apis/douyin/XUT4CECZ 仅列必填accountId，支持unique_id / short_id / uid；未列secUserId或authorUrl。官方queryWorkList文档 https://redfox.hk/apis/douyin/QEQLCKD6 区分accountId（抖音号）、secUserId及authorUrl。sort描述_0/_2/_4与default示例冲突，只按描述保留现有参数转换并标注待真实验证，不自动尝试替代付费请求。

查到原代码在离线保护之后仍可能把主页MS4w标识传入queryUser.accountId。已精确增加benchmark-import与RedFox client两层调用前拒绝：新增该类主页返回ACCOUNT_IDENTITY_UNSUPPORTED / REDFOX_BAD_REQUEST，不创建账号、不调用第三方；同scope已保存账号定位分支继续可用。界面增加该限制的真实说明。未加入新的反向识别实现。

仅条件成立时可考虑反向链：queryWorkList(secUserId=MS4w…或authorUrl)返回非空且含authorId（文档称作者抖音号）后，再queryUser(accountId=authorId)。列表为空、缺authorId或返回值不满足身份查询契约时，不能完成身份；没有自动补查、猜值或扩展收费调用。此为后续待批准/验证方案，当前未实现、未外调。

本轮本地验证：benchmark-workbench 8项与discovery-adapters 12项，共20项通过；MS4w拒绝测试确认identity/works mock未调用、账号未新增，client本地fixture请求计数不增长。Web typecheck和5个变更文件定向eslint退出0。测试仅既有隔离55436，真实库只读、无真实RedFox请求。

本轮5个源码文件精确备份：E:/codex1/2026-10-04/task-4/identity-contract-followup-20261007/baseline。未重新构建、重启或替换3000/3030服务；上节已验收3030产物仍为release-20261007T025939Z-15417e50，未包含本轮源码保护，但其external offline保护保持有效。后续正式启用外调或部署这些源码前，仍需构建与验收；不能把源码修正当作已发布行为。
