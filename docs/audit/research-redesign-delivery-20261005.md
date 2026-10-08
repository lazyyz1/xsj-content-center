# 研究页面可见改造与账号/趋势收口（2026-10-05）

## 最终交付索引与待本人验收（2026-10-05；交付整理）

STATUS：本轮实现停止扩展，仅整理交付并更新四张已有最终隔离截图。代码、测试、构建沿用下列已完成验收；本次没有重跑全套、重建环境、再改业务代码或启动服务。交付主入口为本文，不以旧数据库切换文档代替研究改造交付。

CHANGED：研究首页的宽输入与材料选择、示例和历史入口；单内容动态发现、邻近原文与逐条选用、同一输入框继续追问；私人研究选用、私存及分享确认；账号方法／限制／创作入口与趋势机会的层级、历史日期和手机布局；项目切换、无项目／无材料／不足两篇／零结果、失败重试与轮询失败处理。保留私人 Research 与共享 Artifact 的边界及权限检查。最后修正历史“该次快照榜单”措辞、区分样本发布时间和采集时间、移除重复私存按钮，并使趋势强制研究按钮与既有项目／材料前置条件一致。daily 最小修复仅在 validateDaily 成功后设置 LOCAL_RELEASE_PROFILE='daily'，严格 readiness 规则保留；未改正式环境配置。

VERIFICATION（去重）：最终同一源码执行 14 个 Vitest 文件、73/73 通过，其中 13 个研究文件 58 项＝原 51 项＋账号／趋势浏览器 7 项，另有 readiness 15 项；没有再叠加已包含的服务测试。独立 2 个 Node 配置测试文件 19/19 通过，因此是 73＋19＝92 项，不重复计数。Web typecheck、定向 lint 通过。浏览器使用真实页面、权限与隔离库持久化，外部模型／采集为 Mock；不证明真实 AI 质量。

最终构建：release-20261005T193349Z-edeedc4b，receipt 位于 output/architecture-upgrade-20261005/releases/release-20261005T193349Z-edeedc4b/receipt.json。BUILT、exit0，1148 源文件／1472 产物，sourceUnchanged 与 liveFilesUnchanged 为 true。隔离生产 3030 验收 live/ready/login200、未登录 projects401、dev runtime404、重复端口启动拒绝，退出0并清除 runtime.lock；3030 和临时3020已停止。

证据根：output/research-account-trend-20261005/iteration-20261005T190628959Z-74bbda71。
- 73项：test-20261005T193622492Z-e8d8f0b3.log；19配置项：profiles-20261005T192413854Z-dab69966.log。
- typecheck：web-20261005T193857634Z-28e05a36.log；lint：lint-20261005T193416601Z-c515cbf6.log。
- 最终截图：browser-20261005T193351599Z-452725dd/；生产冒烟：production-20261005T193950790Z-59563e31/candidate-smoke.json。
- 本轮实现范围、快照和定向diff：delivery-manifest.json、before/、task-only.diff；截图更新回执：library-final-screenshot-replacements.json。

Library：账号／趋势桌面和手机四图已用上述最终截图在原 Library identity 上 replace，全部 succeeded，版本检查 expected_current_version=0 保留，返回版本均为1；首页及单内容图未重复上传。旧版本0图片仅为历史版本。官方准备上传在任何写入前返回不可用后，使用已授权原位替换路径；Windows 本地元数据辅助程序失败，身份／版本回执完整保留于 JSON，不声称本地扩展属性已应用。

| 文件 | 保持不变的 Library identity | 新 File ID | 返回版本 |
| --- | --- | --- | --- |
| account-desktop.png | libfile_b26548c9d8dc8191849f4bf6d9eed075 | file_0000000087188207845f24faaba5670d | 1 |
| account-mobile.png | libfile_ec1ebb56b9d08191b51e8e8dc29b0d6d | file_0000000063648207b3a9e012d9d9f702 | 1 |
| trend-desktop.png | libfile_052da42d7c288191ac81f19009c2363c | file_00000000e9248207bdcbf74b1e0a31ba | 1 |
| trend-mobile.png | libfile_d95a458c94248191abfdf35fb681a0f8 | file_000000001194820795c6d9d78586d14b | 1 |

BOUNDARY / CURRENT IMPLEMENTATION GAP：正式3000没有在本轮重启。最后只读实测为2026-10-05 19:49:51 UTC：live/login200、projects401、ready503，配置前置检查失败且未探测数据库／存储。已有代码修复不会追溯注入既有进程环境，不能宣称正式 ready 已恢复。本次交付整理没有再访问正式3000、数据库、附件，也没有改密码／凭证／权限。原库27用户、32材料、44项目、62项完成迁移及两项active部分唯一索引的数字是上述既有只读证据，不冒充本次新盘点。旧库卷、原附件卷和改密后备份继续保留。

下一步：任务停在待本人页面验收与受控重启决定。本人可先查看四张最终样例并反馈页面；正式页面验收应在决定受控重启既有 daily 网页进程、重新只读检查 ready 后进行，本人使用已改密码登录 http://localhost:3000/login 核对真实材料与页面，不由助手代输密码。真实 AI／采集质量仍待验收。切换生产候选亦未执行；需另行明确决定。不得覆盖后续写入，回退仍要求暂停写入并证明备份包含全部最新数据。

GIT：READY_TO_STAGE；原 ae3ff087 与大量未提交工作保护，未 add/commit/push；本次只修改本文及本地交付证据。下面各轮日期、测试和旧截图记录继续作为历史，不替代本节最终结果。


## 最终代码与隔离验收收口（2026-10-05 19:50 UTC）

STATUS：daily启动标记最小修复及账号/趋势关键交互、空态、小幅视觉修正已完成。最终同一源码组合14文件73/73：13研究文件58项（原51项＋扩展浏览器7项），另含readiness15项；不是51＋此前重复7项服务测试。另2个Node profile文件19/19。最终Web typecheck、定向lint通过，production候选release-20261005T193349Z-edeedc4b构建及3030实际烟测通过。READY_TO_STAGE，未暂存/提交/推送。

### daily ready修复与正式运行边界

scripts/local-profile.mjs的dailyEnvironment仍先执行validateDaily，再于返回值末尾显式设置LOCAL_RELEASE_PROFILE='daily'，只有这一行运行配置构造变化。没有修改.env、凭据、readiness严格检查、端口、数据库、存储、Worker或外调标志。错误继承/显式foreign marker不能改变经过验证的daily目标；错误数据库/存储/安全标志/缺凭据仍拒绝。production runtimeEnvironment仍显式NODE_ENV=production并设置实际mode，不存在dev跳过、从ENVIRONMENT_ID猜测或ready强制200。

本轮遵守“现在不要重启用户3000”：进程PID68104，启动于2026-10-05T17:47:39.7481195Z，早于本轮19:06开始。代码修复没有注入已有进程环境。19:49:51 UTC实际3000 live/login200、projects401、ready503（configuration提前失败，未进行数据库/存储探测）。代码缺口已修复，正在运行的daily进程尚待受控重启和实际ready验收；不得写成ready已恢复。

### 账号/趋势实际交互及视觉验收

- 桌面1600、窄屏390及近邻原作品、实际旧快照时间、标题未读正文、单条选择/取消焦点返回/无Artifact写入均通过。
- 账号“依据新增作品更新”相同内容复用版本；故障重试保留意图；双击仅1次请求；强制研究真实在55436持久化新版本；私人保存故障重试与双击通过，savedAt实际写入，未生成共享Artifact；真实VIEWER HTTP写请求403。
- 趋势实际先选择原项目及原资料，再切换第二项目，旧资料取消，选第二资料；请求范围与持久化结果匹配第二项目。更新失败可重试、强制研究新版本、私人保存双击、真实VIEWER写403均通过。不同项目各自研究会话计版本，未假设全局统一序号。
- 两面板连续5次状态503后停止轮询，旧研究仍可读；测试仅将自己隔离QUEUED行标为FAILED清理，再删除隔离workspace/user。无真实模型/采集/后台执行。
- 真正空workspace：0条已读作品、1条已读仍不足2条、无项目、已有项目但无材料，按钮受限且明确提示；合法Mock返回0方法/0机会时显示资料不足，不生成虚构卡片。
- 原51项本轮重新组合通过，包含首页/历史、1/4/7发现、旧输入与引用保留、追加/替换取消、显式Mock创作及真实Artifact保存、实际共享预览/确认/成员读取、私人研究、跨空间/disabled拒绝、响应丢失幂等、30分钟草稿过期/换账号隔离、Escape焦点、窄屏。
- 未验：本人密码、正式真实资料的AI质量、真实采集/真实付费模型/自动增量后台、自动热点过期判定（现有展示仅标实际保存时间和未实时更新）。本轮HTTP更新研究依赖Mock生成/Mock搜索，实际服务预留及持久化在隔离库，未伪称真实外部查询已验。
- 没有机械扩展为全仓测试/全仓Playwright，亦未启用模型配置来绕过发送按钮禁用。原模型未配置时仍沿用明确的Mock服务分支与真实UI/API保存验证。

明确的小修：历史趋势解读在展示层将“当前榜单”限定为“该次快照榜单”，不写回已保存正文；任务提示强调实际日期，趋势promptVersion从11到12。账号头部采集/观察时间与摘要中的研究样本发布日期范围分开；方法限制、值得学/不能照搬、创作选用靠近，演变细节折叠。删除两面板重复的直接私人保存按钮，继续使用原ResearchUseFindings私人保存和项目分享入口及实际正文/可见范围确认，保留完整版本链接，未合并private Research与共享Artifact。更新数据（获取记录）与AI更新/强制研究（新版本）有文字区分，手机标题间距收紧。

真实发现及修复：趋势强制研究按钮在未选材料时原本仍启用，而请求守卫拒绝使点击无动作；现在按钮与原有project/material前置条件一致，并提示先选真实资料。未改变服务权限或数据模型。

### 最终证据与失败追踪

证据根：output/research-account-trend-20261005/iteration-20261005T190628959Z-74bbda71。
- 最终浏览器：browser-20261005T193351599Z-452725dd/evidence.json，7流程完成、fixtureCleanupVerified=true、正式写入0/paidModelCalls0/automaticCollectionCalls0/本人密码0。包含桌面/手机、account-empty、trend-no-project、trend-no-material、account-zero-method、trend-zero-opportunity及手机全文PNG，均为隔离Mock样例，真实日期保留。
- 原研究浏览器最终证据在同根research-browser-*，其fixture-cleanup.json确认清理。
- 生产：output/research-account-trend-20261005/iteration-20261005T190628959Z-74bbda71/production-20261005T193950790Z-59563e31/candidate-smoke.json。live/ready/login200、projects401、dev runtime404、重复端口拒绝；自动退出0、锁清除；production-post-stop-check.json为退出后check0。
- receipt：output/architecture-upgrade-20261005/releases/release-20261005T193349Z-edeedc4b/receipt.json：BUILT/exit0/networkDenied0/sourceUnchanged=true/liveFilesUnchanged=true。先前release-20261005T192617Z-4dd4dfee在最后按钮修复前构建成功，现仅历史候选。
- 前轮扩展测试先因监督器旧目录校验导致3020未启动；已修正本次输出辅助脚本。后有文案选择器、默认1秒刷新等待、每项目版本号、hydration空态等待的测试假定错误，均纠正并保留失败日志。第一次最终组合72/73，指出趋势未选材料的无动作；修复一致按钮条件并补必要材料测试前置条件后，最后组合73/73。没有删除或覆盖失败证据。

Library前轮6图均已成功保存，准确library_file_id/file_id/filename/version映射保留在前轮审计表与前轮library-*.json。本轮遵守不重复上传，不创建重复Library项目；本轮UI小修后的实际截图在上述最新本地证据，不把前轮Library图冒称最终源码截图。

### 正式数据、旧环境与Git

19:49最终只读：27users/32materials/44projects/62completedMigrations/0unfinished；ResearchRun_one_active_per_session、BenchmarkCollectionRun_one_active_per_account_key均仍为部分唯一索引。3000/9000/55432运行，3017/3020/3030/55435入口关闭，55436隔离副本保留。原卷、旧55435独有数据、改密后备份位置不变；本轮没有执行迁移、恢复、合并、seed、reset、权限/密码操作或重启正式依赖。历史附件17/17和三个备份SHA复核沿用此前明确记录的实际时间，不冒称本轮重新校验附件。

Git HEAD仍ae3ff0879029394cec99ccb2f00d012e1e8a52ed。本轮before/与scope.json保护已有WIP，task-only.diff仅对本轮前快照差异。未改治理文档、个人网站/my-online/果冻岛。回退仍output/account-upgrade-private/formal-cutover-20261004，恢复前必须暂停写入并确认涵盖后续全部最新数据，禁止直接覆盖新数据。

待后续：受控重启日常网页进程应用已修代码，然后只读验证实际ready和由本人亲自登录。当前任务明确禁止这一步，故尚未执行。

## 前轮记录（历史；不替代上述最终源码证据）

## 当前账号与趋势收口（2026-10-05 18:58 UTC）

STATUS：本轮账号/趋势实际界面修改完成，定向4文件9项通过（新增真实浏览器2项、账号/趋势服务7项），Web typecheck及定向lint通过。最终 production 候选 release-20261005T184905Z-787793cd 构建与3030真实健康/认证边界验收通过。READY_TO_STAGE；未暂存、提交、推送，未替换正式日常dev入口。

CHANGED：复用现有 AccountV2Panel、TopicOpportunityV2Panel、ResearchUseFindings 和研究CSS；没有新建业务Service/DTO/模型路由/schema。账号卡片直接显示方法限制、演变限制及所需自有材料；可展开完整研究边界，目录进入折叠历史时会先展开。趋势显示实际快照时间（上海时区）、未自动实时更新、标题候选未读正文、待补自有证据；排名历史改为按需展开。单卡宽度随实际数量利用可用宽度，手机减少正文留白。两面板同步请求锁保护重入，趋势增加已存在组件采用的hydration交互守卫。原作品、完整对照、历史保存及旧研究均保留。

VERIFICATION：隔离浏览器使用真实研究服务+Mock生成已有结构，检验桌面1600与手机390、近邻原作品/标题来源、折叠历史导航、单条选用只选1条、取消返回原按钮、不创建Artifact/不改研究正文。普通动画与减少动画模式各2项通过；最终截图减少动画，避免侧栏过渡帧。3服务文件7项通过，夹具全部清理；正式业务写入0、付费模型0、自动采集0、本人密码使用0。未重复首批51项全组，也未跑全仓Playwright/全仓测试；首批结果属于首批历史记录。首轮截图路径曾误计算到 D:/Documents/output，仅为隔离夹具；证据复制回本项目忽略目录，测试已修正，未删除任何原文件。

证据根：output/research-account-trend-20261005/iteration-20261005T183158652Z-3edccec6。最终截图：browser-20261005T185454345Z-9491c029/{account-desktop,account-mobile,trend-desktop,trend-mobile}.png；另有两张手机全文截图。evidence.json确认两流程完成与fixtureCleanupVerified=true。visual-final.json说明截图偏好，不更改应用源码。

生产receipt：output/architecture-upgrade-20261005/releases/release-20261005T184905Z-787793cd/receipt.json：1148源文件、1472产物，BUILT/exit0/networkDenied0/liveFilesUnchanged=true/sourceUnchanged=true。production-20261005T1855-787793cd/candidate-smoke.json：live/ready/login200、未登录projects401、dev runtime404、端口冲突拒绝，自动退出0且锁清除；production-post-stop-check.json退出后check0。此前release-20261005T180812Z-01d8d09f仅为首批历史候选。

### 3000 ready503只读诊断

CURRENT IMPLEMENTATION GAP：daily.env已有ENVIRONMENT_ID=LOCAL_REAL但没有LOCAL_RELEASE_PROFILE；scripts/local-web.mjs未设置该marker，readiness.ts在配置不匹配时立即返回，数据库/存储探测根本未执行。响应内database=false/storage=false不能据此断言这两依赖故障。上述三处代码SHA与改版前release-20261005T154506Z-48591579一致，不是本轮研究改版引入。证据：首批根ready503-readonly-diagnosis.json。

此前“3000恢复”指宿主Docker及日常进程消失后恢复本项目既有容器和daily dev进程：页面可访问，不等于production就绪，不等于本人密码已验收。本轮诊断未改正式配置/秘密、未重启正式依赖、未执行迁移/恢复。final-runtime.json：3000 live/login200、projects401、ready503；3000/9000/55432运行，3017/3020/3030/55435端口关闭，55436隔离副本运行。正式业务只读formal-readonly-counts.json：27users/32materials/44projects/62completedMigrations/0unfinished。共享侧栏未修改。

### Library截图实际交付

官方prepared助手在准备动作之前报告Library prepare_uploads is not available；经当前明确允许，使用Library受支持的新建备用路径，六图均逐项status=succeeded。没有公开外部图床，不包含真实账号或正式数据。

| 图片 | File ID | Library identity |
| --- | --- | --- |
| after-home.png | file_000000009c1c82078a641c1095b28908 | libfile_9b9056a169408191ad884499ea564c07 |
| reader-1-desktop.png | file_0000000069208207b758e21627eefc40 | libfile_df83f32322908191b9d77be2818d9b96 |
| account-desktop.png | file_00000000a27c8207b4d0aa8014c9043e | libfile_b26548c9d8dc8191849f4bf6d9eed075 |
| account-mobile.png | file_000000002f588207b5b370ead9d88e9d | libfile_ec1ebb56b9d08191b51e8e8dc29b0d6d |
| trend-desktop.png | file_00000000dc68820788bf9952c9cc41b7 | libfile_052da42d7c288191ac81f19009c2363c |
| trend-mobile.png | file_000000004a2c8207a46ed45b6987453d | libfile_d95a458c94248191abfdf35fb681a0f8 |

所有返回version为0。Windows官方apply-xattrs助手报os无setxattr，故没有声称本地xattrs成功；真实身份和完整返回元数据保存于library-screenshots.json、library-account-trend-screenshots.json及本地身份侧文件。Library图片保存本身成功，勿重复create以“修复”元数据。

BOUNDARY：没有改个人网站、my-online、果冻岛、权威治理文档、密码、用户权限、付费模型、collector、后台任务、正式业务数据；原库与原MinIO卷、旧55435独有数据和改密后备份保留。数据库回退位置仍为output/account-upgrade-private/formal-cutover-20261004，不能覆盖切换后的新增数据。最新正式附件17/17及三个备份SHA复核见首批原始证据；本轮没有重新恢复或用旧副本替换正式库。

RISKS / 待本人：访问http://localhost:3000/login亲自验证已有新密码与真实历史资料；真实AI结果质量、缺正文/无评论/旧快照等真实数据缺口未由隔离Mock证明解决。ready503属于既有启动配置缺口，需单独处理正式配置，不能宣称正式完整就绪。READY_TO_STAGE仅表示本次hunk可审阅，不包含任何Git暂存或提交授权。

## 首批记录（历史；不替代上述当前账号/趋势证据）

STATUS：宽首页与单内容结果样板已实际运行并通过隔离浏览器验收；本轮相关回归 12 文件 / 51 项通过，最新 Web typecheck 和定向 lint 通过。最终生产候选 release-20261005T180812Z-01d8d09f 已构建及3030实际验收通过；未替换日常入口。READY_TO_STAGE，未暂存、提交或推送。

## 可见结果

- 首页使用宽任务主区、已有资料入口、右侧继续研究及显眼的历史研究入口。用户提出问题、选择资料，发送前不运行研究。旧三个大入口卡片与重复对象入口已移除，静态展示例子明确标注“展示示例 · 非真实研究”。
- 结果按本次实际区块动态显示发现数量，主要发现展开；原文摘录与结构位于旁边，统计、补充分析和资料缺口按需展开。原始文字和已保存结果没有改写。
- 每条发现可单独“选这条用于创作”，仅选择该条并进入已有私人准备面板；继续追问沿用既有研究输入和范围，发送才执行。选用、分享、取消、私人保存仍分别处理。
- 创作带入沿用旧输入、引用、材料保留、确认替换或追加、30分钟同标签页草稿、版本复核和未保存成果守卫。共享必须查看实际正文与有效成员可见范围，再明确确认；响应丢失重试不重复创建。
- 账号与趋势面板已有局部层次调整及单方法/单角度选用，研究专用提示已增加具体通俗表达要求并递增版本（单作品基础8、决策9、账号10、趋势11）。未改变全局模型路由、JSON schema或服务权限。本次可见验收重点为首页与单内容结果；账号/趋势完整真实数据视觉验收仍待后续，不宣称已交付全套重设计。

## 第一批可验收截图

本机证据根：output/research-redesign-20261005/iteration-20261005T171639889Z-cca4efa5。

- research-browser-20261005T174754290Z-0499a37e/after-home.png：宽首页。
- research-browser-20261005T174754290Z-0499a37e/after-result.png：发现与原文并排结果。
- research-browser-20261005T174956022Z-7831bce3/reader-{1,4,7}-{desktop,mobile}.png：三类不同资料，1/4/7条发现，桌面与手机。
- 最终整组浏览器证据在同根最新 research-browser-* 目录，包含真实成果保存、实际分享预览及 fixture-cleanup.json。

截图均为明确的可丢弃隔离样例，非真实模型研究质量证明，也未使用本人密码。视频例子仅提供机器文字稿，不假装拥有画面、分段时间码、评论、留存或转化数据；可打开既有原来源页核对已保留媒体。

## 验证与失败记录

- 最终相关回归：12 文件、51/51；含研究区块与证据约束、首页可用资料、选中结论/角色/跨空间、创作主链、Artifact保存、单作品/账号/趋势任务服务及7项真实浏览器流程。数据库fixture仅55436，模型为Mock。
- 浏览器覆盖三类资料、动态数量、就近原文、逐条选择、取消不共享、旧输入和引用保留、替换取消、追加、刷新恢复、真实成员读取与拒绝、私人保存、实际共享正文、双击与响应丢失重试、草稿过期、窄屏无溢出、Escape焦点返回。
- 首轮整组49通过2失败：未配置模型真实禁用发送；另一次私人保存面板在失败页面仍存活时消失。私人保存单独复现通过，失败页截图后关闭、最终7项整组和12文件51项均通过。未给未复现现象强行修改业务语义。
- 当前隔离宿主未配置模型时，UI仍真实禁止发送。测试显式使用浏览器实际准备的input/references调用Mock服务，再通过真实UI与API保存Artifact；没有启用真实模型、新造凭证、放松认证，也没有把这个分支当作真实按钮可发送验收。
- 初次lint指出旧V1兼容投影有意省略字段的未使用变量；仅在具体省略处添加明确注释，未放宽全局规则或改变投影。
- 客户端边界：9入口、51输入、4契约、0server依赖。新增追问复用既有组件。

## 宿主恢复与正式数据边界

实时核对发现原3000进程消失，Docker Linux引擎管道不存在，原及review容器均已停止。曾有一次exec-server transport disconnected，工具连接恢复后继续；这是连接故障，不是自动审批拒绝。

只恢复本项目既有原PostgreSQL、原MinIO、review数据库和对象副本容器及日常3000；没有新建/替换卷或重放迁移，没有启动Redis/Worker或其他项目容器。本轮3020仅用于隔离验收，非日常；收口后停止。

- 原55432只读复核：27用户、26停用、32材料、44项目、62已完成迁移、0未完成迁移；ResearchRun_one_active_per_session保留。
- 原9000只读GET：17/17历史附件SHA256仍与正式切换新备份恢复结果一致，共361721426字节。
- original-after-password.dump、original-attachments.tar、old-integration-preserved.dump三个本地回退文件重新计算SHA256，均与切换时一致。没有使用备份覆盖运行库。
- 日常3000：live200、login200、未登录projects401，MinIO ready200。ready仍503（configuration/database/storage检查false），为已有CURRENT IMPLEMENTATION GAP，不声称正式完整可用或本人登录成功。
- 3017关闭；旧55435及独有数据、原所有卷/目录保留，未自动合并。55436/19000为副本。
- 原账号密码/令牌/hash未查询、输出或代输。本轮未修改账号停用、角色、权限或业务数据；26停用为此前另行批准结果。
- 外调、采集、真实模型、后台批处理、邮件、云部署均未启用。个人网站、my-online和果冻岛未修改。

## 回退与Git

HEAD仍ae3ff0879029394cec99ccb2f00d012e1e8a52ed，加大量既有未提交修改。每个本轮文件修改前状态在证据根 before/，scope.json仅本轮范围；交付差异必须对这些快照做精确hunk，不能git reset或整树覆盖。

正式数据库回退仍在output/account-upgrade-private/formal-cutover-20261004。恢复前必须暂停写入并确认该备份涵盖全部最新数据；切换后新增数据不允许被此旧回退点覆盖。

待本人：访问http://localhost:3000/login亲自验证已改密码与真实资料；真实AI输出质量未验收。ready503缺口与账号/趋势完整视觉迭代不因这些样板通过而自动关闭。

## 最终生产与入口收口

最终源码候选：release-20261005T180812Z-01d8d09f。receipt在output/architecture-upgrade-20261005/releases/同名目录/receipt.json；1147源文件、1472产物，BUILT、exit0、networkDenied0、sourceUnchanged与liveFilesUnchanged均true。此前release-20261005T175629Z-711b4401为修订验收代码前的历史候选，不能替代当前证据。

3030生产review实际HTTP：live/ready/login200、projects401、dev runtime404；重复端口启动拒绝，退出0、runtime.lock清除，退出后check再校验0。完整证据在本轮根production-20261005T181034956Z-70ff2e12/candidate-smoke.json。

本轮3020已仅通过自建守护停止。最终3000/9000/55432运行，3017/3020/3030关闭；55435容器停止但库卷完整保留，55436副本仍在。没有以新生产候选替换日常dev进程；日常ready503仍如上记录。

最新日志：test-20261005T180931285Z-c62179d8.log（12文件51项），web-20261005T180705603Z-7a6087a1.log，lint-20261005T180703721Z-02116dc3.log。最终浏览器图和fixture-cleanup在research-browser-20261005T180819985Z-311533ca；新增测试身份剩余0，Mock调用1，真实模型/正式业务写入0。

两条active部分唯一索引均复核保留，含ResearchRun_one_active_per_session与BenchmarkCollectionRun_one_active_per_account_key。详细定义只存本机original-active-indexes.json。
