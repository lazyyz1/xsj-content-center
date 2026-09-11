import { notFound } from "next/navigation";
import { StudioShell } from "@/components/projects/studio-shell";
import { WorkbenchStart } from "@/components/workbench-start";
import { requireWorkspace } from "@/server/access";
import { getDashboardWork } from "@/server/dashboard";
import { loadWorkbenchPageData } from "@/server/workbench-page-data";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const projectId = typeof query.project === "string" ? query.project.trim() : "";

  if (projectId) {
    const data = await loadWorkbenchPageData({ userId: session.user.id, workspaceId: workspace.id, role, projectId });
    if (!data) notFound();
    return <div className="dashboard-workbench"><div className="studio-page"><StudioShell {...data} /></div></div>;
  }

  const work = await getDashboardWork(workspace.id);
  return <WorkbenchStart canCreate={role !== "VIEWER"} projects={work.projects.map((project) => ({ id: project.id, title: project.title, updatedAt: project.updatedAt.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) }))} />;
}
