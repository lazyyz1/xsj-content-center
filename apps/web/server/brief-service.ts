import "server-only";

import { db } from "@content-center/db";
import { ProjectServiceError } from "./project-service";

export class VersionConflictError extends Error {
  readonly code = "VERSION_CONFLICT";

  constructor() {
    super("内容已被其他请求更新，请刷新后重试。");
    this.name = "VersionConflictError";
  }
}

export type BriefInput = {
  topic: string;
  angle: string;
  audience: string;
  coreMessage: string;
  keyPoints: string[];
  structure: string[];
  tone: string;
  risks: string[];
  expectedVersion: number;
};

export async function saveBrief(input: { workspaceId: string; userId: string; projectId: string; data: BriefInput }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.creativeBrief.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId } });
      let brief;
      if (existing) {
        if (existing.version !== input.data.expectedVersion) throw new VersionConflictError();
        const result = await tx.creativeBrief.updateMany({
          where: { id: existing.id, version: input.data.expectedVersion },
          data: {
            topic: input.data.topic.trim(),
            angle: input.data.angle.trim(),
            audience: input.data.audience.trim(),
            coreMessage: input.data.coreMessage.trim(),
            keyPoints: input.data.keyPoints,
            structure: input.data.structure,
            tone: input.data.tone.trim(),
            risks: input.data.risks,
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) throw new VersionConflictError();
        brief = await tx.creativeBrief.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        if (input.data.expectedVersion !== 0) throw new VersionConflictError();
        brief = await tx.creativeBrief.create({
          data: {
            workspaceId: input.workspaceId,
            projectId: project.id,
            topic: input.data.topic.trim(),
            angle: input.data.angle.trim(),
            audience: input.data.audience.trim(),
            coreMessage: input.data.coreMessage.trim(),
            keyPoints: input.data.keyPoints,
            structure: input.data.structure,
            tone: input.data.tone.trim(),
            risks: input.data.risks,
            createdById: input.userId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "brief.updated",
          resourceType: "creative_brief",
          resourceId: brief.id,
          metadata: { projectId: project.id, resourceId: brief.id, changedFields: ["topic", "angle", "audience", "coreMessage", "keyPoints", "structure", "tone", "risks"] },
        },
      });
      return brief;
    });
  } catch (error) {
    if (error instanceof VersionConflictError || (error && typeof error === "object" && "code" in error && error.code === "P2002")) {
      throw new VersionConflictError();
    }
    throw error;
  }
}
