import { db } from "@content-center/db";
import { DiscoveryWorkspace } from "@/components/discovery/discovery-workspace";
import { requireWorkspace } from "@/server/access";
import { getIntegrationDisplay } from "@/server/integrations";
import { listBenchmarks, listIdeas } from "@/server/discovery/service";
import { listTrendOpportunities, publicTrendOpportunity } from "@/server/discovery/trends/read-model";

export default async function DiscoveryPage() {
  const { workspace, role } = await requireWorkspace();
  const [integration, benchmarks, ideas, recentSources, trends] = await Promise.all([
    getIntegrationDisplay(workspace.id, "REDFOX"),
    listBenchmarks(workspace.id, 8),
    listIdeas(workspace.id, 8),
    db.sourceItem.findMany({ where: { workspaceId: workspace.id, sourceProvider: "REDFOX" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, author: true, thumbnailUrl: true, sourcePlatform: true, sourceType: true, status: true, createdAt: true } }),
    listTrendOpportunities({ workspaceId: workspace.id, window: "TODAY", platform: "ALL", type: "HOT", take: 6 }),
  ]);
  return <DiscoveryWorkspace
    configured={integration?.status === "CONFIGURED"}
    canWrite={role !== "VIEWER"}
    canManageBenchmarks={role === "OWNER" || role === "ADMIN"}
    initialBenchmarks={benchmarks.map((item) => ({ ...item, createdAt: undefined, updatedAt: undefined, lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null }))}
    initialIdeas={ideas.map((item) => ({ id: item.id, title: item.title, status: item.status, updatedAt: item.updatedAt.toISOString(), referenceCount: item._count.references, sourceCount: item.references.length }))}
    recentSources={recentSources.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    initialTrends={trends.map(publicTrendOpportunity)}
  />;
}
