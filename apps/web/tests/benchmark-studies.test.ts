import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const enqueueBenchmarkStudy = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "queued" }));
vi.mock("@content-center/worker/queue", () => ({ enqueueBenchmarkStudy }));
import { db } from "@content-center/db";
import { createBenchmarkStudy, createBenchmarkStudySchema, listBenchmarkCandidates, listBenchmarkStudies } from "../server/discovery/benchmark-study-service";
import { createMethodFromBenchmarkStudy, getMethod } from "../server/methods/service";

function understanding(quote: string) {
  const evidence = [{ quote }];
  const section = { summary: "先说问题，再给出处理方式。", evidence };
  return {
    whatItSays: { summary: "比较可核对的表达做法。", keyPoints: ["先说问题"], evidence },
    expression: { audience: section, opening: section, progression: { summary: "从问题进入方法。", steps: ["问题", "方法"], evidence }, support: section, emotionalOrRhetoricalShift: section, ending: section },
    methods: { evidenceStatus: "SINGLE_SOURCE_DRAFT", reason: "仅是单条方法草稿。", items: [{ title: "先说问题", howTo: ["先说问题"], applicable: ["解释复杂问题"], boundaries: ["不要虚构事实"], evidence }] },
    reusable: [], doNotCopy: [], uncertain: [],
  };
}

function studyOutput(sampleIds: string[]) {
  const finding = { name: "先说问题", summary: "多数样本先提出问题。", occurrenceSampleIds: sampleIds.slice(0, 4), exceptionSampleIds: sampleIds.slice(4), evidence: sampleIds.slice(0, 4).map((sampleId, index) => ({ sampleId, quote: `可靠依据 ${index + 1}` })) };
  return {
    topicDirections: [finding], openingPatterns: [finding], structures: [], persuasionMethods: [], expressionHabits: [], endings: [],
    commonMethods: [{ title: "先说问题再给方法", howTo: ["先明确问题"], applicable: ["需要解释时"], boundaries: ["不要照搬来源事实"], occurrenceSampleIds: finding.occurrenceSampleIds, exceptionSampleIds: finding.exceptionSampleIds, evidence: finding.evidence }],
    exceptions: [{ ...finding, name: "不同开头", summary: "两个样本使用了其他开头。" }],
    repeatedCaseNotes: [{ summary: "样本重复同一经历，不能当作多个独立事实来源。", sampleIds: sampleIds.slice(0, 2), evidence: finding.evidence.slice(0, 2) }],
    stableMethodsFound: true, message: "只描述所选样本。",
  };
}

describe("benchmark study request boundary", () => {
  it("accepts one through ten samples and rejects empty, oversized, or duplicate selections", () => {
    expect(createBenchmarkStudySchema.safeParse({ sampleIds: ["sample-1"] }).success).toBe(true);
    expect(createBenchmarkStudySchema.safeParse({ sampleIds: Array.from({ length: 10 }, (_, index) => `sample-${index}`) }).success).toBe(true);
    expect(createBenchmarkStudySchema.safeParse({ sampleIds: [] }).success).toBe(false);
    expect(createBenchmarkStudySchema.safeParse({ sampleIds: Array.from({ length: 11 }, (_, index) => `sample-${index}`) }).success).toBe(false);
    expect(createBenchmarkStudySchema.safeParse({ sampleIds: ["sample-1", "sample-1"] }).success).toBe(false);
  });
});

describe("benchmark study persistence and provenance", () => {
  const suffix = randomUUID();
  const ownerId = `benchmark-owner-${suffix}`;
  const colleagueId = `benchmark-colleague-${suffix}`;
  let workspaceId = "";
  let benchmarkId = "";
  let otherBenchmarkId = "";
  const snapshotIds: string[] = [];

  beforeAll(async () => {
    await db.user.createMany({ data: [{ id: ownerId, name: "Benchmark Owner", email: `${ownerId}@example.test` }, { id: colleagueId, name: "Benchmark Colleague", email: `${colleagueId}@example.test` }] });
    const workspace = await db.workspace.create({ data: { name: "Benchmark Study", slug: `benchmark-study-${suffix}`, members: { create: [{ userId: ownerId, role: "OWNER" }, { userId: colleagueId, role: "EDITOR" }] } } });
    workspaceId = workspace.id;
    const [benchmark, other] = await Promise.all([
      db.benchmarkAccount.create({ data: { workspaceId, platform: "DOUYIN", externalAccountId: `account-${suffix}`, name: "对标账号", createdById: ownerId } }),
      db.benchmarkAccount.create({ data: { workspaceId, platform: "DOUYIN", externalAccountId: `other-${suffix}`, name: "其他账号", createdById: ownerId } }),
    ]);
    benchmarkId = benchmark.id; otherBenchmarkId = other.id;
    for (let index = 0; index < 7; index += 1) {
      const externalId = `benchmark-${suffix}-${index}`;
      const snapshot = await db.benchmarkContentSnapshot.create({ data: { workspaceId, benchmarkAccountId: index === 6 ? otherBenchmarkId : benchmarkId, platform: "DOUYIN", externalId, title: `代表内容 ${index + 1}`, url: `https://example.test/${externalId}`, metadata: {} } });
      snapshotIds.push(snapshot.id);
      const source = await db.sourceItem.create({ data: { workspaceId, createdById: ownerId, sourceType: "VIDEO", sourcePlatform: "DOUYIN", externalId, title: `代表内容 ${index + 1}`, status: "READY", transcript: { create: { workspaceId, provider: "FIXTURE", providerMode: "REAL", fullText: `可靠依据 ${index + 1}`, segments: [] } } } });
      if (index < 6) {
        const transcript = await db.transcript.findUniqueOrThrow({ where: { sourceItemId: source.id } });
        await db.materialAnalysis.create({ data: { workspaceId, sourceItemId: source.id, createdById: ownerId, version: 1, status: "COMPLETED", tags: [], keywords: [], keyPoints: [], understanding: understanding(`可靠依据 ${index + 1}`), transcriptUpdatedAtAtAnalysis: transcript.updatedAt } });
      }
    }
  });

  afterAll(async () => {
    await db.methodAsset.deleteMany({ where: { workspaceId } });
    await db.benchmarkStudy.deleteMany({ where: { workspaceId } });
    await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, colleagueId] } } });
    await db.$disconnect();
  });

  it("pins six same-account M1 results, preserves history, and saves a private multi-sample method", async () => {
    const candidates = await listBenchmarkCandidates({ workspaceId, benchmarkAccountId: benchmarkId });
    expect(candidates).toHaveLength(6);
    expect(candidates.every(({ ready }) => ready)).toBe(true);
    const first = await createBenchmarkStudy({ workspaceId, benchmarkAccountId: benchmarkId, userId: ownerId, sampleIds: snapshotIds.slice(0, 6) });
    expect(first).toMatchObject({ version: 1, sampleCount: 6, insufficientSamples: false, status: "PROCESSING" });
    expect(first.samples).toHaveLength(6);
    await expect(createBenchmarkStudy({ workspaceId, benchmarkAccountId: benchmarkId, userId: ownerId, sampleIds: snapshotIds.slice(0, 5) })).rejects.toMatchObject({ code: "BENCHMARK_STUDY_IN_PROGRESS" });

    await db.benchmarkStudy.update({ where: { id: first.id }, data: { status: "COMPLETED", output: studyOutput(first.samples.map(({ id }) => id)) } });
    const method = await createMethodFromBenchmarkStudy({ workspaceId, ownerUserId: ownerId, benchmarkStudyId: first.id, methodIndex: 0 });
    expect(method).toMatchObject({ status: "SAVED", current: { source: { sourceItemId: null, benchmarkStudyId: first.id, benchmarkAccountName: "对标账号", sampleCount: 6 } } });
    const storedVersion = await db.methodVersion.findUniqueOrThrow({ where: { id: method.current.id } });
    expect(storedVersion).toMatchObject({ sourceBenchmarkStudyId: first.id, sourceItemId: null, sourceMaterialAnalysisId: null, sourceTranscriptId: null });
    await expect(getMethod({ workspaceId, ownerUserId: colleagueId, methodId: method.id })).resolves.toBeNull();

    const second = await createBenchmarkStudy({ workspaceId, benchmarkAccountId: benchmarkId, userId: ownerId, sampleIds: snapshotIds.slice(0, 5) });
    await db.benchmarkStudy.update({ where: { id: second.id }, data: { status: "FAILED", errorCode: "FIXTURE_FAILURE", errorMessage: "这次研究没有完成。" } });
    const history = await listBenchmarkStudies({ workspaceId, benchmarkAccountId: benchmarkId });
    expect(history.map(({ status }) => status)).toEqual(["FAILED", "COMPLETED"]);
    expect(history.map(({ version }) => version)).toEqual([2, 1]);
    expect(enqueueBenchmarkStudy).toHaveBeenCalledTimes(2);
  });

  it("rejects another account's sample and Viewer writes", async () => {
    await expect(createBenchmarkStudy({ workspaceId, benchmarkAccountId: benchmarkId, userId: ownerId, sampleIds: [snapshotIds[6]!] })).rejects.toMatchObject({ code: "BENCHMARK_INVALID_SAMPLES" });
    await db.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId: ownerId } }, data: { role: "VIEWER" } });
    await expect(createBenchmarkStudy({ workspaceId, benchmarkAccountId: benchmarkId, userId: ownerId, sampleIds: [snapshotIds[0]!] })).rejects.toMatchObject({ code: "BENCHMARK_FORBIDDEN" });
    await db.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId: ownerId } }, data: { role: "OWNER" } });
  });
});
