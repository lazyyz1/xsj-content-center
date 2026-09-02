import { notFound } from "next/navigation";
import { IdeaWorkspace } from "@/components/discovery/idea-workspace";
import { requireWorkspace } from "@/server/access";
import { getIdea } from "@/server/discovery/service";

export default async function IdeaPage({ params }: PageProps<"/discovery/ideas/[id]">) {
  const { workspace, role } = await requireWorkspace(); const { id } = await params; const idea = await getIdea(workspace.id, id);
  if (!idea) notFound();
  return <IdeaWorkspace canWrite={role !== "VIEWER"} initialIdea={{ id: idea.id, title: idea.title, description: idea.description, status: idea.status, projectId: idea.project?.id ?? null, references: idea.references.map((item) => ({ id: item.id, platform: item.platform, externalId: item.externalId, title: item.title, url: item.url, authorName: item.authorName, coverUrl: item.coverUrl, metadataSnapshot: item.metadataSnapshot, sourceItemId: item.sourceItemId })) }} />;
}
