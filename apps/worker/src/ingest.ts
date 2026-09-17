import { isRetryableIngestError } from "@content-center/core";
import { db } from "@content-center/db";
import {
  GenericUrlSourceProvider,
  IngestProviderError,
  ManualTextSourceProvider,
  MockVideoSourceProvider,
  type IngestSourceProvider,
} from "@content-center/providers";
import { UnrecoverableError, type Job } from "bullmq";
import type { ContentIngestPayload } from "./queue";
import { processRedFoxIngestJob } from "./redfox-ingest";
import { requestMaterialAnalysisJob } from "./material-analysis-request";

function providerFor(source: { sourceType: string; sourceUrl: string | null }): IngestSourceProvider {
  if (source.sourceType === "TEXT" || source.sourceType === "DOCUMENT") return new ManualTextSourceProvider();
  if (source.sourceType === "URL") {
    return new GenericUrlSourceProvider({ allowedTestOrigin: process.env.INGEST_TEST_FIXTURE_ORIGIN });
  }
  if (source.sourceType === "VIDEO" && source.sourceUrl?.startsWith("mock://video/")) {
    return new MockVideoSourceProvider();
  }
  throw new IngestProviderError("UNSUPPORTED_SOURCE", "当前阶段不支持该素材类型。", false);
}

function publicError(error: unknown): { code: string; message: string; retryable: boolean; httpStatus?: number } {
  if (error instanceof IngestProviderError) {
    return { code: error.code, message: error.message, retryable: error.retryable, httpStatus: error.httpStatus };
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return { code: "DUPLICATE_URL", message: "该网页已存在于当前 Workspace。", retryable: false };
  }
  return { code: "INTERNAL_ERROR", message: "采集处理失败。", retryable: false };
}

export async function processContentIngestJob(job: Job<ContentIngestPayload>) {
  const startedAt = new Date();
  const record = await db.ingestJob.findFirst({
    where: {
      id: job.data.jobId,
      workspaceId: job.data.workspaceId,
      sourceItemId: job.data.sourceItemId,
      requestedById: job.data.requestedById,
    },
    include: { sourceItem: true },
  });
  if (!record) throw new UnrecoverableError("Ingest job scope mismatch");
  if (record.sourceItem.workspaceId !== record.workspaceId) throw new UnrecoverableError("Ingest parent workspace mismatch");
  if (record.status === "SUCCEEDED") return { status: "already-succeeded" as const };
  if (record.status === "CANCELLED" || record.sourceItem.status === "ARCHIVED") {
    throw new UnrecoverableError("Ingest job is no longer runnable");
  }

  if (["DOUYIN", "XIAOHONGSHU"].includes(record.sourceItem.sourcePlatform) && record.provider === "REDFOX") {
    return processRedFoxIngestJob(record, job, startedAt);
  }

  const attempt = job.attemptsMade + 1;
  const provider = providerFor(record.sourceItem);
  await db.$transaction([
    db.ingestJob.update({
      where: { id: record.id },
      data: {
        status: "RUNNING",
        provider: provider.providerName,
        attempt,
        progress: 10,
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
        metadata: { sourceItemId: record.sourceItemId, provider: provider.providerName, attempt },
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
        metadata: { sourceItemId: record.sourceItemId, provider: provider.providerName, attempt, automatic: true },
      },
    });
  }

  try {
    const value = record.sourceItem.sourceType === "TEXT" || record.sourceItem.sourceType === "DOCUMENT" ? record.sourceItem.rawText : record.sourceItem.sourceUrl;
    if (!value) throw new IngestProviderError("MISSING_INPUT", "采集输入不存在。", false);
    const result = await provider.ingest({
      value,
      title: record.sourceItem.title ?? undefined,
      notes: record.sourceItem.description ?? undefined,
    });
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const metadata = result.data.metadata;

    const currentSource = await db.sourceItem.findFirst({
      where: { id: record.sourceItemId, workspaceId: record.workspaceId },
      select: { status: true },
    });
    if (!currentSource || currentSource.status === "ARCHIVED") {
      await db.ingestJob.updateMany({
        where: { id: record.id, workspaceId: record.workspaceId },
        data: { status: "CANCELLED", progress: 0, finishedAt },
      });
      return { status: "cancelled" as const, sourceItemId: record.sourceItemId };
    }

    await db.$transaction(async (tx) => {
      await tx.sourceItem.update({
        where: { id: record.sourceItemId },
        data: {
          title: metadata.title ?? record.sourceItem.title,
          author: metadata.author,
          description: metadata.description ?? record.sourceItem.description,
          thumbnailUrl: metadata.thumbnailUrl,
          canonicalUrl: record.sourceItem.sourceType === "URL" ? metadata.url : record.sourceItem.canonicalUrl,
          rawText: result.data.rawText,
          metadata: metadata.raw ? JSON.parse(JSON.stringify(metadata.raw)) : undefined,
          status: "READY",
        },
      });
      if (result.data.transcript) {
        const transcript = result.data.transcript;
        await tx.transcript.upsert({
          where: { sourceItemId: record.sourceItemId },
          create: {
            workspaceId: record.workspaceId,
            sourceItemId: record.sourceItemId,
            provider: provider.providerName,
            providerMode: result.providerMode,
            language: transcript.language,
            durationMs: transcript.durationMs,
            fullText: transcript.fullText,
            segments: JSON.parse(JSON.stringify(transcript.segments)),
          },
          update: {
            provider: provider.providerName,
            providerMode: result.providerMode,
            language: transcript.language,
            durationMs: transcript.durationMs,
            fullText: transcript.fullText,
            segments: JSON.parse(JSON.stringify(transcript.segments)),
          },
        });
      }
      await tx.ingestJob.update({
        where: { id: record.id },
        data: { status: "SUCCEEDED", providerMode: result.providerMode, progress: 100, finishedAt },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "ingest.succeeded",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: {
            sourceItemId: record.sourceItemId,
            provider: provider.providerName,
            providerMode: result.providerMode,
            attempt,
            durationMs,
            contentLength: result.data.rawText.length,
          },
        },
      });
    });
    if (record.sourceItem.sourceType !== "IMAGE") {
      try { await requestMaterialAnalysisJob({ workspaceId: record.workspaceId, sourceItemId: record.sourceItemId, requestedById: record.requestedById }); }
      catch (error) { console.warn("MATERIAL_ANALYSIS_AUTO_ENQUEUE_FAILED", { sourceItemId: record.sourceItemId, errorCode: error instanceof Error ? error.message : "UNKNOWN" }); }
    }
    console.info("CONTENT_INGEST_STATUS", {
      jobId: record.id,
      workspaceId: record.workspaceId,
      sourceItemId: record.sourceItemId,
      provider: provider.providerName,
      status: "SUCCEEDED",
      duration: durationMs,
      contentLength: result.data.rawText.length,
    });
    return { status: "ok" as const, sourceItemId: record.sourceItemId };
  } catch (error) {
    const failure = publicError(error);
    const retryable = failure.retryable || isRetryableIngestError(failure);
    const willRetry = retryable && attempt < record.maxAttempts;
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
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
      db.sourceItem.update({
        where: { id: record.sourceItemId },
        data: { status: willRetry ? "PENDING" : "FAILED" },
      }),
      db.auditLog.create({
        data: {
          workspaceId: record.workspaceId,
          userId: record.requestedById,
          action: "ingest.failed",
          resourceType: "ingest_job",
          resourceId: record.id,
          metadata: { sourceItemId: record.sourceItemId, provider: provider.providerName, attempt, retrying: willRetry, errorCode: failure.code },
        },
      }),
    ]);
    console.error("CONTENT_INGEST_STATUS", {
      jobId: record.id,
      workspaceId: record.workspaceId,
      sourceItemId: record.sourceItemId,
      provider: provider.providerName,
      status: willRetry ? "QUEUED" : "FAILED",
      duration: durationMs,
      errorCode: failure.code,
    });
    if (!retryable) throw new UnrecoverableError(`${failure.code}: ${failure.message}`);
    throw error;
  }
}
