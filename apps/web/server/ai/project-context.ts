import "server-only";

import { db } from "@content-center/db";
import { ProjectServiceError } from "../project-service";
import type { AIAction } from "./schemas";
import { materialAnalysisOutputSchema } from "../material-analysis/schemas";
import type { MaterialAnalysisOutput } from "../material-analysis/schemas";
import { resolveOwnContribution } from "../../lib/content-production";
import { getSelectedGenerationMethods } from "../project-methods/service";

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
    const [sourceRows, evidenceRows, brief] = await Promise.all([
      needsSources ? db.projectSource.findMany({ where: { projectId: project.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { role: true, sourceItem: { select: { id: true, title: true, sourcePlatform: true, rawText: true, transcript: { select: { fullText: true } }, materialAnalyses: { where: { status: "COMPLETED" }, orderBy: { version: "desc" }, take: 1, select: { version: true, suggestedTitle: true, summary: true, topic: true, targetAudience: true, coreViewpoint: true, keyPoints: true, coreQuestion: true, understanding: true } } } } } }) : [],
      needsEvidence ? db.evidenceItem.findMany({ where: { projectId: project.id, workspaceId: input.workspaceId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, type: true, excerpt: true, claim: true, note: true, sourceItemId: true } }) : [],
      needsBrief ? db.creativeBrief.findFirst({ where: { projectId: project.id, workspaceId: input.workspaceId } }) : null,
    ]);
    const selectedMethods = input.action === "GENERATE_MOTHER_CONTENT"
      ? await getSelectedGenerationMethods({ workspaceId: input.workspaceId, userId: input.userId, projectId: project.id })
      : [];
    const selectedMethodContext = selectedMethods.map(({ title, steps, applicableScenarios, boundaries }) => ({ title, steps, applicableScenarios, boundaries }));
    let contextTruncated = false;
    let sourceBudget = this.limits.totalSourceChars;
    type BuiltSource = { id: string; title: string | null; platform: string; role?: string; text?: string; materialAnalysis?: Record<string, unknown> | null; materialUnderstanding?: MaterialAnalysisOutput | { whatItSays: { summary: string; keyPoints: string[] }; reusable: never[]; doNotCopy: never[]; uncertain: never[] } | { reusable: MaterialAnalysisOutput["reusable"]; prohibitedReferenceClaims: Array<{ content: string; reason: string }> } | null };
    const sources: BuiltSource[] = sourceRows.flatMap(({ sourceItem, role }): BuiltSource[] => {
      if (sourceBudget <= 0) { contextTruncated = true; return []; }
      const raw = input.action === "GENERATE_MOTHER_CONTENT" ? "" : sourceItem.transcript?.fullText || sourceItem.rawText || "";
      const selected = take(raw, Math.min(this.limits.perSourceChars, sourceBudget));
      sourceBudget -= selected.value.length;
      contextTruncated ||= selected.truncated || raw.length > selected.value.length;
      const analysis = sourceItem.materialAnalyses[0];
      const understanding = materialAnalysisOutputSchema.safeParse(analysis?.understanding);
      if (input.action === "GENERATE_MOTHER_CONTENT") return [{
        id: sourceItem.id,
        title: sourceItem.title,
        platform: sourceItem.sourcePlatform,
        materialUnderstanding: understanding.success
          ? { reusable: understanding.data.reusable, prohibitedReferenceClaims: [...understanding.data.doNotCopy, ...understanding.data.uncertain] }
          : analysis ? { reusable: [], prohibitedReferenceClaims: [{ content: analysis.summary || strings(analysis.keyPoints).join("；"), reason: "旧版整理只作来源背景，不得写成创作者事实" }].filter((item) => item.content) } : null,
      }];
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
    const briefData = brief ? { topic: brief.topic, angle: brief.angle, audience: brief.audience, coreMessage: brief.coreMessage, coreQuestion: brief.coreQuestion, background: brief.background, keyPoints: strings(brief.keyPoints), structure: strings(brief.structure), tone: brief.tone, risks: strings(brief.risks), version: brief.version } : null;
    const ownContribution = resolveOwnContribution({ coreMessage: briefData?.coreMessage, background: briefData?.background, audience: briefData?.audience });
    const hasOwnBackground = Boolean(briefData?.background?.trim());
    const isExternalReferenceEvidence = (item: (typeof evidence)[number]) => typeof item.sourceItemId === "string" && item.sourceItemId.trim().length > 0;
    const confirmedFacts = evidence.filter((item) => !isExternalReferenceEvidence(item)).map((item) => item.content);
    const externalReferenceEvidence = evidence.filter(isExternalReferenceEvidence).map(({ id, type, sourceItemId, content }) => ({ id, type, sourceItemId, content }));
    const context = input.action === "GENERATE_MOTHER_CONTENT"
      ? { project: { title: project.title }, mySupplement: briefData ? { myCoreViewpoint: briefData.coreMessage, audience: briefData.audience, ownBusinessExperienceOrCases: briefData.background, otherRequirements: briefData.angle } : null, ownContribution, creatorProfile: profile, materialUnderstanding: sources, confirmedFacts, ...(selectedMethodContext.length ? { selectedMethods: selectedMethodContext } : {}), externalReferenceEvidence }
      : { project: { id: project.id, title: project.title, description: project.description, goal: project.goal, audience: project.audience }, creatorProfile: profile, sources, evidence, creativeBasis: evidence.map((item) => ({ ...item, status: "ADOPTED", verificationRequired: false })), creativeBrief: briefData };
    return { context, ownContribution, hasOwnBackground, contextTruncated, selectedMethods, inputSummary: { action: input.action, sourceCount: sources.length, evidenceCount: evidence.length, materialAnalysisCount: sourceRows.filter(({ sourceItem }) => sourceItem.materialAnalyses.length > 0).length, hasUnifiedCreativeAnalysis: false, hasCreativeBrief: Boolean(brief), contextChars: JSON.stringify(context).length, hasCreatorProfile: Boolean(profile), ownContribution, hasOwnBackground, contextTruncated, ...(selectedMethods.length ? { selectedMethodCount: selectedMethods.length, selectedMethodVersionIds: selectedMethods.map(({ methodVersionId }) => methodVersionId) } : {}) } };
  }
}
