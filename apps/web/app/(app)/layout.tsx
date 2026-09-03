import { Sidebar } from "@/components/sidebar";
import { db } from "@content-center/db";
import { requireWorkspace } from "@/server/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, workspace } = await requireWorkspace();
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { systemRole: true } });
  return (
    <div className="min-h-screen">
      <Sidebar workspaceName={workspace.name} userName={session.user.name} isSystemAdmin={user?.systemRole === "SYSTEM_ADMIN"} />
      <main className="app-main">{children}</main>
    </div>
  );
}
