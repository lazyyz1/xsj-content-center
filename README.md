# AI 内容生产中心

阶段 3B RedFox Source Provider：在 Workspace 级加密凭证基础上，接通“抖音分享链接 → RedFox → 安全媒体下载 → 私有 MinIO → SourceAsset → 素材库”的真实 Provider 链路；不包含 ASR、LLM 或发布。

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
| Worker | BullMQ 系统健康与内容采集任务消费者 | 本机进程 |
| PostgreSQL | Auth、Workspace、素材、采集任务、标签、Collection、AuditLog | `55432`（容器内 `5432`） |
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
| Mozilla Readability | `0.6.0` |
| jsdom | `30.0.1` |

## Integration Secrets

Workspace Provider 凭证使用 `INTEGRATION_ENCRYPTION_KEY` 加密。该值必须是随机生成的 32-byte base64 key，不得使用可猜测文本，也不得提交到 Git。

生成新 key：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

将输出仅写入本机或部署环境的：

```text
INTEGRATION_ENCRYPTION_KEY=
```

Key 缺失时，服务不会回退到明文保存，设置页会显示 `Secret encryption is not configured.`。Key 格式或长度错误会明确失败。轮换流程见 [`docs/security/integration-secrets.md`](docs/security/integration-secrets.md)。

RedFox 通过 Workspace Integration 配置使用，不读取 `REDFOX_API_KEY` 环境变量。官方当前未公开无需作品 URL 的轻量鉴权/健康端点，因此设置页只确认 `CONFIG_VALID`，明确显示 `LIVE_API_TEST_NOT_AVAILABLE`，不会为了“测试连接”自动解析或产生调用。

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
- Integration 页面从 Workspace `IntegrationConfig` 读取 RedFox、Doubao、LLM 状态，支持 OWNER/ADMIN 保存、Disable、Enable 和 Delete；API 只返回 public config 与 `lastFour`。
- Provider secret 通过 AES-256-GCM、随机 IV 和认证标签加密保存；Worker 使用同一 Workspace scoped IntegrationService 解密入口。
- Storage 继续由服务端环境变量管理，并明确显示 `Environment Managed`。
- RedFoxSourceProvider：只开放明确的抖音作品链接/分享文案，使用 Workspace 解密后的 API Key 调用真实 RedFox 解析协议。
- RedFox 媒体经 SSRF/DNS/重定向/超时/大小/MIME 校验后流式落入私有 MinIO，素材页只使用 5 分钟 Signed URL。
- `SourceAsset` 显式记录 REMOTE/DOWNLOADING/STORED/FAILED；至少一个 Asset 为 STORED 才允许 SourceItem READY。
- `ApiUsage` 对每次 RedFox `PARSE_WORK` 调用记录 1 unit；官方未返回成本时 `cost = null`。
- READY 抖音 canonical URL 在同一 Workspace 内禁止重复收录，避免重复调用；FAILED 素材可显式重试。
- Manual Text Ingest：文本通过真实 Worker 入库，并生成明确标记为 `MANUAL / REAL` 的 Transcript。
- Generic Web URL Extraction：仅抓取公开 HTTP(S) 网页，经 SSRF 校验后提取为纯文本正文。
- Library：卡片/列表视图、真实分页、标题/作者/正文搜索、平台/类型/状态/标签/Collection 筛选和排序。
- 人工 Tags 与一级 Collections，可在素材详情中添加和移除。
- Ingest Jobs：显式状态、进度、错误、自动瞬时错误重试和人工失败重试。
- SourceItem 归档、确认后删除及对应 AuditLog。
- 所有素材、任务、Transcript、Tag 与 Collection 查询均执行 Workspace Membership 隔离。

## What Does Not Work Yet

- Doubao ASR（豆包转写）：`UNCONFIGURED`
- LLM 调用：未接入
- RedFox 以外的视频来源：未开放
- 视频/音频转写：未实现；RedFox 视频详情明确显示“等待语音转写能力接入”
- AI 创作：未实现
- Publishing：未实现
- ContentProject、Creator Memory、热点发现：未实现

这些能力不会以假按钮、假 API 或假成功状态呈现。

## Security Notes

- `.env`、真实 Key、Cookie 和 Token 不提交到 Git。
- 外部凭证只允许 Web server/Worker 解密；API 和 UI 只显示状态与末四位。
- URL 抓取只允许 HTTP(S)，对初始地址、DNS 结果和每次重定向执行 SSRF 校验，并限制超时、响应体大小和跳转次数。
- RedFox 返回的临时媒体 URL 仅在 Worker/数据库服务端使用，不通过素材 API 返回；播放只使用本项目私有 Storage 的短期 Signed URL。
- 媒体下载默认限制为视频 300 MiB、图片 30 MiB，拒绝 HTML/JSON 或与 Asset 类型不匹配的 MIME。
- 网页正文只保存和渲染 normalized plain text，不把远端 HTML 注入页面。
- `IntegrationConfig` 将 public config 与 AES-256-GCM encrypted secret 分开保存；缺少 master key 时 fail closed，不写明文。
- 真实外部发布必须等待后续阶段实现 `APPROVED` 人工审核门。

## Reference Research

参考项目、源码位置、许可证边界和采用/不采用决策见 [`docs/reference-map.md`](docs/reference-map.md)。参考仓库位于主仓库外，不参与主项目 Git 跟踪。
