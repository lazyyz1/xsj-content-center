import "server-only";

import { slugifyTag } from "@content-center/core";
import { db, type MaterialAnalysis, type Prisma } from "@content-center/db";
import { LLMError } from "@content-center/providers";
import { executeStructuredAIRun } from "../ai/ai-run-service";
import { loadLLMRuntime, type LLMRuntime } from "../ai/llm-runtime";
import { renderPrompt, selectPromptTemplate } from "../ai/prompt-service";
import { createProject } from "../project-service";
import { buildMaterialAnalysisContext, MaterialAnalysisContextError } from "./context-builder";
import { materialAnalysisEditSchema, materialAnalysisOutputInstruction, materialAnalysisOutputSchema, type MaterialAnalysisOutput } from "./schemas";

export class MaterialAnalysisError extends Error {
  constructor(readonly code: "SOURCE_NOT_FOUND" | "TRANSCRIPT_REQUIRED" | "ANALYSIS_NOT_FOUND" | "ANALYSIS_ALREADY_PROCESSING" | "INVALID_INPUT" | "MOCK_NOT_ALLOWED", message: string) {
    super(message);
    this.name = "MaterialAnalysisError";
  }
}

function strings(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export type MaterialAnalysisDTO = {
  id: string;
  sourceItemId: string;
  version: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  origin: "AI" | "HUMAN";
  suggestedTitle: string | null;
  summary: string | null;
  topic: string | null;
  tags: string[];
  keywords: string[];
  contentType: string | null;
  targetAudience: string | null;
  coreViewpoint: string | null;
  keyPoints: string[];
  coreQuestion: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  stale: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toMaterialAnalysisDTO(row: MaterialAnalysis, transcriptUpdatedAt?: Date | null): MaterialAnalysisDTO {
  return {
    id: row.id,
    sourceItemId: row.sourceItemId,
    version: row.version,
    status: row.status,
    origin: row.origin,
    suggestedTitle: row.suggestedTitle,
    summary: row.summary,
    topic: row.topic,
    tags: strings(row.tags),
    keywords: strings(row.keywords),
    contentType: row.contentType,
    targetAudience: row.targetAudience,
    coreViewpoint: row.coreViewpoint,
    keyPoints: strings(row.keyPoints),
    coreQuestion: row.coreQuestion,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    stale: Boolean(transcriptUpdatedAt && transcriptUpdatedAt > row.transcriptUpdatedAtAtAnalysis),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function scopedSource(workspaceId: string, sourceItemId: string) {
  const source = await db.sourceItem.findFirst({ where: { id: sourceItemId, workspaceId }, include: { transcript: true } });
  if (!source) throw new MaterialAnalysisError("SOURCE_NOT_FOUND", "素材不存在。");
  return source;
}

export async function getMaterialAnalysis(input: { workspaceId: string; sourceItemId: string }) {
  const source = await scopedSource(input.workspaceId, input.sourceItemId);
  const analyses = await db.materialAnalysis.findMany({ where: { workspaceId: input.workspaceId, sourceItemId: source.id }, orderBy: { version: "desc" }, take: 20 });
  return {
    current: analyses[0] ? toMaterialAnalysisDTO(analyses[0], source.transcript?.updatedAt) : null,
    history: analyses.map((row) => toMaterialAnalysisDTO(row, source.transcript?.updatedAt)),
  };
}

async function reserveAnalysis(input: { workspaceId: string; sourceItemId: string; userId: string; transcriptUpdatedAt: Date }) {
  try {
    return await db.$transaction(async (tx) => {
      const processing = await tx.materialAnalysis.findFirst({ where: { workspaceId: input.workspaceId, sourceItemId: input.sourceItemId, status: "PROCESSING" } });
      if (processing) throw new MaterialAnalysisError("ANALYSIS_ALREADY_PROCESSING", "这条素材正在整理，请稍候。");
      const latest = await tx.materialAnalysis.findFirst({ where: { workspaceId: input.workspaceId, sourceItemId: input.sourceItemId }, orderBy: { version: "desc" }, select: { version: true } });
      return tx.materialAnalysis.create({ data: { workspaceId: input.workspaceId, sourceItemId: input.sourceItemId, version: (latest?.version ?? 0) + 1, status: "PROCESSING", tags: [], keywords: [], keyPoints: [], transcriptUpdatedAtAtAnalysis: input.transcriptUpdatedAt, createdById: input.userId } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof MaterialAnalysisError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002" || code === "P2034") throw new MaterialAnalysisError("ANALYSIS_ALREADY_PROCESSING", "这条素材正在整理，请稍候。");
    throw error;
  }
}

export async function analyzeMaterial(input: { workspaceId: string; sourceItemId: string; userId: string }, dependencies: { runtime?: LLMRuntime } = {}) {
  let built;
  try {
    built = await buildMaterialAnalysisContext(input);
  } catch (error) {
    if (error instanceof MaterialAnalysisContextError) throw new MaterialAnalysisError(error.code, error.message);
    throw error;
  }
  const runtime = dependencies.runtime ?? await loadLLMRuntime(input.workspaceId);
  if (runtime.mode === "MOCK") throw new MaterialAnalysisError("MOCK_NOT_ALLOWED", "智能整理不使用模拟结果，请先配置 Kimi 2.6。");
  const template = await selectPromptTemplate(input.workspaceId, "ANALYZE_MATERIAL");
  const reserved = await reserveAnalysis({ workspaceId: input.workspaceId, sourceItemId: input.sourceItemId, userId: input.userId, transcriptUpdatedAt: built.source.transcript!.updatedAt });
  try {
    const prompt = `${renderPrompt(template.template, built.context)}${materialAnalysisOutputInstruction}`;
    const run = await executeStructuredAIRun<MaterialAnalysisOutput>({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "ANALYZE_MATERIAL",
      operation: "ANALYZE_MATERIAL",
      promptVersion: template.version,
      promptTemplateId: template.id,
      inputSummary: built.inputSummary,
      auditMetadata: { sourceItemId: input.sourceItemId, materialAnalysisId: reserved.id, materialAnalysisVersion: reserved.version },
      contextTruncated: built.contextTruncated,
      generate: (provider) => provider.generateStructured({ systemPrompt: template.systemPrompt, prompt }, materialAnalysisOutputSchema),
    }, { runtime });
    const output = materialAnalysisOutputSchema.parse(run.output);
    const completed = await db.materialAnalysis.update({ where: { id: reserved.id }, data: { ...output, tags: json(output.tags), keywords: json(output.keywords), keyPoints: json(output.keyPoints), status: "COMPLETED", aiRunId: run.id } });
    return toMaterialAnalysisDTO(completed, built.source.transcript!.updatedAt);
  } catch (error) {
    const code = error instanceof LLMError ? error.code : "MATERIAL_ANALYSIS_FAILED";
    const message = error instanceof Error ? error.message : "智能整理失败，请重试。";
    await db.materialAnalysis.update({ where: { id: reserved.id }, data: { status: "FAILED", errorCode: code, errorMessage: message } });
    throw error;
  }
}

export async function updateMaterialAnalysis(input: { workspaceId: string; sourceItemId: string; analysisId: string; userId: string; data: unknown }) {
  const parsed = materialAnalysisEditSchema.safeParse(input.data);
  if (!parsed.success) throw new MaterialAnalysisError("INVALID_INPUT", "请检查整理字段、标签数量和内容长度。");
  const source = await scopedSource(input.workspaceId, input.sourceItemId);
  const analysis = await db.materialAnalysis.findFirst({ where: { id: input.analysisId, workspaceId: input.workspaceId, sourceItemId: source.id } });
  if (!analysis) throw new MaterialAnalysisError("ANALYSIS_NOT_FOUND", "整理结果不存在。");
  const tagNames = [...new Map(parsed.data.tags.map((name) => [slugifyTag(name), name])).entries()].filter(([slug]) => slug).slice(0, 8);
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.materialAnalysis.update({ where: { id: analysis.id }, data: { ...parsed.data, tags: json(parsed.data.tags), keywords: json(parsed.data.keywords), keyPoints: json(parsed.data.keyPoints), status: "COMPLETED", origin: "HUMAN", errorCode: null, errorMessage: null } });
    for (const [slug, name] of tagNames) {
      const tag = await tx.contentTag.upsert({ where: { workspaceId_slug: { workspaceId: input.workspaceId, slug } }, create: { workspaceId: input.workspaceId, name, slug }, update: {} });
      await tx.sourceItemTag.upsert({ where: { sourceItemId_tagId: { sourceItemId: source.id, tagId: tag.id } }, create: { sourceItemId: source.id, tagId: tag.id }, update: {} });
    }
    await tx.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.userId, action: "material_analysis.updated", resourceType: "material_analysis", resourceId: analysis.id, metadata: { sourceItemId: source.id, version: analysis.version } } });
    return row;
  });
  return toMaterialAnalysisDTO(updated, source.transcript?.updatedAt);
}

export async function createProjectFromMaterial(input: { workspaceId: string; sourceItemId: string; userId: string }) {
  const source = await scopedSource(input.workspaceId, input.sourceItemId);
  const existing = await db.projectSource.findFirst({ where: { sourceItemId: source.id, project: { workspaceId: input.workspaceId, status: { not: "ARCHIVED" } } }, orderBy: { createdAt: "desc" }, select: { projectId: true } });
  if (existing) return { projectId: existing.projectId, created: false };
  const latest = await db.materialAnalysis.findFirst({ where: { workspaceId: input.workspaceId, sourceItemId: source.id, status: "COMPLETED" }, orderBy: { version: "desc" } });
  if (!latest) throw new MaterialAnalysisError("ANALYSIS_NOT_FOUND", "请先完成智能整理。");
  const project = await createProject({ workspaceId: input.workspaceId, userId: input.userId, sourceItemId: source.id, title: latest.suggestedTitle || source.title || "未命名内容项目", description: latest.summary || undefined, audience: latest.targetAudience || undefined });
  return { projectId: project.id, created: true };
}
