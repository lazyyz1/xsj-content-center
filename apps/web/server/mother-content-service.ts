import "server-only";

import { db, type MotherContentOrigin } from "@content-center/db";
import { VersionConflictError } from "./brief-service";
import { ProjectServiceError } from "./project-service";

export type MotherContentInput = {
  title: string;
  body: string;
  outline: string[];
  expectedVersion: number;
  origin?: MotherContentOrigin;
  originNote?: string | null;
};

export type MotherContentVersion = {
  title: string;
  body: string;
  outline: string[];
  version: number;
  revision: number;
  origin: MotherContentOrigin;
  originNote: string | null;
  createdAt: string;
  current: boolean;
};

export class MotherContentConfirmationError extends Error {
  constructor(readonly code: "MOTHER_CONTENT_NOT_FOUND" | "MOTHER_VERSION_CONFLICT" | "MOTHER_WARNINGS_UNCONFIRMED", message: string) {
    super(message);
    this.name = "MotherContentConfirmationError";
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function versionSnapshot(value: { title: string; body: string; outline: unknown; version: number; origin: MotherContentOrigin; originNote: string | null; updatedAt: Date }, displayVersion: number) {
  return { title: value.title, body: value.body, outline: stringArray(value.outline), version: displayVersion, revision: value.version, origin: value.origin, originNote: value.originNote, createdAt: value.updatedAt.toISOString() };
}

export async function saveMotherContent(input: { workspaceId: string; userId: string; projectId: string; data: MotherContentInput; auditAction?: "mother_content.updated" | "mother_content.imported_from_gpt_web"; preservePreviousVersion?: boolean }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.motherContent.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId } });
      let content;
      if (existing) {
        if (existing.version !== input.data.expectedVersion) throw new VersionConflictError();
        if (input.preservePreviousVersion) {
          const preservedCount = await tx.auditLog.count({ where: { workspaceId: input.workspaceId, resourceId: existing.id, action: "mother_content.version_preserved" } });
          await tx.auditLog.create({
            data: {
              workspaceId: input.workspaceId,
              userId: input.userId,
              action: "mother_content.version_preserved",
              resourceType: "mother_content",
              resourceId: existing.id,
              metadata: { projectId: project.id, snapshot: versionSnapshot(existing, preservedCount + 1) },
            },
          });
        }
        const result = await tx.motherContent.updateMany({
          where: { id: existing.id, version: input.data.expectedVersion },
          data: {
            title: input.data.title.trim(),
            body: input.data.body,
            outline: input.data.outline,
            ...(input.data.origin === undefined ? {} : { origin: input.data.origin }),
            ...(input.data.originNote === undefined ? {} : { originNote: input.data.originNote }),
            confirmedVersion: null,
            confirmedWarnings: { set: null },
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
            origin: input.data.origin ?? "HUMAN",
            originNote: input.data.originNote ?? null,
            createdById: input.userId,
            confirmedVersion: null,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: input.auditAction ?? "mother_content.updated",
          resourceType: "mother_content",
          resourceId: content.id,
          metadata: { projectId: project.id, resourceId: content.id, version: content.version, origin: content.origin, changedFields: ["title", "body", "outline", ...(input.data.origin === undefined ? [] : ["origin"]), ...(input.data.originNote === undefined ? [] : ["originNote"])] },
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

export async function saveMotherWarningConfirmations(input: { workspaceId: string; userId: string; projectId: string; version: number; warningKeys: string[] }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId, workspace: { members: { some: { userId: input.userId } } } }, select: { motherContent: true } });
  if (!project?.motherContent) throw new MotherContentConfirmationError("MOTHER_CONTENT_NOT_FOUND", "口播稿不存在。");
  if (project.motherContent.version !== input.version) throw new MotherContentConfirmationError("MOTHER_VERSION_CONFLICT", "口播稿已更新，请重新确认当前版本。");
  return db.motherContent.update({ where: { id: project.motherContent.id }, data: { confirmedWarnings: input.warningKeys } });
}

export async function confirmMotherContent(input: { workspaceId: string; userId: string; projectId: string; version: number; warningKeys: string[]; currentWarningKeys: string[] }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId, workspace: { members: { some: { userId: input.userId } } } }, select: { motherContent: true } });
  if (!project?.motherContent) throw new MotherContentConfirmationError("MOTHER_CONTENT_NOT_FOUND", "口播稿不存在。");
  if (project.motherContent.version !== input.version) throw new MotherContentConfirmationError("MOTHER_VERSION_CONFLICT", "口播稿已更新，请重新确认当前版本。");
  const confirmed = new Set(input.warningKeys);
  if (input.currentWarningKeys.some((key) => !confirmed.has(key))) throw new MotherContentConfirmationError("MOTHER_WARNINGS_UNCONFIRMED", "还有内容需要确认后才能进入平台适配。");
  const content = await db.$transaction(async (tx) => {
    const updated = await tx.motherContent.updateMany({ where: { id: project.motherContent!.id, version: input.version }, data: { confirmedVersion: input.version, confirmedWarnings: input.warningKeys } });
    if (updated.count !== 1) throw new MotherContentConfirmationError("MOTHER_VERSION_CONFLICT", "口播稿已更新，请重新确认当前版本。");
    const value = await tx.motherContent.findUniqueOrThrow({ where: { id: project.motherContent!.id } });
    const workspaceMember = await tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } } });
    if (workspaceMember) await tx.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.userId, action: "mother_content.confirmed", resourceType: "mother_content", resourceId: value.id, metadata: { projectId: input.projectId, version: input.version, warningCount: input.currentWarningKeys.length } } });
    return value;
  });
  return content;
}

export async function listMotherContentVersions(input: { workspaceId: string; userId: string; projectId: string }): Promise<MotherContentVersion[]> {
  const project = await db.contentProject.findFirst({
    where: { id: input.projectId, workspaceId: input.workspaceId, workspace: { members: { some: { userId: input.userId } } } },
    select: { motherContent: true },
  });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  if (!project.motherContent) return [];
  const audits = await db.auditLog.findMany({
    where: { workspaceId: input.workspaceId, resourceId: project.motherContent.id, action: "mother_content.version_preserved" },
    select: { metadata: true },
    orderBy: { createdAt: "asc" },
  });
  const previous = audits.flatMap<MotherContentVersion>(({ metadata }) => {
    const value = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : null;
    const snapshot = value?.snapshot && typeof value.snapshot === "object" && !Array.isArray(value.snapshot) ? value.snapshot as Record<string, unknown> : null;
    if (!snapshot || typeof snapshot.version !== "number" || typeof snapshot.body !== "string") return [];
    const origin = snapshot.origin === "KIMI" || snapshot.origin === "GPT_WEB" ? snapshot.origin : "HUMAN";
    return [{ title: typeof snapshot.title === "string" ? snapshot.title : "", body: snapshot.body, outline: stringArray(snapshot.outline), version: snapshot.version, revision: typeof snapshot.revision === "number" ? snapshot.revision : snapshot.version, origin, originNote: typeof snapshot.originNote === "string" ? snapshot.originNote : null, createdAt: typeof snapshot.createdAt === "string" ? snapshot.createdAt : "", current: false }];
  });
  return [...previous, { ...versionSnapshot(project.motherContent, previous.length + 1), current: true }].sort((a, b) => b.version - a.version);
}
