import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@content-center/db";
import { MockLLMProvider } from "@content-center/providers";
import { analyzeMaterial, createProjectFromMaterial, getMaterialAnalysis, updateMaterialAnalysis } from "../server/material-analysis/service";
import { materialAnalysisOutputSchema } from "../server/material-analysis/schemas";

describe("V1.2B-1 smart material analysis", () => {
  const suffix = randomUUID();
  const userAId = `material-a-${suffix}`;
  const userBId = `material-b-${suffix}`;
  let workspaceAId = "";
  let workspaceBId = "";
  let sourceAId = "";
  let sourceBId = "";

  const output = {
    suggestedTitle: "把素材先整理清楚，再开始创作",
    summary: "这条素材讨论内容团队如何用结构化整理减少创作前的信息损耗。",
    topic: "素材智能整理",
    tags: ["内容工作流", "素材整理"],
    keywords: ["素材库", "转写", "结构化"],
    contentType: "方法讲解",
    targetAudience: "需要处理大量视频素材的内容创作者",
    coreViewpoint: "创作前先把原始素材的主题、观点与问题整理成可编辑结果。",
    keyPoints: ["元数据与转写共同提供上下文", "整理结果需要人工可编辑", "AI 结果不能直接当成事实"],
    coreQuestion: "如何让视频素材更快进入可靠的创作流程？",
  };

  beforeAll(async () => {
    await db.user.createMany({ data: [{ id: userAId, name: "Material A", email: `${userAId}@example.test` }, { id: userBId, name: "Material B", email: `${userBId}@example.test` }] });
    const [workspaceA, workspaceB] = await Promise.all([
      db.workspace.create({ data: { name: "Material A", slug: `material-a-${suffix}`, members: { create: { userId: userAId, role: "OWNER" } } } }),
      db.workspace.create({ data: { name: "Material B", slug: `material-b-${suffix}`, members: { create: { userId: userBId, role: "OWNER" } } } }),
    ]);
    workspaceAId = workspaceA.id; workspaceBId = workspaceB.id;
    const [sourceA, sourceB] = await Promise.all([
      db.sourceItem.create({ data: { workspaceId: workspaceAId, createdById: userAId, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "素材 A", description: "市场信号只用于辅助理解", status: "READY", transcript: { create: { workspaceId: workspaceAId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: "这是一段关于素材整理、人工确认与可靠创作流程的中文转写。", segments: [] } } } }),
      db.sourceItem.create({ data: { workspaceId: workspaceBId, createdById: userBId, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "私有素材 B", status: "READY", transcript: { create: { workspaceId: workspaceBId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: "另一个工作区的私有转写。", segments: [] } } } }),
    ]);
    sourceAId = sourceA.id; sourceBId = sourceB.id;
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { id: { in: [workspaceAId, workspaceBId] } } });
    await db.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await db.$disconnect();
  });

  it("accepts only the bounded material-understanding contract", () => {
    expect(materialAnalysisOutputSchema.parse(output)).toEqual(output);
    expect(() => materialAnalysisOutputSchema.parse({ ...output, tags: Array.from({ length: 9 }, (_, index) => `标签${index}`) })).toThrow();
    expect(() => materialAnalysisOutputSchema.parse({ ...output, hook: "不属于本阶段" })).toThrow();
    expect(() => materialAnalysisOutputSchema.parse({ ...output, coreQuestion: undefined })).toThrow();
    expect(() => materialAnalysisOutputSchema.parse("not-json")).toThrow();
  });

  it("runs one fixture LLM call through AIRun and stores a versioned DTO", async () => {
    let capturedPrompt = "";
    const runtime = { provider: new MockLLMProvider(({ prompt }) => { capturedPrompt = prompt; return output; }), providerName: "FIXTURE", model: "fixture-kimi-2.6", productModel: "FIXTURE" as const, mode: "FIXTURE" as const };
    const result = await analyzeMaterial({ workspaceId: workspaceAId, userId: userAId, sourceItemId: sourceAId }, { runtime });
    expect(result).toMatchObject({ version: 1, status: "COMPLETED", topic: output.topic, origin: "AI", stale: false });
    expect(capturedPrompt).toContain("ANALYZE_MATERIAL");
    expect(capturedPrompt).toContain("Interaction metrics are market signals");
    expect(capturedPrompt).toContain("Do not return hooks, structure");
    expect(await db.aIRun.count({ where: { workspaceId: workspaceAId, action: "ANALYZE_MATERIAL" } })).toBe(1);
    const usage = await db.apiUsage.findFirstOrThrow({ where: { workspaceId: workspaceAId, operation: "ANALYZE_MATERIAL", success: true } });
    expect(usage.metadata).toMatchObject({ productModel: "FIXTURE", latencyMs: expect.any(Number), sourceItemId: sourceAId });
  });

  it("prevents duplicate processing and keeps the older version", async () => {
    const transcript = await db.transcript.findUniqueOrThrow({ where: { sourceItemId: sourceAId } });
    const processing = await db.materialAnalysis.create({ data: { workspaceId: workspaceAId, sourceItemId: sourceAId, createdById: userAId, version: 2, status: "PROCESSING", tags: [], keywords: [], keyPoints: [], transcriptUpdatedAtAtAnalysis: transcript.updatedAt } });
    const runtime = { provider: new MockLLMProvider(() => output), providerName: "FIXTURE", model: "fixture-kimi-2.6", mode: "FIXTURE" as const };
    await expect(analyzeMaterial({ workspaceId: workspaceAId, userId: userAId, sourceItemId: sourceAId }, { runtime })).rejects.toMatchObject({ code: "ANALYSIS_ALREADY_PROCESSING" });
    await db.materialAnalysis.update({ where: { id: processing.id }, data: { status: "FAILED", errorCode: "TEST_INTERRUPTED", errorMessage: "测试中的中断任务" } });
    await expect(analyzeMaterial({ workspaceId: workspaceAId, userId: userAId, sourceItemId: sourceAId }, { runtime })).resolves.toMatchObject({ version: 3, status: "COMPLETED" });
    expect(await db.materialAnalysis.count({ where: { sourceItemId: sourceAId, status: "COMPLETED" } })).toBe(2);
  });

  it("saves human edits, normalizes at most eight tags and marks stale after transcript changes", async () => {
    const current = (await getMaterialAnalysis({ workspaceId: workspaceAId, sourceItemId: sourceAId })).current!;
    const edited = await updateMaterialAnalysis({ workspaceId: workspaceAId, userId: userAId, sourceItemId: sourceAId, analysisId: current.id, data: { ...output, topic: "人工确认主题", tags: ["内容 工作流", "素材整理", "内容 工作流"] } });
    expect(edited).toMatchObject({ origin: "HUMAN", topic: "人工确认主题" });
    expect(await db.sourceItemTag.count({ where: { sourceItemId: sourceAId } })).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await db.transcript.update({ where: { sourceItemId: sourceAId }, data: { fullText: "更新后的转写文本。" } });
    expect((await getMaterialAnalysis({ workspaceId: workspaceAId, sourceItemId: sourceAId })).current?.stale).toBe(true);
  });

  it("creates one project from the material and reuses it", async () => {
    const first = await createProjectFromMaterial({ workspaceId: workspaceAId, sourceItemId: sourceAId, userId: userAId });
    const second = await createProjectFromMaterial({ workspaceId: workspaceAId, sourceItemId: sourceAId, userId: userAId });
    expect(first.created).toBe(true); expect(second).toEqual({ projectId: first.projectId, created: false });
    await expect(db.projectSource.findFirst({ where: { projectId: first.projectId, sourceItemId: sourceAId } })).resolves.toBeTruthy();
  });

  it("enforces workspace scope and never enables product MOCK results", async () => {
    await expect(getMaterialAnalysis({ workspaceId: workspaceAId, sourceItemId: sourceBId })).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
    const runtime = { provider: new MockLLMProvider(() => output), providerName: "MOCK", model: "mock", mode: "MOCK" as const };
    await expect(analyzeMaterial({ workspaceId: workspaceBId, userId: userBId, sourceItemId: sourceBId }, { runtime })).rejects.toMatchObject({ code: "MOCK_NOT_ALLOWED" });
  });
});
