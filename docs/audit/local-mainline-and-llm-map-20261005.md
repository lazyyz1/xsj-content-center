# 本地主树与 LLM 新旧链路核查 — 2026-10-05

STATUS：本轮 V0 只读核查完成到可用于下一张技术执行卡的范围；没有实施 C，没有业务代码、路由、Prompt、schema 或正式数据变更。六板块建议已撤回，不作为产品重组依据。先确认本地实现主线，再做共同技术底座，业务去留另行核定。

## 主树依据与未吸收工作

建议继续以 `D:/Documents/ChatGPT/内容生产中心-integration` 的**当前工作内容**作为施工主树。它的 HEAD 为 `ae3ff0879029394cec99ccb2f00d012e1e8a52ed`，分支 `feat/web-integration-release`；其他已登记 worktree 的 HEAD 都是其祖先。3000 的实际 Next 进程 PID74600，命令路径来自 integration 的 Next 依赖；现有正式交付记录和启动器将 daily 限定为3000/55432/9000。未读取进程环境或私人 env 的秘密值，进程命令路径本身不是全部运行配置证明。

这说明 integration 是已整合并正在使用的主树，**不证明其他工作目录的未提交成果都已吸收**。本次比较 git 已改文件及全部 untracked 路径的工作文件摘要，没有按目录修改时间裁决新旧。统计是文件字节关系，不是业务价值排序：

| 目录 | HEAD 与 integration 的提交关系 | 已改/未跟踪路径 | 同内容 | 不同内容 | 仅该目录存在 |
| --- | --- | ---: | ---: | ---: | ---: |
| 原 内容生产中心 | 883dd84c，integration领先4提交 | 429 | 80 | 82 | 264 |
| 内容生产中心-account | 883dd84c，integration领先4提交 | 126 | 50 | 52 | 23 |
| 内容生产中心-agent | 883dd84c，integration领先4提交 | 42 | 12 | 20 | 10 |
| material-v1-final-5867b637 | 68887398，integration领先6提交 | 5 | 2 | 3 | 0 |
| integration | ae3ff087 | 272（采样时） | 本树基线 | — | — |

原目录另有3个“原目录删除/integration存在”路径；account有1个敏感名称路径跳过。仅该目录存在包含审计、截图和输出文件，不能把264项叫作264个未合并功能。没有搜索秘密值，没有读取敏感配置文件。上述数字来自本轮初始采样，后加本核查文档会使工作树统计增加。

需要保留的具体增量：
- **原目录独有源码/测试19项**：discovery 下账号分析/报告表格、benchmark-analysis-workspace、benchmark-input-panel、research-library；material-detail 的页面/菜单/证据抽屉及 server/material-detail/view-model；workspace-selection-view、studio-reference.css；两个资料/研究 E2E；三个 import/inspect 辅助脚本。另有 benchmark-research、frontend-information-architecture 等独有产品/审计稿。未执行这些导入脚本，未复制到主树。
- **原目录与主树不同的活跃链**：原 dashboard 有 ProjectTreeExtension，StudioShell 有 OralScriptArtifact/显式进入口播编辑路径；主树是 ArtifactWindow、项目 Assistant 和通用文本 Artifact。属于实际工作内容差异，不能直接把原目录组件补回主树。
- **account 独有7个源码辅助入口**：account-preview/local-storage-smoke/real-chain-retry/real-chains-acceptance/real-material-agent/account-env/account-http-smoke；本轮未执行。账号核心差异已抽查：integration 增加停用保护、负责人交接、持久限流等；没有据此认定全部52个差异都可丢弃。
- **agent 10个独有路径**全部在 output，为截图/基线/辅助运行记录；20个同名差异仍要保留。抽查 Assistant、Artifact：integration 增加媒体/联网协作、停用范围检查及手动版本保存；通用 Artifact 基础链已在两树存在。
- **material候选3个差异**为 readable-content 测试、transcription 集成测试及 transcription processor；祖先关系不代表这些未提交差异没有价值。保留，不自动覆盖。

逐文件台账：`output/architecture-lineage-20261005/checkout-facts.json`；7个关键语义 diff 和列表：`diffs/`、`semantic-diff-ledger.json`。仅本机忽略目录；所有目录和未提交修改保持原状。

## 当前真实 LLM 链路

“模型与API”位于 `/settings/integrations`，页面通过 requireWorkspace 和管理权限显示工作区集成状态。它是模型/采集等配置入口；业务 LLM 入口在下表，不应只审 Provider 设置页。

| 当前入口 | API / 服务 / 上下文与模型 | 生成结果与保存 |
| --- | --- | --- |
| 首页开始创作、dashboard 项目对话 | WorkbenchStart/HomeComposer → /api/projects → dashboard → StudioShell → StudioDefaultMethod → /api/projects/[id]/assistant → runProjectAssistant → AIControlService → ContextBuilderV2.buildAssistant → ModelRouter/loadLLMRuntime → OpenAICompatibleLLMProvider.streamText | SSE start/status/delta/done/stopped/error；AssistantThread/AssistantMessage 持久保存。通用成果通过独立 Artifact API 显式创建/应用版本，生成结束不自动覆盖成果 |
| 作品研究后“把研究变成我的内容” | WorkCreationAction（作品详情、研究会话、研究结果页实际引用）→ 可选 prepare-creation → 保存研究 → researchCreationPrompt → 同一个项目 Assistant；引用 RESEARCH runId 和自选材料 | 生成的是 Conversation 回复；用户编辑后显式 POST Artifact，再用 PUT expectedVersion 保存改动。历史版本保留，离开未保存内容有保护；不调用 GENERATE_MOTHER_CONTENT |
| 选中通用 Artifact 继续修改 | ArtifactWindow/StudioDefaultMethod → Assistant 请求 targetArtifactId → ArtifactContextAdapter 限定当前目标 → 返回完整修改正文 | POST artifacts/[artifactId]/revisions 校验 message归属及 expectedVersion 后应用。不是生成时直接替换 legacy primary draft |
| 研究主题、拆解作品、研究账号 | ResearchComposer/ResearchSession及账号/作品控制组件 → research API → reserveResearchRun/executeResearchRun；profile 分流 ACCOUNT_DOSSIER、ACCOUNT_V2、WORK_DEEP、FOCUS_V2、TOPIC_OPPORTUNITY_V2 或通用研究 →各自 evidence/prompt/schema → ModelRouter + executeStructuredAIRun | ResearchSession/ResearchRun 保存版本、inputs/blocks/状态；普通启动通过 Next after，页面查询运行状态；saveResearchResult 只是显式 savedAt，不自动变成创作 Artifact |
| Canvas 节点协作 | 节点 Assistant API → runNodeAssistant →选中节点/快照上下文→共同 AIControlService/provider | CanvasGenerateRun、消息及新 Canvas 文本对象；与项目通用 Artifact 保存是不同路径 |
| 母稿与平台适配兼容 | 当前 StudioShell 仍保留 /api/projects/[id]/ai/run 的 GENERATE_MOTHER_CONTENT、apply、MotherContentEditor、PlatformFactory；非项目 Assistant 的 ContextBuilderV2 分支仍可调用 legacy ProjectContextBuilder | DraftBranch/currentDraft、母稿/平台稿兼容状态。不能冒充所有新业务的必经链，也不能无证据删除 |

项目 Agent 已证实的边界：
- `assistant/service.ts:219` 为实际入口；`control/context-builder-v2.ts:151` 对 PROJECT_ASSISTANT + GENERAL_QUERY 走独立 buildAssistant；该分支返回 `currentDraft:null`、`defaultMethod:null`，不继承母稿/default-method流水线。引用按工作区/项目或私人研究所有者范围解析。
- Skill 可选：显式 null 不加载；undefined 可采用已选择的项目方法（最多一个），不是默认强制方法。UI 有“不使用 Skill”，不能笼统称“全部新链已移除方法”，也不能把旧默认创作方式规则接回。
- AIControlService 检查角色/scope/fact/action 权限；loadLLMRuntime 在外调禁用标志处先拒绝，之后才读取工作区集成配置。ModelRouter 是 SINGLE_ENGINE，crossProviderFallback=false；模型选择必须匹配该工作区配置 Provider 和能力。没有实际调用任何模型，未验证模型质量。
- Artifact TEXT 当前复用 DraftBranch/DraftRevision 版本原语，并有不得应用到 legacy primary draft 的检查。共享底层存储原语或 Provider 不代表业务回流。
- 作品拆解 prompt 明确按作品实际内容生成动态 structureBlocks，不套 Hook/正文/CTA 固定三段。改写面板提供短视频/图文/文章，自有材料选填，缺事实留问题。另一个趋势选题 TOPIC_OPPORTUNITY_V2 profile 当前要求项目与自有材料，这是特定链现状；不能将“自有材料选填”泛化到所有研究 profile。

关键源码位置：`app/(app)/dashboard/page.tsx`；`components/projects/{studio-shell,studio-default-method,content-canvas}.tsx`；`components/research/{work-creation-action,creation-prompt}.tsx`；`server/assistant/{service,references}.ts`；`server/ai/control/{ai-control-service,context-builder-v2,model-router}.ts`；`server/ai/llm-runtime.ts`；`server/research/{service,work-research-analysis}.ts`；`server/artifacts/service.ts`。以上均以 apps/web 为前缀。

## 新旧、隐藏和废弃候选

| 分类 | 已证实事实 | 处理边界 |
| --- | --- | --- |
| CURRENT IMPLEMENTATION 活跃新主线 | dashboard 实际挂载项目 Agent；研究结果与作品改写实际使用通用 Assistant/Artifact | 作为技术契约梳理对象，不改交互或Prompt |
| LEGACY COMPATIBILITY 仍有真实依赖 | projects/[id] 与 studio 路由重定向 dashboard；StudioShell 仍挂载 Canvas、MotherContentEditor 与平台适配 | 保留路由和数据，不解释为产品必经流程 |
| 隐藏但仍挂载 | StudioShell 默认 assistant-only；ContentCanvas 对画布 aria-hidden，布局菜单支持画布/对话组合，稿件 focus editor仍在组件树 | 属布局状态，不证明废弃；未进行登录浏览器可见性验收，不猜赶工动机 |
| 静态无引用候选 | integration 的 AICreationPanel 在 app/components 搜索仅命中自身定义；原目录独有 ResearchLibrary/BenchmarkAnalysisWorkspace 主树不存在 | 仅候选，本轮扫描不覆盖一切动态引用/历史运行；不删、不恢复、不判定正式废弃 |
| CURRENT IMPLEMENTATION GAP | 兼容方法面板仍显示“默认创作方法已自动应用”，但项目 Agent 独立分支 defaultMethod:null；新工作台与旧母稿控制还同属 StudioShell | 先报告事实，业务文案/组件去留等用户确认后另卡，不用隐藏界面通过验收 |

## A/B 保护与 C 技术边界

本轮将上述六个目录中的119个当前源码与 A release-20261005T060130Z-244d397f 的源码清单摘要比较，全部一致（`llm-protected-source-check.json`）。覆盖 server/assistant、artifacts、research、ai/control 和 components/research、projects；这是该119文件的精确范围证明，不是全仓无变化认证。B 没有将这些业务链迁回旧母稿；A产物因其他B代码变化不能当当前完整生产产物。

A 已完成构建/启动隔离，B 已完成代表 IngestJob 提交恢复及模式/权限收口，详见各批交付。ResearchRun 的 Next after 链不受 B IngestJob reconcile 自动覆盖，Benchmark旧表和 autoTranscribe窗口也是已登记缺口。没有声称全部LLM任务已具持久队列恢复。

C 仅允许在下一张明确小卡中做：纯 DTO/type 契约提取；client/server-only依赖边界检查；既有服务层与只读 read model 的技术职责整理。SSR 直接调服务合法，不强制所有链绕 HTTP。每卡先列直接调用者、字段/状态兼容和scope保障，用定向验证证明行为不变。

C 当前不允许：按撤回的六板块重组；更换研究三入口或项目交互；修改模型路由/Prompt/Skill行为；恢复原目录口播协议；删除隐藏组件/旧路由；移动真实数据归属；新增schema/正式迁移/运行切换。领域拆分暂停，不能把本地图当业务重构授权。

待负责人核定的具体事项（不阻塞只做技术契约）：
1. 原目录独有资料详情/研究表格/workspace展示：保留为独立候选评审，或另卡按功能逐项适配；本轮不整树吸收。
2. Canvas/母稿/平台适配：保持现有兼容可达状态，或经单独确认调整可见入口；当前不删除。
3. 项目 Agent 的可选Skill/通用Artifact与兼容默认方法面板如何对齐，以及特定趋势链是否继续要求自有资料：属于业务选择，不能由C偷偷决定。
未能从代码证明“为什么赶工隐藏”或“已经批准废弃”的候选保留待问，不编造历史原因。

## 本轮验证与运行状态

V0：注册worktree提交祖先关系、已改工作文件摘要、7个关键语义diff、入口/服务静态引用、119源码保护检查。没有运行代码测试/build/迁移/导入脚本，没有真实密码登录、LLM/采集调用或正式写入；没有重启服务和修改账号。

2026-10-05T08:04 UTC附近实时匿名 GET：3000/api/health/live、3000/login、9000/minio/health/ready均200。3000监听127.0.0.1，原MinIO9000/9001仅回环；3017/3020/3030/56381没有监听，B隔离Redis已退出。原55432、旧55435和review55436保留。原PostgreSQL既有公开映射未变更。数据库/附件切换结果与回退位置见 database-cutover-delivery-20261004.md；本轮未重新读取业务表或复做附件全量hash，不能用该匿名检查替代本人登录验收。

GIT：未 add/commit/push、切分支、合并、reset 或覆盖用户树。本轮只新增本核查文档并精确修订 architecture-upgrade-plan-20261005.md；本机证据在 Git 忽略的 output/architecture-lineage-20261005。
