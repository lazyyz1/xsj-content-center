import { db } from "@content-center/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function getApiWorkspaceContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  return { session, workspace: membership.workspace, role: membership.role };
}

export function apiError(error: string, status: number, message?: string) {
  return NextResponse.json({ error, message }, { status });
}
