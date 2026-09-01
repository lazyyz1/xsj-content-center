import { db } from "@content-center/db";

export async function getDashboardCounts(workspaceId: string) {
  const resourceTypes = ["library_item", "content_project", "approval", "publication"] as const;
  const [materials, projects, pendingReview, pendingPublish] = await Promise.all(
    resourceTypes.map((resourceType) => db.auditLog.count({ where: { workspaceId, resourceType } })),
  );

  return { materials, projects, pendingReview, pendingPublish };
}
