import { db, findSourceForUser } from "@content-center/db";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { getStorageProvider, readSourceMetadataEnvelope } from "@content-center/providers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const { id } = await route.params;
  const source = await findSourceForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, sourceItemId: id });
  if (!source) return apiError("NOT_FOUND", 404);
  return NextResponse.json({
    ...source,
    metadata: readSourceMetadataEnvelope(source.metadata),
    assets: source.assets.map(({ remoteUrl: _remoteUrl, storageKey: _storageKey, sizeBytes, ...asset }) => ({
      ...asset,
      sizeBytes: sizeBytes?.toString() ?? null,
    })),
  });
}

export async function PATCH(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const { id } = await route.params;
  const source = await findSourceForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, sourceItemId: id });
  if (!source) return apiError("NOT_FOUND", 404);
  if (source.status === "ARCHIVED") return NextResponse.json({ status: "ARCHIVED" });
  await db.$transaction([
    db.sourceItem.update({ where: { id: source.id }, data: { status: "ARCHIVED" } }),
    db.ingestJob.updateMany({
      where: { sourceItemId: source.id, workspaceId: context.workspace.id, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED", finishedAt: new Date() },
    }),
    db.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "source.archived", resourceType: "source_item", resourceId: source.id } }),
  ]);
  return NextResponse.json({ status: "ARCHIVED" });
}

export async function DELETE(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const { id } = await route.params;
  const source = await findSourceForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, sourceItemId: id });
  if (!source) return apiError("NOT_FOUND", 404);
  const storedAssets = source.assets.filter((asset) => asset.storageKey);
  const storage = storedAssets.length > 0 ? getStorageProvider() : null;
  for (const asset of storedAssets) {
    if (!asset.storageKey) continue;
    try {
      await storage!.delete(asset.storageKey!, {
        workspaceId: context.workspace.id,
        sourceItemId: source.id,
        assetId: asset.id,
      });
    } catch {
      await db.auditLog.create({
        data: {
          workspaceId: context.workspace.id,
          userId: context.session.user.id,
          action: "source_asset.delete_failed",
          resourceType: "source_asset",
          resourceId: asset.id,
          metadata: { sourceItemId: source.id },
        },
      });
      return apiError("STORAGE_DELETE_FAILED", 502, "媒体对象删除失败，素材记录未删除，请重试。");
    }
  }
  await db.$transaction(async (tx) => {
    for (const asset of source.assets) {
      await tx.auditLog.create({
        data: {
          workspaceId: context.workspace.id,
          userId: context.session.user.id,
          action: "source_asset.deleted",
          resourceType: "source_asset",
          resourceId: asset.id,
          metadata: { sourceItemId: source.id, assetType: asset.assetType },
        },
      });
    }
    await tx.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "source.deleted", resourceType: "source_item", resourceId: source.id } });
    await tx.sourceItem.delete({ where: { id: source.id } });
  });
  return new NextResponse(null, { status: 204 });
}
