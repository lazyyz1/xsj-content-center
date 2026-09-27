import { notFound } from "next/navigation";
import { requireWorkspace } from "@/server/access";
import { getResearchSession, listResearchMaterials } from "@/server/research/service";
import { researchSessionView } from "@/server/research/read-model";
import { ResearchError } from "@/server/research/access";
import { ResearchSessionWorkspace } from "@/components/research/research-session";
export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ before?: string }> }) {
  const { workspace, session, role } = await requireWorkspace(); const actor = { workspaceId: workspace.id, userId: session.user.id };
  const before = Number((await searchParams).before);
  try { const [value, materials] = await Promise.all([getResearchSession(actor, (await params).id, Number.isSafeInteger(before) && before > 0 ? before : undefined), listResearchMaterials(actor)]); return <ResearchSessionWorkspace {...researchSessionView(value)} materials={materials} canWrite={role !== "VIEWER"} />; } catch (error) { if (error instanceof ResearchError && error.status === 404) notFound(); throw error; }
}
