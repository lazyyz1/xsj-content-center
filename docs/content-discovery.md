# Content Discovery V1

## 产品定位

内容发现回答“我下一条内容值得做什么”。它是发现和取舍层，不是 RedFox API 查询后台，也不是第二个素材库。

- **内容发现**：搜索外部内容、查看对标账号、暂存选题，决定是否收录或创作。
- **素材库**：保存用户已明确收录的 SourceItem、媒体和转写结果。
- **内容项目**：承载正在进行的研究、Evidence、简报、母稿和多平台创作。

V1 的主链路是：

```text
搜索方向 → 发现外部内容 → 预览
                           ├→ 收录素材
                           ├→ 加入选题
                           └→ 开始创作
```

## RedFox 数据层

RedFox 凭证继续通过 `IntegrationConfig` 在服务端加密存储。浏览器不接触 API Key，页面和 Route Handler 不知道第三方 endpoint 或 payload。

```text
ContentDiscoveryService
  → RedFoxDiscoveryProvider
      ├→ ContentSearchAdapter
      ├→ AccountSearchAdapter
      ├→ AccountDetailAdapter
      ├→ AccountWorksAdapter
      └→ WorkDetailAdapter
          → RedFoxClient
```

单条作品的媒体下载不另建管线，仍复用现有 `RedFoxSourceProvider → IngestJob → BullMQ Worker → StorageProvider`。

## 统一外部 DTO

`ExternalContent` 统一抖音作品和小红书笔记，包含稳定外部 ID、平台、内容形式、标题/摘要、作者、封面、原链接、时间和可选互动指标。缺失指标保持 `null`，不伪造为 `0`。

`ExternalAccount` 统一外部账号 ID、平台、名称、头像、简介、粉丝数、获赞数和原始链接。

Adapter 可在服务端保留 `rawProviderMetadata` 供调试，对前端输出时会删除该字段。

## 数据模型

### BenchmarkAccount

保存 Workspace 共享对标账号。`workspaceId + platform + externalAccountId` 唯一，包含可选 CreatorProfile 归属、账号快照、`enabled`、`lastSyncedAt` 和创建人。V1 不后台自动同步；账号作品只在用户点击加载/刷新时请求。

### ContentIdea

发现与项目之间的最小选题缓冲层。状态为 `INBOX / READY / IN_PROGRESS / DONE / ARCHIVED`，可关联一个后续 ContentProject。

### ContentIdeaReference

保存 ExternalContent 快照，不要求先创建 SourceItem。当用户后续收录同一 `platform + externalId` 时，`sourceItemId` 会回填。因此“加入选题”不会触发下载。

## 搜索与输入判定

`DiscoveryQueryResolver` 把用户输入分为 `KEYWORD / ACCOUNT_QUERY / ACCOUNT_URL / CONTENT_URL`。无法可靠判定时按关键词处理。V1 一级平台筛选为全部、抖音、小红书，排序为推荐、最新、热门。

搜索结果只是 metadata，不创建 SourceItem、不下载媒体、不自动调用 LLM。

## 收录与开始创作

- **收录素材**：先按 `workspace + platform + externalId`、再按 canonical URL 去重；新内容创建 SourceItem/IngestJob 并进入既有 Worker。
- **开始创作**：如尚未收录，先显式收录；然后创建 ContentProject，并以 `REFERENCE` 建立 ProjectSource，进入 `/projects/[id]/studio`。
- **从选题开始**：已收录的 references 直接关联。存在未收录 reference 时必须先向用户明确确认，不暗中批量下载。

## 成本、缓存与安全

- 所有真实 RedFox 调用都由明确的搜索、加载作品或刷新动作触发。打开首页、预览卡片和加入选题都不产生付费请求。
- 相同 Workspace、operation、query/platform/filter 在 5 分钟内复用进程内缓存。缓存命中不重复记账。
- 缓存未命中的真实调用写入 ApiUsage，记录 operation、success/failure、duration 和 provider request ID；不知道单价时 `cost` 保持 `null`。
- 所有路由使用既有 Workspace RBAC；数据查询必须带 `workspaceId`。VIEWER 只读，EDITOR 可搜索/收录/选题/建项目，OWNER/ADMIN 管理共享对标。
- RedFox 返回的媒体 URL 仍经过原有 SSRF、redirect、MIME 和大小限制，不因数据来源而绕过安全检查。

## D3 / D4 边界

V1 不包含热点趋势、上升话题、“今日值得做”、AI 选题推荐、CreatorMemory、对标自动同步或 Cron 监控。D3 可在真实排名/趋势数据和成本策略验证后单独进入下一阶段；D4 再把趋势、对标、历史内容与 CreatorProfile 组合成可解释的推荐。
