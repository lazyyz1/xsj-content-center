import { isRetryableIngestError } from "@content-center/core";
import { db, type Prisma } from "@content-center/db";
import {
  MediaFetcher,
  RedFoxClient,
  RedFoxError,
  RedFoxSourceProvider,
  minioStorageFromEnv,
  redFoxErrorMetadata,
} from "@content-center/providers";
import { UnrecoverableError, type Job } from "bullmq";
import { getWorkspaceIntegrationConfig, getWorkspaceIntegrationStatus } from "./integrations";
import type { ContentIngestPayload } from "./queue";
import { requestSourceTranscription } from "./transcription";

type RedFoxRecord = Prisma.IngestJobGetPayload<{ include: { sourceItem: true } }>;
type ProgressStage = "RESOLVING" | "FETCHING_METADATA" | "DOWNLOADING_MEDIA" | "STORING" | "DONE";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function progress(jobId: string, amount: number, stage: ProgressStage) {
  await db.ingestJob.update({ where: { id: jobId }, data: { progress: amount, metadata: { progressStage: stage } } });
}

function publicFailure(error: unknown) {
  if (error instanceof RedFoxError) {
    return { code: error.code, message: error.message, retryable: error.retryable, httpStatus: error.httpStatus };
  }
  return { code: "INTERNAL_ERROR", message: "抖音素材采集失败。", retryable: false, httpStatus: undefined };
}

async function recordParseUsage(input: {
  record: RedFoxRecord;
  attempt: number;
  success: boolean;
  providerRequestId?: string;
  providerCode?: string;
  errorCode?: string;
}) {
  await db.apiUsage.create({
    data: {
      workspaceId: input.record.workspaceId,
      userId: input.record.requestedById,
      provider: "REDFOX",
      operation: "PARSE_WORK",
      requestId: `${input.record.id}:${input.attempt}`,
      providerRequestId: input.providerRequestId,
      success: input.success,
      units: 1,
      cost: null,
      metadata: json({ providerCode: input.providerCode, errorCode: input.errorCode, attempt: input.attempt }),
    },
  });
}

async function loadRedFoxConfig(workspaceId: string) {
  const status = await getWorkspaceIntegrationStatus(workspaceId, "REDFOX");
  if (status.status === "DISABLED") {
    throw new RedFoxError("REDFOX_DISABLED", "红狐 API 已禁用。", false);
  }
  if (status.status !== "CONFIGURED") {
    throw new RedFoxError("REDFOX_NOT_CONFIGURED", "请先在 设置 → AI 与外部服务 配置红狐 API。", false);
  }
  const config = await getWorkspaceIntegrationConfig(workspaceId, "REDFOX");
  if (!config || typeof config.apiKey !== "string" || !config.apiKey.trim()) {
    throw new RedFoxError("REDFOX_NOT_CONFIGURED", "请先在 设置 → AI 与外部服务 配置红狐 API。", false);
  }
  if (config.baseUrl !== undefined && typeof config.baseUrl !== "string") {
    throw new RedFoxError("REDFOX_NOT_CONFIGURED", "红狐 API 配置无效。", false);
  }
  return { apiKey: config.apiKey, baseUrl: config.baseUrl };
}

export async function processRedFoxIngestJob(
  record: RedFoxRecord,
  job: Job<ContentIngestPayload>,
  startedAt: Date,
) {
  const attempt = job.attemptsMade + 1;
  await db.$transaction([
    db.ingestJob.update({
      where: { id: record.id },
      data: {
        status: "RUNNING",
        provider: "REDFOX",
        providerMode: "REAL",
        attempt,
        progress: 5,
        metadata: { progressStage: "RESOLVING" },
        startedAt,
        finishedAt: null,
        errorCode: null,
        errorMessage: null,
      },
    }),
    db.sourceItem.update({ where: { id: record.sourceItemId }, data: { status: "PROCESSING" } }),
    db.auditLog.create({
      data: {
        workspaceId: record.workspaceId,
        userId: record.requestedById,
        action: "ingest.started",
        resourceType: "ingest_job",
        resourceId: record.id,
        metadata: { sourceItemId: record.sourceItemId, provider: "REDFOX", attempt },
      },
    }),
  ]);
  if (attempt > 1) {
    await db.auditLog.create({
      data: {
        workspaceId: record.workspaceId,
        userId: record.requestedById,
        action: "ingest.retried",
        resourceType: "ingest_job",
        resourceId: record.id,
        metadata: { sourceItemId: record.sourceItemId, provider: "REDFOX", attempt, automatic: true },
      },
    });
  }

  let parseCalled = false;
  try {
    const sourceUrl = record.sourceItem.sourceUrl;
    if (!sourceUrl) throw new RedFoxError("INVALID_DOUYIN_URL", "抖音素材链接不存在。", false);
    const config = await loadRedFoxConfig(record.workspaceId);
    const provider = new RedFoxSourceProvider(new RedFoxClient(config));
    await progress(record.id, 15, "FETCHING_METADATA");
    await db.auditLog.create({
      data: {
        workspaceId: record.workspaceId,
        userId: record.requestedById,
        action: "redfox.parse_started",
        resourceType: "source_item",
        resourceId: record.sourceItemId,
        metadata: { jobId: record.id, attempt },
      },
    });
    parseCalled = true;
    let resolved;
    try {
      resolved = (await provider.resolve(sourceUrl)).data;
      const requestMetadata = provider.getLastRequestMetadata();
      await Promise.all([
        recordParseUsage({ record, attempt, success: true, ...requestMetadata }),
        db.auditLog.create({
          data: {
            workspaceId: record.workspaceId,
            userId: record.requestedById,
            action: "redfox.parse_succeeded",
            resourceType: "source_item",
            resourceId: record.sourceItemId,
            metadata: { jobId: record.id, attempt, providerRequestId: requestMetadata.providerRequestId },
          },
        }),
      ]);
    } catch (error) {
      const metadata = redFoxErrorMetadata(error);
      await Promise.all([
        recordParseUsage({
          record,
          attempt,
          success: false,
          providerRequestId: metadata.providerRequestId,
          providerCode: metadata.providerCode,
          errorCode: error instanceof RedFoxError ? error.code : "REDFOX_API_ERROR",
        }),
        db.auditLog.create({
          data: {
            workspaceId: record.workspaceId,
            userId: record.requestedById,
            action: "redfox.parse_failed",
            resourceType: "source_item",
            resourceId: record.sourceItemId,
            metadata: {
              jobId: record.id,
              attempt,
              errorCode: error instanceof RedFoxError ? error.code : "REDFOX_API_ERROR",
              providerCode: metadata.providerCode,
              providerRequestId: metadata.providerRequestId,
            },
          },
        }),
      ]);
      throw error;
    }

    const storage = minioStorageFromEnv();
    const mediaFetcher = new MediaFetcher(storage, { allowedTestOrigin: process.env.INGEST_TEST_FIXTURE_ORIGIN });
    let storedCount = 0;
    let storedVideoAssetId: string | undefined;
    for (const media of resolved.media) {
      const asset = await db.sourceAsset.create({
        data: {
          workspaceId: record.workspaceId,
          sourceItemId: record.sourceItemId,
          assetType: media.type,
          sourceProvider: "REDFOX",
          remoteUrl: media.url,
          status: "REMOTE",
          metadata: media.index === undefined ? undefined : { index: media.index },
        },
      });
      const storageKey = `workspaces/${record.workspaceId}/sources/${record.sourceItemId}/assets/${asset.id}/original`;
      await progress(record.id, 45, "DOWNLOADING_MEDIA");
      await db.$transaction([
        db.sourceAsset.update({ where: { id: asset.id }, data: { status: "DOWNLOADING" } }),
        db.auditLog.create({
          data: {
            workspaceId: record.workspaceId,
            userId: record.requestedById,
            action: "source_asset.download_started",
            resourceType: "source_asset",
            resourceId: asset.id,
            metadata: { sourceItemId: record.sourceItemId, assetType: media.type, index: media.index },
          },
        }),
      ]);
      try {
        const downloaded = await mediaFetcher.downloadToStorage({
          remoteUrl: media.url,
          kind: media.type,
          storageKey,
          onBeforeStore: () => progress(record.id, 75, "STORING"),
        });
        const storedAt = new Date();
        await db.$transaction([
          db.sourceAsset.update({
            where: { id: asset.id },
            data: {
              status: "STORED",
              storageKey: downloaded.storageKey,
              mimeType: downloaded.mimeType,
              sizeBytes: BigInt(downloaded.sizeBytes),
              storedAt,
            },
          }),
          db.auditLog.create({
            data: {
              workspaceId: record.workspaceId,
              userId: record.requestedById,
              action: "source_asset.stored",
              resourceType: "source_asset",
              resourceId: asset.id,
              metadata: {
                sourceItemId: record.sourceItemId,
                assetType: media.type,
                mimeType: downloaded.mimeType,
                sizeBytes: downloaded.sizeBytes,
              },
            },
          }),
        ]);
        storedCount += 1;
        if (media.type === "VIDEO") storedVideoAssetId = asset.id;
      } catch (error) {
        await db.$transaction([
          db.sourceAsset.update({ where: { id: asset.id }, data: { status: "FAILED", storageKey: null } }),
          db.auditLog.create({
            data: {
              workspaceId: record.workspaceId,
              userId: record.requestedById,
              action: "source_asset.failed",
              resourceType: "source_asset",
              resourceId: asset.id,
              metadata: {
                sourceItemId: record.sourceItemId,
                assetType: media.type,
                errorCode: error instanceof RedFoxError ? error.code : "REDFOX_MEDIA_DOWNLOAD_FAILED",
              },
            },
          }),
        ]);
        throw error;
      }
    }

    if (storedCount < 1) throw new RedFoxError("REDFOX_MEDIA_MISSING", "没有可保存的媒体资源。", false);
    const finishedAt = new Date();
    await db.$transaction([
      db.sourceItem.update({
        where: { id: record.sourceItemId },
        data: {
          sourceType: resolved.sourceType,
          sourcePlatform: resolved.sourcePlatform,
          canonicalUrl: resolved.resolvedUrl ?? resolved.originalUrl,
          title: resolved.title,
          author: resolved.author,
          description: resolved.description,
          thumbnailUrl: resolved.thumbnailUrl,
          rawText: null,
          metadata: json({
            provider: resolved.provider,
            providerMode: resolved.providerMode,
            externalId: resolved.providerMetadata.externalId,
            awemeType: resolved.providerMetadata.awemeType,
            providerRaw: resolved.providerRaw,
            assetCount: storedCount,
          }),
          status: "READY",
        },
      }),
      db.ingestJob.update({
        where: { id: record.id },
        data: { status: "SUCCEEDED", progress: 100, metadata: { progressStage: "DONE" }, finishedAt },
      }),
      db.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "ingest.succeeded",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: { sourceItemId: record.sourceItemId, provider: "REDFOX", providerMode: "REAL", attempt, assetCount: storedCount },
        },
      }),
    ]);
    const doubaoStatus = await getWorkspaceIntegrationStatus(record.workspaceId, "DOUBAO_ASR");
    if (doubaoStatus.status === "CONFIGURED" && storedVideoAssetId) {
      try {
        await requestSourceTranscription({
          workspaceId: record.workspaceId,
          sourceItemId: record.sourceItemId,
          requestedById: record.requestedById,
          videoAssetId: storedVideoAssetId,
        });
      } catch (error) {
        console.error("TRANSCRIPTION_AUTO_ENQUEUE_FAILED", {
          sourceItemId: record.sourceItemId,
          errorCode: error instanceof Error ? error.message : "UNKNOWN",
        });
      }
    }
    return { status: "ok" as const, sourceItemId: record.sourceItemId };
  } catch (error) {
    const failure = publicFailure(error);
    const retryable = failure.retryable || isRetryableIngestError(failure);
    const willRetry = retryable && attempt < record.maxAttempts;
    const finishedAt = new Date();
    await db.$transaction([
      db.ingestJob.update({
        where: { id: record.id },
        data: {
          status: willRetry ? "QUEUED" : "FAILED",
          progress: 0,
          errorCode: failure.code,
          errorMessage: failure.message,
          finishedAt: willRetry ? null : finishedAt,
        },
      }),
      db.sourceItem.update({ where: { id: record.sourceItemId }, data: { status: willRetry ? "PENDING" : "FAILED" } }),
      db.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "ingest.failed",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: { sourceItemId: record.sourceItemId, provider: "REDFOX", attempt, retrying: willRetry, errorCode: failure.code, parseCalled },
        },
      }),
    ]);
    if (!retryable) throw new UnrecoverableError(`${failure.code}: ${failure.message}`);
    throw error;
  }
}
