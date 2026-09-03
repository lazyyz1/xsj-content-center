import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { db } from "@content-center/db";
import { readRenderMediaRelayConfig, resolveStoragePath, verifyMediaRelayToken } from "@content-center/providers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function notFound() {
  return new Response(null, { status: 404 });
}

export async function GET(request: Request, { params }: RouteContext) {
  if ((process.env.STORAGE_DRIVER?.trim() || "S3_COMPATIBLE") !== "RENDER_MEDIA_RELAY") return notFound();
  let config;
  try {
    config = readRenderMediaRelayConfig();
  } catch {
    return notFound();
  }
  const { token } = await params;
  const requestedPurpose = new URL(request.url).searchParams.get("purpose") ?? "browser";
  if (requestedPurpose !== "browser" && requestedPurpose !== "doubao") return notFound();
  const payload = verifyMediaRelayToken(token, config.signingSecret, Date.now(), requestedPurpose);
  if (!payload) return notFound();
  const asset = await db.sourceAsset.findFirst({
    where: {
      id: payload.assetId,
      workspaceId: payload.workspaceId,
      sourceItemId: payload.sourceItemId,
      sourceItem: { id: payload.sourceItemId, workspaceId: payload.workspaceId },
      status: "STORED",
      storageKey: { not: null },
    },
  });
  if (!asset?.storageKey) return notFound();
  try {
    const filePath = resolveStoragePath(config.mediaStorageRoot, asset.storageKey);
    const file = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath));
    const headers = new Headers({
      "content-type": asset.mimeType || "application/octet-stream",
      "content-length": String(file.size),
      "cache-control": "private, no-store",
      "x-content-center-purpose": payload.purpose,
    });
    if (payload.disposition === "attachment") {
      const extension = asset.assetType === "VIDEO" ? "mp4" : asset.assetType === "IMAGE" ? "jpg" : "mp3";
      headers.set("content-disposition", `attachment; filename="source-asset.${extension}"`);
    } else {
      headers.set("content-disposition", "inline");
    }
    return new Response(stream as ReadableStream, { status: 200, headers });
  } catch {
    return notFound();
  }
}
