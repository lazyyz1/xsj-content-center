import { detectSourcePlatform, normalizeSourceUrl } from "@content-center/core";
import { db } from "@content-center/db";
import { enqueueContentIngest } from "@content-center/worker/queue";

export type CreateSourceInput =
  | { kind: "TEXT"; title?: string; text: string; notes?: string }
  | { kind: "URL"; url: string }
  | { kind: "VIDEO_MOCK"; url: string };

export async function createSourceAndJob(input: {
  workspaceId: string;
  userId: string;
  source: CreateSourceInput;
}) {
  const rawText = input.source.kind === "TEXT" ? input.source.text.trim() : null;
  const sourceUrl = input.source.kind === "TEXT" ? null : input.source.url.trim();
  const canonicalUrl = input.source.kind === "URL" && sourceUrl ? normalizeSourceUrl(sourceUrl) : null;
  const sourceType = input.source.kind === "TEXT" ? "TEXT" : input.source.kind === "URL" ? "URL" : "VIDEO";
  const sourcePlatform = input.source.kind === "TEXT" ? "GENERIC" : detectSourcePlatform(sourceUrl ?? "");
  const provider = input.source.kind === "TEXT" ? "MANUAL" : input.source.kind === "URL" ? "GENERIC_URL" : "MOCK_VIDEO";
  const providerMode = input.source.kind === "VIDEO_MOCK" ? "MOCK" : "REAL";
  const jobType = input.source.kind === "TEXT" ? "EXTRACT_TEXT" : input.source.kind === "URL" ? "FETCH_URL" : "TRANSCRIBE";
  const title = input.source.kind === "TEXT" ? input.source.title?.trim() || null : null;
  const description = input.source.kind === "TEXT" ? input.source.notes?.trim() || null : null;

  const created = await db.$transaction(async (tx) => {
    const sourceItem = await tx.sourceItem.create({
      data: {
        workspaceId: input.workspaceId,
        createdById: input.userId,
        sourceType,
        sourcePlatform,
        sourceUrl,
        canonicalUrl,
        title,
        description,
        rawText,
        status: "PENDING",
      },
    });
    const ingestJob = await tx.ingestJob.create({
      data: {
        workspaceId: input.workspaceId,
        sourceItemId: sourceItem.id,
        requestedById: input.userId,
        jobType,
        provider,
        providerMode,
        status: "QUEUED",
        maxAttempts: 3,
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "source.created",
        resourceType: "source_item",
        resourceId: sourceItem.id,
        metadata: { sourceType, sourcePlatform, jobId: ingestJob.id, providerMode },
      },
    });
    return { sourceItem, ingestJob };
  });

  try {
    await enqueueContentIngest(
      {
        jobId: created.ingestJob.id,
        workspaceId: input.workspaceId,
        sourceItemId: created.sourceItem.id,
        requestedById: input.userId,
      },
      created.ingestJob.maxAttempts,
    );
  } catch {
    console.error("CONTENT_INGEST_QUEUE_ERROR", {
      jobId: created.ingestJob.id,
      workspaceId: input.workspaceId,
      sourceItemId: created.sourceItem.id,
    });
    await db.$transaction([
      db.ingestJob.update({
        where: { id: created.ingestJob.id },
        data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE", errorMessage: "采集队列暂时不可用。", finishedAt: new Date() },
      }),
      db.sourceItem.update({ where: { id: created.sourceItem.id }, data: { status: "FAILED" } }),
      db.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "ingest.failed",
          resourceType: "ingest_job",
          resourceId: created.ingestJob.id,
          metadata: { sourceItemId: created.sourceItem.id, errorCode: "QUEUE_UNAVAILABLE" },
        },
      }),
    ]);
    throw new Error("QUEUE_UNAVAILABLE");
  }
  return created;
}
