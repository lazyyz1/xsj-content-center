import { db } from "@content-center/db";
import { DiscoveryWorkspace } from "@/components/discovery/discovery-workspace";
import { requireWorkspace } from "@/server/access";
import { getIntegrationDisplay } from "@/server/integrations";
import { listBenchmarks, listIdeas } from "@/server/discovery/service";
import { listTrendOpportunities, publicTrendOpportunity } from "@/server/discovery/trends/read-model";
import { getCurrentRecommendationBatch, publicRecommendationBatch } from "@/server/discovery/recommendations/service";

export default async function DiscoveryPage() {
  const { session, workspace, role } = await requireWorkspace();
  const [integration, benchmarks, ideas, recentSources, trends, recommendationBatch] = await Promise.all([
    getIntegrationDisplay(workspace.id, "REDFOX"),
    listBenchmarks(workspace.id, 8),
    listIdeas(workspace.id, 8),
    db.sourceItem.findMany({ where: { workspaceId: workspace.id, sourceProvider: "REDFOX" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, author: true, thumbnailUrl: true, sourcePlatform: true, sourceType: true, status: true, createdAt: true } }),
    listTrendOpportunities({ workspaceId: workspace.id, window: "TODAY", platform: "ALL", type: "HOT", take: 6 }),
    getCurrentRecommendationBatch({ workspaceId: workspace.id, userId: session.user.id }),
  ]);
  return <div className="desktop-discovery"><DiscoveryWorkspace
    configured={integration?.status === "CONFIGURED"}
    canWrite={role !== "VIEWER"}
    canManageBenchmarks={role === "OWNER" || role === "ADMIN"}
    initialBenchmarks={benchmarks.map((item) => ({ id: item.id, name: item.name, platform: item.platform, avatarUrl: item.avatarUrl, bio: item.bio, lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null, latestContent: item.contentSnapshots[0] ? { title: item.contentSnapshots[0].title, observedAt: item.contentSnapshots[0].observedAt.toISOString() } : null }))}
    initialIdeas={ideas.map((item) => ({ id: item.id, title: item.title, status: item.status, projectId: item.projectId, updatedAt: item.updatedAt.toISOString(), referenceCount: item._count.references, sourceCount: item.references.length }))}
    recentSources={recentSources.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    initialTrends={trends.map(publicTrendOpportunity)}
    initialRecommendationBatch={recommendationBatch ? publicRecommendationBatch(recommendationBatch) : null}
  /></div>;
}
