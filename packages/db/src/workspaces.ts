import type { PrismaClient } from "@prisma/client";

export async function createOwnedWorkspace(
  prisma: PrismaClient,
  input: { userId: string; name: string; slug: string },
) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: { create: { userId: input.userId, role: "OWNER" } },
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: input.userId,
        action: "workspace.created",
        resourceType: "workspace",
        resourceId: workspace.id,
      },
    });

    return workspace;
  });
}

export function findWorkspaceForUser(
  prisma: PrismaClient,
  input: { userId: string; workspaceId: string },
) {
  return prisma.workspace.findFirst({
    where: {
      id: input.workspaceId,
      members: { some: { userId: input.userId } },
    },
    include: {
      members: { where: { userId: input.userId }, take: 1 },
    },
  });
}
