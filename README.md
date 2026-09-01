# AI 内容生产中心

阶段 1 基础骨架：Better Auth、Workspace/RBAC、Provider 契约、BullMQ 健康队列、MinIO StorageProvider 和响应式 Web Shell。

## Prerequisites

- Node.js `>=24`（本阶段验证：`24.18.0`）
- pnpm `11.19.0`
- Docker + Docker Compose

## First Run

```bash
copy .env.example .env
pnpm install
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

Web 默认运行在 `http://localhost:3000`，MinIO Console 默认运行在 `http://localhost:9001`。

## Services

| Service | 用途 | 默认端口 |
| --- | --- | --- |
| Web | Next.js App Router | `3000` |
| Worker | BullMQ 系统健康任务消费者 | 本机进程 |
| PostgreSQL | Auth、Workspace、IntegrationConfig、AuditLog | `55432`（容器内 `5432`） |
| Redis | BullMQ 队列 | `6379` |
| MinIO | S3-compatible 对象存储 | `9000` / `9001` |

## Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:worker

pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build

pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

基础设施快捷命令：`pnpm infra:up`、`pnpm infra:down`。

## Exact Versions

| Package | Version |
| --- | --- |
| Next.js | `16.3.4` |
| React / React DOM | `19.2.8` |
| TypeScript | `6.0.3` |
| pnpm | `11.19.0` |
| Turborepo | `2.10.12` |
| Tailwind CSS | `4.3.3` |
| Better Auth / Prisma adapter | `1.7.2` |
| Prisma / Prisma Client | `6.19.3` |
| BullMQ | `6.3.3` |
| ioredis | `6.0.0` |
| AWS SDK S3 | `3.1123.0` |
| Vitest | `4.1.11` |
| Playwright | `1.62.1` |

Prisma 固定在 `6.19.3`：阶段初始化时 `prisma` 的 npm `latest` 指向 `8.0.0-rc`，而 Better Auth 官方明确支持 Prisma 6；这里优先稳定和兼容，不追逐 RC。

## What Works

- email/password 注册、登录、数据库 Session 和退出登录。
- 新用户 Onboarding 创建一个 Workspace，并成为 OWNER。
- 服务端 `requireSession`、`requireWorkspace`、`requireWorkspaceRole` 与 Workspace 隔离查询。
- OWNER/ADMIN 可访问成员列表；EDITOR/VIEWER 无管理权限。
- Source、Transcription、LLM、Publishing、Storage Provider 契约。
- 显式 Mock Provider：返回 `providerMode: MOCK` 并记录 `MOCK_PROVIDER_USED`。
- Web 创建 `SYSTEM_HEALTH_CHECK`，Redis/BullMQ Worker 消费并完成任务。
- MinIO 上传、Signed URL 和删除。
- Dashboard 的计数来自 Workspace 范围内的数据库查询；空库显示真实的 `0`。
- 集成页根据服务端环境配置显示 Configured、Unconfigured 或 Mock，不返回密钥。

## What Does Not Work Yet

- RedFox（红狐 API）：`UNCONFIGURED`
- Doubao ASR（豆包转写）：`UNCONFIGURED`
- 内容采集：未实现
- AI 创作：未实现
- Publishing：未实现
- 素材库、ContentProject、Creator Memory、热点发现：未实现

这些能力不会以假按钮、假 API 或假成功状态呈现。

## Security Notes

- `.env`、真实 Key、Cookie 和 Token 不提交到 Git。
- 外部凭证只允许在服务端读取；集成页只显示状态。
- `IntegrationConfig.encryptedConfig` 已预留，但阶段 1 没有实现成熟加密写入，因此当前不保存敏感配置。
- 真实外部发布必须等待后续阶段实现 `APPROVED` 人工审核门。

## Reference Research

参考项目、源码位置、许可证边界和采用/不采用决策见 [`docs/reference-map.md`](docs/reference-map.md)。参考仓库位于主仓库外，不参与主项目 Git 跟踪。
