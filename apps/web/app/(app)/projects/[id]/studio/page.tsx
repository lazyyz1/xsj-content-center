import { Badge } from "@content-center/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioShell } from "@/components/projects/studio-shell";
import { requireWorkspace } from "@/server/access";
import { getProjectForUser } from "@/server/project-service";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { getCreatorProfile } from "@/server/creator-profile-service";
import { projectStatusLabels } from "@/lib/content-labels";
import { CreativeBriefPrefillService } from "@/server/studio/creative-brief-prefill";
import { listMotherContentVersions } from "@/server/mother-content-service";
import { materialAnalysisOutputSchema } from "@/server/material-analysis/schemas";
import { buildDraftWarnings } from "@/server/ai/draft-warnings";

function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export default async function ProjectStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const project = await getProjectForUser({ userId: session.user.id, workspaceId: workspace.id, projectId: id });
  if (!project) notFound();
  const sourceIds = project.sources.map(({ sourceItemId }) => sourceItemId);
  const [availableSources, llm, ownProfile, motherHistory] = await Promise.all([
    db.sourceItem.findMany({ where: { workspaceId: workspace.id, status: "READY", ...(sourceIds.length ? { id: { notIn: sourceIds } } : {}) }, select: { id: true, title: true, sourcePlatform: true, sourceType: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    new IntegrationService().getIntegrationStatus(workspace.id, "LLM"),
    getCreatorProfile(workspace.id, session.user.id),
    listMotherContentVersions({ workspaceId: workspace.id, userId: session.user.id, projectId: project.id }),
  ]);
  const brief = project.creativeBrief;
  const mother = project.motherContent;
  const initialWarnings = mother?.body.trim() ? await buildDraftWarnings({ workspaceId: workspace.id, projectId: project.id, body: mother.body }) : [];
  const storedBrief = brief ? { topic: brief.topic, angle: brief.angle, audience: brief.audience, coreMessage: brief.coreMessage, coreQuestion: brief.coreQuestion || "", background: brief.background || "", keyPoints: stringArray(brief.keyPoints), structure: stringArray(brief.structure), tone: brief.tone, risks: stringArray(brief.risks), version: brief.version, metadata: brief.metadata } : null;
  const creativePlan = CreativeBriefPrefillService.build({ project: { title: project.title, audience: project.audience, status: project.status }, sources: project.sources, existingBrief: storedBrief, hasMotherContent: Boolean(mother?.body.trim()) });
  const studioProject = {
    id: project.id, title: project.title, status: project.status, description: project.description, goal: project.goal, audience: project.audience,
    sources: project.sources.map(({ role: sourceRole, sourceItem }) => {
      const analysis = sourceItem.materialAnalyses[0];
      const parsed = materialAnalysisOutputSchema.safeParse(analysis?.understanding);
      return { role: sourceRole, sourceItem: { id: sourceItem.id, title: sourceItem.title, sourcePlatform: sourceItem.sourcePlatform, sourceType: sourceItem.sourceType, rawText: sourceItem.rawText, transcript: sourceItem.transcript ? { fullText: sourceItem.transcript.fullText } : null, materialAnalysis: analysis ? { version: analysis.version, summary: analysis.summary, keyPoints: stringArray(analysis.keyPoints), understanding: parsed.success ? parsed.data : null, legacy: !parsed.success } : null } };
    }),
    creativePlan,
    motherContent: { title: mother?.title || "", body: mother?.body || "", outline: stringArray(mother?.outline), version: mother?.version || 0, origin: mother?.origin || "HUMAN" as const, originNote: mother?.originNote || null },
    motherHistory,
    platformVariants: project.platformVariants.map((variant) => ({ id: variant.id, platform: variant.platform, version: variant.version, title: variant.title, body: variant.body, hook: variant.hook, summary: variant.summary, hashtags: stringArray(variant.hashtags), mediaPlan: variant.mediaPlan, metadata: variant.metadata, status: variant.status, sourceMotherVersion: variant.sourceMotherVersion, isStale: variant.sourceMotherVersion < (mother?.version ?? 0) })),
  };
  const profile = project.creatorProfile || ownProfile;
  const ai = { integrationStatus: llm.status !== "CONFIGURED" && process.env.MOCK_MODE === "true" ? "MOCK" as const : llm.status, creatorProfile: profile ? { displayName: profile.displayName, positioning: profile.positioning } : null };
  return <><header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><Link href="/projects" className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回我的创作</Link><h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">参考素材 → 我的补充 → 我的口播稿</p></div><Badge>{projectStatusLabels[project.status] || project.status}</Badge></header><StudioShell project={studioProject} availableSources={availableSources} editable={role !== "VIEWER"} ai={ai} initialWarnings={initialWarnings} /></>;
}
