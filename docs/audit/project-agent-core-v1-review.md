# Project Agent Core V1 验收交接

STATUS: PROJECT_AGENT_CORE_V1_READY_FOR_REVIEW

日期：2026-09-28。此状态表示隔离工位代码和本地验收已完成，等待人工评审；不代表已合并、上线或通过真实付费模型效果验收。

## 开发环境与边界

- 独立目录：`D:\Documents\ChatGPT\内容生产中心-agent`
- 分支：`feat/project-agent-core-v1`
- 基线及 HEAD：`883dd84cd66e4a579b5126b5e317f9c854dd94e5`
- Web 验收端口：3015；未占用 3013 / 3014。
- 独立 PostgreSQL：`content-center-agent-postgres`，本机端口 55435，数据库 `content_center_agent_test`。仅此新数据库执行了 Prisma db push；没有执行 migration deploy。
- 依赖在独立目录安装、Prisma Client 独立生成；未复制主目录未提交文件或 API 凭据。
- 未修改主项目工作区、Research 并行工作区、账号/API 工位，也未修改账号配置、Research 产品结构、Material 主链、Knowledge 产品、License、Desktop 或治理文档。
- Schema / Migration：无修改。复用 AssistantThread.createdById、AssistantMessage.metadata、AIRun.metadata、Artifact、DraftBranch / DraftRevision。

## 最终数据流

请求携带 content、references、skillVersionId、modelSelection → 服务端登录与项目/成员校验 → 当前用户的项目对话 → ContextBuilderV2 通用对话分支 → 类型化资料 Adapter → 去重、预算、最近对话与旧对话摘录 → AIControlService / ModelRouter → 现有 LLMRuntime / Provider.streamText → SSE → AssistantMessage 与 AIRun → 用户点击保存 → 现有 Artifact Service 和版本机制。

没有引入 AgentV2、ConversationV2 或独立 Run 表。Canvas 节点生成和历史创作任务保留原有上下文分支。

## 相对参考方案的关键优化

1. **私人研究不通过聊天历史泄露。** 默认通用对话按 workspace + project + createdById 隔离；同项目成员不再共享默认聊天。保存和应用成果也必须拥有来源消息。旧对话按其原 createdById 归属可见，不迁移或删除历史数据。
2. **预算清单就是实际上下文。** 通用对话不再把旧 ProjectContext 的整套数据连同精简 manifest 一起发给模型。只序列化最终选中的 items 和必要提示。
3. **大资料不会独占全部引用预算。** 每个显式来源有份额，并为近期对话独立预留预算。当前用户问题完整保留；超限明确失败。
4. **重试能恢复原请求。** 服务端从用户自己的原消息读取引用、Skill、模型及目标成果快照；刷新页面后重试仍可用，并截断到原请求之前的历史。
5. **取消保留已生成文字。** 停止和失败保存 partial content；正常网络结束但未收到终态按中断处理。原始异常不回显给用户。
6. **并发发送受服务端约束。** 使用 PostgreSQL 事务 advisory lock 保证默认会话创建与生成占用；已有运行时拒绝第二次发送。超过十分钟的遗留消息可恢复为失败状态。
7. **成果修改保留多段完整正文。** 修复目标 Artifact 改写只提取“新版本”首行的问题，应用时继续使用 expectedVersion 并保留历史 revision。
8. **首次打开新项目可以完成初始化。** 工作区数据加载先初始化一次主稿，再并行执行其他读取，避免两个旧读取器同时初始化造成死锁。

## 引用和权限

| 对象 | 读取边界 | 内容与定位 |
| --- | --- | --- |
| Material | workspace 范围和成员检查后调用 getMaterialReadableContent | 最佳可读正文、版本和更新时间；不可读明确提示；链接 `/library/:id` |
| Research | 复用 getResearchResult / listResearchResults 的用户和 session owner 范围 | 已保存完成 Run 的问题、范围、coverage、blocks、sourceRefs；不会重新运行研究 |
| Artifact | 复用 ArtifactContextAdapter / getArtifactContext | 当前项目现有 working version，链接现有成果入口 |
| 对标账号 | 同 workspace、enabled 范围 | 名称、简介、平台、研究备注；不自动加载所有作品或启动采集 |
| 趋势 | 同 workspace 的保存快照 | 排名、指标、观察时间与数据窗口，链接稳定趋势页面 |
| Knowledge | KnowledgeContextAdapter.retrieve 接口 | 默认 unsupported；接口可注入检索实现，V1 未实现知识库 |

前端统一使用 sourceType/sourceId。Source Reference 包含标题、可访问链接、generated 属性及可用版本/时间。编号根据实际进入预算的来源生成；Markdown 的引用链接打开对应折叠来源区域。代码块不会被引用替换处理破坏。

## 上下文与 Skill

- 系统规则独立传入 Provider；正文包含精简项目背景、选中的 Skill、显式引用、旧对话摘录、最近对话和完整当前问题。
- 项目只取已有 title / description / goal / audience，不自动生成 Project Profile。
- Skill 0 个时正常执行；明确选择 1 个时校验 owner/workspace/status，加载实际步骤、边界与工作流契约。超过预算时拒绝，不会假装已生效。
- 复用现有 Skill Resolver 返回状态。没有多 Skill 规划，也没有自动写操作循环。
- items 内容预算为 32,000 UTF-8 字节，其中 10,000 预留最近对话、22,000 用于项目/Skill/引用/摘录。完整 Provider 文本另设 64,000 字节硬上限，预留 2,000 completion tokens。
- 这些字节数是当前模型目录缺少 context-window 字段时的保守限制，不声称等于模型 tokenizer 的 token 数或动态模型窗口。
- 最近最多 10 条完成消息进入预算，保留完整消息；上一条回答放不下会提示先保存成果再引用，避免默默丢失修改对象。
- 更早内容采用滚动、有界的对话摘录，存在 AssistantMessage.metadata，明确标注可能省略和非已确认事实。它不是语义长期 Memory，可能丢失旧细节；重要文本应保存为 Artifact。
- AIRun manifest 保存实际来源、截断和遗漏信息、预算及只读工具结果状态。未支持自动知识检索或自主多轮工具调用。

## 对话与前端

- 复用 StudioDefaultMethod，项目默认 assistant-only；现有 Canvas 入口和布局切换保留。
- 连续历史、Markdown 标题/列表/表格/代码、轻量执行状态、复制/保存/重新生成图标及中文 title/aria-label。
- `+` 调用现有文件/图片上传链路，成功后作为本轮引用；后台读取未完成时会说明状态。
- `@` 搜索五种已实现对象，结果展示名称、类型和说明；引用可移除。每轮最多八项。
- Skill 单选与模型选择位于输入区。模型列表读取现有 workspace Provider 的公开配置，不返回明文凭据；实际请求继续经 ModelRouter 校验。
- 语音入口明确禁用并标为暂未开放。没有伪造点赞、分享或语音功能。
- “保存为成果”复用 TEXT Artifact；进入现有成果编辑能力。没有新增成果模型或重做画布。
- GET 返回最近 80 条消息并按时间正序展示，修复原先只取最早 80 条的问题。

## 验证证据

- Agent、Conversation、Context、权限、Material readable、Skill、Artifact、AI control：6 个测试文件，共 44 项通过。
- OpenAI-compatible Provider：27 项通过，包含本地 HTTP SSE、错误处理和能力检查。
- 最小 Playwright E2E：1 项通过，覆盖新项目首次进入、引用资料、发送与追加对话、来源链接、保存 Artifact、刷新恢复，以及 390px 视口无横向溢出。
- Web typecheck、Core typecheck、修改范围定向 ESLint、git diff --check 通过。
- 关键补测：跨用户私人 Research 拒绝、私人会话和成果消息隔离、实际 prompt 使用资料/Skill、多轮保留最近回答、长历史最近页、取消保留 partial、失败后重试、恢复原引用、完整多段成果 revision。
- 截图：`output/playwright/project-agent-chat.png`。截图中的答案来自明确测试夹具。
- 未跑全仓 Playwright / 全仓 build；本次为 V2 模块收口。
- 未调用真实付费模型；真实凭据、外网连接与生成质量没有作为已完成验收。运行时仍使用已有真实 Provider 实现，账号/API 窗口合入后需人工验证实际配置。

## 复现

在独立目录的 PowerShell 中为当前进程设置 DATABASE_URL，指向端口 55435 的 `content_center_agent_test`，然后执行：

```powershell
pnpm --filter @content-center/web exec vitest run tests/project-agent-core.test.ts tests/project-assistant.test.ts tests/ai-control.test.ts tests/artifacts.test.ts tests/material-readable-content.test.ts tests/skill-resolver.test.ts --no-file-parallelism
pnpm --filter @content-center/providers exec vitest run src/openai-compatible/provider.test.ts
pnpm --filter @content-center/web exec playwright test --config playwright.agent.config.ts
pnpm --filter @content-center/web typecheck
pnpm --filter @content-center/core typecheck
git diff --check
```

Agent E2E 配置强制核对独立数据库地址并使用 3015。测试脚本在独立库创建并清理自己的数据，不连接主库。

## 后续与交接

Knowledge 检索实现、语义长历史压缩/Memory、多 Skill、多 Agent、高级 Canvas 和模型窗口精细计量继续留在后续范围。当前账号 API 抽象仍以 workspace 为单位；未跨窗口提前实现用户 Credential Store。

无已知本地验收 blocker。人工评审需关注“通用对话改为用户私有”的产品行为，以及真实模型/凭据联调。

Git：staged = 0；所有修改及新增交付文件保持未暂存。commit = NO，push = NO，merge = NO。停止扩张，等待人工验收。
