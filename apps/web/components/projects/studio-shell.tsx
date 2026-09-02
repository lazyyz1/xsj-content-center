"use client";

import { Button, Card } from "@content-center/ui";
import { useEffect, useState } from "react";
import { BriefEditor } from "./brief-editor";
import { EvidenceBoard } from "./evidence-board";
import { MotherContentEditor } from "./mother-content-editor";
import { ProjectStatusPanel } from "./project-status-panel";
import { StudioSources, type ProjectSource } from "./studio-sources";
import { StudioDrawer } from "./studio-drawer";
import { AICreationPanel, type RewriteRequest, type UnifiedAnalysisView } from "./ai-creation-panel";
import { PlatformContentFactory } from "./platform-content-factory";
import { PLATFORM_LABELS, SUPPORTED_PLATFORMS, type PlatformVariantView, type SupportedPlatform } from "@/lib/platforms";
import { DeepContentWorkspace, type MotherSnapshot, type PackageView } from "./deep-content-workspace";
import type { CreativePlan } from "@/server/studio/creative-brief-prefill";

type Evidence = { id: string; type: string; excerpt: string | null; claim: string | null; note: string | null; sourceItemId: string | null; sourceItem: { title: string | null } | null };
type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type CreativePlanHandoff = { plan: CreativePlan; storedPlan: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; stage: "PREPARING" | "WRITING" };

function analysisEvidenceCount(output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return 0;
  const value = output as Record<string, unknown>;
  return Array.isArray(value.keyPoints) ? value.keyPoints.length : 0;
}

export function StudioShell({ project, availableSources, editable, ai }: {
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    description: string | null;
    goal: string | null;
    audience: string | null;
    sources: ProjectSource[];
    evidenceItems: Evidence[];
    creativePlan: CreativePlanHandoff;
    motherContent: MotherSnapshot;
    deepContentPackage: PackageView | null;
    platformVariants: PlatformVariantView[];
  };
  availableSources: AvailableSource[];
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; creatorProfile: { displayName: string; positioning: string } | null; unifiedAnalysis: UnifiedAnalysisView | null; latestAnalysisStatus: string | null; latestAnalysisErrorCode: string | null };
}) {
  const [rewriteRequest, setRewriteRequest] = useState<RewriteRequest | null>(null);
  const [appliedMotherContent, setAppliedMotherContent] = useState<typeof project.motherContent | null>(null);
  const [savedMotherVersion, setSavedMotherVersion] = useState(project.motherContent.version);
  const [contentTab, setContentTab] = useState<"MOTHER" | "PACKAGE" | SupportedPlatform>("MOTHER");
  const [activePlatform, setActivePlatform] = useState<SupportedPlatform>("DOUYIN");
  const [platformVariants, setPlatformVariants] = useState(project.platformVariants);
  const [analysisInputChanged, setAnalysisInputChanged] = useState(false);
  const [creationStage, setCreationStage] = useState(project.creativePlan.stage);
  const [projectStatus, setProjectStatus] = useState(project.status);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const motherContent = appliedMotherContent ?? project.motherContent;
  const currentMotherVersion = Math.max(motherContent.version, savedMotherVersion);
  const effectiveVariants = platformVariants.map((variant) => ({ ...variant, isStale: variant.sourceMotherVersion < currentMotherVersion }));
  const staleCount = effectiveVariants.filter(({ isStale }) => isStale).length;
  const unifiedOutput = ai.unifiedAnalysis?.output;
  useEffect(() => { setProjectStatus(project.status); }, [project.status]);
  useEffect(() => { setCreationStage(project.creativePlan.stage); }, [project.creativePlan.stage]);
  function selectPlatform(platform: SupportedPlatform) { setActivePlatform(platform); setContentTab(platform); }
  function platformStatus(platform: SupportedPlatform) { const variant = effectiveVariants.find((item) => item.platform === platform); return !variant ? "未生成" : variant.isStale ? "母稿已更新" : variant.status === "IN_REVIEW" ? "待审核" : variant.status === "APPROVED" ? "已批准" : "草稿"; }
  function continueCreation() { document.getElementById(creationStage === "PREPARING" ? "creative-plan" : "mother-content")?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return <>
    <nav aria-label="创作步骤" className="mb-4 grid gap-1 rounded-xl border bg-[var(--surface)] p-1 sm:grid-cols-3">
      <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab === "MOTHER" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setContentTab("MOTHER")}><span className="block font-medium">1 · 准备与核心母稿</span><span className="mt-1 block text-[10px] opacity-75">参考素材 → 创作方案 → 核心母稿</span></button>
      <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab === "PACKAGE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setContentTab("PACKAGE")}><span className="block font-medium">2 · 深度创作</span><span className="mt-1 block text-[10px] opacity-75">创作包 · GPT 网页成稿 · {project.deepContentPackage ? `v${project.deepContentPackage.version}` : "未生成"}</span></button>
      <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => selectPlatform(activePlatform)}><span className="block font-medium">3 · 平台内容与审核</span><span className="mt-1 block text-[10px] opacity-75">5 个平台 · 生成后逐一提交人工审核</span></button>
    </nav>
    {contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? <nav aria-label="平台版本" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-[var(--surface)] p-1">{SUPPORTED_PLATFORMS.map((platform) => <button key={platform} className={`min-w-24 rounded-lg px-3 py-2 text-sm ${contentTab === platform ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} onClick={() => selectPlatform(platform)}><span className="block font-medium">{PLATFORM_LABELS[platform]}</span><span className="mt-0.5 block text-[10px] opacity-75">{platformStatus(platform)}</span></button>)}</nav> : null}
    {staleCount ? <p className="mb-4 text-sm text-[var(--warning)]">{staleCount} 个平台版本需要更新</p> : null}

    <div className={contentTab === "MOTHER" ? "block" : "hidden"}>
      <div className="grid items-start gap-5 min-[901px]:grid-cols-[minmax(0,1fr)_320px]">
        <main className="grid min-w-0 gap-5">
          <Card className="p-5"><StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editable} unifiedAnalysisOutput={unifiedOutput} /><EvidenceBoard projectId={project.id} evidence={project.evidenceItems} sources={project.sources} editable={editable} suggestedCount={analysisEvidenceCount(unifiedOutput)} /></Card>
          {creationStage === "PREPARING" ? <Card className="p-5"><BriefEditor projectId={project.id} projectStatus={projectStatus} initial={project.creativePlan.plan} stored={project.creativePlan.storedPlan} origins={project.creativePlan.origins} autoPrefilled={project.creativePlan.autoPrefilled} titleReferences={project.creativePlan.titleReferences} editable={editable && projectStatus !== "ARCHIVED"} onSaved={() => setAnalysisInputChanged(true)} onConfirmed={() => { setCreationStage("WRITING"); setProjectStatus("WRITING"); }} /></Card> : <Card id="mother-content" className="p-5"><div className="mb-4 flex justify-end"><Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setPlanDrawerOpen(true)}>查看创作方案</Button></div><MotherContentEditor key={motherContent.version} projectId={project.id} initial={motherContent} editable={editable && projectStatus !== "ARCHIVED"} aiConfigured={ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK"} onRewriteRequest={setRewriteRequest} onSaved={setSavedMotherVersion} /></Card>}
        </main>
        <aside className="min-w-0"><Card className="p-5 min-[901px]:sticky min-[901px]:top-5"><AICreationPanel projectId={project.id} integrationStatus={ai.integrationStatus} creatorProfile={ai.creatorProfile} editable={editable && projectStatus !== "ARCHIVED"} motherVersion={motherContent.version} unifiedAnalysis={ai.unifiedAnalysis} latestStatus={ai.latestAnalysisStatus} latestErrorCode={ai.latestAnalysisErrorCode} inputChanged={analysisInputChanged} sourceCount={project.sources.length} organizedSourceCount={project.sources.filter(({ sourceItem }) => sourceItem.materialAnalysis).length} planConfirmed={creationStage === "WRITING"} planReady={Boolean(project.creativePlan.plan.topic && project.creativePlan.plan.coreMessage)} onAnalysisUpdated={() => setAnalysisInputChanged(false)} onContinue={continueCreation} rewriteRequest={rewriteRequest} onMotherContentApplied={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); }} /><details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-xs text-[var(--text-secondary)]">项目管理与高级状态</summary><ProjectStatusPanel project={{ ...project, status: projectStatus }} editable={editable} /></details></Card></aside>
      </div>
      <StudioDrawer title="创作方案" open={planDrawerOpen} onClose={() => setPlanDrawerOpen(false)}><BriefEditor projectId={project.id} projectStatus={projectStatus} initial={project.creativePlan.plan} stored={project.creativePlan.storedPlan} origins={project.creativePlan.origins} autoPrefilled={project.creativePlan.autoPrefilled} titleReferences={project.creativePlan.titleReferences} editable={false} /></StudioDrawer>
    </div>
    <div className={contentTab === "PACKAGE" ? "block" : "hidden"}><DeepContentWorkspace projectId={project.id} initialPackage={project.deepContentPackage} editable={editable && projectStatus !== "ARCHIVED"} integrationStatus={ai.integrationStatus} motherContent={{ ...motherContent, version: currentMotherVersion }} onMotherImported={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); setCreationStage("WRITING"); setContentTab("MOTHER"); }} /></div>
    <div className={contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? "block" : "hidden"}><PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={currentMotherVersion} variants={effectiveVariants} editable={editable && projectStatus !== "ARCHIVED"} integrationStatus={ai.integrationStatus} onSelectPlatform={selectPlatform} onVariantChange={(variant) => setPlatformVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} /></div>
  </>;
}
