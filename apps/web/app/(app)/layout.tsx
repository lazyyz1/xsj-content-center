import { Sidebar } from "@/components/sidebar";
import { db } from "@content-center/db";
import { requireWorkspace } from "@/server/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, workspace } = await requireWorkspace();
  const [user, recentProjects] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { systemRole: true } }),
    db.contentProject.findMany({ where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
  ]);
  return (
    <div className="app-shell">
      <Sidebar workspaceName={workspace.name} userName={session.user.name} isSystemAdmin={user?.systemRole === "SYSTEM_ADMIN"} recentProjects={recentProjects.map((project) => ({ ...project, updatedAt: project.updatedAt.toISOString() }))} />
      <main id="main-content" className="app-main">{children}</main>
    </div>
  );
}
