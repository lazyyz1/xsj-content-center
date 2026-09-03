import { db } from "@content-center/db";

export async function getDashboardCounts(workspaceId: string) {
  const [materials, projects, pendingReview, pendingPublish] = await Promise.all([
    db.sourceItem.count({ where: { workspaceId, status: { not: "ARCHIVED" } } }),
    db.contentProject.count({ where: { workspaceId, status: { not: "ARCHIVED" } } }),
    db.platformVariant.count({ where: { workspaceId, status: "IN_REVIEW" } }),
    db.publishTask.count({ where: { workspaceId, status: { in: ["READY_TO_PUBLISH", "SCHEDULED"] } } }),
  ]);
  return { materials, projects, pendingReview, pendingPublish };
}

export async function getDashboardWork(workspaceId: string) {
  const [projects, recommendations] = await Promise.all([
    db.contentProject.findMany({ where: { workspaceId, status: { notIn: ["ARCHIVED", "APPROVED"] } }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, status: true, updatedAt: true, _count: { select: { sources: true } } } }),
    db.recommendationItem.findMany({ where: { workspaceId, status: { in: ["NEW", "SAVED"] } }, orderBy: [{ batch: { generatedAt: "desc" } }, { position: "asc" }], take: 5, select: { id: true, title: true, coreQuestion: true, contentIdeaId: true, projectId: true } }),
  ]);
  return { projects, recommendations };
}
