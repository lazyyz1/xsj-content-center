import { db, findSourceForUser } from "@content-center/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";

const updateTranscriptSchema = z.object({ fullText: z.string().trim().min(1).max(1_000_000) }).strict();
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, route: RouteContext) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const { id } = await route.params;
  const input = updateTranscriptSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("INVALID_INPUT", 400, "转写文字不能为空。");
  const source = await findSourceForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, sourceItemId: id });
  if (!source?.transcript) return apiError("NOT_FOUND", 404, "转写不存在。");
  const transcript = await db.$transaction(async (tx) => {
    const updated = await tx.transcript.update({ where: { sourceItemId: source.id }, data: { fullText: input.data.fullText } });
    await tx.auditLog.create({ data: { workspaceId: context.workspace.id, userId: context.session.user.id, action: "transcript.updated", resourceType: "transcript", resourceId: updated.id, metadata: { sourceItemId: source.id } } });
    return updated;
  });
  return NextResponse.json({ id: transcript.id, updatedAt: transcript.updatedAt.toISOString() });
}
