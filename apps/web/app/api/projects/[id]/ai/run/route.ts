import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import { aiApiError } from "@/server/ai/ai-api";
import { runAIAction } from "@/server/ai/ai-run-service";
import { AI_ACTIONS } from "@/server/ai/schemas";

const schema = z.object({ action: z.enum(AI_ACTIONS), selectedText: z.string().max(20_000).optional(), instruction: z.string().max(5_000).optional() }).strict();

export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", 400);
  const { id } = await route.params;
  try { return NextResponse.json(await runAIAction({ workspaceId: context.workspace.id, userId: context.session.user.id, projectId: id, ...parsed.data }), { status: 201 }); }
  catch (error) { return aiApiError(error); }
}
