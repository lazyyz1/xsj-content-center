import "server-only";

import {
  CONTENT_PROJECT_STATUSES,
  ProjectTransitionError,
  transitionProjectStatus as validateProjectTransition,
  type ContentProjectStatus,
} from "@content-center/core";
import { db, findProjectForUser, type Prisma } from "@content-center/db";

export class ProjectServiceError extends Error {
  constructor(readonly code: "PROJECT_NOT_FOUND" | "SOURCE_NOT_FOUND" | "SOURCE_ALREADY_ADDED") {
    super(code);
    this.name = "ProjectServiceError";
  }
}

export type ProjectListQuery = {
  search?: string;
  status?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export async function listProjects(workspaceId: string, query: ProjectListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 12));
  const status = CONTENT_PROJECT_STATUSES.includes(query.status as ContentProjectStatus)
    ? query.status as ContentProjectStatus
    : undefined;
  const search = query.search?.trim();
  const where: Prisma.ContentProjectWhereInput = {
    workspaceId,
    status: status ?? { not: "ARCHIVED" },
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { goal: { contains: search, mode: "insensitive" } },
        { audience: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    db.contentProject.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        goal: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        _count: { select: { sources: true, evidenceItems: true } },
      },
      orderBy: query.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contentProject.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getProjectForUser(input: { userId: string; workspaceId: string; projectId: string }) {
  return findProjectForUser(db, input);
}

export async function createProject(input: {
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  goal?: string;
  audience?: string;
  sourceItemId?: string;
}) {
  const source = input.sourceItemId
    ? await db.sourceItem.findFirst({ where: { id: input.sourceItemId, workspaceId: input.workspaceId }, select: { id: true } })
    : null;
  if (input.sourceItemId && !source) throw new ProjectServiceError("SOURCE_NOT_FOUND");

  return db.$transaction(async (tx) => {
    const project = await tx.contentProject.create({
      data: {
        workspaceId: input.workspaceId,
        createdById: input.userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        goal: input.goal?.trim() || null,
        audience: input.audience?.trim() || null,
        status: "DRAFT",
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "project.created",
        resourceType: "content_project",
        resourceId: project.id,
        metadata: { projectId: project.id, changedFields: ["title", "description", "goal", "audience"] },
      },
    });
    if (source) {
      const relation = await tx.projectSource.create({
        data: { projectId: project.id, sourceItemId: source.id, role: "REFERENCE", sortOrder: 0 },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "project.source_added",
          resourceType: "project_source",
          resourceId: relation.id,
          metadata: { projectId: project.id, sourceItemId: source.id, role: "REFERENCE" },
        },
      });
    }
    return project;
  });
}

export async function updateProject(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  data: { title?: string; description?: string; goal?: string; audience?: string };
}) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  const changedFields = Object.keys(input.data);
  const updated = await db.contentProject.update({
    where: { id: project.id },
    data: {
      ...(input.data.title !== undefined ? { title: input.data.title.trim() } : {}),
      ...(input.data.description !== undefined ? { description: input.data.description.trim() || null } : {}),
      ...(input.data.goal !== undefined ? { goal: input.data.goal.trim() || null } : {}),
      ...(input.data.audience !== undefined ? { audience: input.data.audience.trim() || null } : {}),
    },
  });
  await db.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "project.updated",
      resourceType: "content_project",
      resourceId: project.id,
      metadata: { projectId: project.id, changedFields },
    },
  });
  return updated;
}

export async function deleteProject(input: { workspaceId: string; userId: string; projectId: string }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  await db.$transaction([
    db.contentProject.delete({ where: { id: project.id } }),
    db.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "project.deleted",
        resourceType: "content_project",
        resourceId: project.id,
        metadata: { projectId: project.id },
      },
    }),
  ]);
}

export async function addProjectSource(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  sourceItemId: string;
  role: "REFERENCE" | "EVIDENCE" | "INSPIRATION" | "OWN_MATERIAL";
}) {
  const [project, source, existing] = await Promise.all([
    db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } }),
    db.sourceItem.findFirst({ where: { id: input.sourceItemId, workspaceId: input.workspaceId }, select: { id: true } }),
    db.projectSource.findFirst({ where: { projectId: input.projectId, sourceItemId: input.sourceItemId }, select: { id: true } }),
  ]);
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  if (!source) throw new ProjectServiceError("SOURCE_NOT_FOUND");
  if (existing) throw new ProjectServiceError("SOURCE_ALREADY_ADDED");
  const maximum = await db.projectSource.aggregate({ where: { projectId: project.id }, _max: { sortOrder: true } });
  const relation = await db.projectSource.create({
    data: { projectId: project.id, sourceItemId: source.id, role: input.role, sortOrder: (maximum._max.sortOrder ?? -1) + 1 },
  });
  await db.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "project.source_added",
      resourceType: "project_source",
      resourceId: relation.id,
      metadata: { projectId: project.id, sourceItemId: source.id, role: input.role },
    },
  });
  return relation;
}

export async function removeProjectSource(input: { workspaceId: string; userId: string; projectId: string; sourceItemId: string }) {
  const project = await db.contentProject.findFirst({ where: { id: input.projectId, workspaceId: input.workspaceId }, select: { id: true } });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  const relation = await db.projectSource.findFirst({ where: { projectId: project.id, sourceItemId: input.sourceItemId }, select: { id: true } });
  if (!relation) throw new ProjectServiceError("SOURCE_NOT_FOUND");
  await db.$transaction([
    db.projectSource.delete({ where: { id: relation.id } }),
    db.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "project.source_removed",
        resourceType: "project_source",
        resourceId: relation.id,
        metadata: { projectId: project.id, sourceItemId: input.sourceItemId },
      },
    }),
  ]);
}

export async function transitionProjectStatus(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  to: ContentProjectStatus;
}) {
  const project = await db.contentProject.findFirst({
    where: { id: input.projectId, workspaceId: input.workspaceId },
    include: { creativeBrief: true, motherContent: true },
  });
  if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
  const status = validateProjectTransition({
    from: project.status,
    to: input.to,
    brief: project.creativeBrief,
    motherContent: project.motherContent,
  });
  const updated = await db.contentProject.update({ where: { id: project.id }, data: { status } });
  const auditEntries: Prisma.AuditLogCreateManyInput[] = [{
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "project.status_changed",
    resourceType: "content_project",
    resourceId: project.id,
    metadata: { projectId: project.id, from: project.status, to: status },
  }];
  if (status === "ARCHIVED") auditEntries.push({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "project.archived",
    resourceType: "content_project",
    resourceId: project.id,
    metadata: { projectId: project.id, from: project.status },
  });
  await db.auditLog.createMany({ data: auditEntries });
  return updated;
}

export { ProjectTransitionError };
