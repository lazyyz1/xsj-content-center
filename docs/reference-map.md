# Reference Map

本文件记录阶段 1 的只读参考研究。参考仓库位于主仓库同级的 `../reference-repos`，均使用 shallow clone；主项目没有复制任何参考仓库源码。

| Repository | Commit | Source file / 模块 | License | 参考价值 | 我们怎么实现 | copied / adapted / inspired | modifications | 后续集成方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Voxen](https://github.com/Yefclub/Voxen) | `27547cfd8e68` | `prisma/schema.prisma`、`apps/web/src/lib/auth.ts`、`apps/web/src/lib/redis.ts`、`apps/worker/src/storage.py`、`apps/worker/src/pipeline.py` | MIT | URL/媒体进入后台任务、结构化 transcript、Better Auth、Redis、S3 与用户隔离 | 仅采用“入口 → 队列 → Worker → 结构化结果”的边界；本阶段只实现健康检查队列与独立 StorageProvider | inspired | 使用 TypeScript BullMQ Worker、Workspace 作用域和本项目数据模型重新实现 | 无直接集成计划；必要时仅参考公开协议 |
| [ContentFlow](https://github.com/dmamediai/contentflow) | `287b505e7839` | `apps/api/prisma/schema.prisma`、`apps/api/src/middleware/rbac.ts`、`apps/api/src/routes/teams.ts`、`apps/api/src/routes/media.ts`、`apps/api/src/mcp` | 未声明 / NOASSERTION | Team/RBAC、媒体路由、AI Studio、MCP 和内容复用流程 | 采用服务端成员关系查询和集中式角色判断；不复制其业务路由 | inspired | 将 Team 概念收敛为 Workspace，角色固定为 OWNER/ADMIN/EDITOR/VIEWER | 许可证明确前不复制或适配源码；如需能力，仅通过公开 API/MCP |
| [OverSeek Socials / socaliseit](https://github.com/MerlinStacks/socaliseit) | `e4672b07a62e` | `app/prisma/schema.prisma`、`app/src/lib/bullmq/connection.ts`、`app/src/lib/bullmq/queues.ts`、`docker-compose.dev.yml` | MIT | Next.js + Prisma、队列连接、媒体库和 Docker Compose 的基础设施组织 | 采用 Web/Worker 分离、共享 Redis 队列名称与 Compose 健康检查 | inspired | 缩减为单一 `SYSTEM_HEALTH_CHECK` 队列，不引入媒体/发布 Worker | 当前不直接集成 |
| [Pendpost](https://github.com/pendpost/pendpost) | `f7947ab8a876` | `lib/publish-hold.mjs`、`lib/publish-job.mjs`、`test/publish-hold.test.mjs`、`test/edited-since-approval.test.mjs` | MIT | 人类批准门、批准后编辑失效、发布前再次确认、活动记录 | 采用“真实发布必须处于 APPROVED”的不可绕过服务端规则；本阶段只保留 Provider 契约，不实现发布 | inspired | 用显式状态机和未来的 AuditLog 重新实现，不沿用其本地文件模型 | 将来若接入，也只通过本项目 PublishingProvider |
| [Postiz](https://github.com/gitroomhq/postiz-app) | `c98ea0465022` | `libraries/nestjs-libraries/src/integrations/integration.manager.ts`、`libraries/nestjs-libraries/src/integrations/social`、后台任务与日历模块 | AGPL-3.0 | 日历、调度、发布 Provider、集成管理与后台任务 | 只采用 Provider 注册边界和异步发布思路；阶段 1 不实现调度或发布 | inspired | 不复制 NestJS 模块或 Provider 实现 | 优先独立部署，通过 REST API/MCP/Webhook 连接 |
| [TryPost](https://github.com/trypostit/trypost) | `b689e3902cfc` | `app/Policies/WorkspacePolicy.php`、`app/Traits/HasWorkspace.php`、Workspace/Brand/Media 模型与权限测试 | AGPL-3.0 | Workspace 策略、Brand Profile、资产库和权限测试 | 采用“每次请求都验证成员关系”的服务端 Workspace 策略；不实现品牌/资产业务 | inspired | 用 Prisma 查询和 TypeScript RBAC helper 重新实现 | 优先独立服务 + REST/MCP；不复制 PHP 源码 |
| [Karakeep](https://github.com/karakeep-app/karakeep) | `5a2f009e2f6d` | `packages/shared-server/src/queues.ts`、`apps/workers/workers/crawler/assetStorage.ts`、书签/标签/搜索模块、浏览器扩展 | AGPL-3.0 | save-anything、Collection/Tag/Search、队列、资产存储和扩展边界 | 仅记录未来素材库的“保存 → 异步处理 → 归档”分层；阶段 1 不创建素材模型 | inspired | 未实现对应业务，不复制源码 | 如未来复用，优先独立部署并通过 REST/MCP/Webhook 连接 |
| [Postmill](https://github.com/postmill-ai/postmill-app) | `2ea67c89462a` | `libraries/nestjs-libraries/src/providers/provider-resolution.service.ts`、`provider-catalog.service.ts`、Brand Voice/Prompt Library/RBAC 模块 | AGPL-3.0 | Provider catalog/resolution、Brand Voice、Prompt Library、RAG 与 RBAC | 采用业务层只依赖 Provider 契约的原则；阶段 1 不实现 catalog、RAG 或 Brand Voice | inspired | 使用最小 TypeScript interface 与显式 Mock 重新实现 | 优先独立服务 + REST/MCP；不复制 Provider 源码 |

## 采用

- pnpm workspace + Turborepo，Web、Worker 与共享包分离。
- PostgreSQL/Prisma 作为持久层，WorkspaceMember 唯一约束保证成员隔离。
- Better Auth 管理 User/Session/Account/Verification，业务层不重复创建身份系统。
- 服务端集中执行 Workspace/RBAC 校验，页面隐藏不作为安全边界。
- BullMQ/Redis 只实现可验证的系统健康任务，后续业务任务按阶段新增。
- S3-compatible StorageProvider 隔离 MinIO 细节。
- Source/Transcription/LLM/Publishing/Storage 只暴露统一 Provider 契约。
- Mock 必须返回 `providerMode: "MOCK"` 并记录 `MOCK_PROVIDER_USED`。
- 真实发布必须经过人工 `APPROVED`，批准后变更应使批准失效（后续发布阶段实现）。

## 不采用

- 不采用参考项目的完整数据库或业务域；它们包含当前 V1 不需要的素材、AI、发布、分析、计费等模型。
- 不采用 Postiz/Postmill 的大型 NestJS 模块体系；对当前单一 Web + Worker 基线过重。
- 不采用 TryPost 的 Laravel/PHP 技术栈；与本项目 TypeScript/Next.js 约束不一致。
- 不采用 Karakeep 的完整抓取、搜索和浏览器扩展；属于下一阶段“内容采集与个人素材库”。
- 不采用国外平台 Provider 实现；国内平台协议和合规边界不同。
- 不采用 ContentFlow 的任何源码；仓库当前没有可识别许可证。
- 不在本阶段实现 Brand Voice、Prompt Library、RAG、AI Studio、scheduler 或 publishing。

## License Boundary

- **AGPL / GPL**：优先独立部署，通过 REST API、MCP 或 Webhook 集成；禁止将大量源码复制进主仓库。
- **MIT**：保留许可证和版权要求时允许适配，但仍优先依据公开行为重新实现最小能力。
- **未声明许可证**：按不可复制处理；只允许高层架构启发，不适配源码。
- 每次外部代码引入都必须在本文件记录 repository、source file、license、usage、copied/adapted/inspired 和 modifications。
