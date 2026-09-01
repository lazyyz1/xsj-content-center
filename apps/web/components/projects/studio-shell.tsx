"use client";

import { Card } from "@content-center/ui";
import { useState } from "react";
import { BriefEditor } from "./brief-editor";
import { EvidenceBoard } from "./evidence-board";
import { MotherContentEditor } from "./mother-content-editor";
import { ProjectStatusPanel } from "./project-status-panel";
import { StudioSources } from "./studio-sources";
import { AICreationPanel, type AIAction, type RewriteRequest } from "./ai-creation-panel";
import { PlatformContentFactory } from "./platform-content-factory";
import { PLATFORM_LABELS, SUPPORTED_PLATFORMS, type PlatformVariantView, type SupportedPlatform } from "@/lib/platforms";
import { DeepContentWorkspace, type MotherSnapshot, type PackageView } from "./deep-content-workspace";

type Source = {
  role: string;
  sourceItem: { id: string; title: string | null; sourcePlatform: string; sourceType: string; rawText: string | null; transcript: { fullText: string } | null };
};
type Evidence = { id: string; type: string; excerpt: string | null; claim: string | null; note: string | null; sourceItemId: string | null; sourceItem: { title: string | null } | null };
type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";

export function StudioShell({ project, availableSources, editable, ai }: {
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    description: string | null;
    goal: string | null;
    audience: string | null;
    sources: Source[];
    evidenceItems: Evidence[];
    creativeBrief: { topic: string; angle: string; audience: string; coreMessage: string; keyPoints: string[]; structure: string[]; tone: string; risks: string[]; version: number };
    motherContent: MotherSnapshot;
    deepContentPackage: PackageView | null;
    platformVariants: PlatformVariantView[];
  };
  availableSources: AvailableSource[];
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "DISABLED" | "ERROR" | "MOCK"; hasCreatorProfile: boolean; recentRuns: Array<{ id: string; action: AIAction; status: string; outputJson?: unknown; contextTruncated?: boolean; errorCode?: string | null; appliedAt?: string | null; discardedAt?: string | null }> };
}) {
  const [tab, setTab] = useState<"research" | "writing" | "brief">("writing");
  const [rewriteRequest, setRewriteRequest] = useState<RewriteRequest | null>(null);
  const [appliedMotherContent, setAppliedMotherContent] = useState<typeof project.motherContent | null>(null);
  const [savedMotherVersion, setSavedMotherVersion] = useState(project.motherContent.version);
  const [contentTab, setContentTab] = useState<"MOTHER" | "PACKAGE" | SupportedPlatform>("MOTHER");
  const [activePlatform, setActivePlatform] = useState<SupportedPlatform>("DOUYIN");
  const [platformVariants, setPlatformVariants] = useState(project.platformVariants);
  const motherContent = appliedMotherContent ?? project.motherContent;
  const currentMotherVersion = Math.max(motherContent.version, savedMotherVersion);
  const effectiveVariants = platformVariants.map((variant) => ({ ...variant, isStale: variant.sourceMotherVersion < currentMotherVersion }));
  const staleCount = effectiveVariants.filter(({ isStale }) => isStale).length;
  const tabClass = (name: typeof tab) => `h-10 flex-1 rounded-[var(--radius)] text-sm font-medium ${tab === name ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`;
  function selectPlatform(platform: SupportedPlatform) { setActivePlatform(platform); setContentTab(platform); }
  function platformStatus(platform: SupportedPlatform) { const variant = effectiveVariants.find((item) => item.platform === platform); return !variant ? "未生成" : variant.isStale ? "母稿已更新" : variant.status === "IN_REVIEW" ? "待审核" : variant.status === "APPROVED" ? "已批准" : "草稿"; }

  return (
    <>
      <nav aria-label="创作步骤" className="mb-4 grid gap-1 rounded-xl border bg-[var(--surface)] p-1 sm:grid-cols-3">
        <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab === "MOTHER" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setContentTab("MOTHER")}><span className="block font-medium">1 · 准备与核心母稿</span><span className="mt-1 block text-[10px] opacity-75">素材 · 观点 / 证据 · 创作简报 · v{currentMotherVersion || 0}</span></button>
        <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab === "PACKAGE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setContentTab("PACKAGE")}><span className="block font-medium">2 · 深度创作</span><span className="mt-1 block text-[10px] opacity-75">创作包 · GPT 网页成稿 · {project.deepContentPackage ? `v${project.deepContentPackage.version}` : "未生成"}</span></button>
        <button className={`rounded-lg px-4 py-3 text-left text-sm ${contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => selectPlatform(activePlatform)}><span className="block font-medium">3 · 平台内容与审核</span><span className="mt-1 block text-[10px] opacity-75">5 个平台 · 生成后逐一提交人工审核</span></button>
      </nav>
      {contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? <nav aria-label="平台版本" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-[var(--surface)] p-1">{SUPPORTED_PLATFORMS.map((platform) => <button key={platform} className={`min-w-24 rounded-lg px-3 py-2 text-sm ${contentTab === platform ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} onClick={() => selectPlatform(platform)}><span className="block font-medium">{PLATFORM_LABELS[platform]}</span><span className="mt-0.5 block text-[10px] opacity-75">{platformStatus(platform)}</span></button>)}</nav> : null}
      {staleCount ? <p className="mb-4 text-sm text-[var(--warning)]">{staleCount} 个平台版本需要更新</p> : null}
      <div className={contentTab === "MOTHER" ? "block" : "hidden"}>
      <nav aria-label="工作台面板" className="mb-4 flex rounded-xl border bg-[var(--surface)] p-1 xl:hidden">
        <button className={tabClass("research")} onClick={() => setTab("research")}>素材与观点</button>
        <button className={tabClass("writing")} onClick={() => setTab("writing")}>核心母稿</button>
        <button className={tabClass("brief")} onClick={() => setTab("brief")}>AI 与创作简报</button>
      </nav>
      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Card className={`${tab === "research" ? "block" : "hidden"} p-4 xl:block`}>
          <StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editable} />
          <EvidenceBoard projectId={project.id} evidence={project.evidenceItems} sources={project.sources} editable={editable} />
        </Card>
        <Card className={`${tab === "writing" ? "block" : "hidden"} p-5 xl:block`}>
          <MotherContentEditor key={motherContent.version} projectId={project.id} initial={motherContent} editable={editable && project.status !== "ARCHIVED"} aiConfigured={ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK"} onRewriteRequest={(request) => { setRewriteRequest(request); setTab("brief"); }} onSaved={setSavedMotherVersion} />
        </Card>
        <Card className={`${tab === "brief" ? "block" : "hidden"} p-4 xl:block`}>
          <AICreationPanel projectId={project.id} integrationStatus={ai.integrationStatus} hasCreatorProfile={ai.hasCreatorProfile} editable={editable && project.status !== "ARCHIVED"} briefVersion={project.creativeBrief.version} motherVersion={motherContent.version} motherHasContent={Boolean(motherContent.body.trim())} recentRuns={ai.recentRuns} rewriteRequest={rewriteRequest} onMotherContentApplied={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); }} />
          <div className="my-6 border-t" />
          <BriefEditor key={project.creativeBrief.version} projectId={project.id} initial={project.creativeBrief} editable={editable && project.status !== "ARCHIVED"} />
          <ProjectStatusPanel project={project} editable={editable} />
        </Card>
      </div>
      </div>
      <div className={contentTab === "PACKAGE" ? "block" : "hidden"}>
        <DeepContentWorkspace projectId={project.id} initialPackage={project.deepContentPackage} editable={editable && project.status !== "ARCHIVED"} integrationStatus={ai.integrationStatus} motherContent={{ ...motherContent, version: currentMotherVersion }} onMotherImported={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); setContentTab("MOTHER"); }} />
      </div>
      <div className={contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? "block" : "hidden"}>
        <PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={currentMotherVersion} variants={effectiveVariants} editable={editable && project.status !== "ARCHIVED"} integrationStatus={ai.integrationStatus} onSelectPlatform={selectPlatform} onVariantChange={(variant) => setPlatformVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} />
      </div>
    </>
  );
}
