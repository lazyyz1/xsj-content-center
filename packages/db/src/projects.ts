import type { PrismaClient } from "@prisma/client";

export function findProjectForUser(
  prisma: PrismaClient,
  input: { userId: string; workspaceId: string; projectId: string },
) {
  return prisma.contentProject.findFirst({
    where: {
      id: input.projectId,
      workspaceId: input.workspaceId,
      workspace: { members: { some: { userId: input.userId } } },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      creatorProfile: true,
      sources: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { sourceItem: { include: { transcript: true } } },
      },
      evidenceItems: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { sourceItem: { select: { id: true, title: true } } },
      },
      creativeBrief: true,
      motherContent: true,
      platformVariants: { orderBy: { platform: "asc" } },
    },
  });
}
