# Production Storage

对象存储统一通过 `S3CompatibleStorageProvider` 接入。MinIO 只作为本地开发实现，Cloudflare R2 作为生产实现；两者使用相同的 S3 API、对象 Key 规则和短时 Signed URL，不在业务代码中分叉成两套 Provider。

## 配置

```dotenv
STORAGE_DRIVER=S3_COMPATIBLE
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=content-center
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

生产 Cloudflare R2 使用同一个 Provider：

```dotenv
STORAGE_DRIVER=S3_COMPATIBLE
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<private-bucket>
S3_ACCESS_KEY_ID=<server-secret>
S3_SECRET_ACCESS_KEY=<server-secret>
S3_FORCE_PATH_STYLE=false
```

R2 凭证只放在部署环境变量中，不进入浏览器、Workspace IntegrationConfig、Git 或日志。系统管理页只显示 `CONFIGURED` / `UNCONFIGURED`。

## 私有对象与 Key

生产 Bucket 必须保持 private。所有新素材对象由 `StorageObjectKeyBuilder` 生成，前缀固定为：

```text
workspaces/<workspaceId>/sources/<sourceItemId>/assets/<assetId>/original.mp4
workspaces/<workspaceId>/sources/<sourceItemId>/assets/<assetId>/audio.mp3
workspaces/<workspaceId>/sources/<sourceItemId>/assets/<assetId>/cover.jpg
```

扩展名由服务端检测到的 MIME 类型决定。浏览器和 Doubao 只获得短时 Presigned GET；客户端不能提交 `objectKey` 或 Bucket 来越权访问。

- 播放与下载：5 分钟
- Doubao Recording File 2.0：15 分钟

访问接口为 `GET /api/source-items/:sourceId/assets/:assetId/access`，只接受 `sourceId`、`assetId` 和可选的 `disposition=inline|attachment`。接口先验证 Session、当前 Workspace、SourceItem 与 SourceAsset 归属，再从数据库读取 `storageKey` 并签发 URL。

## 历史 MinIO 数据

本阶段不自动迁移历史对象。开发环境继续使用 MinIO 读取旧数据；后续生产迁移需要单独的迁移方案与授权，不在本阶段范围内。
