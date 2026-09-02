import "server-only";

import { db } from "@content-center/db";
import { ProjectServiceError } from "../project-service";
import type { AIAction } from "./schemas";

export type ContextBudgetLimits = { perSourceChars: number; totalSourceChars: number; totalEvidenceChars: number };
const defaults: ContextBudgetLimits = { perSourceChars: 8_000, totalSourceChars: 24_000, totalEvidenceChars: 12_000 };

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function take(value: string, maximum: number) { return value.length <= maximum ? { value, truncated: false } : { value: value.slice(0, maximum), truncated: true }; }

export class ProjectContextBuilder {
  constructor(private readonly limits: ContextBudgetLimits = defaults) {}

  async build(input: { workspaceId: string; userId: string; projectId: string; action: AIAction }) {
    const project = await db.contentProject.findFirst({
      where: { id: input.projectId, workspaceId: input.workspaceId, workspace: { members: { some: { userId: input.userId } } } },
      select: { id: true, title: true, description: true, goal: true, audience: true, creatorProfileId: true },
    });
    if (!project) throw new ProjectServiceError("PROJECT_NOT_FOUND");
    const creatorProfile = project.creatorProfileId
      ? await db.creatorProfile.findFirst({ where: { id: project.creatorProfileId, workspaceId: input.workspaceId } })
      : await db.creatorProfile.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } } });
    const needsSources = ["ANALYZE_SOURCES", "EXTRACT_EVIDENCE", "GENERATE_ANGLES", "GENERATE_MOTHER_CONTENT"].includes(input.action);
    const needsEvidence = ["GENERATE_ANGLES", "GENERATE_BRIEF", "GENERATE_MOTHER_CONTENT"].includes(input.action);
    const needsBrief = ["GENERATE_BRIEF", "GENERATE_MOTHER_CONTENT", "REWRITE_SELECTION", "SHORTEN", "EXPAND", "ADD_PERSONAL_VIEW", "HUMANIZE"].includes(input.action);
    const [sourceRows, evidenceRows, brief, unifiedAnalysis] = await Promise.all([
      needsSources ? db.projectSource.findMany({ where: { projectId: project.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { role: true, sourceItem: { select: { id: true, title: true, sourcePlatform: true, rawText: true, transcript: { select: { fullText: true } }, materialAnalyses: { where: { status: "COMPLETED" }, orderBy: { version: "desc" }, take: 1, select: { version: true, suggestedTitle: true, summary: true, topic: true, targetAudience: true, coreViewpoint: true, keyPoints: true, coreQuestion: true } } } } } }) : [],
      needsEvidence ? db.evidenceItem.findMany({ where: { projectId: project.id, workspaceId: input.workspaceId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, type: true, excerpt: true, claim: true, note: true, sourceItemId: true } }) : [],
      needsBrief ? db.creativeBrief.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId } }) : null,
      input.action === "GENERATE_MOTHER_CONTENT" ? db.unifiedCreativeAnalysis.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId, status: "COMPLETED" }, orderBy: { version: "desc" }, select: { version: true, output: true, provenance: true } }) : null,
    ]);
    let contextTruncated = false;
    let sourceBudget = this.limits.totalSourceChars;
    const sources = sourceRows.flatMap(({ sourceItem, role }) => {
      if (sourceBudget <= 0) { contextTruncated = true; return []; }
      const raw = sourceItem.transcript?.fullText || sourceItem.rawText || "";
      const selected = take(raw, Math.min(this.limits.perSourceChars, sourceBudget));
      sourceBudget -= selected.value.length;
      contextTruncated ||= selected.truncated || raw.length > selected.value.length;
      const analysis = sourceItem.materialAnalyses[0];
      return [{ id: sourceItem.id, title: sourceItem.title, platform: sourceItem.sourcePlatform, role, text: selected.value, materialAnalysis: analysis ? { version: analysis.version, suggestedTitle: analysis.suggestedTitle, summary: analysis.summary, topic: analysis.topic, targetAudience: analysis.targetAudience, coreViewpoint: analysis.coreViewpoint, keyPoints: strings(analysis.keyPoints), coreQuestion: analysis.coreQuestion } : null }];
    });
    let evidenceBudget = this.limits.totalEvidenceChars;
    const evidence = evidenceRows.flatMap((item) => {
      if (evidenceBudget <= 0) { contextTruncated = true; return []; }
      const raw = JSON.stringify({ excerpt: item.excerpt, claim: item.claim, note: item.note });
      const selected = take(raw, evidenceBudget);
      evidenceBudget -= selected.value.length;
      contextTruncated ||= selected.truncated;
      return [{ id: item.id, type: item.type, sourceItemId: item.sourceItemId, content: selected.value }];
    });
    const profile = creatorProfile ? { displayName: creatorProfile.displayName, positioning: creatorProfile.positioning, targetAudience: creatorProfile.targetAudience, tone: creatorProfile.tone, preferredStyle: creatorProfile.preferredStyle, forbiddenStyle: creatorProfile.forbiddenStyle, coreTopics: strings(creatorProfile.coreTopics), personalViews: strings(creatorProfile.personalViews), brandTerms: strings(creatorProfile.brandTerms), forbiddenTerms: strings(creatorProfile.forbiddenTerms), hookPreferences: strings(creatorProfile.hookPreferences), structurePreferences: strings(creatorProfile.structurePreferences), ctaPreferences: strings(creatorProfile.ctaPreferences), examplePhrases: strings(creatorProfile.examplePhrases) } : null;
    const context = { project: { id: project.id, title: project.title, description: project.description, goal: project.goal, audience: project.audience }, creatorProfile: profile, sources, evidence, creativeBasis: evidence.map((item) => ({ ...item, status: "ADOPTED", verificationRequired: false })), creativeBrief: brief ? { topic: brief.topic, angle: brief.angle, audience: brief.audience, coreMessage: brief.coreMessage, coreQuestion: brief.coreQuestion, background: brief.background, keyPoints: strings(brief.keyPoints), structure: strings(brief.structure), tone: brief.tone, risks: strings(brief.risks), version: brief.version } : null, unifiedCreativeAnalysis: unifiedAnalysis ? { version: unifiedAnalysis.version, output: unifiedAnalysis.output, provenance: unifiedAnalysis.provenance } : null };
    return { context, contextTruncated, inputSummary: { action: input.action, sourceCount: sources.length, evidenceCount: evidence.length, materialAnalysisCount: sources.filter((source) => Boolean(source.materialAnalysis)).length, hasUnifiedCreativeAnalysis: Boolean(unifiedAnalysis), hasCreativeBrief: Boolean(brief), contextChars: JSON.stringify(context).length, hasCreatorProfile: Boolean(profile), contextTruncated } };
  }
}
