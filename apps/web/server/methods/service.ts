import "server-only";

import { db, type Prisma } from "@content-center/db";
import { materialAnalysisOutputSchema, type CurrentMaterialAnalysisOutput } from "../material-analysis/schemas";
import { z } from "zod";

const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const methodContentSchema = z.object({
  title: requiredText(200),
  steps: z.array(requiredText(500)).min(1).max(8),
  applicableScenarios: z.array(requiredText(300)).min(1).max(8),
  boundaries: z.array(requiredText(300)).min(1).max(8),
}).strict();

export const createMethodSchema = methodContentSchema.extend({
  materialAnalysisId: z.string().trim().min(1).max(200),
  methodIndex: z.number().int().min(0).max(20),
}).strict();

export const updateMethodSchema = methodContentSchema.extend({ expectedVersion: z.number().int().min(1) }).strict();
export const methodStatusSchema = z.enum(["SAVED", "TRIAL", "CORE", "DISABLED"]);

export class MethodError extends Error {
  constructor(readonly code: "METHOD_INVALID" | "METHOD_NOT_FOUND" | "METHOD_VERSION_CONFLICT" | "METHOD_STATUS_INVALID", message: string) {
    super(message);
    this.name = "MethodError";
  }
}

type MethodEvidenceDTO = { quote: string; segmentIndex?: number; startMs?: number; endMs?: number };

export type MethodVersionDTO = {
  id: string;
  version: number;
  title: string;
  steps: string[];
  applicableScenarios: string[];
  boundaries: string[];
  evidence: MethodEvidenceDTO[];
  source: {
    sourceItemId: string;
    title: string;
    platform: string;
    materialAnalysisId: string;
    transcriptId: string;
    transcriptUpdatedAt: string;
    stale: boolean;
  };
  editedBy: string;
  createdAt: string;
};

export type MethodDTO = {
  id: string;
  status: "SAVED" | "TRIAL" | "CORE" | "DISABLED";
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  current: MethodVersionDTO;
  history: MethodVersionDTO[];
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function strings(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function evidence(value: Prisma.JsonValue): MethodEvidenceDTO[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.quote !== "string" || !candidate.quote.trim()) return [];
    return [{
      quote: candidate.quote,
      ...(typeof candidate.segmentIndex === "number" ? { segmentIndex: candidate.segmentIndex } : {}),
      ...(typeof candidate.startMs === "number" ? { startMs: candidate.startMs } : {}),
      ...(typeof candidate.endMs === "number" ? { endMs: candidate.endMs } : {}),
    }];
  });
}

function evidenceMatchesTranscript(item: { quote: string; segmentIndex?: number }, transcript: { fullText: string; segments: Prisma.JsonValue }) {
  if (transcript.fullText.includes(item.quote)) return true;
  if (item.segmentIndex === undefined || !Array.isArray(transcript.segments)) return false;
  const segment = transcript.segments[item.segmentIndex];
  if (!segment || typeof segment !== "object" || Array.isArray(segment)) return false;
  const text = (segment as Record<string, unknown>).text;
  return typeof text === "string" && (text === item.quote || text.startsWith(item.quote));
}

const methodVersionInclude = {
  sourceItem: { select: { id: true, title: true, sourcePlatform: true } },
  sourceMaterialAnalysis: { select: { id: true } },
  sourceTranscript: { select: { id: true, updatedAt: true } },
  editedBy: { select: { name: true } },
} as const;

type MethodAssetRow = Prisma.MethodAssetGetPayload<{ include: { versions: { include: typeof methodVersionInclude } } }>;
type MethodVersionRow = MethodAssetRow["versions"][number];

function toVersionDTO(row: MethodVersionRow): MethodVersionDTO {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    steps: strings(row.steps),
    applicableScenarios: strings(row.applicableScenarios),
    boundaries: strings(row.boundaries),
    evidence: evidence(row.evidence),
    source: {
      sourceItemId: row.sourceItem.id,
      title: row.sourceItem.title || "未命名素材",
      platform: row.sourceItem.sourcePlatform,
      materialAnalysisId: row.sourceMaterialAnalysis.id,
      transcriptId: row.sourceTranscript.id,
      transcriptUpdatedAt: row.sourceTranscriptUpdatedAt.toISOString(),
      stale: row.sourceTranscript.updatedAt > row.sourceTranscriptUpdatedAt,
    },
    editedBy: row.editedBy.name,
    createdAt: row.createdAt.toISOString(),
  };
}

function toMethodDTO(row: MethodAssetRow): MethodDTO {
  const versions = row.versions.map(toVersionDTO);
  const current = versions[0];
  if (!current) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
  return {
    id: row.id,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    current,
    history: versions,
  };
}

async function findMethodRow(input: { workspaceId: string; ownerUserId: string; methodId: string }) {
  return db.methodAsset.findFirst({
    where: { id: input.methodId, workspaceId: input.workspaceId, ownerUserId: input.ownerUserId },
    include: { versions: { orderBy: { version: "desc" }, include: methodVersionInclude } },
  });
}

async function assertMethodEditor(input: { workspaceId: string; userId: string }) {
  const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } }, select: { role: true } });
  if (!membership || membership.role === "VIEWER") throw new MethodError("METHOD_INVALID", "当前用户无法修改我的方法。");
}

export async function listMethods(input: { workspaceId: string; ownerUserId: string; status?: "SAVED" | "TRIAL" | "CORE" | "DISABLED" }) {
  const rows = await db.methodAsset.findMany({
    where: { workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, ...(input.status ? { status: input.status } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, include: methodVersionInclude } },
  });
  return rows.map(toMethodDTO);
}

export async function getMethod(input: { workspaceId: string; ownerUserId: string; methodId: string }) {
  const row = await findMethodRow(input);
  return row ? toMethodDTO(row) : null;
}

function currentUnderstanding(value: Prisma.JsonValue | null): CurrentMaterialAnalysisOutput {
  const parsed = materialAnalysisOutputSchema.safeParse(value);
  if (!parsed.success || !("methods" in parsed.data)) throw new MethodError("METHOD_INVALID", "这条内容暂时没有可保存的方法。");
  return parsed.data;
}

export async function createMethodFromAnalysis(input: {
  workspaceId: string;
  ownerUserId: string;
  materialAnalysisId: string;
  methodIndex: number;
  title: string;
  steps: string[];
  applicableScenarios: string[];
  boundaries: string[];
}) {
  await assertMethodEditor({ workspaceId: input.workspaceId, userId: input.ownerUserId });
  if (!Number.isInteger(input.methodIndex) || input.methodIndex < 0) throw new MethodError("METHOD_INVALID", "这条内容暂时没有可保存的方法。");
  const content = methodContentSchema.safeParse({ title: input.title, steps: input.steps, applicableScenarios: input.applicableScenarios, boundaries: input.boundaries });
  if (!content.success) throw new MethodError("METHOD_INVALID", "请检查方法名称、步骤和适用边界。");
  const analysis = await db.materialAnalysis.findFirst({
    where: { id: input.materialAnalysisId, workspaceId: input.workspaceId, status: "COMPLETED", sourceItem: { workspaceId: input.workspaceId } },
    include: { sourceItem: { select: { id: true, title: true, transcript: true } } },
  });
  if (!analysis) throw new MethodError("METHOD_INVALID", "这条内容暂时没有可保存的方法。");
  if (!analysis.sourceItem.transcript || analysis.sourceItem.transcript.workspaceId !== input.workspaceId) throw new MethodError("METHOD_INVALID", "来源文字稿已不可用，暂时不能保存方法。");
  const sourceTranscript = analysis.sourceItem.transcript;
  const understanding = currentUnderstanding(analysis.understanding);
  if (understanding.methods.evidenceStatus !== "SINGLE_SOURCE_DRAFT") throw new MethodError("METHOD_INVALID", "依据还不够，暂时不能保存为方法。");
  const draft = understanding.methods.items[input.methodIndex];
  const calibratedEvidence = draft?.evidence.filter((item) => typeof item.quote === "string" && item.quote.trim() && evidenceMatchesTranscript(item, sourceTranscript)) ?? [];
  if (!draft || calibratedEvidence.length === 0) throw new MethodError("METHOD_INVALID", "这条内容暂时没有可保存的方法。");

  const asset = await db.$transaction(async (tx) => {
    const created = await tx.methodAsset.create({ data: { workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, status: "SAVED", statusUpdatedAt: new Date() } });
    await tx.methodVersion.create({
      data: {
        assetId: created.id,
        version: 1,
        title: content.data.title,
        steps: json(content.data.steps),
        applicableScenarios: json(content.data.applicableScenarios),
        boundaries: json(content.data.boundaries),
        sourceItemId: analysis.sourceItem.id,
        sourceMaterialAnalysisId: analysis.id,
        sourceTranscriptId: sourceTranscript.id,
        sourceTranscriptUpdatedAt: analysis.transcriptUpdatedAtAtAnalysis,
        evidence: json(calibratedEvidence),
        editedById: input.ownerUserId,
      },
    });
    await tx.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.ownerUserId, action: "method.created", resourceType: "method_asset", resourceId: created.id, metadata: { sourceItemId: analysis.sourceItem.id, sourceMaterialAnalysisId: analysis.id, sourceTranscriptId: sourceTranscript.id } } });
    return created;
  });
  const result = await getMethod({ workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, methodId: asset.id });
  if (!result) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
  return result;
}

function versionConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error.code === "P2002" || error.code === "P2034"));
}

export async function updateMethodContent(input: {
  workspaceId: string;
  ownerUserId: string;
  methodId: string;
  expectedVersion: number;
  title: string;
  steps: string[];
  applicableScenarios: string[];
  boundaries: string[];
}) {
  await assertMethodEditor({ workspaceId: input.workspaceId, userId: input.ownerUserId });
  const content = methodContentSchema.safeParse({ title: input.title, steps: input.steps, applicableScenarios: input.applicableScenarios, boundaries: input.boundaries });
  if (!content.success) throw new MethodError("METHOD_INVALID", "请检查方法名称、步骤和适用边界。");
  try {
    await db.$transaction(async (tx) => {
      const asset = await tx.methodAsset.findFirst({ where: { id: input.methodId, workspaceId: input.workspaceId, ownerUserId: input.ownerUserId }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
      const current = asset?.versions[0];
      if (!asset || !current) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
      if (current.version !== input.expectedVersion) throw new MethodError("METHOD_VERSION_CONFLICT", "这个方法刚刚有新的修改，请刷新后再保存。");
      await tx.methodVersion.create({ data: { assetId: asset.id, version: current.version + 1, title: content.data.title, steps: json(content.data.steps), applicableScenarios: json(content.data.applicableScenarios), boundaries: json(content.data.boundaries), sourceItemId: current.sourceItemId, sourceMaterialAnalysisId: current.sourceMaterialAnalysisId, sourceTranscriptId: current.sourceTranscriptId, sourceTranscriptUpdatedAt: current.sourceTranscriptUpdatedAt, evidence: json(current.evidence ?? []), editedById: input.ownerUserId } });
      await tx.methodAsset.update({ where: { id: asset.id }, data: { updatedAt: new Date() } });
      await tx.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.ownerUserId, action: "method.version_created", resourceType: "method_asset", resourceId: asset.id, metadata: { version: current.version + 1 } } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof MethodError) throw error;
    if (versionConflict(error)) throw new MethodError("METHOD_VERSION_CONFLICT", "这个方法刚刚有新的修改，请刷新后再保存。");
    throw error;
  }
  const result = await getMethod({ workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, methodId: input.methodId });
  if (!result) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
  return result;
}

export async function updateMethodStatus(input: { workspaceId: string; ownerUserId: string; methodId: string; status: string }) {
  await assertMethodEditor({ workspaceId: input.workspaceId, userId: input.ownerUserId });
  const parsed = methodStatusSchema.safeParse(input.status);
  if (!parsed.success) throw new MethodError("METHOD_STATUS_INVALID", "请选择有效的方法状态。");
  const asset = await db.methodAsset.findFirst({ where: { id: input.methodId, workspaceId: input.workspaceId, ownerUserId: input.ownerUserId }, select: { id: true } });
  if (!asset) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
  await db.$transaction([
    db.methodAsset.update({ where: { id: asset.id }, data: { status: parsed.data, statusUpdatedAt: new Date() } }),
    db.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.ownerUserId, action: "method.status_updated", resourceType: "method_asset", resourceId: asset.id, metadata: { status: parsed.data } } }),
  ]);
  const result = await getMethod({ workspaceId: input.workspaceId, ownerUserId: input.ownerUserId, methodId: input.methodId });
  if (!result) throw new MethodError("METHOD_NOT_FOUND", "方法不存在。");
  return result;
}
