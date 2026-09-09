"use client";

import { Button, Card } from "@content-center/ui";
import { useEffect, useRef, useState } from "react";
import { BriefEditor, type MySupplement } from "./brief-editor";
import { MotherContentEditor } from "./mother-content-editor";
import { StudioSources, type ProjectSource } from "./studio-sources";
import { StudioDrawer } from "./studio-drawer";
import { PlatformContentFactory } from "./platform-content-factory";
import { PLATFORM_LABELS, SUPPORTED_PLATFORMS, type PlatformVariantView, type SupportedPlatform } from "@/lib/platforms";
import type { CreativePlan } from "@/server/studio/creative-brief-prefill";
import type { MotherContentVersion } from "@/server/mother-content-service";
import type { ContentProductionPlan } from "@/lib/content-production";
import { ContentProductionPreview, ShootabilityCheck } from "./content-production-preview";
import { StudioMethodSelector } from "./studio-method-selector";
import type { ProjectMethodStateDTO } from "@/server/project-methods/service";
import { CreationFeedback } from "./creation-feedback";
import type { CreationFeedbackContext } from "@/server/creation-feedback/service";
import { useRouter } from "next/navigation";
import { StudioDefaultMethod } from "./studio-default-method";
import type { StudioDefaultContentMethodDTO } from "@/server/default-content-method/service";

type AvailableSource = { id: string; title: string | null; displayName: string; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null; confirmedVersion: number | null; confirmedWarnings: string[] };
type CreativePlanHandoff = { plan: CreativePlan; storedPlan: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; stage: "PREPARING" | "WRITING" };
type DraftWarning = { code: string; message: string; reason?: string; suggestion?: string };

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function warningKey(warning: Pick<DraftWarning, "code" | "message">) { return `${warning.code}:${warning.message}`; }

export function StudioShell({ project, methods, defaultMethod, availableSources, feedback, editable, ai, initialWarnings = [] }: {
  project: { id: string; title: string; status: ProjectStatus; description: string | null; goal: string | null; audience: string | null; sources: ProjectSource[]; creativePlan: CreativePlanHandoff; motherContent: MotherSnapshot; motherHistory: MotherContentVersion[]; platformVariants: PlatformVariantView[]; productionPlan: ContentProductionPlan | null };
  methods: ProjectMethodStateDTO;
  defaultMethod: StudioDefaultContentMethodDTO | null;
  availableSources: AvailableSource[];
  feedback: CreationFeedbackContext;
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; creatorProfile: { displayName: string; positioning: string } | null };
  initialWarnings?: DraftWarning[];
}) {
  const router = useRouter();
  const initialPlan = project.creativePlan.plan;
  const briefVersion = useRef(initialPlan.version);
  const [supplement, setSupplement] = useState<MySupplement>({ coreMessage: initialPlan.coreMessage, audience: initialPlan.audience, background: initialPlan.background, angle: initialPlan.angle });
  const [supplementBusy, setSupplementBusy] = useState(false);
  const [supplementMessage, setSupplementMessage] = useState("");
  const [mother, setMother] = useState(project.motherContent);
  const [motherHistory, setMotherHistory] = useState(project.motherHistory);
  const motherGeneratingRef = useRef(false);
  const [motherGenerating, setMotherGenerating] = useState(false);
  const [motherMessage, setMotherMessage] = useState("");
  const [motherError, setMotherError] = useState("");
  const [warnings, setWarnings] = useState<DraftWarning[]>(initialWarnings);
  const [confirmedWarningKeys, setConfirmedWarningKeys] = useState<string[]>(project.motherContent.confirmedWarnings);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [productionPlan, setProductionPlan] = useState(project.productionPlan);
  const [methodState, setMethodState] = useState(methods);
  const [selectedAngle, setSelectedAngle] = useState(project.productionPlan?.recommendedAngle || "");
  const [selectedTitle, setSelectedTitle] = useState(project.motherContent.title || project.productionPlan?.recommendedTitle || "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tab, setTab] = useState<"CREATE" | "PLATFORM">("CREATE");
  const [activePlatform, setActivePlatform] = useState<SupportedPlatform>("DOUYIN");
  const [variants, setVariants] = useState(project.platformVariants);
  const [feedbackContext, setFeedbackContext] = useState(feedback);
  const editableProject = editable && project.status !== "ARCHIVED";
  const configured = ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK";
  const motherConfirmed = mother.version > 0 && mother.confirmedVersion === mother.version;
  const unresolvedWarningCount = warnings.filter((warning) => !confirmedWarningKeys.includes(warningKey(warning))).length;

  useEffect(() => setFeedbackContext(feedback), [feedback]);

  function invalidateFeedback() {
    setFeedbackContext((current) => current ? { ...current, available: false, sourceAiRunId: null, methods: [], feedback: null, unavailableReason: "NO_APPLIED_GENERATION" } : current);
    router.refresh();
  }

  async function refreshWarnings(body: string) {
    try {
      const response = await fetch(`/api/projects/${project.id}/mother-content/warnings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const result = object(await response.json().catch(() => ({})));
      if (!response.ok) throw new Error(text(result.message) || "暂时无法检查需要确认的内容。");
      setWarnings(Array.isArray(result.warnings) ? result.warnings.filter((item): item is DraftWarning => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).code === "string" && typeof (item as Record<string, unknown>).message === "string")) : []);
      setConfirmedWarningKeys([]);
    } catch (cause) { setMotherError(cause instanceof Error ? cause.message : "暂时无法检查需要确认的内容。"); }
  }

  async function saveWarningConfirmations(nextKeys: string[]) {
    const response = await fetch(`/api/projects/${project.id}/mother-content/confirmation`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: mother.version, warningKeys: nextKeys }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "确认状态保存失败。");
    setConfirmedWarningKeys(nextKeys);
  }

  async function confirmWarning(warning: DraftWarning) {
    setMotherError("");
    try { await saveWarningConfirmations([...new Set([...confirmedWarningKeys, warningKey(warning)])]); setMotherMessage("已记录这项确认。"); }
    catch (cause) { setMotherError(cause instanceof Error ? cause.message : "确认状态保存失败。"); }
  }

  async function confirmMother() {
    if (!editableProject || !mother.version || unresolvedWarningCount) return;
    setMotherError(""); setMotherMessage("");
    try {
      const response = await fetch(`/api/projects/${project.id}/mother-content/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: mother.version }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "口播稿确认失败，请稍后重试。");
      setMother((current) => ({ ...current, confirmedVersion: current.version }));
      setMotherMessage("口播稿已确认，可以生成平台版本。");
      setTab("PLATFORM");
      setActivePlatform("DOUYIN");
    } catch (cause) { setMotherError(cause instanceof Error ? cause.message : "口播稿确认失败，请稍后重试。"); }
  }

  async function saveSupplement(showMessage = true) {
    setSupplementBusy(true); if (showMessage) setSupplementMessage("");
    try {
      const response = await fetch(`/api/projects/${project.id}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: initialPlan.topic || project.title, coreMessage: supplement.coreMessage, audience: supplement.audience, background: supplement.background, angle: supplement.angle, coreQuestion: initialPlan.coreQuestion, keyPoints: initialPlan.keyPoints, structure: initialPlan.structure, tone: initialPlan.tone, risks: initialPlan.risks, expectedVersion: briefVersion.current }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || result.error || "保存失败"); briefVersion.current = result.version; if (showMessage) setSupplementMessage("已保存"); return true;
    } catch (cause) { setSupplementMessage(cause instanceof Error ? cause.message : "保存失败"); return false; }
    finally { setSupplementBusy(false); }
  }

  async function generateMotherContent(angle?: string) {
    if (motherGeneratingRef.current || !editableProject) return;
    motherGeneratingRef.current = true;
    setMotherGenerating(true); setMotherError(""); setMotherMessage(""); setWarnings([]);
    try {
      if (!await saveSupplement(false)) throw new Error("请先保存我的补充");
      const runResponse = await fetch(`/api/projects/${project.id}/ai/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "GENERATE_MOTHER_CONTENT", ...(angle ? { instruction: angle } : {}) }) });
      const run = await runResponse.json().catch(() => ({})); if (!runResponse.ok) throw new Error(run.message || run.error || "口播稿生成失败");
      const applyResponse = await fetch(`/api/projects/${project.id}/ai/runs/${text(object(run).id)}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: mother.version, confirmReplace: Boolean(mother.body.trim()) }) });
      const applied = object(await applyResponse.json().catch(() => ({}))); if (!applyResponse.ok) throw new Error(text(applied.message) || text(applied.error) || "口播稿生成失败");
      const result = object(applied.motherContent); const next: MotherSnapshot = { title: text(result.title), body: text(result.body), outline: stringArray(result.outline), version: typeof result.version === "number" ? result.version : mother.version + 1, origin: "KIMI", originNote: typeof result.originNote === "string" ? result.originNote : null, confirmedVersion: null, confirmedWarnings: [] };
      const plan = object(applied.productionPlan) as ContentProductionPlan;
      const nextWarnings = Array.isArray(applied.warnings) ? applied.warnings.filter((item): item is DraftWarning => Boolean(item && typeof item === "object" && "message" in item)).map((item) => ({ ...item, reason: text((item as DraftWarning).reason), suggestion: text((item as DraftWarning).suggestion) })) : [];
      setMother({ ...next, confirmedVersion: null, confirmedWarnings: [] }); setProductionPlan(plan); setSelectedAngle(text(plan.recommendedAngle)); setSelectedTitle(next.title); setWarnings(nextWarnings); setConfirmedWarningKeys([]); setWarningsOpen(false); invalidateFeedback();
      const historyResponse = await fetch(`/api/projects/${project.id}/mother-content`); if (historyResponse.ok) setMotherHistory(await historyResponse.json() as MotherContentVersion[]);
      setMotherMessage(mother.version ? "新版本口播稿已生成" : "第一版口播稿已生成");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "口播稿生成失败";
      setMotherError(mother.version ? `${message} 原有口播稿仍然保留，可以稍后重试。` : `${message} 请稍后重试。`);
    }
    finally { motherGeneratingRef.current = false; setMotherGenerating(false); }
  }

  async function selectTitle(title: string) {
    if (!editableProject || title === mother.title) { setSelectedTitle(title); return; }
    setSelectedTitle(title); setMotherError("");
    try {
      const response = await fetch(`/api/projects/${project.id}/mother-content`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body: mother.body, outline: mother.outline, expectedVersion: mother.version }) });
      const result = object(await response.json().catch(() => ({}))); if (!response.ok) throw new Error(text(result.message) || text(result.error) || "标题保存失败");
      const version = typeof result.version === "number" ? result.version : mother.version + 1;
      setMother((current) => ({ ...current, title, version, confirmedVersion: null, confirmedWarnings: [] })); setConfirmedWarningKeys([]); setWarningsOpen(false); invalidateFeedback(); await refreshWarnings(`${title}\n${mother.body}`); setMotherMessage("标题已采用");
    } catch (cause) { setSelectedTitle(mother.title); setMotherError(cause instanceof Error ? cause.message : "标题保存失败"); }
  }

  function useReference(content: string) { setSupplement((current) => ({ ...current, coreMessage: [current.coreMessage.trim(), content].filter(Boolean).join("\n") })); setSupplementMessage("已放入“我的核心观点”，保存后生效"); }
  const effectiveVariants = variants.map((variant) => ({ ...variant, isStale: variant.sourceMotherVersion < mother.version }));

  return <><nav aria-label="创作区域" className="mb-5 flex gap-1 rounded-xl border bg-[var(--surface)] p-1"><button className={`rounded-lg px-4 py-2.5 text-sm ${tab === "CREATE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setTab("CREATE")}>创作</button><button className={`rounded-lg px-4 py-2.5 text-sm ${tab === "PLATFORM" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setTab("PLATFORM")}>平台内容与审核</button></nav>
    {tab === "CREATE" ? <main className="grid gap-5"><Card className="p-5"><StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editableProject} onUse={useReference} /></Card><Card className="p-5"><BriefEditor value={supplement} editable={editableProject} busy={supplementBusy} message={supplementMessage} onChange={setSupplement} onSave={() => void saveSupplement()} /></Card><StudioDefaultMethod projectId={project.id} method={defaultMethod} editable={editableProject} configured={configured} motherVersion={mother.version} onUseTopic={(value) => { setSupplement((current) => ({ ...current, coreMessage: value })); setSupplementMessage("已放入我的核心观点，保存后生效"); }} onApplied={(content, nextWarnings) => { setMother((current) => ({ ...current, ...content, confirmedVersion: null, confirmedWarnings: [] })); setWarnings(nextWarnings); setConfirmedWarningKeys([]); setWarningsOpen(false); invalidateFeedback(); setMotherMessage("AI 建议已应用，你可以继续修改。"); }} /><StudioMethodSelector projectId={project.id} initial={methodState} editable={editableProject} onChange={setMethodState} />{productionPlan ? <ContentProductionPreview plan={productionPlan} selectedAngle={selectedAngle} selectedTitle={selectedTitle} busy={motherGenerating} editable={editableProject} onAngleChange={setSelectedAngle} onTitleChange={(title) => void selectTitle(title)} onRegenerate={() => void generateMotherContent(selectedAngle)} /> : null}<Card id="mother-content" className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">3. 我的口播稿</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">AI 以你的补充为最高优先级，参考素材只提供机制和背景。</p></div>{mother.version ? <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setHistoryOpen(true)}>历史版本</Button> : null}</div>{warnings.length ? <div className="mt-4"><button type="button" className="w-full rounded-xl border border-[var(--warning)] p-3 text-left text-sm text-[var(--warning)]" onClick={() => setWarningsOpen((current) => !current)}>有 {warnings.length} 处需要确认 · {warningsOpen ? "收起" : "查看详情"}</button>{warningsOpen ? <div className="mt-2 grid gap-2">{warnings.map((warning) => { const key = warningKey(warning); const confirmed = confirmedWarningKeys.includes(key); return <article key={key} className="rounded-xl border p-4 text-sm"><p className="font-medium">{warning.message}</p><p className="mt-2 text-[var(--text-secondary)]">风险原因：{warning.reason || "这项内容需要人工判断。"}</p><p className="mt-1 text-[var(--text-secondary)]">建议处理：{warning.suggestion || "核对原始素材，确认后再继续。"}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant={confirmed ? "secondary" : "primary"} disabled={confirmed || !editableProject} onClick={() => void confirmWarning(warning)}>{confirmed ? "已确认" : "我已确认"}</Button><Button variant="ghost" disabled={!editableProject} onClick={() => { setConfirmedWarningKeys((current) => current.filter((item) => item !== key)); setMotherMessage("请返回正文修改这项内容。"); }}>返回修改</Button></div></article>; })}</div> : null}</div> : null}{motherMessage ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{motherMessage}</p> : null}{motherError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{motherError}</p> : null}{mother.version ? <><div className="my-4 flex justify-end">{configured && editableProject ? <Button variant="secondary" disabled={motherGenerating} onClick={() => void generateMotherContent()}>{motherGenerating ? "正在生成…" : "重新生成我的口播稿"}</Button> : null}</div><MotherContentEditor key={mother.version} projectId={project.id} initial={mother} editable={editableProject} onSaved={(version, snapshot) => { setMother((current) => ({ ...current, version, title: snapshot.title, body: snapshot.body, outline: snapshot.outline, confirmedVersion: null, confirmedWarnings: [] })); invalidateFeedback(); setWarnings([]); setConfirmedWarningKeys([]); setWarningsOpen(false); void refreshWarnings(snapshot.body); }} />{unresolvedWarningCount ? <p className="mt-4 text-sm text-[var(--warning)]">还有 {unresolvedWarningCount} 处内容需要确认。</p> : null}<Button className="mt-4 w-full" disabled={!editableProject || unresolvedWarningCount > 0 || !mother.version || motherGenerating} onClick={() => void confirmMother()}>确认这版口播稿，进入平台适配</Button>{productionPlan ? <ShootabilityCheck plan={productionPlan} warningCount={warnings.length} /> : null}</> : <section className="mt-5 rounded-xl border border-dashed p-6"><p className="text-sm text-[var(--text-secondary)]">补充你的观点后，生成一版可继续编辑的口播稿。不会把参考素材中的经历当成你的经历。</p>{configured && editableProject ? <Button className="mt-5" disabled={motherGenerating} onClick={() => void generateMotherContent()}>{motherGenerating ? "正在生成我的口播稿…" : "生成我的口播稿"}</Button> : <p className="mt-4 text-sm">内容生成服务暂时不可用，请联系管理员。</p>}</section>}</Card><CreationFeedback projectId={project.id} context={feedbackContext} editable={editableProject} /></main> : <section><nav aria-label="平台版本" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-[var(--surface)] p-1">{SUPPORTED_PLATFORMS.map((platform) => <button key={platform} className={`min-w-24 rounded-lg px-3 py-2 text-sm ${activePlatform === platform ? "bg-[var(--surface-elevated)]" : "text-[var(--text-secondary)]"}`} onClick={() => setActivePlatform(platform)}>{PLATFORM_LABELS[platform]}</button>)}</nav>{motherConfirmed ? <PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={mother.version} variants={effectiveVariants} editable={editableProject} integrationStatus={ai.integrationStatus} motherConfirmed onSelectPlatform={setActivePlatform} onVariantChange={(variant) => setVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} /> : <Card className="p-6"><h2 className="font-semibold">请先确认当前口播稿</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">确认后才能生成平台版本，旧平台版本仍可查看。</p><Button className="mt-4" onClick={() => setTab("CREATE")}>返回确认口播稿</Button></Card>}</section>}
    <StudioDrawer title="口播稿历史版本" open={historyOpen} onClose={() => setHistoryOpen(false)}><div className="grid gap-3">{motherHistory.map((item) => <details key={`${item.version}-${item.createdAt}`} className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">V{item.version}{item.current ? " · 当前版本" : ""}</summary><h3 className="mt-3 font-medium">{item.title || "未命名口播稿"}</h3><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.body || "空白草稿"}</p></details>)}</div></StudioDrawer>
  </>;
}
