import { Sidebar } from "@/components/sidebar";
import { requireWorkspace } from "@/server/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, workspace } = await requireWorkspace();
  return (
    <div className="min-h-screen">
      <Sidebar workspaceName={workspace.name} userName={session.user.name} />
      <main className="mx-auto max-w-7xl p-5 sm:p-8 lg:ml-64 lg:p-10">{children}</main>
    </div>
  );
}
