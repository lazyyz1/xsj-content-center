import "server-only";

import { db } from "@content-center/db";
import { VersionConflictError } from "./brief-service";
import { ProjectServiceError } from "./project-service";

export type MotherContentInput = {
  title: string;
  body: string;
  outline: string[];
  expectedVersion: number;
};

export async function saveMotherContent(input: { workspaceId: string; userId: string; projectId: string; data: MotherContentInput }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.motherContent.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId } });
      let content;
      if (existing) {
        if (existing.version !== input.data.expectedVersion) throw new VersionConflictError();
        const result = await tx.motherContent.updateMany({
          where: { id: existing.id, version: input.data.expectedVersion },
          data: {
            title: input.data.title.trim(),
            body: input.data.body,
            outline: input.data.outline,
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) throw new VersionConflictError();
        content = await tx.motherContent.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        if (input.data.expectedVersion !== 0) throw new VersionConflictError();
        content = await tx.motherContent.create({
          data: {
            workspaceId: input.workspaceId,
            projectId: project.id,
            title: input.data.title.trim(),
            body: input.data.body,
            outline: input.data.outline,
            createdById: input.userId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "mother_content.updated",
          resourceType: "mother_content",
          resourceId: content.id,
          metadata: { projectId: project.id, resourceId: content.id, changedFields: ["title", "body", "outline"] },
        },
      });
      return content;
    });
  } catch (error) {
    if (error instanceof VersionConflictError || (error && typeof error === "object" && "code" in error && error.code === "P2002")) {
      throw new VersionConflictError();
    }
    throw error;
  }
}
