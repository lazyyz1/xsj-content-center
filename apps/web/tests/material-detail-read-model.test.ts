import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@content-center/db";
import { listLibrarySources } from "../server/library";
import { getSourceWorkspaceModel } from "../server/material-detail/read-model";

describe("Material Detail read boundary", () => {
  const suffix = randomUUID();
  const userId = `material-read-${suffix}`;
  let workspaceId = "";
  let sourceItemId = "";

  beforeAll(async () => {
    await db.user.create({ data: { id: userId, name: "Material reader", email: `${userId}@example.test` } });
    const workspace = await db.workspace.create({ data: { name: "Material read boundary", slug: `material-read-${suffix}`, members: { create: { userId, role: "OWNER" } } } });
    workspaceId = workspace.id;
    const project = await db.contentProject.create({ data: { workspaceId, createdById: userId, title: "关联项目" } });
    const source = await db.sourceItem.create({ data: { workspaceId, createdById: userId, sourceType: "TEXT", title: "原始资料", rawText: "资料原文，允许阅读和复制。", status: "READY" } });
    sourceItemId = source.id;
    await db.projectSource.create({ data: { projectId: project.id, sourceItemId } });
    await db.materialAnalysis.create({ data: { workspaceId, sourceItemId, createdById: userId, version: 1, status: "COMPLETED", summary: "研究摘要不属于资料详情", tags: [], keywords: [], keyPoints: [], transcriptUpdatedAtAtAnalysis: source.updatedAt } });
    await db.materialDistillation.create({ data: { workspaceId, sourceItemId, createdById: userId, version: 1, mode: "COMPREHENSIVE", status: "COMPLETED", schemaVersion: "1", output: { highlights: [] }, transcriptUpdatedAtAtDistillation: source.updatedAt } });
    await db.evidenceItem.create({ data: { workspaceId, projectId: project.id, sourceItemId, type: "VIEWPOINT", excerpt: "资料原文", claim: "研究候选不属于资料详情", ownership: "EXTERNAL", status: "CONFIRMED", createdById: userId } });
    await db.ingestJob.create({ data: { workspaceId, sourceItemId, requestedById: userId, jobType: "ANALYZE_MATERIAL", provider: "LLM", providerMode: "REAL", status: "RUNNING" } });
  });

  afterAll(async () => {
    if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("opens raw material without research results or research processing state", async () => {
    const model = await getSourceWorkspaceModel({ workspaceId, userId, sourceItemId, role: "OWNER" });
    expect(model).not.toBeNull();
    expect(Object.keys(model!.detail)).toEqual(["header", "preview", "transcript", "tags"]);
    expect(model!.detail.transcript.text).toBe("资料原文，允许阅读和复制。");
    expect(model!.actions.relatedProjects).toMatchObject([{ title: "关联项目" }]);
    expect(model!.workspace.busy).toBe(false);
    expect(model!.adminDetails?.jobs).toEqual([]);
    expect(JSON.stringify(model)).not.toMatch(/研究摘要|研究候选|materialAnalysis|materialDistillation|evidence/u);
  });

  it("lists material without loading analysis readiness", async () => {
    const library = await listLibrarySources(workspaceId, {});
    expect(library.items.find((item) => item.id === sourceItemId)).toMatchObject({ title: "原始资料", status: "READY" });
    expect(library.items.find((item) => item.id === sourceItemId)).not.toHaveProperty("materialAnalyses");
  });
});
