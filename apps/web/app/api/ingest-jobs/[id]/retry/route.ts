import { db, findIngestJobForUser } from "@content-center/db";
import { enqueueContentIngest } from "@content-center/worker/queue";
import { requestSourceTranscription } from "@content-center/worker/transcription";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";

export async function POST(_request: Request, route: { params: Promise<{ id: string }> }) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const { id } = await route.params;
  const job = await findIngestJobForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, jobId: id });
  if (!job) return apiError("NOT_FOUND", 404);
  if (job.status !== "FAILED") return apiError("JOB_NOT_RETRYABLE", 409);
  const source = await db.sourceItem.findFirst({
    where: { id: job.sourceItemId, workspaceId: context.workspace.id, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  if (!source) return apiError("SOURCE_NOT_RETRYABLE", 409);
  if (job.jobType === "TRANSCRIBE") {
    try {
      const queued = await requestSourceTranscription({ workspaceId: job.workspaceId, sourceItemId: job.sourceItemId, requestedById: context.session.user.id });
      return NextResponse.json({ jobId: queued.job.id, status: "QUEUED" }, { status: 202 });
    } catch {
      return apiError("TRANSCRIPTION_RETRY_FAILED", 503, "转写重试暂时无法开始，请稍后再试。");
    }
  }
  await db.$transaction([
    db.ingestJob.update({ where: { id: job.id }, data: { requestedById: context.session.user.id, status: "QUEUED", progress: 0, attempt: 0, errorCode: null, errorMessage: null, startedAt: null, finishedAt: null } }),
    db.sourceItem.update({ where: { id: job.sourceItemId }, data: { status: "PENDING" } }),
    db.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "ingest.retried", resourceType: "ingest_job", resourceId: job.id, metadata: { sourceItemId: job.sourceItemId } } }),
  ]);
  try {
    await enqueueContentIngest({ jobId: job.id, workspaceId: job.workspaceId, sourceItemId: job.sourceItemId, requestedById: context.session.user.id }, job.maxAttempts);
  } catch {
    await db.$transaction([
      db.ingestJob.update({ where: { id: job.id }, data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE", errorMessage: "采集队列暂时不可用。", finishedAt: new Date() } }),
      db.sourceItem.update({ where: { id: job.sourceItemId }, data: { status: "FAILED" } }),
      db.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "ingest.failed", resourceType: "ingest_job", resourceId: job.id, metadata: { sourceItemId: job.sourceItemId, errorCode: "QUEUE_UNAVAILABLE" } } }),
    ]);
    return apiError("QUEUE_UNAVAILABLE", 503);
  }
  return NextResponse.json({ jobId: job.id, status: "QUEUED" }, { status: 202 });
}
