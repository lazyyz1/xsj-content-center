import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@content-center/db";
import { saveBrief, VersionConflictError } from "../server/brief-service";
import { createEvidence } from "../server/evidence-service";
import { saveMotherContent } from "../server/mother-content-service";
import { createProject, listProjects, transitionProjectStatus } from "../server/project-service";

describe("content project service flow", () => {
  const runId = randomUUID();
  const userId = `project-service-${runId}`;
  let workspaceId = "";
  let sourceId = "";

  beforeAll(async () => {
    await db.user.create({ data: { id: userId, name: "Project Service User", email: `${userId}@example.test` } });
    const workspace = await db.workspace.create({ data: { name: "Project Service", slug: `project-service-${runId}`, members: { create: { userId, role: "OWNER" } } } });
    workspaceId = workspace.id;
    sourceId = (await db.sourceItem.create({ data: { workspaceId, createdById: userId, sourceType: "TEXT", sourcePlatform: "GENERIC", status: "READY", title: "Service source", rawText: "Service source body" } })).id;
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it("creates a source-linked project, evidence, brief and mother content through review", async () => {
    const project = await createProject({ workspaceId, userId, title: "Stage 4 service flow", sourceItemId: sourceId });
    expect(project.status).toBe("DRAFT");
    await expect(db.projectSource.count({ where: { projectId: project.id, sourceItemId: sourceId } })).resolves.toBe(1);
    await createEvidence({ workspaceId, userId, projectId: project.id, data: { type: "FACT", sourceItemId: sourceId, excerpt: "Evidence excerpt", claim: "Evidence claim" } });
    await transitionProjectStatus({ workspaceId, userId, projectId: project.id, to: "RESEARCHING" });
    const brief = await saveBrief({ workspaceId, userId, projectId: project.id, data: { topic: "A validated topic", angle: "Practical", audience: "Creators", coreMessage: "Use evidence before drafting", keyPoints: ["Point one"], structure: ["Opening", "Body"], tone: "Clear", risks: [], expectedVersion: 0 } });
    expect(brief.version).toBe(1);
    await expect(saveBrief({ workspaceId, userId, projectId: project.id, data: { topic: "Stale", angle: "", audience: "", coreMessage: "Stale", keyPoints: [], structure: [], tone: "", risks: [], expectedVersion: 0 } })).rejects.toBeInstanceOf(VersionConflictError);
    await transitionProjectStatus({ workspaceId, userId, projectId: project.id, to: "BRIEF_READY" });
    await transitionProjectStatus({ workspaceId, userId, projectId: project.id, to: "WRITING" });
    const mother = await saveMotherContent({ workspaceId, userId, projectId: project.id, data: { title: "Mother title", body: "A real persisted mother content body.", outline: ["Opening", "Body"], expectedVersion: 0 } });
    expect(mother.version).toBe(1);
    await expect(saveMotherContent({ workspaceId, userId, projectId: project.id, data: { title: "Stale", body: "stale", outline: [], expectedVersion: 0 } })).rejects.toBeInstanceOf(VersionConflictError);
    await transitionProjectStatus({ workspaceId, userId, projectId: project.id, to: "IN_REVIEW" });
    const stored = await db.contentProject.findUniqueOrThrow({ where: { id: project.id }, include: { evidenceItems: true, creativeBrief: true, motherContent: true } });
    expect(stored).toMatchObject({ status: "IN_REVIEW" });
    expect(stored.evidenceItems).toHaveLength(1);
    expect(stored.creativeBrief?.topic).toBe("A validated topic");
    expect(stored.motherContent?.body).toBe("A real persisted mother content body.");
    await db.platformVariant.create({ data: { workspaceId, projectId: project.id, motherContentId: stored.motherContent!.id, platform: "DOUYIN", title: "待审核版本", body: "待审核正文", hashtags: [], mediaPlan: {}, metadata: {}, status: "IN_REVIEW", sourceMotherVersion: stored.motherContent!.version, createdById: userId } });
    const pendingReview = await listProjects(workspaceId, { review: "pending" });
    expect(pendingReview.items.map((item) => item.id)).toContain(project.id);
    const actions = await db.auditLog.findMany({ where: { workspaceId, metadata: { path: ["projectId"], equals: project.id } }, select: { action: true, metadata: true } });
    expect(actions.map(({ action }) => action)).toEqual(expect.arrayContaining(["project.created", "project.source_added", "evidence.created", "brief.updated", "mother_content.updated", "project.status_changed"]));
    expect(JSON.stringify(actions)).not.toContain("A real persisted mother content body.");
  });
});
