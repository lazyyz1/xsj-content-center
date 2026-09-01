import { canManageWorkspace, canReadWorkspace, hasWorkspaceRole, type WorkspaceRole } from "@content-center/core";
import { db, findWorkspaceForUser } from "@content-center/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireWorkspace(workspaceId?: string) {
  const session = await requireSession();
  if (workspaceId) {
    const workspace = await findWorkspaceForUser(db, { userId: session.user.id, workspaceId });
    const membership = workspace?.members[0];
    if (!workspace || !membership) redirect("/onboarding");
    return { session, workspace, role: membership.role as WorkspaceRole };
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/onboarding");
  return { session, workspace: membership.workspace, role: membership.role as WorkspaceRole };
}

export async function requireWorkspaceRole(
  allowedRoles: readonly WorkspaceRole[],
  workspaceId?: string,
) {
  const context = await requireWorkspace(workspaceId);
  if (!hasWorkspaceRole(context.role, allowedRoles)) redirect("/dashboard");
  return context;
}

export { canManageWorkspace, canReadWorkspace };
