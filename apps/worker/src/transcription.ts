import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  ASR_AUDIO_SIGNED_URL_TTL_SECONDS,
  MAX_ASR_BINARY_DATA_BYTES,
} from "@content-center/config";
import { db, type Prisma } from "@content-center/db";
import {
  DOUBAO_DEFAULT_BASE_URL,
  DOUBAO_DEFAULT_RESOURCE_ID,
  IntegrationService,
} from "@content-center/integrations";
import {
  assertFlashAudioLimits,
  DoubaoClient,
  DoubaoError,
  DoubaoTranscriptionProvider,
  doubaoErrorMetadata,
  doubaoRuntimeConfigSchema,
  FFmpegMediaProcessor,
  MediaProcessorError,
  minioStorageFromEnv,
  resolvePublicAddress,
  type TranscriptionInput,
} from "@content-center/providers";
import { UnrecoverableError, type Job } from "bullmq";
import { enqueueTranscribeSource, type TranscribeSourcePayload } from "./transcription-queue";

type ProgressStage = "QUEUED" | "EXTRACTING_AUDIO" | "UPLOADING_AUDIO" | "TRANSCRIBING" | "PERSISTING" | "SUCCEEDED";
type TranscriptionRecord = Prisma.IngestJobGetPayload<{ include: { sourceItem: { include: { assets: true } } } }>;

const integrationService = new IntegrationService();

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function publicFailure(error: unknown) {
  if (error instanceof DoubaoError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  if (error instanceof MediaProcessorError) {
    return { code: error.code, message: error.message, retryable: false };
  }
  if (error instanceof Error && error.message === "ASR_VIDEO_NOT_AVAILABLE") {
    return { code: "ASR_VIDEO_NOT_AVAILABLE", message: "没有可转写的已保存视频。", retryable: false };
  }
  return { code: "INTERNAL_ERROR", message: "视频转写失败。", retryable: false };
}

async function updateProgress(jobId: string, amount: number, stage: ProgressStage) {
  await db.ingestJob.update({ where: { id: jobId }, data: { progress: amount, metadata: { progressStage: stage } } });
}

async function loadDoubaoConfig(workspaceId: string) {
  const status = await integrationService.getIntegrationStatus(workspaceId, "DOUBAO_ASR");
  if (status.status === "DISABLED") throw new DoubaoError("DOUBAO_DISABLED", "豆包 ASR Integration 已禁用。", false);
  if (status.status !== "CONFIGURED") throw new DoubaoError("DOUBAO_NOT_CONFIGURED", "请先配置豆包 ASR。", false);
  const decrypted = await integrationService.getDecryptedIntegrationConfig(workspaceId, "DOUBAO_ASR");
  if (!decrypted) throw new DoubaoError("DOUBAO_NOT_CONFIGURED", "请先配置豆包 ASR。", false);
  const authMode = decrypted.authMode === "LEGACY_APP_TOKEN" || (!decrypted.authMode && decrypted.appId)
    ? "LEGACY_APP_TOKEN"
    : "API_KEY";
  const parsed = doubaoRuntimeConfigSchema.safeParse({
    ...decrypted,
    authMode,
    baseUrl: decrypted.baseUrl ?? DOUBAO_DEFAULT_BASE_URL,
    resourceId: decrypted.resourceId ?? DOUBAO_DEFAULT_RESOURCE_ID,
  });
  if (!parsed.success) throw new DoubaoError("DOUBAO_NOT_CONFIGURED", "豆包 ASR Integration 配置无效。", false);
  return parsed.data;
}

export async function requestSourceTranscription(input: {
  workspaceId: string;
  sourceItemId: string;
  requestedById: string;
  videoAssetId?: string;
}) {
  await loadDoubaoConfig(input.workspaceId);
  const videoAsset = await db.sourceAsset.findFirst({
    where: {
      id: input.videoAssetId,
      workspaceId: input.workspaceId,
      sourceItemId: input.sourceItemId,
      assetType: "VIDEO",
      status: "STORED",
      storageKey: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!videoAsset) throw new Error("ASR_VIDEO_NOT_AVAILABLE");
  const active = await db.ingestJob.findFirst({
    where: {
      workspaceId: input.workspaceId,
      sourceItemId: input.sourceItemId,
      jobType: "TRANSCRIBE",
      status: { in: ["QUEUED", "RUNNING"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (active) return { job: active, created: false };

  const job = await db.ingestJob.create({
    data: {
      workspaceId: input.workspaceId,
      sourceItemId: input.sourceItemId,
      requestedById: input.requestedById,
      jobType: "TRANSCRIBE",
      provider: "DOUBAO_ASR",
      providerMode: "REAL",
      status: "QUEUED",
      progress: 0,
      maxAttempts: 3,
      metadata: { progressStage: "QUEUED", videoAssetId: videoAsset.id },
    },
  });
  await db.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.requestedById,
      action: "transcription.queued",
      resourceType: "ingest_job",
      resourceId: job.id,
      metadata: { sourceItemId: input.sourceItemId, videoAssetId: videoAsset.id, provider: "DOUBAO_ASR" },
    },
  });
  try {
    await enqueueTranscribeSource({
      jobId: job.id,
      workspaceId: input.workspaceId,
      sourceItemId: input.sourceItemId,
      videoAssetId: videoAsset.id,
      requestedById: input.requestedById,
    }, job.maxAttempts);
  } catch {
    await db.$transaction([
      db.ingestJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE", errorMessage: "转写队列暂时不可用。", finishedAt: new Date() },
      }),
      db.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.requestedById,
          action: "transcription.enqueue_failed",
          resourceType: "ingest_job",
          resourceId: job.id,
          metadata: { sourceItemId: input.sourceItemId, errorCode: "QUEUE_UNAVAILABLE" },
        },
      }),
    ]);
    throw new Error("QUEUE_UNAVAILABLE");
  }
  return { job, created: true };
}

async function recordUsage(input: {
  record: TranscriptionRecord;
  attempt: number;
  durationMs: number;
  success: boolean;
  requestId?: string;
  providerRequestId?: string;
  statusCode?: string;
  errorCode?: string;
}) {
  await db.apiUsage.create({
    data: {
      workspaceId: input.record.workspaceId,
      userId: input.record.requestedById,
      provider: "DOUBAO_ASR",
      operation: "TRANSCRIBE_FLASH",
      requestId: `${input.record.id}:${input.attempt}`,
      providerRequestId: input.providerRequestId,
      success: input.success,
      units: 1,
      cost: null,
      metadata: json({
        durationMs: input.durationMs,
        estimatedUsageHours: input.durationMs / 3_600_000,
        clientRequestId: input.requestId,
        statusCode: input.statusCode,
        errorCode: input.errorCode,
        attempt: input.attempt,
      }),
    },
  });
}

async function audioInput(input: {
  signedUrl: string;
  sizeBytes: number;
  extractedPath?: string;
}): Promise<TranscriptionInput> {
  try {
    await resolvePublicAddress(input.signedUrl);
    return { audio: { mode: "REMOTE_URL", url: input.signedUrl }, contentType: "audio/mpeg" };
  } catch {
    if (input.sizeBytes > MAX_ASR_BINARY_DATA_BYTES) {
      throw new DoubaoError(
        "ASR_AUDIO_NOT_PUBLICLY_REACHABLE",
        "音频地址不可公网访问，且文件不适合二进制上传。",
        false,
      );
    }
    let data: Uint8Array;
    if (input.extractedPath) {
      data = await readFile(input.extractedPath);
    } else {
      const response = await fetch(input.signedUrl, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new DoubaoError("ASR_AUDIO_NOT_PUBLICLY_REACHABLE", "无法读取已保存音频。", false);
      data = new Uint8Array(await response.arrayBuffer());
    }
    if (data.byteLength > MAX_ASR_BINARY_DATA_BYTES) {
      throw new DoubaoError("ASR_AUDIO_NOT_PUBLICLY_REACHABLE", "音频二进制超过安全上传限制。", false);
    }
    return { audio: { mode: "BINARY_DATA", data }, contentType: "audio/mpeg" };
  }
}

function durationFromMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>).durationMs;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function processTranscribeSourceJob(job: Job<TranscribeSourcePayload>) {
  const startedAt = new Date();
  const record = await db.ingestJob.findFirst({
    where: {
      id: job.data.jobId,
      workspaceId: job.data.workspaceId,
      sourceItemId: job.data.sourceItemId,
      requestedById: job.data.requestedById,
      jobType: "TRANSCRIBE",
    },
    include: { sourceItem: { include: { assets: true } } },
  });
  if (!record) throw new UnrecoverableError("Transcription job scope mismatch");
  if (record.status === "SUCCEEDED") return { status: "already-succeeded" as const };
  if (record.status === "CANCELLED" || record.sourceItem.status === "ARCHIVED") {
    throw new UnrecoverableError("Transcription job is no longer runnable");
  }

  const attempt = job.attemptsMade + 1;
  await db.$transaction([
    db.ingestJob.update({
      where: { id: record.id },
      data: {
        status: "RUNNING",
        attempt,
        progress: 5,
        startedAt,
        finishedAt: null,
        errorCode: null,
        errorMessage: null,
        metadata: { progressStage: "EXTRACTING_AUDIO", videoAssetId: job.data.videoAssetId },
      },
    }),
    db.auditLog.create({
      data: {
        workspaceId: record.workspaceId,
        userId: record.requestedById,
        action: "transcription.started",
        resourceType: "ingest_job",
        resourceId: record.id,
        metadata: { sourceItemId: record.sourceItemId, provider: "DOUBAO_ASR", attempt },
      },
    }),
  ]);

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const config = await loadDoubaoConfig(record.workspaceId);
    const video = record.sourceItem.assets.find((asset) =>
      asset.id === job.data.videoAssetId && asset.assetType === "VIDEO" && asset.status === "STORED" && asset.storageKey,
    );
    if (!video?.storageKey) throw new Error("ASR_VIDEO_NOT_AVAILABLE");

    const storage = minioStorageFromEnv();
    const processor = new FFmpegMediaProcessor();
    await processor.checkAvailability();
    let audio = record.sourceItem.assets
      .filter((asset) => asset.assetType === "AUDIO" && asset.status === "STORED" && asset.storageKey)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    let extractedPath: string | undefined;
    let durationMs = audio ? durationFromMetadata(audio.metadata) : undefined;

    if (!audio?.storageKey) {
      const pendingAudio = await db.sourceAsset.create({
        data: {
          workspaceId: record.workspaceId,
          sourceItemId: record.sourceItemId,
          assetType: "AUDIO",
          sourceProvider: "FFMPEG",
          remoteUrl: null,
          status: "DOWNLOADING",
          metadata: { derivedFromAssetId: video.id },
        },
      });
      await db.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "source_asset.audio_extraction_started",
          resourceType: "source_asset",
          resourceId: pendingAudio.id,
          metadata: { sourceItemId: record.sourceItemId, derivedFromAssetId: video.id },
        },
      });
      try {
        const videoUrl = (await storage.getSignedUrl(video.storageKey, 15 * 60)).data.url;
        const extracted = await processor.extractAudio(videoUrl);
        cleanup = extracted.cleanup;
        extractedPath = extracted.path;
        durationMs = extracted.durationMs;
        await updateProgress(record.id, 35, "UPLOADING_AUDIO");
        const storageKey = `workspaces/${record.workspaceId}/sources/${record.sourceItemId}/assets/${pendingAudio.id}/audio.mp3`;
        await storage.upload({
          key: storageKey,
          body: createReadStream(extracted.path),
          contentType: "audio/mpeg",
          contentLength: extracted.sizeBytes,
        });
        const storedAt = new Date();
        audio = await db.sourceAsset.update({
          where: { id: pendingAudio.id },
          data: {
            status: "STORED",
            storageKey,
            mimeType: "audio/mpeg",
            sizeBytes: BigInt(extracted.sizeBytes),
            storedAt,
            metadata: { derivedFromAssetId: video.id, durationMs: extracted.durationMs },
          },
        });
        await db.auditLog.create({
          data: {
            workspaceId: record.workspaceId,
            userId: record.requestedById,
            action: "source_asset.audio_stored",
            resourceType: "source_asset",
            resourceId: audio.id,
            metadata: { sourceItemId: record.sourceItemId, sizeBytes: extracted.sizeBytes, durationMs: extracted.durationMs },
          },
        });
      } catch (error) {
        await db.sourceAsset.update({ where: { id: pendingAudio.id }, data: { status: "FAILED", storageKey: null } });
        throw error;
      }
    }

    if (!audio?.storageKey || durationMs === undefined || audio.sizeBytes === null) {
      throw new MediaProcessorError("ASR_AUDIO_EXTRACTION_FAILED", "已保存音频缺少必要元数据。");
    }
    const sizeBytes = Number(audio.sizeBytes);
    assertFlashAudioLimits({ sizeBytes, durationMs });
    const signedUrl = (await storage.getSignedUrl(audio.storageKey, ASR_AUDIO_SIGNED_URL_TTL_SECONDS)).data.url;
    const providerInput = await audioInput({ signedUrl, sizeBytes, extractedPath });
    await updateProgress(record.id, 65, "TRANSCRIBING");
    const provider = new DoubaoTranscriptionProvider(new DoubaoClient(config));
    let transcript;
    try {
      transcript = (await provider.transcribe(providerInput)).data;
      await recordUsage({ record, attempt, durationMs, success: true, ...provider.getLastRequestMetadata() });
    } catch (error) {
      const metadata = doubaoErrorMetadata(error);
      const requestMetadata = provider.getLastRequestMetadata();
      await recordUsage({
        record,
        attempt,
        durationMs,
        success: false,
        ...requestMetadata,
        ...metadata,
        errorCode: error instanceof DoubaoError ? error.code : "DOUBAO_INVALID_RESPONSE",
      });
      throw error;
    }

    await updateProgress(record.id, 90, "PERSISTING");
    const finishedAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.transcript.upsert({
        where: { sourceItemId: record.sourceItemId },
        create: {
          workspaceId: record.workspaceId,
          sourceItemId: record.sourceItemId,
          provider: "DOUBAO_ASR",
          providerMode: "REAL",
          language: transcript.language,
          durationMs: transcript.durationMs ?? durationMs,
          fullText: transcript.fullText,
          segments: json(transcript.segments),
        },
        update: {
          provider: "DOUBAO_ASR",
          providerMode: "REAL",
          language: transcript.language,
          durationMs: transcript.durationMs ?? durationMs,
          fullText: transcript.fullText,
          segments: json(transcript.segments),
        },
      });
      await tx.ingestJob.update({
        where: { id: record.id },
        data: { status: "SUCCEEDED", progress: 100, metadata: { progressStage: "SUCCEEDED", videoAssetId: video.id, audioAssetId: audio.id }, finishedAt },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "transcription.succeeded",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: { sourceItemId: record.sourceItemId, provider: "DOUBAO_ASR", providerMode: "REAL", attempt, durationMs, audioAssetId: audio.id },
        },
      });
    });
    return { status: "ok" as const, sourceItemId: record.sourceItemId };
  } catch (error) {
    const failure = publicFailure(error);
    const willRetry = failure.retryable && attempt < record.maxAttempts;
    await db.$transaction([
      db.ingestJob.update({
        where: { id: record.id },
        data: {
          status: willRetry ? "QUEUED" : "FAILED",
          progress: 0,
          errorCode: failure.code,
          errorMessage: failure.message,
          finishedAt: willRetry ? null : new Date(),
        },
      }),
      db.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "transcription.failed",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: { sourceItemId: record.sourceItemId, provider: "DOUBAO_ASR", attempt, retrying: willRetry, errorCode: failure.code },
        },
      }),
    ]);
    if (!failure.retryable) throw new UnrecoverableError(`${failure.code}: ${failure.message}`);
    throw error;
  } finally {
    await cleanup?.();
  }
}
