import { db } from "@content-center/db";

export async function getDashboardCounts(workspaceId: string) {
  const [materials, projects, pendingReview] = await Promise.all([
    db.sourceItem.count({ where: { workspaceId, status: { not: "ARCHIVED" } } }),
    db.contentProject.count({ where: { workspaceId, status: { not: "ARCHIVED" } } }),
    db.platformVariant.count({ where: { workspaceId, status: "IN_REVIEW" } }),
  ]);
  return { materials, projects, pendingReview, pendingPublish: 0 };
}
