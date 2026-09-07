import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@content-center/worker/queue", () => ({ enqueueContentIngest: vi.fn().mockResolvedValue(undefined) }));

import { db } from "@content-center/db";
import { MockLLMProvider } from "@content-center/providers";
import { buildRecommendationContext } from "../server/discovery/recommendations/context-builder";
import { actOnRecommendation, generateRecommendationBatch, getCurrentRecommendationBatch, getRecommendationItem, RecommendationServiceError } from "../server/discovery/recommendations/service";

describe("Content Discovery D4 today recommendations", () => {
  const suffix = randomUUID(); const ownerId = `recommend-owner-${suffix}`; const otherId = `recommend-other-${suffix}`;
  let workspaceId = ""; let otherWorkspaceId = ""; const sourceIds: string[] = [];

  beforeAll(async () => {
    await db.user.createMany({ data: [{ id: ownerId, name: "Recommendation Owner", email: `${ownerId}@example.test` }, { id: otherId, name: "Other Owner", email: `${otherId}@example.test` }] });
    const [workspace, other] = await Promise.all([
      db.workspace.create({ data: { name: "Recommendation Workspace", slug: `recommend-${suffix}`, members: { create: { userId: ownerId, role: "OWNER" } } } }),
      db.workspace.create({ data: { name: "Other Recommendation Workspace", slug: `recommend-other-${suffix}`, members: { create: { userId: otherId, role: "OWNER" } } } }),
    ]);
    workspaceId = workspace.id; otherWorkspaceId = other.id;
  });

  beforeEach(async () => {
    await db.recommendationBatch.deleteMany({ where: { workspaceId } });
    await db.contentIdea.deleteMany({ where: { workspaceId } });
    await db.contentProject.deleteMany({ where: { workspaceId } });
    await db.sourceItem.deleteMany({ where: { workspaceId } });
    await db.apiUsage.deleteMany({ where: { workspaceId } });
    await db.aIRun.deleteMany({ where: { workspaceId } });
    sourceIds.length = 0;
    for (const [index, title] of ["AI 团队如何减少重复沟通", "创作者建立证据库", "短视频选题复盘方法"].entries()) {
      const source = await db.sourceItem.create({ data: { workspaceId, createdById: ownerId, sourceType: "TEXT", sourcePlatform: "GENERIC", title, description: `真实素材摘要 ${index}`, rawText: "不进入推荐上下文的完整原文", status: "READY" } });
      sourceIds.push(source.id);
    }
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.$disconnect();
  });

  it("builds a bounded context without transcript or full raw text", async () => {
    const context = await buildRecommendationContext({ workspaceId, userId: ownerId });
    expect(context.candidates).toHaveLength(3);
    expect(JSON.stringify(context)).not.toContain("不进入推荐上下文的完整原文");
    expect(context.candidates.length).toBeLessThanOrEqual(15);
  });

  it("uses deterministic mode without profile, creates no AIRun, and reuses a valid batch", async () => {
    const runtime = { provider: new MockLLMProvider(() => ({})), providerName: "MOCK", model: "mock" };
    const first = await generateRecommendationBatch({ workspaceId, userId: ownerId }, { runtime });
    const second = await generateRecommendationBatch({ workspaceId, userId: ownerId }, { runtime });
    expect(first.mode).toBe("DETERMINISTIC");
    expect(first.creatorProfileId).toBeNull();
    expect(first.items).toHaveLength(3);
    expect(second.id).toBe(first.id);
    expect(await db.aIRun.count({ where: { workspaceId, action: "GENERATE_TODAY_RECOMMENDATIONS" } })).toBe(0);
    expect(await db.apiUsage.count({ where: { workspaceId, provider: "REDFOX" } })).toBe(0);
  });

  it("makes one AI call, validates evidence ids and persists only real evidence", async () => {
    let calls = 0;
    const runtime = { provider: new MockLLMProvider(() => { calls += 1; return { recommendations: sourceIds.map((id, index) => ({ candidateId: `source:${id}`, title: `方向 ${index + 1}`, coreQuestion: "核心问题", angle: "差异化切口", whyRecommended: "编辑判断", whyNow: "素材最近更新", creatorFit: "未使用个性化结论", evidenceRefs: [id, "forged-evidence"], differenceFromRecentContent: "无精确重复", suggestedNextStep: "核对素材", riskNotes: [], recommendedFormat: null })) }; }), providerName: "FIXTURE", model: "fixture-model" };
    const batch = await generateRecommendationBatch({ workspaceId, userId: ownerId, force: true }, { runtime });
    expect(batch.mode).toBe("AI_ASSISTED"); expect(calls).toBe(1); expect(batch.items).toHaveLength(3);
    expect(batch.items.flatMap((item) => item.evidence).every((evidence) => evidence.referenceId !== "forged-evidence")).toBe(true);
    expect(await db.aIRun.count({ where: { workspaceId, action: "GENERATE_TODAY_RECOMMENDATIONS" } })).toBe(1);
    expect(await db.apiUsage.count({ where: { workspaceId, provider: "FIXTURE", operation: "GENERATE_TODAY_RECOMMENDATIONS" } })).toBe(1);
  });

  it("dismisses only one item and supports save, research and project creation", async () => {
    const batch = await generateRecommendationBatch({ workspaceId, userId: ownerId, force: true }, { runtime: { provider: new MockLLMProvider(() => ({})), providerName: "MOCK", model: "mock" } });
    await actOnRecommendation({ workspaceId, userId: ownerId, itemId: batch.items[0]!.id, action: "DISMISS" });
    expect((await getRecommendationItem({ workspaceId, userId: ownerId, itemId: batch.items[0]!.id }))?.status).toBe("DISMISSED");
    expect((await getRecommendationItem({ workspaceId, userId: ownerId, itemId: batch.items[1]!.id }))?.status).toBe("NEW");
    const saved = await actOnRecommendation({ workspaceId, userId: ownerId, itemId: batch.items[1]!.id, action: "START_RESEARCH" });
    expect(saved.status).toBe("SAVED");
    await expect(db.contentIdea.findUniqueOrThrow({ where: { id: "ideaId" in saved ? saved.ideaId : "" } })).resolves.toMatchObject({ status: "READY" });
    const started = await actOnRecommendation({ workspaceId, userId: ownerId, itemId: batch.items[2]!.id, action: "START_CREATION" });
    expect(started.status).toBe("STARTED");
    expect("projectId" in started ? started.projectId : null).toBeTruthy();
  });

  it("enforces workspace isolation and reports no-data honestly", async () => {
    const batch = await generateRecommendationBatch({ workspaceId, userId: ownerId, force: true }, { runtime: { provider: new MockLLMProvider(() => ({})), providerName: "MOCK", model: "mock" } });
    expect(await getRecommendationItem({ workspaceId: otherWorkspaceId, userId: otherId, itemId: batch.items[0]!.id })).toBeNull();
    await db.recommendationBatch.deleteMany({ where: { workspaceId } }); await db.sourceItem.deleteMany({ where: { workspaceId } });
    await expect(generateRecommendationBatch({ workspaceId, userId: ownerId, force: true }, { runtime: { provider: new MockLLMProvider(() => ({})), providerName: "MOCK", model: "mock" } })).rejects.toBeInstanceOf(RecommendationServiceError);
    expect(await getCurrentRecommendationBatch({ workspaceId, userId: ownerId })).toBeNull();
  });
});
