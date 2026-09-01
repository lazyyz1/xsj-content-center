import { db, findIngestJobForUser } from "@content-center/db";
import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";

export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const { id } = await route.params;
  const job = await findIngestJobForUser(db, { userId: context.session.user.id, workspaceId: context.workspace.id, jobId: id });
  return job ? NextResponse.json(job) : apiError("NOT_FOUND", 404);
}
