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
import { getRecentAIRuns } from "@/server/ai/ai-run-service";
import { deepContentPackageSchema } from "@/server/deep-content/schemas";

function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export default async function ProjectStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, workspace, role } = await requireWorkspace();
  const { id } = await params;
  const project = await getProjectForUser({ userId: session.user.id, workspaceId: workspace.id, projectId: id });
  if (!project) notFound();
  const sourceIds = project.sources.map(({ sourceItemId }) => sourceItemId);
  const [availableSources, llm, ownProfile, recentRuns] = await Promise.all([
    db.sourceItem.findMany({ where: { workspaceId: workspace.id, status: "READY", ...(sourceIds.length ? { id: { notIn: sourceIds } } : {}) }, select: { id: true, title: true, sourcePlatform: true, sourceType: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    new IntegrationService().getIntegrationStatus(workspace.id, "LLM"),
    getCreatorProfile(workspace.id, session.user.id),
    getRecentAIRuns({ workspaceId: workspace.id, userId: session.user.id, projectId: project.id }),
  ]);
  const brief = project.creativeBrief;
  const mother = project.motherContent;
  const deepRow = project.deepContentPackages[0];
  const deepPackage = deepRow ? { id: deepRow.id, version: deepRow.version, status: deepRow.status, creatorProfileId: deepRow.creatorProfileId, createdAt: deepRow.createdAt.toISOString(), updatedAt: deepRow.updatedAt.toISOString(), ...deepContentPackageSchema.parse({ topicPackage: deepRow.topicPackage, viewpointPackage: deepRow.viewpointPackage, evidencePackage: deepRow.evidencePackage, expressionPackage: deepRow.expressionPackage, structurePackage: deepRow.structurePackage, creatorContribution: deepRow.creatorContribution, recommendedDirection: deepRow.recommendedDirection, risks: deepRow.risks, needsConfirmation: deepRow.needsConfirmation }) } : null;
  const studioProject = {
    id: project.id, title: project.title, status: project.status, description: project.description, goal: project.goal, audience: project.audience,
    sources: project.sources.map(({ role: sourceRole, sourceItem }) => ({ role: sourceRole, sourceItem: { id: sourceItem.id, title: sourceItem.title, sourcePlatform: sourceItem.sourcePlatform, sourceType: sourceItem.sourceType, rawText: sourceItem.rawText, transcript: sourceItem.transcript ? { fullText: sourceItem.transcript.fullText } : null } })),
    evidenceItems: project.evidenceItems.map((item) => ({ id: item.id, type: item.type, excerpt: item.excerpt, claim: item.claim, note: item.note, sourceItemId: item.sourceItemId, sourceItem: item.sourceItem })),
    creativeBrief: { topic: brief?.topic || "", angle: brief?.angle || "", audience: brief?.audience || "", coreMessage: brief?.coreMessage || "", keyPoints: stringArray(brief?.keyPoints), structure: stringArray(brief?.structure), tone: brief?.tone || "", risks: stringArray(brief?.risks), version: brief?.version || 0 },
    motherContent: { title: mother?.title || "", body: mother?.body || "", outline: stringArray(mother?.outline), version: mother?.version || 0, origin: mother?.origin || "HUMAN" as const, originNote: mother?.originNote || null },
    deepContentPackage: deepPackage,
    platformVariants: project.platformVariants.map((variant) => ({ id: variant.id, platform: variant.platform, version: variant.version, title: variant.title, body: variant.body, hook: variant.hook, summary: variant.summary, hashtags: stringArray(variant.hashtags), mediaPlan: variant.mediaPlan, metadata: variant.metadata, status: variant.status, sourceMotherVersion: variant.sourceMotherVersion, isStale: variant.sourceMotherVersion < (mother?.version ?? 0) })),
  };
  const ai = { integrationStatus: llm.status !== "CONFIGURED" && process.env.MOCK_MODE === "true" ? "MOCK" as const : llm.status, hasCreatorProfile: Boolean(project.creatorProfile || ownProfile), recentRuns: recentRuns.map((run) => ({ ...run, createdAt: run.createdAt.toISOString(), appliedAt: run.appliedAt?.toISOString() ?? null, discardedAt: run.discardedAt?.toISOString() ?? null })) };
  return <><header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><Link href={`/projects/${project.id}`} className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} />返回项目详情</Link><h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">创作工作台</p></div><Badge>{project.status}</Badge></header><StudioShell project={studioProject} availableSources={availableSources} editable={role !== "VIEWER"} ai={ai} /></>;
}
