"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { AlertTriangle, BookOpenCheck, CheckCircle2, ChevronRight, CircleCheckBig, Eye, LibraryBig, MoreHorizontal, PencilLine, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BriefEditor, type MySupplement } from "./brief-editor";
import { MotherContentEditor, type StudioSelectionAction } from "./mother-content-editor";
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
import { StudioDefaultMethod, type StudioAssistantHandle } from "./studio-default-method";
import { ContentCanvas, type CanvasAssistantContext, type CanvasContextKind } from "./content-canvas";
import type { StudioDefaultContentMethodDTO } from "@/server/default-content-method/service";
import type { StudioActionRecommendation } from "@/server/ai/schemas";

type AvailableSource = { id: string; title: string | null; displayName: string; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null; confirmedVersion: number | null; confirmedWarnings: string[] };
type CreativePlanHandoff = { plan: CreativePlan; storedPlan: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; stage: "PREPARING" | "WRITING" };
type DraftWarning = { code: string; message: string; reason?: string; suggestion?: string };
type ContextFact = { text: string; source: "CREATOR_PROFILE" | "PROJECT_EVIDENCE" | "MY_SUPPLEMENT" | "CURRENT_DRAFT"; kind: string };
type ContextSummary = { topic: string; goal: string; ownFacts: ContextFact[]; profile: { displayName: string; positioning: string } | null; creatorUnderstandingCount: number; externalSourceCount: number; handoff: string | null };

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function warningKey(warning: Pick<DraftWarning, "code" | "message">) { return `${warning.code}:${warning.message}`; }
function isBlockingWarning(warning: DraftWarning) { return warning.code === "POSSIBLE_SOURCE_COPY" || warning.code === "UNVERIFIED_REFERENCE_CLAIM"; }
function historyLabel(version: number, current: boolean) { return current ? "当前稿件" : version === 1 ? "首次保存" : `第 ${version} 次修改`; }

export function StudioShell({ project, methods, defaultMethod, recommendedActions, availableSources, feedback, editable, ai, contextSummary, initialWarnings = [] }: {
  project: { id: string; title: string; status: ProjectStatus; description: string | null; goal: string | null; audience: string | null; sources: ProjectSource[]; creativePlan: CreativePlanHandoff; motherContent: MotherSnapshot; motherHistory: MotherContentVersion[]; platformVariants: PlatformVariantView[]; productionPlan: ContentProductionPlan | null };
  methods: ProjectMethodStateDTO;
  defaultMethod: StudioDefaultContentMethodDTO | null;
  recommendedActions: StudioActionRecommendation[];
  availableSources: AvailableSource[];
  feedback: CreationFeedbackContext;
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; creatorProfile: { displayName: string; positioning: string } | null };
  contextSummary: ContextSummary;
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tab, setTab] = useState<"CREATE" | "PLATFORM">("CREATE");
  const [contextTab, setContextTab] = useState<"SOURCES" | "FACTS" | "PERSON" | "METHODS">("SOURCES");
  const [sourceManageRequest, setSourceManageRequest] = useState(0);
  const [methodSelectRequest, setMethodSelectRequest] = useState(0);
  const [supplementOpen, setSupplementOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [activePlatform, setActivePlatform] = useState<SupportedPlatform>("DOUYIN");
  const [variants, setVariants] = useState(project.platformVariants);
  const [feedbackContext, setFeedbackContext] = useState(feedback);
  const assistantRef = useRef<StudioAssistantHandle>(null);
  const editableProject = editable && project.status !== "ARCHIVED";
  const configured = ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK";
  const motherConfirmed = mother.version > 0 && mother.confirmedVersion === mother.version;
  const advisoryWarnings = warnings.filter((warning) => !isBlockingWarning(warning));
  const blockingWarnings = warnings.filter((warning) => isBlockingWarning(warning));
  const unresolvedBlockingWarnings = blockingWarnings.filter((warning) => !confirmedWarningKeys.includes(warningKey(warning)));

  useEffect(() => setFeedbackContext(feedback), [feedback]);
  useEffect(() => {
    const stored = window.localStorage.getItem("studio-assistant-open");
    if (stored === "false") setAssistantOpen(false);
  }, []);
  useEffect(() => { if (selection) setAssistantOpen(true); }, [selection]);

  function toggleAssistant(next: boolean) {
    setAssistantOpen(next);
    window.localStorage.setItem("studio-assistant-open", String(next));
  }

  function runSelectionAction(action: StudioSelectionAction) {
    toggleAssistant(true);
    window.setTimeout(() => assistantRef.current?.executeSelection(action), 0);
  }

  function openCanvasContext(kind: CanvasContextKind) {
    if (kind === "brief") setSupplementOpen(true);
    if (kind === "sources") { setContextTab("SOURCES"); setSourceManageRequest((current) => current + 1); }
    if (kind === "facts") setContextTab("FACTS");
    if (kind === "methods") { setContextTab("METHODS"); setMethodSelectRequest((current) => current + 1); }
  }

  function invalidateFeedback() {
    setFeedbackContext((current) => current ? { ...current, available: false, sourceAiRunId: null, methods: [], feedback: null, unavailableReason: "NO_APPLIED_GENERATION" } : current);
    router.refresh();
  }

  async function refreshWarnings(body: string) {
    try {
      const response = await fetch(`/api/projects/${project.id}/mother-content/warnings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const result = object(await response.json().catch(() => ({})));
      if (!response.ok) throw new Error(text(result.message) || "暂时无法完成内容检查。");
      setWarnings(Array.isArray(result.warnings) ? result.warnings.filter((item): item is DraftWarning => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).code === "string" && typeof (item as Record<string, unknown>).message === "string")) : []);
      setConfirmedWarningKeys([]);
    } catch (cause) { setMotherError(cause instanceof Error ? cause.message : "暂时无法完成内容检查。"); }
  }

  async function saveWarningConfirmations(nextKeys: string[]) {
    const response = await fetch(`/api/projects/${project.id}/mother-content/confirmation`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: mother.version, warningKeys: nextKeys }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "确认状态保存失败。");
    setConfirmedWarningKeys(nextKeys);
  }

  async function confirmMother() {
    if (!editableProject || !mother.version || unresolvedBlockingWarnings.length) return;
    setMotherError(""); setMotherMessage("");
    try {
      const checkedKeys = [...new Set([...confirmedWarningKeys, ...advisoryWarnings.map(warningKey)])];
      if (checkedKeys.length !== confirmedWarningKeys.length) await saveWarningConfirmations(checkedKeys);
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
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || result.error || "保存失败"); briefVersion.current = result.version; router.refresh(); if (showMessage) setSupplementMessage("已保存"); return true;
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
      setMotherMessage(mother.version ? "新的口播稿已生成" : "第一版口播稿已生成");
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

  const handleAIApply = (content: Omit<MotherSnapshot, "confirmedVersion" | "confirmedWarnings">, nextWarnings: DraftWarning[]) => {
    setMother((current) => ({ ...current, ...content, confirmedVersion: null, confirmedWarnings: [] }));
    setWarnings(nextWarnings); setConfirmedWarningKeys([]); setWarningsOpen(false); setSelection(null); invalidateFeedback(); setMotherMessage("AI 建议已应用，你可以继续修改。");
  };
  const sourceLabels = { CREATOR_PROFILE: "人物已确认事实", PROJECT_EVIDENCE: "我方资料", MY_SUPPLEMENT: "我的补充", CURRENT_DRAFT: "当前稿件" } as const;
  const supplementCount = Object.values(supplement).filter((value) => value.trim()).length;
  const supplementSummary = supplement.coreMessage.trim() || supplement.background.trim() || "还没有补充我方观点或真实情况";
  const ourTake = initialPlan.coreMessage.trim() || initialPlan.angle.trim() || contextSummary.goal;
  const contextPanel = <div className="studio-context-stack">
    <header className="studio-context-heading"><h2>创作上下文</h2><span>本次写作使用</span></header>
    <section className="studio-context-hero"><p><Target size={15} />当前主题</p><h3>{contextSummary.topic}</h3><dl><div><dt>创作任务</dt><dd>{project.goal || "继续完善当前口播稿"}</dd></div><div><dt>我们的切入</dt><dd>{ourTake}</dd></div></dl><div><i>{mother.version ? "已进入创作" : "准备开始"}</i><i>资料 {project.sources.length}</i><i>我方依据 {contextSummary.ownFacts.length}</i></div>{contextSummary.handoff === "BENCHMARK_TOPIC" ? <small>来自对标启发，外部内容只作参考。</small> : null}</section>
    <details className="studio-supplement-disclosure" open={supplementOpen} onToggle={(event) => setSupplementOpen(event.currentTarget.open)}><summary><PencilLine size={17} /><span><strong>我的补充 <i>{supplementCount} 项</i></strong><small>{supplementSummary}</small></span><b>{supplementCount ? "编辑 / 查看" : "补充我的观点"}</b><ChevronRight size={16} /></summary><div><BriefEditor value={supplement} editable={editableProject} busy={supplementBusy} message={supplementMessage} onChange={setSupplement} onSave={() => void saveSupplement()} /></div></details>
    <div className="studio-context-tabs" role="tablist" aria-label="创作上下文分类"><button role="tab" aria-selected={contextTab === "SOURCES"} onClick={() => setContextTab("SOURCES")}><LibraryBig size={15} />资料</button><button role="tab" aria-selected={contextTab === "FACTS"} onClick={() => setContextTab("FACTS")}><ShieldCheck size={15} />我方依据</button><button role="tab" aria-selected={contextTab === "PERSON"} onClick={() => setContextTab("PERSON")}><UserRound size={15} />人物</button><button role="tab" aria-selected={contextTab === "METHODS"} onClick={() => setContextTab("METHODS")}><BookOpenCheck size={15} />方法</button></div>
    {contextTab === "SOURCES" ? <section className="studio-context-detail studio-context-surface"><StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editableProject} manageRequest={sourceManageRequest} onManageRequestHandled={() => setSourceManageRequest(0)} onUse={useReference} /></section> : null}
    {contextTab === "FACTS" ? <section className="studio-context-detail studio-context-surface"><div className="flex items-center justify-between"><h3>当前可用的我方依据</h3><span>{contextSummary.ownFacts.length} 条</span></div>{contextSummary.ownFacts.length ? <ul>{contextSummary.ownFacts.map((fact, index) => <li key={`${fact.source}-${index}`}><p>{fact.text}</p><small><CheckCircle2 size={12} />可以直接使用 · {sourceLabels[fact.source]}</small></li>)}</ul> : <div className="studio-context-empty"><ShieldCheck size={20} /><p>还没有已确认的我方依据</p><span>可以继续写观点或明确的假设场景；需要结果支撑时再补真实案例或数据。</span></div>}</section> : null}
    {contextTab === "PERSON" ? <section className="studio-context-detail studio-context-surface"><h3>人物与表达</h3>{contextSummary.profile ? <div className="studio-profile-summary"><span><UserRound size={18} /></span><div><strong>{contextSummary.profile.displayName}</strong><p>{contextSummary.profile.positioning || "已有人物画像，详细信息可在设置中维护。"}</p><small>另有 {contextSummary.creatorUnderstandingCount} 项表达偏好和当前理解参与创作</small></div></div> : <div className="studio-context-empty"><UserRound size={20} /><p>暂未补充人物信息</p><span>保持空白即可，AI 不会因此虚构身份或经历。</span><Link href="/settings/creator-profile">补充人物信息</Link></div>}</section> : null}
    {contextTab === "METHODS" ? <div className="studio-method-context"><section className="studio-context-detail studio-context-surface"><div className="flex items-center justify-between"><h3>鑫世界默认创作方式</h3><Badge>{defaultMethod ? "当前已自动应用" : "未设置"}</Badge></div>{defaultMethod ? <ul className="studio-method-summary">{defaultMethod.sections.slice(0, 4).flatMap((section) => section.items.slice(0, 1)).map((item) => <li key={item.text}>{item.text}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">当前没有已发布的默认方法。</p>}</section><StudioMethodSelector projectId={project.id} initial={methodState} editable={editableProject} openRequest={methodSelectRequest} onOpenRequestHandled={() => setMethodSelectRequest(0)} onChange={setMethodState} /></div> : null}
  </div>;
  const assistantPanel = ({ focus, openContext, openDraft }: CanvasAssistantContext) => <StudioDefaultMethod ref={assistantRef} projectId={project.id} method={defaultMethod} recommendedActions={recommendedActions} editable={editableProject} configured={configured} motherVersion={mother.version} selection={selection} focusKind={focus} contextStats={{ sources: project.sources.length, facts: contextSummary.ownFacts.length, methods: (defaultMethod ? 1 : 0) + methods.selected.length }} onClose={() => toggleAssistant(false)} onOpenContext={openContext} onOpenDraft={openDraft} onSelectionApplied={() => setSelection(null)} onUseTopic={(value) => { setSupplement((current) => ({ ...current, coreMessage: value })); setSupplementMessage("已放入我的核心观点，保存后生效"); }} onApplied={handleAIApply} />;
  const contentCheck = warnings.length ? <details className={`studio-content-check ${unresolvedBlockingWarnings.length ? "has-blocker" : ""}`} open={warningsOpen} onToggle={(event) => setWarningsOpen(event.currentTarget.open)}><summary><span>{unresolvedBlockingWarnings.length ? <AlertTriangle size={17} /> : <CircleCheckBig size={17} />}</span><div><strong>内容检查已完成</strong><small>{unresolvedBlockingWarnings.length ? `${unresolvedBlockingWarnings.length} 处需要处理后再继续` : `${advisoryWarnings.length} 处建议留意，不影响继续创作`}</small></div><b>{warningsOpen ? "收起" : "查看详情"}</b><ChevronRight size={16} /></summary><div>{warnings.map((warning) => <article key={warningKey(warning)} className={isBlockingWarning(warning) ? "is-blocking" : ""}><span>{isBlockingWarning(warning) ? "需要处理" : "建议留意"}</span><p>{warning.message}</p><small>{warning.suggestion || warning.reason || "可以继续修改这处表达。"}</small></article>)}</div></details> : <div className="studio-content-check is-clear"><CircleCheckBig size={17} /><span><strong>内容检查已完成</strong><small>当前未发现需要留意的内容</small></span></div>;
  const emptyDraft = <section className="studio-empty-draft"><header><span>当前选题</span><h2>{contextSummary.topic}</h2></header><div className="studio-empty-draft-grid"><article><span>我们的切入</span><p>{ourTake}</p></article>{project.sources.length || contextSummary.ownFacts.length ? <article><span>当前可用依据</span><p>{project.sources.length ? `${project.sources.length} 条资料正在使用` : ""}{project.sources.length && contextSummary.ownFacts.length ? " · " : ""}{contextSummary.ownFacts.length ? `${contextSummary.ownFacts.length} 条我方依据可以直接使用` : ""}</p></article> : null}</div><div className="studio-empty-draft-start"><strong>你可以从这里开始</strong><div><Button variant="secondary" onClick={() => setSupplementOpen(true)}><PencilLine size={16} />补充我的观点</Button><Button variant="secondary" onClick={() => setContextTab("SOURCES")}><LibraryBig size={16} />查看当前资料</Button>{configured && editableProject ? <Button disabled={motherGenerating} onClick={() => void generateMotherContent()}><Sparkles size={17} />{motherGenerating ? "正在生成…" : "直接生成第一版口播稿"}</Button> : null}</div></div>{!configured ? <p className="studio-empty-unavailable">内容生成服务暂时不可用，请联系管理员。</p> : null}<small>不会伪造大纲或我方经历；你的补充会优先进入创作。</small></section>;
  const draftEditor = <Card id="mother-content" className="studio-editor-card canvas-draft-editor"><header className="studio-document-header"><div><span>当前稿件</span><h1>我的口播稿</h1><p>你的补充优先，外部内容只作为参考。</p></div><div>{mother.version ? <Badge>已保存</Badge> : <Badge>空白稿</Badge>}{mother.version ? <><Button variant="ghost" onClick={() => setPreviewOpen(true)}><Eye size={15} />预览</Button><Button variant="secondary" onClick={() => setHistoryOpen(true)}>历史记录</Button><details className="studio-document-more"><summary aria-label="更多稿件操作"><MoreHorizontal size={17} /></summary><div><a href="#mother-outline">编辑大纲</a>{configured && editableProject ? <button type="button" disabled={motherGenerating} onClick={() => void generateMotherContent()}>{motherGenerating ? "正在生成…" : "重新生成稿件"}</button> : null}</div></details></> : null}</div></header>{productionPlan ? <details className="studio-plan-disclosure"><summary><span><strong>本次生成思路</strong><small>查看候选角度、标题和开场建议</small></span><ChevronRight size={16} /></summary><div><ContentProductionPreview plan={productionPlan} selectedAngle={selectedAngle} selectedTitle={selectedTitle} busy={motherGenerating} editable={editableProject} onAngleChange={setSelectedAngle} onTitleChange={(title) => void selectTitle(title)} onRegenerate={() => void generateMotherContent(selectedAngle)} /></div></details> : null}{contentCheck}{motherMessage ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{motherMessage}</p> : null}{motherError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{motherError}</p> : null}{mother.version ? <><MotherContentEditor key={mother.version} projectId={project.id} initial={mother} editable={editableProject} onSelectionChange={setSelection} onSelectionAction={runSelectionAction} onSaved={(version, snapshot) => { setMother((current) => ({ ...current, version, title: snapshot.title, body: snapshot.body, outline: snapshot.outline, confirmedVersion: null, confirmedWarnings: [] })); invalidateFeedback(); setWarnings([]); setConfirmedWarningKeys([]); setWarningsOpen(false); void refreshWarnings(snapshot.body); }} /><div className="studio-editor-actions"><Button disabled={!editableProject || unresolvedBlockingWarnings.length > 0 || !mother.version || motherGenerating} onClick={() => void confirmMother()}>{unresolvedBlockingWarnings.length ? `处理 ${unresolvedBlockingWarnings.length} 处问题后继续` : "确认稿件，进入平台适配"}</Button></div>{productionPlan ? <ShootabilityCheck plan={productionPlan} warningCount={blockingWarnings.length} /> : null}</> : emptyDraft}</Card>;
  const draftToolbar = <>{mother.version ? <><span className="draft-focus-save-state">已保存</span><button type="button" onClick={() => setPreviewOpen(true)}><Eye size={15} />预览</button><button type="button" onClick={() => setHistoryOpen(true)}>历史记录</button><details className="studio-document-more"><summary aria-label="更多稿件操作"><MoreHorizontal size={17} /></summary><div><a href="#mother-outline">编辑大纲</a>{configured && editableProject ? <button type="button" disabled={motherGenerating} onClick={() => void generateMotherContent()}>{motherGenerating ? "正在生成…" : "重新生成稿件"}</button> : null}</div></details></> : <span className="draft-focus-save-state">尚未开始</span>}</>;

  return <>
    <ContentCanvas projectId={project.id} projectTitle={project.title} brief={[contextSummary.topic, project.audience || initialPlan.audience || "受众待补充", initialPlan.coreQuestion || contextSummary.goal]} sources={project.sources.slice(0, 4).map(({ sourceItem }) => sourceItem.displayName)} facts={contextSummary.ownFacts.slice(0, 4).map(({ text }) => text)} methods={[...(defaultMethod ? ["鑫世界默认创作方法"] : []), ...methodState.selected.slice(0, 3).map(({ title }) => title)]} suggestions={recommendedActions.slice(0, 4).map(({ label }) => label)} draft={{ title: mother.title || "当前稿件", body: mother.body, version: mother.version, characters: mother.body.replace(/\s/g, "").length, updated: mother.version ? "已保存" : "尚未开始" }} draftToolbar={draftToolbar} draftEditor={<>{draftEditor}<CreationFeedback projectId={project.id} context={feedbackContext} editable={editableProject} /></>} contextTools={contextPanel} assistant={assistantPanel} assistantOpen={assistantOpen} onAssistantOpen={toggleAssistant} onContextKindChange={openCanvasContext} onPlatform={(platform) => { setActivePlatform(platform as SupportedPlatform); setTab("PLATFORM"); }} />
    {tab === "PLATFORM" ? <div className="platform-focus-layer"><button type="button" aria-label="返回画布" onClick={() => setTab("CREATE")} /><section><header><div><span>平台适配</span><strong>选择一个平台继续</strong></div><Button variant="secondary" onClick={() => setTab("CREATE")}>返回画布</Button></header><nav aria-label="平台稿">{SUPPORTED_PLATFORMS.map((platform) => <button key={platform} className={activePlatform === platform ? "is-active" : ""} onClick={() => setActivePlatform(platform)}>{PLATFORM_LABELS[platform]}</button>)}</nav>{motherConfirmed ? <PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={mother.version} variants={effectiveVariants} editable={editableProject} integrationStatus={ai.integrationStatus} motherConfirmed onSelectPlatform={setActivePlatform} onVariantChange={(variant) => setVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} /> : <Card className="p-6"><h2 className="font-semibold">请先确认当前口播稿</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">确认后选择一个平台生成；未选择的平台不会创建内容。</p></Card>}</section></div> : null}
    <StudioDrawer title="稿件预览" open={previewOpen} onClose={() => setPreviewOpen(false)}><article className="studio-document-preview"><h2>{mother.title || "未命名口播稿"}</h2><p>{mother.body || "当前还是空白稿。"}</p></article></StudioDrawer>
    <StudioDrawer title="口播稿历史记录" open={historyOpen} onClose={() => setHistoryOpen(false)}><div className="grid gap-3">{motherHistory.map((item) => <details key={`${item.version}-${item.createdAt}`} className="rounded-xl border p-4"><summary className="text-sm font-medium">{historyLabel(item.version, item.current)}</summary><h3 className="mt-3 font-medium">{item.title || "未命名口播稿"}</h3><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.body || "空白草稿"}</p></details>)}</div></StudioDrawer>
  </>;
}
