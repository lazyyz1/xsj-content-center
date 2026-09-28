import { NextResponse } from "next/server";
import { db } from "@content-center/db";
import { apiError, getApiWorkspaceContext } from "@/server/api-access";

export async function GET(request: Request) {
  const context = await getApiWorkspaceContext();
  if (!context) return apiError("UNAUTHORIZED", 401);
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) || "";
  const scope = new URL(request.url).searchParams.get("scope") || "ALL";
  const sourceType = ["DOCUMENT", "IMAGE", "VIDEO", "TEXT", "AUDIO", "URL"].includes(scope) ? scope as "DOCUMENT" | "IMAGE" | "VIDEO" | "TEXT" | "AUDIO" | "URL" : undefined;
  const workspaceId = context.workspace.id;
  const [projects, sources] = await Promise.all([
    scope === "ALL" || scope === "PROJECT" ? db.contentProject.findMany({ where: { workspaceId, status: { not: "ARCHIVED" }, ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}) }, select: { id: true, title: true, updatedAt: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 20 }) : [],
    scope === "ALL" || sourceType ? db.sourceItem.findMany({ where: { workspaceId, ...(sourceType ? { sourceType } : {}), status: { not: "ARCHIVED" }, ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" as const } }, { author: { contains: query, mode: "insensitive" as const } }, { rawText: { contains: query, mode: "insensitive" as const } }] } : {}) }, select: { id: true, title: true, sourceType: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 30 }) : [],
  ]);
  return NextResponse.json({ items: [
    ...projects.map((item) => ({ id: item.id, title: item.title, type: "PROJECT", href: `/dashboard?project=${item.id}`, date: item.updatedAt.toISOString() })),
    ...sources.map((item) => ({ id: item.id, title: item.title || "未命名资料", type: item.sourceType, href: `/library/${item.id}`, date: item.createdAt.toISOString() })),
  ] });
}
