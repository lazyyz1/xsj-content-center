import { db, type Prisma } from "@content-center/db";
import {
  LLMError,
  benchmarkAnalysisOutputSchema,
  benchmarkCreatorProfileGenerationSchema,
  benchmarkCreatorProfileInputSchema,
  benchmarkCreatorProfileOutputInstruction,
  benchmarkCreatorProfileOutputSchema,
  benchmarkCreatorProfileSectionCandidateSchema,
  benchmarkCreatorProfileSystemBoundary,
  buildTranscriptSourceIndex,
  generationQualityContract,
  materialDistillationGenerationSchema,
  type BenchmarkCreatorProfileGeneration,
  type BenchmarkCreatorProfileInput,
  type BenchmarkCreatorProfileOutput,
  type BenchmarkCreatorProfileSectionCandidate,
  type MaterialDistillationOutput,
  type TranscriptSourceIndex,
} from "@content-center/providers";
import { UnrecoverableError, type Job } from "bullmq";
import { loadBenchmarkRuntime, type BenchmarkRuntime } from "./benchmark-analysis";
import type { BenchmarkStudyPayload } from "./queue";

export type CreatorProfileAtom = {
  ref: string;
  sampleId: string;
  sourceItemId: string;
  materialDistillationId: string;
  materialDistillationVersion: number;
  itemKind: "HIGHLIGHT" | "COPYWRITING";
  itemKey: string;
  title: string;
  text: string;
  type?: string;
  quality?: string;
  sourceRefs: string[];
  evidence: Array<{ ref: string; text: string }>;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function unique(items: string[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function evidenceForRefs(refs: string[], sourceIndex: TranscriptSourceIndex) {
  const selected = new Set(refs);
  let usedChars = 0;
  return sourceIndex.refs.flatMap(({ ref, text }) => {
    if (!selected.has(ref) || usedChars >= 1_500) return [];
    const clipped = text.slice(0, 600);
    usedChars += clipped.length;
    return [{ ref, text: clipped }];
  });
}

function copywritingAtoms(output: MaterialDistillationOutput, sourceIndex: TranscriptSourceIndex, base: Omit<CreatorProfileAtom, "ref" | "itemKind" | "itemKey" | "title" | "text" | "sourceRefs" | "evidence" | "type" | "quality">): CreatorProfileAtom[] {
  if (!output.copywriting) return [];
  const refs = unique(output.copywriting.evidence.flatMap(({ sourceRef }) => sourceRef ? [sourceRef] : []));
  const evidence = evidenceForRefs(refs, sourceIndex);
  if (!evidence.length) return [];
  const fields: Array<[string, string | string[]]> = [
    ["CORE", output.copywriting.coreProposition],
    ["ANGLE", output.copywriting.angle],
    ["OPENING", output.copywriting.openingLogic],
    ["FLOW", output.copywriting.progression],
    ["SKELETON", output.copywriting.skeleton],
    ["EVIDENCE", output.copywriting.evidenceFunction],
    ["REUSE", output.copywriting.reusableStrategies],
    ["AVOID", output.copywriting.doNotCopy],
  ];
  return fields.flatMap(([key, value]) => {
    const text = (Array.isArray(value) ? value.join("；") : value).trim();
    return text ? [{ ...base, ref: "", itemKind: "COPYWRITING" as const, itemKey: key, title: key, text, sourceRefs: evidence.map(({ ref }) => ref), evidence }] : [];
  });
}

export function buildCreatorProfileAtoms(samples: Array<{ sampleId: string; sourceItemId: string; materialDistillationId: string; materialDistillationVersion: number; output: MaterialDistillationOutput; sourceIndex: TranscriptSourceIndex }>): CreatorProfileAtom[] {
  const atoms = samples.flatMap((sample) => {
    const base = { sampleId: sample.sampleId, sourceItemId: sample.sourceItemId, materialDistillationId: sample.materialDistillationId, materialDistillationVersion: sample.materialDistillationVersion };
    const highlights = sample.output.highlights.flatMap((highlight, index): CreatorProfileAtom[] => {
      const refs = unique(highlight.evidence.flatMap(({ sourceRef }) => sourceRef ? [sourceRef] : []));
      const evidence = evidenceForRefs(refs, sample.sourceIndex);
      return evidence.length ? [{ ...base, ref: "", itemKind: "HIGHLIGHT", itemKey: String(index), title: highlight.title, text: highlight.essence, type: highlight.type, quality: highlight.quality, sourceRefs: evidence.map(({ ref }) => ref), evidence }] : [];
    });
    return [...highlights, ...copywritingAtoms(sample.output, sample.sourceIndex, base)];
  });
  return atoms.map((atom, index) => ({ ...atom, ref: `E${String(index + 1).padStart(3, "0")}` }));
}

const genericTexts = new Set(["内容专业", "选题精准", "善于建立信任", "输出价值", "具有用户思维", "注重互动"]);
const normalizedText = (value: string) => value.toLowerCase().replace(/[\s，。；、,:：.!！?？"'“”‘’（）()\-_=→>]+/gu, "");
const causalClaim = /(为什么火|爆款原因|爆火.{0,6}原因|流量密码|导致.{0,12}(高播放|爆|火)|必然.{0,12}(转化|成交|播放)|有效提高.{0,12}(转化|成交)|因此.{0,12}(爆|火|转化|成交))/u;
const ownFactClaim = /(我们|我方|我们的)(客户|收入|成绩|学校|项目|经历|案例|成交)/u;
const observationalLanguage = /(当前样本|从当前样本|可能|有助于|值得继续验证|目前观察)/u;

function valueType(value: unknown) {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

function valueAtPath(value: unknown, path: PropertyKey[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

function sectionPassesLanguageGate(section: BenchmarkCreatorProfileSectionCandidate) {
  if (genericTexts.has(normalizedText(section.text))) return false;
  if (causalClaim.test(section.text)) return false;
  if (section.code !== "AVOID" && ownFactClaim.test(section.text)) return false;
  if (section.code === "ATTENTION_TRUST" && !observationalLanguage.test(section.text)) return false;
  return true;
}

export function normalizeBenchmarkCreatorProfileResult(input: BenchmarkCreatorProfileGeneration, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInput) {
  const atomMap = new Map(atoms.map((atom) => [atom.ref, atom]));
  const sections: BenchmarkCreatorProfileOutput["sections"] = [];
  const seenCodes = new Set<string>();
  const validationIssues: Array<{ path: string; code: string; expected?: string; receivedType: string }> = [];
  input.sections.forEach((candidate, index) => {
    const parsed = benchmarkCreatorProfileSectionCandidateSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const detail = issue as unknown as { code: string; path: PropertyKey[]; expected?: unknown };
        validationIssues.push({ path: ["sections", index, ...detail.path].join("."), code: detail.code, ...(typeof detail.expected === "string" ? { expected: detail.expected } : {}), receivedType: valueType(valueAtPath(candidate, detail.path)) });
      }
      return;
    }
    const section = parsed.data;
    if (seenCodes.has(section.code) || !sectionPassesLanguageGate(section)) return;
    const evidenceRefs = unique(section.evidenceRefs).filter((ref) => atomMap.has(ref));
    const sectionAtoms = evidenceRefs.map((ref) => atomMap.get(ref)!).filter(Boolean);
    const sourceCount = new Set(sectionAtoms.map(({ sourceItemId }) => sourceItemId)).size;
    const minimumSources = section.code === "POSITIONING" || section.code === "AUDIENCE" ? 1 : 2;
    if (sourceCount < minimumSources) return;
    if (section.code === "METHOD_TENDENCY") {
      const hasExpression = sectionAtoms.some((atom) => atom.itemKind === "COPYWRITING" || atom.type === "copy_structure");
      const hasMethod = sectionAtoms.some((atom) => atom.itemKind === "HIGHLIGHT" && ["method", "principle", "process", "framework", "decision_rule"].includes(atom.type ?? ""));
      if (!hasExpression || !hasMethod) return;
    }
    seenCodes.add(section.code);
    sections.push({
      code: section.code,
      text: section.text,
      evidenceRefs,
      evidence: sectionAtoms.map((atom) => ({ evidenceRef: atom.ref, sampleId: atom.sampleId, sourceItemId: atom.sourceItemId, materialDistillationId: atom.materialDistillationId, materialDistillationVersion: atom.materialDistillationVersion, itemKind: atom.itemKind, itemKey: atom.itemKey, sourceRefs: atom.sourceRefs })),
    });
  });
  if (input.sections.length > 0 && sections.length === 0) {
    throw new LLMError("LLM_INVALID_RESPONSE", "AI 模型返回的账号画像候选全部不可用。", false, { rawCandidateCount: input.sections.length, validCandidateCount: 0, droppedCandidateCount: input.sections.length, validationIssues });
  }
  const output = benchmarkCreatorProfileOutputSchema.parse({
    kind: "CREATOR_PROFILE",
    schemaVersion: "benchmark-creator-profile-v1",
    message: sections.length ? `已根据 ${manifest.distillations.length} 条代表内容形成 ${sections.length} 项账号画像观察。` : "当前样本暂时没有形成可靠的账号画像结论。",
    account: manifest.account,
    inputs: manifest.distillations,
    accountResearch: manifest.accountResearch,
    sections,
  });
  return { output, diagnostics: { rawSectionCount: input.sections.length, validSectionCount: sections.length, droppedSectionCount: input.sections.length - sections.length } };
}

export function normalizeBenchmarkCreatorProfileOutput(input: BenchmarkCreatorProfileGeneration, atoms: CreatorProfileAtom[], manifest: BenchmarkCreatorProfileInput): BenchmarkCreatorProfileOutput {
  return normalizeBenchmarkCreatorProfileResult(input, atoms, manifest).output;
}

function profileFailure(error: unknown) {
  if (error instanceof LLMError) return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    providerRequestId: error.details.providerRequestId,
    actualModel: error.details.actualModel,
    finishReason: error.details.finishReason,
    validationIssues: error.details.validationIssues,
    returnedRootKeys: error.details.returnedRootKeys,
    returnedFirstLevelObjectKeys: error.details.returnedFirstLevelObjectKeys,
    rawCandidateCount: error.details.rawCandidateCount,
    validCandidateCount: error.details.validCandidateCount,
    droppedCandidateCount: error.details.droppedCandidateCount,
  };
  return { code: "BENCHMARK_CREATOR_PROFILE_FAILED", message: "这次账号画像没有完成，请重试。", retryable: false };
}

type CreatorProfileJobDependencies = { runtime?: BenchmarkRuntime };

export async function processBenchmarkCreatorProfileJob(job: Job<BenchmarkStudyPayload>, dependencies: CreatorProfileJobDependencies = {}) {
  const startedAt = new Date();
  const record = await db.benchmarkStudy.findFirst({
    where: { id: job.data.studyId, workspaceId: job.data.workspaceId, createdById: job.data.requestedById },
    include: { benchmarkAccount: { select: { id: true, workspaceId: true } }, samples: { orderBy: { createdAt: "asc" }, include: { sourceItem: { select: { id: true, title: true, transcript: { select: { id: true, updatedAt: true, fullText: true, segments: true } } } } } } },
  });
  if (!record || record.benchmarkAccount.workspaceId !== record.workspaceId) throw new UnrecoverableError("Benchmark creator profile scope mismatch");
  if (record.status === "COMPLETED") return { status: "already-completed" as const, studyId: record.id };
  const manifest = benchmarkCreatorProfileInputSchema.safeParse(record.output);
  if (!manifest.success) throw new UnrecoverableError("Benchmark creator profile input is missing");
  const distillations = await db.materialDistillation.findMany({ where: { workspaceId: record.workspaceId, id: { in: manifest.data.distillations.map(({ materialDistillationId }) => materialDistillationId) }, status: "COMPLETED" } });
  const rows = manifest.data.distillations.flatMap((locked) => {
    const distillation = distillations.find((item) => item.id === locked.materialDistillationId && item.sourceItemId === locked.sourceItemId && item.version === locked.materialDistillationVersion);
    const sample = record.samples.find((item) => item.id === locked.sampleId && item.sourceItemId === locked.sourceItemId);
    const output = distillation ? materialDistillationGenerationSchema.safeParse(distillation.output) : null;
    const transcript = sample?.sourceItem.transcript;
    return sample && distillation && output?.success && transcript && distillation.transcriptUpdatedAtAtDistillation.getTime() === transcript.updatedAt.getTime()
      ? [{ ...locked, title: sample.sourceItem.title || "未命名内容", output: output.data, sourceIndex: buildTranscriptSourceIndex({ id: transcript.id, updatedAt: transcript.updatedAt, fullText: transcript.fullText, segments: transcript.segments }) }]
      : [];
  });
  if (rows.length !== manifest.data.distillations.length) throw new UnrecoverableError("Locked M7 evidence is unavailable");
  const atoms = buildCreatorProfileAtoms(rows);
  if (!atoms.length) throw new UnrecoverableError("Creator profile evidence atoms are unavailable");
  const accountResearch = manifest.data.accountResearch ? await db.benchmarkStudy.findFirst({ where: { id: manifest.data.accountResearch.studyId, workspaceId: record.workspaceId, benchmarkAccountId: record.benchmarkAccountId, version: manifest.data.accountResearch.version, status: "COMPLETED" }, select: { output: true } }) : null;
  const parsedResearch = accountResearch ? benchmarkAnalysisOutputSchema.safeParse(accountResearch.output) : null;
  const context = {
    action: "GENERATE_BENCHMARK_CREATOR_PROFILE",
    account: manifest.data.account,
    videos: rows.map((row) => ({ sampleId: row.sampleId, title: row.title, materialDistillation: { id: row.materialDistillationId, version: row.materialDistillationVersion, items: atoms.filter(({ sampleId }) => sampleId === row.sampleId).map(({ ref, itemKind, itemKey, title, text, type, quality, sourceRefs, evidence }) => ({ ref, itemKind, itemKey, title, text, sourceRefs, evidence, ...(type ? { type } : {}), ...(quality ? { quality } : {}) })) } })),
    accountResearch: parsedResearch?.success ? parsedResearch.data : null,
    cautions: [benchmarkCreatorProfileSystemBoundary, "M7 items are candidate observations. Account-level sections still require independent cross-video support."],
  };
  const prompt = `Action: GENERATE_BENCHMARK_CREATOR_PROFILE\nContext:\n${JSON.stringify(context, null, 2)}\n${benchmarkCreatorProfileOutputInstruction}`;
  const contextTruncated = JSON.stringify(context).length > 200_000;
  const summary = { benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, materialDistillationIds: rows.map(({ materialDistillationId }) => materialDistillationId), accountResearchStudyId: manifest.data.accountResearch?.studyId ?? null, schemaVersion: "benchmark-creator-profile-v1" };
  let runId: string | undefined;
  let runProvider: string | undefined;
  let requestedModel: string | undefined;
  let runMode: string | undefined;
  try {
    const runtime = dependencies.runtime ?? await loadBenchmarkRuntime(record.workspaceId);
    runProvider = runtime.providerName;
    requestedModel = runtime.requestedModel ?? runtime.model;
    runMode = runtime.mode ?? "REAL";
    const runtimeAudit = { provider: runtime.providerName, requestedModel, providerMode: runMode };
    const run = await db.$transaction(async (tx) => {
      const created = await tx.aIRun.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "ANALYZE_BENCHMARK", provider: runtime.providerName, model: runtime.model, promptVersion: 1, status: "RUNNING", inputSummary: json(summary), metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion: "benchmark-creator-profile-v1", structuredOutput: "JSON_OBJECT", ...runtimeAudit }), contextTruncated } });
      await tx.benchmarkStudy.update({ where: { id: record.id }, data: { aiRunId: created.id, errorCode: null, errorMessage: null } });
      await tx.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.started", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ aiRunId: created.id, sampleCount: rows.length }) } });
      return created;
    });
    runId = run.id;
    const result = await runtime.provider.generateStructured({ systemPrompt: `${benchmarkCreatorProfileSystemBoundary}\n\n${generationQualityContract}`, prompt, maxCompletionTokens: 3_500, structuredOutput: { strategy: "JSON_OBJECT" } }, benchmarkCreatorProfileGenerationSchema);
    const normalized = normalizeBenchmarkCreatorProfileResult(result.data.value, atoms, manifest.data);
    const output = normalized.output;
    const candidateDiagnostics = normalized.diagnostics;
    const latencyMs = Date.now() - startedAt.getTime();
    await db.$transaction([
      db.aIRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", outputJson: json(output), metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion: "benchmark-creator-profile-v1", structuredOutput: "JSON_OBJECT", ...candidateDiagnostics, ...runtimeAudit, actualModel: result.data.model, finishReason: result.data.finishReason ?? null }), providerRequestId: result.data.providerRequestId, inputTokens: result.data.usage?.inputTokens, outputTokens: result.data.usage?.outputTokens, finishedAt: new Date() } }),
      db.benchmarkStudy.update({ where: { id: record.id }, data: { status: "COMPLETED", output: json(output), errorCode: null, errorMessage: null } }),
      db.apiUsage.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, provider: runtime.providerName, operation: "GENERATE_BENCHMARK_CREATOR_PROFILE", requestId: run.id, providerRequestId: result.data.providerRequestId, success: true, units: 1, cost: null, inputTokens: result.data.usage?.inputTokens, outputTokens: result.data.usage?.outputTokens, metadata: json({ airRunId: run.id, benchmarkStudyId: record.id, sampleCount: rows.length, promptVersion: 1, latencyMs, ...candidateDiagnostics, ...runtimeAudit, actualModel: result.data.model, finishReason: result.data.finishReason ?? null }) } }),
      db.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.succeeded", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ sampleCount: rows.length, sectionCount: output.sections.length, ...candidateDiagnostics }) } }),
    ]);
    return { status: "ok" as const, studyId: record.id, sampleCount: rows.length };
  } catch (error) {
    const failed = profileFailure(error);
    const diagnostics = { structuredOutput: "JSON_OBJECT", requestedModel: requestedModel ?? null, actualModel: failed.actualModel ?? null, finishReason: failed.finishReason ?? null, validationIssues: failed.validationIssues ?? [], returnedRootKeys: failed.returnedRootKeys ?? [], returnedFirstLevelObjectKeys: failed.returnedFirstLevelObjectKeys ?? {}, rawCandidateCount: failed.rawCandidateCount ?? null, validCandidateCount: failed.validCandidateCount ?? null, droppedCandidateCount: failed.droppedCandidateCount ?? null };
    if (runId) {
      await db.aIRun.update({ where: { id: runId }, data: { status: "FAILED", errorCode: failed.code, errorMessage: "账号画像未完成。", providerRequestId: failed.providerRequestId, metadata: json({ benchmarkAction: "GENERATE_CREATOR_PROFILE", benchmarkStudyId: record.id, benchmarkAccountId: record.benchmarkAccountId, sampleCount: rows.length, schemaVersion: "benchmark-creator-profile-v1", provider: runProvider ?? "LLM", providerMode: runMode ?? "REAL", ...diagnostics }), finishedAt: new Date() } }).catch(() => undefined);
      await db.apiUsage.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, provider: runProvider ?? "LLM", operation: "GENERATE_BENCHMARK_CREATOR_PROFILE", requestId: runId, providerRequestId: failed.providerRequestId, success: false, units: 1, cost: null, metadata: json({ airRunId: runId, benchmarkStudyId: record.id, errorCode: failed.code, ...diagnostics }) } }).catch(() => undefined);
    }
    const attempt = job.attemptsMade + 1;
    const willRetry = failed.retryable && attempt < 3;
    await db.benchmarkStudy.update({ where: { id: record.id }, data: { status: willRetry ? "PROCESSING" : "FAILED", errorCode: failed.code, errorMessage: willRetry ? null : failed.message } }).catch(() => undefined);
    await db.auditLog.create({ data: { workspaceId: record.workspaceId, userId: record.createdById, action: "benchmark_creator_profile.failed", resourceType: "benchmark_study", resourceId: record.id, metadata: json({ sampleCount: rows.length, attempt, retrying: willRetry, errorCode: failed.code, ...diagnostics }) } }).catch(() => undefined);
    if (!failed.retryable) throw new UnrecoverableError(`${failed.code}: ${failed.message}`);
    throw error;
  }
}
