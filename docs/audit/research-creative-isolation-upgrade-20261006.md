# 研究与创作隔离升级：实现边界与待确认方案（2026-10-06）

STATUS: 首批研究代码已落地，隔离验证进行中。正式 3000 未重启；无正式数据库写入、迁移、外调、暂存、提交或推送。

## 已确认事实

- ProjectAssistant 是当前主业务链，TEXT Artifact 已支持独立成果、版本、手工编辑和导出。
- ResearchSession / ResearchRun 与 AssistantThread / AssistantMessage 独立。
- 当前研究阅读页仍曾挂载 WorkCreationAction 的旧“生成我的版本”控件，直接 POST 项目 assistant。首批已从三个实际阅读入口移除；原组件代码保留便于回退。
- 主创作服务读取 workspace + project + canvasObjectId=null 下最早的一条 AssistantThread。创建者不匹配时禁止聊天；同项目后续工作共享该会话和历史摘要。
- AssistantThread 表已有 id、workspaceId、projectId、canvasObjectId、createdById，且没有 project 唯一约束。因此用现有 Thread ID 表示创作任务可不做 schema 迁移。
- 输入暂存目前以 workspace/user/project 为键，未绑定 Thread ID；需要更新应用契约，不能仅重画 UI 或把旧内容隐藏进 system prompt。

## 两个不同的确认边界

### A. 无迁移的任务隔离方案

1. 保留全部旧会话与历史消息。旧主会话继续可读；新增任务时明确新建 AssistantThread，不复制旧消息或摘要。
2. 为当前可用聊天的账号新增“新创作任务”及任务列表。任务标题首期由用户首条消息摘要/创建时间显示，不持久化虚假标题。
3. API 请求显式提供 threadId。服务端同时验证 workspace、project、createdById、canvasObjectId=null 与现有角色权限，不仅依赖 UI。
4. 模型历史、摘要、重试原消息、当前编辑 Artifact、引用都只从指定任务读取；禁止自动读取其他任务聊天或项目成果正文。
5. 客户端输入草稿键增加 threadId；老项目键仅由原会话一次性兼容读取。取消采用不覆盖原输入。
6. 流式请求、补读 GET、上传结果、引用预览、采用确认均绑定请求时的 project/thread/object 和请求代次；切换后旧响应不得更新新会话状态。
7. 独立成果采用已有 Artifact/ArtifactRevision；引用/骨架/核验列表显示在成果与参考区域。不会为了减少聊天刷屏隐式增加模型上下文。
8. 所有验证只在 55436 与 Mock 中进行；正式重启仍需单独批准。

此方案不需要数据库迁移。但不能宣称现有仅按项目的版本已满足任务隔离；须完成服务端和浏览器回归后验收。

### B. 共享项目多人各自私人创作会话：本批不扩大授权

现有语义为最早主会话属于谁，谁能聊天；其他成员只能查看获准成果。要允许其他有效成员各自新建私人任务，需要确认：

- 是否允许当前已有项目读取权限的非 VIEWER 成员，创建和使用自己的私人 AssistantThread；
- 原有别人的会话仍禁止读取、引用、重试、保存、接管；共享 Artifact 仍按已有项目读取权限可见；
- VIEWER 的创作、保存权限保持原规则，不因新任务接口获得写权限。

本次按最新明确指令，不改变该权限语义；新增任务也只授予已有原主会话聊天权限的成员。其他成员不得因本批获得新的聊天权限。不得用隐藏别人的消息代替服务端隔离。

## 私人长期批注：必要 schema 方案（不执行）

现有 ResearchObjectPreference 可承载私人 MATERIAL 未读与收藏，无需迁移。个人来源批注/跟踪目的没有字段：
- 可在既有 ResearchObjectPreference 增加 notes String? @db.Text；所有写入继续绑定 workspace + user + kind + objectKey。
- 对 BenchmarkAccount.researchNotes 的现有写入是工作空间共享记录，不把它冒充个人笔记。
- 若需要独立笔记版本/全文检索能力，再评估范围；首期不新增平行笔记系统。
- 新列仅增列，无删除或覆盖旧数据。需确认后才能写 schema/migration；正式 migration deploy 另行授权。

## 首批无迁移内容

- 默认 /research 为真实资料来源列表；按实际入库日期显示，不把旧观察写作今日热点。
- 原文摘录、机器文字稿摘录、来源描述分开标注；技术文件名只改显示标签，不改库内标题。
- 明确标记已读/未读、个人收藏；收藏不自动标记已读；原件更新重新视为未读。
- /research/sources/[id] 服务端校验成员、workspace 和 READY 资料归属后读取原文。
- /research/new 是显式研究表单；旧带参数 /research 链接兼容跳转。
- 研究采用界面不再默认勾选三段 AI 解释；由用户选结论及目标项目，再进入待发送输入。
- 账号档案、实际作品窗口和动态拆解沿用已有业务链，不开启外调或伪造进度。
- 留存工作树基线与逐文件原状：output/research-core-20261006/iteration-1791269163425。

## 交付前必测

不同项目/任务切换、返回刷新、取消、双击、失败重试、流式迟到；共享成员互读/重试拒绝；研究追问/保存/收藏/刷新不得改创作 Message、输入或 Artifact；用户明确采用后仍不自动发送；研究更新不得覆写既有成果版本。

## 2026-10-06 实际视频核对与研究功能交付检查点

优先级：本批先研究，创作任务隔离、骨架/脚本等仍后排，未宣称已实现。参考视频已通过受支持 Library materialization 路线下载到 Windows，27007729 字节、590.228 秒；已提取并目视核对 17 帧。此前普通 download_file 的 Windows split-root 沙箱初始化错误已解决；没有借此读取业务凭证或恢复外调。

| 参考功能 | 本次实际入口 / 数据 / API | 验证与改进 | 仍有限制 |
| --- | --- | --- | --- |
| 03:10 Clippings | /research/results?library=clippings；既有私人 ResearchSession/ResearchRun；POST /api/research/sources/:id/clippings | 手工选原文+私人备注，服务端核对片段、来源范围与幂等；并发只保存一条 | 是私人手工记录，非 AI 分析；不新增逐对象可编辑 notes 列 |
| 03:15–03:41 日报、读原文、收藏 | /research；READY SourceItem+本人 MATERIAL preference；/research/sources/:id | 原文/转写/描述分开，真实入库日期与 1/3/7/30 天筛选；阅读不自动写已读；收藏不自动改已读 | 不伪造 AI 日报，不启用定时采集；未读按最多30项当前批次筛选 |
| 03:43 新作品、未读、研究、原文 | /research/works；BenchmarkContentSnapshot/Observation+本人 WORK preference | 普通作品可研究；账号/平台/日期筛选，缺失指标明确，本人研究与已有选题链接；真实浏览器已读、刷新和时间筛选通过 | 每批100项；无可靠同口径基线时不显示爆款倍数；未知发布时间排除近几天 |
| 03:47 老师/对标添加 | /research/benchmarks；既有 BenchmarkAccount；POST /api/discovery/benchmarks | 手工平台账号、真实ID、共享跟踪目的；真实浏览器保存通过 | 当前支持手工抖音/小红书；外部搜索与同步采集仍暂停，不能把目的写成私人笔记 |
| 同步实际状态/时间 | 账号档案沿用 collection runs 和 lastSyncedAt；作品显式 observedAt | 保留真实既有状态与观察时间；暂停采集按钮可见且不可启动 | 本批没有新同步，不把旧作品包装成今日采集成功 |
| 04:13–04:43 动态拆解/方法/适用性 | 既有 work research / WORK_DEEP 阅读；保留实际原文与动态块 | 去除三个实际研究阅读入口中的旧直接生成稿件控件；明确选择发现→目标项目→待发送预览 | 新模型运行仍需另行恢复模型策略；历史报告不代表本批真实 AI 执行 |
| 04:23 明确用于创作 | ResearchUseFindings / 既有 handoff API | 默认零勾选；取消不写项目；原输入保留；只带明确选段，零项目 assistant/Artifact POST | 创作新任务隔离仍是后排方案，本批未扩大成员聊天权限 |
| 04:45 已采用/重复提示 | 来源页及作品队列显示既有 ContentIdeaReference；POST /api/research/sources/:id/topic | 用户先确认工作空间可见；同来源同名幂等，不覆写原说明；私人备注不自动复制 | 其他角度可明确另存；不假定原视频按钮展示等于后端成功 |

最新真实浏览器回执：output/research-core-20261006/iteration-1791269163425/browser-1791272515037/evidence.json，8项通过，fixtureCleanupVerified=true，assistantPosts=0，formalBusinessWrites=0，externalCalls=0，originalUserPasswordUsed=false。
直接新增服务验收 research-source-inbox.test.ts 9项通过；共享发现/选题服务两文件9项回归通过。TypeScript 和本批相关 lint 已通过，隔离候选构建进行中，最终状态另补。

实际截图：
- 首批4项：library-first-screenshots.json；日报桌面 libfile_b9f1192d03b08191b9144a84c800cefc、移动 libfile_bbacf5a567e481918cbc40aefef14c14、来源 libfile_39720006a25c819185cdaa7816e0b995、暂停采集 libfile_20edc8c6a5288191865c55550652c981。
- 新作品队列：libfile_d98164cc48008191b40a7c2a1f4be783。
- 私人摘录/重复采用：libfile_c3c07af849748191954dbb2be883656c。
- 后两项精确本地路径/身份回执：library-new-features.json。Windows 无 os.setxattr，元数据映射已写回执，未宣称 xattrs 已设置。

当前仅127.0.0.1:3020为研究验收环境。正式127.0.0.1:3000 PID68104保持原运行进程；未应用本批代码、未迁移、未改密码或权限、未启用外调。旧库/卷/备份继续保留，Git未暂存、提交或推送。
旧 research-experience-browser / research-creation-browser 中部分断言面向已被用户否定的旧首页或直接生成控件，本批未冒称这些旧验收通过；新8项HTTP验收覆盖当前研究入口。创作跨任务流式迟到等验证归后续创作任务。

## 本批最终验证与环境状态

- 隔离候选构建成功：output/architecture-upgrade-20261005/releases/release-20261006T074346Z-443e571e/receipt.json，status=BUILT，exitCode=0，networkDenied=0，liveFilesUnchanged=true，sourceUnchanged=true。生产 TypeScript 与104页生成通过。未启动或应用到3000。
- 新研究服务9项、共享选题/发现9项、当前真实浏览器8项通过；额外9文件研究回归51项中50通过、1失败。该失败为 research-library.test.ts 的可选评论采集 Mock 期望成功，而当前 collectF2Comments 入口 assertReviewExternalAllowed 拒绝 LOCAL_REVIEW_EXTERNAL_CALL_BLOCKED。本批未改该运行策略或相关服务，不宣称全研究测试通过。
- 当前本批相关15文件 lint通过；web类型检查通过，最终生产构建再次检查全部Web类型。
- git diff --check通过（既有CRLF提示），无暂存、提交、推送。phase-file-manifest.json记录31个改前快照及本批文件状态；不覆盖原WIP。
- 只读HTTP：3000/3020存活与/login均200，未登录/api/projects均401；/api/health/ready均503。503不能解释为本批已验收完全就绪。最终结果留存final-readonly-http.json。
- 正式3000继续原PID68104；本批review3020 PID85736，仅127.0.0.1，3030未启动。无正式业务写入、迁移或新凭证；原密码仍须本人验收。
- 去重按当前用户、当前来源和同名选题处理；不同成员的候选首先通过已有选题提示供明确选择，不宣称全工作空间唯一。
- 人工逐对象编辑型长期批注列仍未实现；本批通过既有私人ResearchRun提供手工摘录备注，不需要迁移。创作任务隔离方案待后续任务，不扩大聊天权限。

### 隔离生产候选真实 HTTP 补充验收

构建产物 release-20261006T074346Z-443e571e 已使用既有 review 配置临时启动于127.0.0.1:3030；/api/health/ready=200、ready=true，configuration/database/storage均true，live/login=200，未登录projects=401、research/works=307转登录。回执production-review-smoke.json。无正式写入或外调，临时进程验收后已发送停止信号。

更正503含义：现有3000/3020进程未带LOCAL_RELEASE_PROFILE；releaseReadiness在配置门禁提前返回三项false，未探测数据库和存储。因此503不证明数据库/附件不可用，也不应通过关闭门禁绕过。新生产review候选在既有55436/19000配置下已真实通过上述健康探测。正式3000不重启，原运行配置保持。
