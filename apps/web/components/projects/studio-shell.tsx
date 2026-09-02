"use client";

import { Badge, Button, Card } from "@content-center/ui";
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
import type { CreativeBasisSummary } from "@/server/studio/creative-basis";
import type { MotherContentVersion } from "@/server/mother-content-service";

type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type CreativePlanHandoff = { plan: CreativePlan; storedPlan: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; stage: "PREPARING" | "WRITING" };

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export function StudioShell({ project, availableSources, editable, ai }: {
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    description: string | null;
    goal: string | null;
    audience: string | null;
    sources: ProjectSource[];
    creativeBasis: CreativeBasisSummary;
    creativePlan: CreativePlanHandoff;
    motherContent: MotherSnapshot;
    motherHistory: MotherContentVersion[];
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [motherHistory, setMotherHistory] = useState(project.motherHistory);
  const [motherGenerating, setMotherGenerating] = useState(false);
  const [motherMessage, setMotherMessage] = useState("");
  const [motherError, setMotherError] = useState("");
  const motherContent = appliedMotherContent ?? project.motherContent;
  const currentMotherVersion = Math.max(motherContent.version, savedMotherVersion);
  const currentCreativeVersion = motherHistory.find((item) => item.current)?.version ?? (motherContent.version > 0 ? 1 : 0);
  const effectiveVariants = platformVariants.map((variant) => ({ ...variant, isStale: variant.sourceMotherVersion < currentMotherVersion }));
  const staleCount = effectiveVariants.filter(({ isStale }) => isStale).length;
  const unifiedOutput = ai.unifiedAnalysis?.output;
  useEffect(() => { setProjectStatus(project.status); }, [project.status]);
  useEffect(() => { setCreationStage(project.creativePlan.stage); }, [project.creativePlan.stage]);
  function selectPlatform(platform: SupportedPlatform) { setActivePlatform(platform); setContentTab(platform); }
  function platformStatus(platform: SupportedPlatform) { const variant = effectiveVariants.find((item) => item.platform === platform); return !variant ? "未生成" : variant.isStale ? "母稿已更新" : variant.status === "IN_REVIEW" ? "待审核" : variant.status === "APPROVED" ? "已批准" : "草稿"; }
  function continueCreation() { document.getElementById(creationStage === "PREPARING" ? "creative-plan" : "mother-content")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  async function generateMotherContent() {
    if (motherGenerating || !editable || projectStatus === "ARCHIVED") return;
    setMotherGenerating(true); setMotherError(""); setMotherMessage("");
    try {
      const runResponse = await fetch(`/api/projects/${project.id}/ai/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "GENERATE_MOTHER_CONTENT" }) });
      const run = await runResponse.json().catch(() => ({}));
      if (!runResponse.ok) throw new Error(run.message || run.error || "核心母稿生成失败");
      const applyResponse = await fetch(`/api/projects/${project.id}/ai/runs/${text(object(run).id)}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: currentMotherVersion, confirmReplace: Boolean(motherContent.body.trim()) }) });
      const applied = object(await applyResponse.json().catch(() => ({})));
      if (!applyResponse.ok) throw new Error(text(applied.message) || text(applied.error) || "核心母稿生成失败");
      const result = object(applied.motherContent);
      const next: MotherSnapshot = { title: text(result.title), body: text(result.body), outline: stringArray(result.outline), version: typeof result.version === "number" ? result.version : currentMotherVersion + 1, origin: "KIMI", originNote: typeof result.originNote === "string" ? result.originNote : null };
      setAppliedMotherContent(next); setSavedMotherVersion(next.version);
      const historyResponse = await fetch(`/api/projects/${project.id}/mother-content`);
      if (historyResponse.ok) setMotherHistory(await historyResponse.json() as MotherContentVersion[]);
      setMotherMessage(currentMotherVersion > 0 ? "新版本母稿已生成" : "第一版母稿已生成");
    } catch (cause) { setMotherError(cause instanceof Error ? cause.message : "核心母稿生成失败"); }
    finally { setMotherGenerating(false); }
  }
  async function startManualMother() {
    if (!editable || projectStatus === "ARCHIVED") return;
    setMotherError("");
    const response = await fetch(`/api/projects/${project.id}/mother-content`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "", body: "", outline: [], expectedVersion: 0 }) });
    const result = object(await response.json().catch(() => ({})));
    if (!response.ok) { setMotherError(text(result.message) || text(result.error) || "无法开始写作"); return; }
    const next: MotherSnapshot = { title: "", body: "", outline: [], version: typeof result.version === "number" ? result.version : 1, origin: "HUMAN", originNote: null };
    setAppliedMotherContent(next); setSavedMotherVersion(next.version); setMotherHistory([{ ...next, version: 1, revision: next.version, createdAt: new Date().toISOString(), current: true }]);
  }

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
          <Card className="p-5"><StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editable} unifiedAnalysisOutput={unifiedOutput} /><div id="creative-basis"><EvidenceBoard projectId={project.id} summary={project.creativeBasis} editable={editable} /></div></Card>
          {creationStage === "PREPARING" ? <Card className="p-5"><BriefEditor projectId={project.id} projectStatus={projectStatus} initial={project.creativePlan.plan} stored={project.creativePlan.storedPlan} origins={project.creativePlan.origins} autoPrefilled={project.creativePlan.autoPrefilled} titleReferences={project.creativePlan.titleReferences} editable={editable && projectStatus !== "ARCHIVED"} onSaved={() => setAnalysisInputChanged(true)} onConfirmed={() => { setCreationStage("WRITING"); setProjectStatus("WRITING"); }} /></Card> : <Card id="mother-content" className="p-5"><div className="mb-4 flex flex-wrap justify-end gap-2"><Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setPlanDrawerOpen(true)}>查看创作方案</Button>{motherContent.version > 0 ? <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setHistoryOpen(true)}>查看历史版本</Button> : null}</div>{motherContent.version === 0 ? <MotherContentStart integrationStatus={ai.integrationStatus} editable={editable && projectStatus !== "ARCHIVED"} hasCreatorProfile={Boolean(ai.creatorProfile)} generating={motherGenerating} error={motherError} onGenerate={generateMotherContent} onManual={startManualMother} /> : <><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">核心母稿 · V{currentCreativeVersion}</p>{editable && projectStatus !== "ARCHIVED" && (ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK") ? <Button variant="secondary" disabled={motherGenerating} onClick={generateMotherContent}>{motherGenerating ? "正在生成核心母稿..." : "重新生成"}</Button> : null}</div>{motherMessage ? <p role="status" className="mb-3 text-sm text-[var(--success)]">✓ {motherMessage}</p> : null}{motherError ? <p role="alert" className="mb-3 text-sm text-[var(--danger)]">核心母稿生成失败：{motherError}</p> : null}<MotherContentEditor key={motherContent.version} projectId={project.id} initial={motherContent} editable={editable && projectStatus !== "ARCHIVED"} aiConfigured={ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK"} onRewriteRequest={setRewriteRequest} onSaved={setSavedMotherVersion} /></>}</Card>}
        </main>
        <aside className="min-w-0"><Card className="p-5 min-[901px]:sticky min-[901px]:top-5"><AICreationPanel projectId={project.id} integrationStatus={ai.integrationStatus} creatorProfile={ai.creatorProfile} editable={editable && projectStatus !== "ARCHIVED"} motherVersion={motherContent.version} motherReady={motherContent.version > 0} motherGenerating={motherGenerating} creativeBasis={project.creativeBasis} unifiedAnalysis={ai.unifiedAnalysis} latestStatus={ai.latestAnalysisStatus} latestErrorCode={ai.latestAnalysisErrorCode} inputChanged={analysisInputChanged} sourceCount={project.sources.length} organizedSourceCount={project.sources.filter(({ sourceItem }) => sourceItem.materialAnalysis).length} planConfirmed={creationStage === "WRITING"} planReady={Boolean(project.creativePlan.plan.topic && project.creativePlan.plan.coreMessage)} onAnalysisUpdated={() => setAnalysisInputChanged(false)} onContinue={continueCreation} onGenerateMother={generateMotherContent} rewriteRequest={rewriteRequest} onMotherContentApplied={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); }} /><details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-xs text-[var(--text-secondary)]">项目管理与高级状态</summary><ProjectStatusPanel project={{ ...project, status: projectStatus }} editable={editable} /></details></Card></aside>
      </div>
      <StudioDrawer title="创作方案" open={planDrawerOpen} onClose={() => setPlanDrawerOpen(false)}><BriefEditor projectId={project.id} projectStatus={projectStatus} initial={project.creativePlan.plan} stored={project.creativePlan.storedPlan} origins={project.creativePlan.origins} autoPrefilled={project.creativePlan.autoPrefilled} titleReferences={project.creativePlan.titleReferences} editable={false} /></StudioDrawer>
      <StudioDrawer title="核心母稿历史版本" open={historyOpen} onClose={() => setHistoryOpen(false)}><div className="grid gap-3">{motherHistory.map((item) => <details key={`${item.version}-${item.createdAt}`} className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">V{item.version} · {item.origin === "KIMI" ? "Kimi 生成" : item.origin === "GPT_WEB" ? "GPT 网页成稿" : "人工创作"}{item.current ? " · 当前版本" : ""}<span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">{item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""}</span></summary><h3 className="mt-3 font-medium">{item.title || "未命名母稿"}</h3><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.body || "空白草稿"}</p></details>)}</div></StudioDrawer>
    </div>
    <div className={contentTab === "PACKAGE" ? "block" : "hidden"}><DeepContentWorkspace projectId={project.id} initialPackage={project.deepContentPackage} editable={editable && projectStatus !== "ARCHIVED"} integrationStatus={ai.integrationStatus} motherContent={{ ...motherContent, version: currentMotherVersion }} onMotherImported={(content) => { setAppliedMotherContent(content); setSavedMotherVersion(content.version); setCreationStage("WRITING"); setContentTab("MOTHER"); }} /></div>
    <div className={contentTab !== "MOTHER" && contentTab !== "PACKAGE" ? "block" : "hidden"}><PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={currentMotherVersion} variants={effectiveVariants} editable={editable && projectStatus !== "ARCHIVED"} integrationStatus={ai.integrationStatus} onSelectPlatform={selectPlatform} onVariantChange={(variant) => setPlatformVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} /></div>
  </>;
}

function MotherContentStart({ integrationStatus, editable, hasCreatorProfile, generating, error, onGenerate, onManual }: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; editable: boolean; hasCreatorProfile: boolean; generating: boolean; error: string; onGenerate: () => void; onManual: () => void }) {
  const configured = integrationStatus === "CONFIGURED" || integrationStatus === "MOCK";
  return <section className="rounded-xl border border-dashed p-6 sm:p-8"><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">核心母稿</h2><Badge>AI First</Badge></div><p className="mt-3 text-sm text-[var(--text-secondary)]">创作方案已准备完成。AI 将结合参考素材、智能整理、统一创作分析、创作方案、已采用创作依据{hasCreatorProfile ? "和创作者画像" : ""}，生成第一版核心母稿。</p><ul className="mt-4 grid gap-2 text-sm"><li>✓ 参考素材与智能整理</li><li>✓ 统一创作分析与创作方案</li><li>✓ 已采用创作依据</li>{hasCreatorProfile ? <li>✓ 创作者画像</li> : <li className="text-[var(--text-secondary)]">完善创作者画像后，内容会更贴近个人表达。</li>}</ul>{configured && editable ? <Button className="mt-6" disabled={generating} onClick={onGenerate}>{generating ? "正在生成核心母稿..." : "AI 生成核心母稿"}</Button> : <div className="mt-6 rounded-lg border border-dashed p-3 text-sm"><p>AI 创作服务当前不可用。</p><a className="mt-2 inline-block text-[var(--accent)]" href="/settings/integrations">检查 Kimi 配置</a></div>}{editable ? <Button className="mt-3 sm:ml-3" variant="secondary" disabled={generating} onClick={onManual}>手动开始写</Button> : null}{generating ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">正在生成核心母稿，请稍候…</p> : null}{error ? <div role="alert" className="mt-4 text-sm text-[var(--danger)]"><p>核心母稿生成失败</p><p className="mt-1">{error}</p></div> : null}</section>;
}
