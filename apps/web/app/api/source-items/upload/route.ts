import { db } from "@content-center/db";
import { buildSourceAssetObjectKey, getStorageProvider } from "@content-center/providers";
import { enqueueContentIngest } from "@content-center/worker/queue";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { MAX_UPLOADS_PER_REQUEST, uploadErrorMessage, validateUploadedFile } from "@/server/source-upload";

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : "UPLOAD_FAILED";
}

export async function POST(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((value): value is File => value instanceof File) ?? [];
  if (!files.length) return apiError("FILE_REQUIRED", 400, "请选择要添加的文件。");
  if (files.length > MAX_UPLOADS_PER_REQUEST) return apiError("TOO_MANY_FILES", 400, `一次最多添加 ${MAX_UPLOADS_PER_REQUEST} 个文件。`);

  const storage = getStorageProvider();
  const results: Array<Record<string, unknown>> = [];
  for (const file of files) {
    let upload: Awaited<ReturnType<typeof validateUploadedFile>>;
    try {
      upload = await validateUploadedFile(file);
    } catch (error) {
      const code = errorCode(error);
      results.push({ name: file.name, status: "FAILED", errorCode: code, message: uploadErrorMessage(code) });
      continue;
    }

    const existingAssets = await db.sourceAsset.findMany({ where: { workspaceId: context.workspace.id }, select: { sourceItemId: true, metadata: true } });
    const duplicate = existingAssets.find((asset) => {
      const metadata = asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata as Record<string, unknown> : {};
      return metadata.sha256 === upload.sha256;
    });
    if (duplicate) {
      results.push({ name: upload.originalName, status: "DUPLICATE", sourceItemId: duplicate.sourceItemId });
      continue;
    }

    let sourceId = "";
    let assetId = "";
    let storageKey = "";
    try {
      const source = await db.$transaction(async (tx) => {
        const sourceItem = await tx.sourceItem.create({
          data: {
            workspaceId: context.workspace.id,
            createdById: context.session.user.id,
            sourceType: upload.sourceType,
            sourcePlatform: "GENERIC",
            sourceProvider: "LOCAL_UPLOAD",
            title: upload.title,
            rawText: upload.contentText ?? null,
            status: upload.kind === "VIDEO" || upload.kind === "AUDIO" || upload.kind === "IMAGE" ? "READY" : "PENDING",
          },
        });
        const asset = await tx.sourceAsset.create({
          data: {
            workspaceId: context.workspace.id,
            sourceItemId: sourceItem.id,
            assetType: upload.assetType,
            sourceProvider: "LOCAL_UPLOAD",
            status: "DOWNLOADING",
            mimeType: upload.mimeType,
            sizeBytes: BigInt(upload.bytes.byteLength),
            metadata: json({ sha256: upload.sha256, originalName: upload.originalName, sourceType: upload.sourceType }),
          },
        });
        return { sourceItem, asset };
      });
      sourceId = source.sourceItem.id;
      assetId = source.asset.id;
      storageKey = buildSourceAssetObjectKey({ workspaceId: context.workspace.id, sourceItemId: sourceId, assetId, assetType: upload.assetType, mimeType: upload.mimeType });
      await storage.upload({ key: storageKey, body: upload.bytes, contentType: upload.mimeType, contentLength: upload.bytes.byteLength, assetScope: { workspaceId: context.workspace.id, sourceItemId: sourceId, assetId } });
      await db.sourceAsset.update({ where: { id: assetId }, data: { status: "STORED", storageKey, storedAt: new Date() } });

      if (upload.kind === "IMAGE" || upload.kind === "VIDEO" || upload.kind === "AUDIO") {
        results.push({ name: upload.originalName, status: "READY", sourceItemId: sourceId, contentState: "READY" });
      } else {
        const job = await db.ingestJob.create({ data: { workspaceId: context.workspace.id, sourceItemId: sourceId, requestedById: context.session.user.id, jobType: "EXTRACT_TEXT", provider: "FILE_READER", providerMode: "REAL", status: "QUEUED", maxAttempts: 3 } });
        try {
          await enqueueContentIngest({ jobId: job.id, workspaceId: context.workspace.id, sourceItemId: sourceId, requestedById: context.session.user.id }, job.maxAttempts);
          results.push({ name: upload.originalName, status: "QUEUED", sourceItemId: sourceId, jobId: job.id, contentState: "READING" });
        } catch {
          await db.$transaction([
            db.ingestJob.update({ where: { id: job.id }, data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE", errorMessage: "资料读取队列暂时不可用。", finishedAt: new Date() } }),
            db.sourceItem.update({ where: { id: sourceId }, data: { status: "FAILED" } }),
          ]);
          results.push({ name: upload.originalName, status: "FAILED", sourceItemId: sourceId, jobId: job.id, errorCode: "QUEUE_UNAVAILABLE", message: "上传成功，但资料读取暂时无法开始。" });
        }
      }
    } catch (error) {
      if (storageKey) await storage.delete(storageKey, { workspaceId: context.workspace.id, sourceItemId: sourceId, assetId }).catch(() => undefined);
      if (sourceId) await db.sourceItem.delete({ where: { id: sourceId } }).catch(() => undefined);
      const code = errorCode(error);
      results.push({ name: upload.originalName, status: "FAILED", errorCode: code, message: uploadErrorMessage(code) });
    }
  }

  const hasSuccess = results.some((item) => item.status === "QUEUED" || item.status === "DUPLICATE" || item.status === "READY");
  return NextResponse.json({ results }, { status: hasSuccess ? 202 : 400 });
}
