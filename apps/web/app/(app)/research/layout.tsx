import { requireWorkspace } from "@/server/access";
import { listResearchSessions } from "@/server/research/service";
import { ResearchShell } from "@/components/research/research-shell";
import "@/components/research/research.css";
import "@/components/research/research-workspace.css";
export default async function ResearchLayout({ children }: { children: React.ReactNode }) {
  const { workspace, session, role } = await requireWorkspace();
  const sessions = await listResearchSessions({ workspaceId: workspace.id, userId: session.user.id });
  return <ResearchShell sessions={sessions} canWrite={role !== "VIEWER"}>{children}</ResearchShell>;
}
