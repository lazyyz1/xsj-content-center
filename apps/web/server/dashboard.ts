import { db } from "@content-center/db";

export async function getDashboardCounts(workspaceId: string) {
  const materials = await db.sourceItem.count({ where: { workspaceId, status: { not: "ARCHIVED" } } });
  // ContentProject, approval and publication domains do not exist yet.
  return { materials, projects: 0, pendingReview: 0, pendingPublish: 0 };
}
