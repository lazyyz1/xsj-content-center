import { db, findSourceForUser } from "@content-center/db";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const { id } = await route.params;
  const source = await findSourceForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, sourceItemId: id });
  return source ? NextResponse.json(source) : apiError("NOT_FOUND", 404);
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
  await db.$transaction(async (tx) => {
    await tx.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "source.deleted", resourceType: "source_item", resourceId: source.id } });
    await tx.sourceItem.delete({ where: { id: source.id } });
  });
  return new NextResponse(null, { status: 204 });
}
