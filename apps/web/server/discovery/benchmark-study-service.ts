import "server-only";

import { db, type Prisma } from "@content-center/db";
import {
  benchmarkAnalysisOutputSchema,
  materialAnalysisOutputSchema,
  type BenchmarkAnalysisOutput,
} from "@content-center/providers";
import { enqueueBenchmarkStudy } from "@content-center/worker/queue";
import { z } from "zod";

const sampleId = z.string().trim().min(1).max(200);
export const createBenchmarkStudySchema = z.object({
  sampleIds: z.array(sampleId).min(1).max(10),
}).strict().superRefine((value, context) => {
  if (new Set(value.sampleIds).size !== value.sampleIds.length) context.addIssue({ code: "custom", path: ["sampleIds"], message: "代表内容不能重复。" });
});

export class BenchmarkStudyError extends Error {
  constructor(readonly code: "BENCHMARK_NOT_FOUND" | "BENCHMARK_STUDY_NOT_FOUND" | "BENCHMARK_INVALID_SAMPLES" | "BENCHMARK_SAMPLE_NOT_READY" | "BENCHMARK_STUDY_IN_PROGRESS" | "BENCHMARK_QUEUE_UNAVAILABLE" | "BENCHMARK_FORBIDDEN", message: string) {
    super(message);
    this.name = "BenchmarkStudyError";
  }
}

export type BenchmarkCandidateDTO = {
  id: string;
  externalId: string;
  title: string;
  url: string;
  coverUrl: string | null;
  publishedAt: string | null;
  observedAt: string;
  sourceItemId: string | null;
  materialAnalysisId: string | null;
  materialAnalysisVersion: number | null;
  ready: boolean;
};

type BenchmarkStudySampleDTO = {
  id: string;
  sourceItemId: string;
  title: string;
  materialAnalysisId: string;
  materialAnalysisVersion: number;
};

export type BenchmarkStudyDTO = {
  id: string;
  benchmarkAccountId: string;
  benchmarkAccountName: string;
  version: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  sampleCount: number;
  insufficientSamples: boolean;
  output: BenchmarkAnalysisOutput | null;
  aiRunId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  samples: BenchmarkStudySampleDTO[];
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toOutput(value: Prisma.JsonValue | null): BenchmarkAnalysisOutput | null {
  const parsed = benchmarkAnalysisOutputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function key(platform: string, externalId: string) {
  return `${platform}:${externalId}`;
}

async function account(workspaceId: string, benchmarkAccountId: string) {
  const row = await db.benchmarkAccount.findFirst({ where: { id: benchmarkAccountId, workspaceId, enabled: true }, select: { id: true, name: true, platform: true } });
  if (!row) throw new BenchmarkStudyError("BENCHMARK_NOT_FOUND", "对标账号不存在。");
  return row;
}

async function assertStudyWriter(workspaceId: string, userId: string) {
  const member = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { role: true } });
  if (!member || member.role === "VIEWER") throw new BenchmarkStudyError("BENCHMARK_FORBIDDEN", "当前权限不能发起账号研究。");
}

export async function listBenchmarkCandidates(input: { workspaceId: string; benchmarkAccountId: string }) {
  const benchmark = await account(input.workspaceId, input.benchmarkAccountId);
  const snapshots = await db.benchmarkContentSnapshot.findMany({
    where: { workspaceId: input.workspaceId, benchmarkAccountId: benchmark.id },
    orderBy: [{ observedAt: "desc" }, { publishedAt: "desc" }],
    take: 100,
  });
  if (!snapshots.length) return [];
  const sources = await db.sourceItem.findMany({
    where: { workspaceId: input.workspaceId, OR: snapshots.map((item) => ({ sourcePlatform: item.platform, externalId: item.externalId })) },
    select: {
      id: true,
      sourcePlatform: true,
      externalId: true,
      materialAnalyses: { where: { status: "COMPLETED" }, orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, understanding: true } },
    },
  });
  const sourceMap = new Map(sources.map((source) => [key(source.sourcePlatform, source.externalId ?? ""), source]));
  return snapshots.map((snapshot): BenchmarkCandidateDTO => {
    const source = sourceMap.get(key(snapshot.platform, snapshot.externalId));
    const analysis = source?.materialAnalyses[0];
    const parsedAnalysis = analysis ? materialAnalysisOutputSchema.safeParse(analysis.understanding) : null;
    const ready = Boolean(parsedAnalysis?.success && "expression" in parsedAnalysis.data);
    return {
      id: snapshot.id,
      externalId: snapshot.externalId,
      title: snapshot.title,
      url: snapshot.url,
      coverUrl: snapshot.coverUrl,
      publishedAt: snapshot.publishedAt?.toISOString() ?? null,
      observedAt: snapshot.observedAt.toISOString(),
      sourceItemId: source?.id ?? null,
      materialAnalysisId: ready ? analysis?.id ?? null : null,
      materialAnalysisVersion: ready ? analysis?.version ?? null : null,
      ready,
    };
  });
}

const sampleInclude = {
  sourceItem: { select: { id: true, title: true } },
  materialAnalysis: { select: { id: true, version: true } },
} as const;

type StudyRow = Prisma.BenchmarkStudyGetPayload<{ include: { benchmarkAccount: { select: { id: true; name: true } }; samples: { include: typeof sampleInclude } } }>;

function toDTO(row: StudyRow): BenchmarkStudyDTO {
  return {
    id: row.id,
    benchmarkAccountId: row.benchmarkAccountId,
    benchmarkAccountName: row.benchmarkAccount.name,
    version: row.version,
    status: row.status,
    sampleCount: row.sampleCount,
    insufficientSamples: row.insufficientSamples,
    output: toOutput(row.output),
    aiRunId: row.aiRunId,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    samples: row.samples.map((sample) => ({ id: sample.id, sourceItemId: sample.sourceItemId, title: sample.sourceItem.title || "未命名内容", materialAnalysisId: sample.materialAnalysis.id, materialAnalysisVersion: sample.materialAnalysis.version })),
  };
}

async function rows(input: { workspaceId: string; benchmarkAccountId: string; take?: number }) {
  await account(input.workspaceId, input.benchmarkAccountId);
  return db.benchmarkStudy.findMany({
    where: { workspaceId: input.workspaceId, benchmarkAccountId: input.benchmarkAccountId },
    orderBy: { version: "desc" },
    take: input.take ?? 20,
    include: { benchmarkAccount: { select: { id: true, name: true } }, samples: { orderBy: { createdAt: "asc" }, include: sampleInclude } },
  });
}

export async function listBenchmarkStudies(input: { workspaceId: string; benchmarkAccountId: string }) {
  return (await rows(input)).map(toDTO);
}

export async function getBenchmarkStudy(input: { workspaceId: string; benchmarkAccountId: string; studyId: string }) {
  const result = await db.benchmarkStudy.findFirst({
    where: { id: input.studyId, workspaceId: input.workspaceId, benchmarkAccountId: input.benchmarkAccountId },
    include: { benchmarkAccount: { select: { id: true, name: true } }, samples: { orderBy: { createdAt: "asc" }, include: sampleInclude } },
  });
  if (!result) throw new BenchmarkStudyError("BENCHMARK_STUDY_NOT_FOUND", "这次账号研究不存在。");
  return toDTO(result);
}

export async function createBenchmarkStudy(input: { workspaceId: string; benchmarkAccountId: string; userId: string; sampleIds: string[] }) {
  await assertStudyWriter(input.workspaceId, input.userId);
  const parsed = createBenchmarkStudySchema.safeParse({ sampleIds: input.sampleIds });
  if (!parsed.success) throw new BenchmarkStudyError("BENCHMARK_INVALID_SAMPLES", "请选择 1–10 条不重复的代表内容。");
  const benchmark = await account(input.workspaceId, input.benchmarkAccountId);
  let created: { id: string; maxAttempts: number };
  try {
    created = await db.$transaction(async (tx) => {
      const processing = await tx.benchmarkStudy.findFirst({ where: { workspaceId: input.workspaceId, benchmarkAccountId: benchmark.id, status: "PROCESSING" }, select: { id: true } });
      if (processing) throw new BenchmarkStudyError("BENCHMARK_STUDY_IN_PROGRESS", "这个账号已有一项研究正在进行，请稍候。 ");
      const snapshots = await tx.benchmarkContentSnapshot.findMany({ where: { id: { in: parsed.data.sampleIds }, workspaceId: input.workspaceId, benchmarkAccountId: benchmark.id }, select: { id: true, platform: true, externalId: true } });
      if (snapshots.length !== parsed.data.sampleIds.length) throw new BenchmarkStudyError("BENCHMARK_INVALID_SAMPLES", "代表内容已变化，请刷新后重新选择。");
      const sourceItems = await tx.sourceItem.findMany({ where: { workspaceId: input.workspaceId, OR: snapshots.map((snapshot) => ({ sourcePlatform: snapshot.platform, externalId: snapshot.externalId })) }, select: { id: true, sourcePlatform: true, externalId: true } });
      const sourceMap = new Map(sourceItems.map((source) => [key(source.sourcePlatform, source.externalId ?? ""), source]));
      const candidates = snapshots.map((snapshot) => ({ snapshot, source: sourceMap.get(key(snapshot.platform, snapshot.externalId)) })).filter((item): item is { snapshot: typeof snapshots[number]; source: typeof sourceItems[number] } => Boolean(item.source));
      if (candidates.length !== snapshots.length) throw new BenchmarkStudyError("BENCHMARK_SAMPLE_NOT_READY", "有代表内容还没有收录，请先收录后再研究。");
      const analyses = await tx.materialAnalysis.findMany({ where: { workspaceId: input.workspaceId, sourceItemId: { in: candidates.map((item) => item.source.id) }, status: "COMPLETED" }, orderBy: { version: "desc" }, select: { id: true, sourceItemId: true, version: true, understanding: true } });
      const latest = new Map<string, typeof analyses[number]>();
      for (const analysis of analyses) if (!latest.has(analysis.sourceItemId)) latest.set(analysis.sourceItemId, analysis);
      if (candidates.some((item) => {
        const analysis = latest.get(item.source.id);
        const parsed = analysis ? materialAnalysisOutputSchema.safeParse(analysis.understanding) : null;
        return !parsed?.success || !("expression" in parsed.data);
      })) throw new BenchmarkStudyError("BENCHMARK_SAMPLE_NOT_READY", "有代表内容还没有完成整理，请先去内容库处理后再试。");
      const previous = await tx.benchmarkStudy.findFirst({ where: { benchmarkAccountId: benchmark.id }, orderBy: { version: "desc" }, select: { version: true } });
      const study = await tx.benchmarkStudy.create({ data: { workspaceId: input.workspaceId, benchmarkAccountId: benchmark.id, createdById: input.userId, version: (previous?.version ?? 0) + 1, status: "PROCESSING", sampleCount: candidates.length, insufficientSamples: candidates.length < 5, samples: { create: candidates.map((item) => ({ sourceItemId: item.source.id, materialAnalysisId: latest.get(item.source.id)!.id, snapshotId: item.snapshot.id })) } } });
      await tx.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.userId, action: "benchmark_study.created", resourceType: "benchmark_study", resourceId: study.id, metadata: json({ benchmarkAccountId: benchmark.id, sampleCount: candidates.length, insufficientSamples: candidates.length < 5 }) } });
      return { id: study.id, maxAttempts: 3 };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof BenchmarkStudyError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002" || code === "P2034") throw new BenchmarkStudyError("BENCHMARK_STUDY_IN_PROGRESS", "这个账号已有一项研究正在进行，请稍候。");
    throw error;
  }
  try {
    await enqueueBenchmarkStudy({ studyId: created.id, workspaceId: input.workspaceId, requestedById: input.userId }, created.maxAttempts);
  } catch {
    await db.benchmarkStudy.update({ where: { id: created.id }, data: { status: "FAILED", errorCode: "BENCHMARK_QUEUE_UNAVAILABLE", errorMessage: "账号研究暂时无法开始。" } });
    throw new BenchmarkStudyError("BENCHMARK_QUEUE_UNAVAILABLE", "账号研究暂时无法开始。");
  }
  return getBenchmarkStudy({ workspaceId: input.workspaceId, benchmarkAccountId: input.benchmarkAccountId, studyId: created.id });
}
