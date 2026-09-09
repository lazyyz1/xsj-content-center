import { NextResponse } from "next/server";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";
import {
  createDefaultContentMethodDraft,
  defaultContentMethodDraftRequestSchema,
  defaultContentMethodPublishRequestSchema,
  defaultContentMethodSaveRequestSchema,
  DefaultContentMethodError,
  getDefaultContentMethod,
  publishDefaultContentMethod,
  saveDefaultContentMethodDraft,
} from "@/server/default-content-method/service";

function response(error: unknown) {
  if (!(error instanceof DefaultContentMethodError)) return apiError("DEFAULT_METHOD_FAILED", 500, "默认创作方法暂时无法操作。");
  const status = error.code === "DEFAULT_METHOD_NOT_FOUND" ? 404 : error.code === "DEFAULT_METHOD_CONFLICT" ? 409 : error.code === "DEFAULT_METHOD_FORBIDDEN" ? 403 : 400;
  return apiError(error.code, status, error.message);
}

export async function GET() {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  return NextResponse.json(await getDefaultContentMethod({ workspaceId: context.workspace.id }));
}

export async function POST(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  if (!defaultContentMethodDraftRequestSchema.safeParse(await request.json().catch(() => null)).success) return apiError("INVALID_DEFAULT_METHOD_INPUT", 400);
  try { return NextResponse.json(await createDefaultContentMethodDraft({ workspaceId: context.workspace.id, userId: context.session.user.id, origin: "HUMAN" })); }
  catch (error) { return response(error); }
}

export async function PUT(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const parsed = defaultContentMethodSaveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_DEFAULT_METHOD_INPUT", 400, "请检查七个创作指南部分。");
  try { return NextResponse.json(await saveDefaultContentMethodDraft({ workspaceId: context.workspace.id, userId: context.session.user.id, version: parsed.data.version, sections: parsed.data.sections, origin: "HUMAN" })); }
  catch (error) { return response(error); }
}

export async function PATCH(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  if (context.role === "VIEWER") return apiError("FORBIDDEN", 403);
  const parsed = defaultContentMethodPublishRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_DEFAULT_METHOD_INPUT", 400);
  try { return NextResponse.json(await publishDefaultContentMethod({ workspaceId: context.workspace.id, userId: context.session.user.id, version: parsed.data.version, actor: "HUMAN" })); }
  catch (error) { return response(error); }
}
