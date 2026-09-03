import { canManageWorkspace, canReadWorkspace, hasWorkspaceRole, type WorkspaceRole } from "@content-center/core";
import { db, ensurePersonalWorkspaceForUser, findWorkspaceForUser } from "@content-center/db";
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

  let membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    await ensurePersonalWorkspaceForUser(db, { userId: session.user.id });
    membership = await db.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!membership) throw new Error("PERSONAL_WORKSPACE_PROVISIONING_FAILED");
  return { session, workspace: membership.workspace, role: membership.role as WorkspaceRole };
}

export async function requireSystemAdmin() {
  const session = await requireSession();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, systemRole: true },
  });
  if (!user || user.systemRole !== "SYSTEM_ADMIN") redirect("/dashboard");
  return { session, user };
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
