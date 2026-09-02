"use client";

import { Button, Card } from "@content-center/ui";
import { useRef, useState } from "react";
import { BriefEditor, type MySupplement } from "./brief-editor";
import { MotherContentEditor } from "./mother-content-editor";
import { StudioSources, type ProjectSource } from "./studio-sources";
import { StudioDrawer } from "./studio-drawer";
import { PlatformContentFactory } from "./platform-content-factory";
import { PLATFORM_LABELS, SUPPORTED_PLATFORMS, type PlatformVariantView, type SupportedPlatform } from "@/lib/platforms";
import type { CreativePlan } from "@/server/studio/creative-brief-prefill";
import type { MotherContentVersion } from "@/server/mother-content-service";

type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };
type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type MotherSnapshot = { title: string; body: string; outline: string[]; version: number; origin: "HUMAN" | "KIMI" | "GPT_WEB"; originNote: string | null };
type CreativePlanHandoff = { plan: CreativePlan; storedPlan: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; stage: "PREPARING" | "WRITING" };
type DraftWarning = { code: string; message: string };

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export function StudioShell({ project, availableSources, editable, ai, initialWarnings = [] }: {
  project: { id: string; title: string; status: ProjectStatus; description: string | null; goal: string | null; audience: string | null; sources: ProjectSource[]; creativePlan: CreativePlanHandoff; motherContent: MotherSnapshot; motherHistory: MotherContentVersion[]; platformVariants: PlatformVariantView[] };
  availableSources: AvailableSource[];
  editable: boolean;
  ai: { integrationStatus: "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "DISABLED" | "ERROR" | "MOCK"; creatorProfile: { displayName: string; positioning: string } | null };
  initialWarnings?: DraftWarning[];
}) {
  const initialPlan = project.creativePlan.plan;
  const briefVersion = useRef(initialPlan.version);
  const [supplement, setSupplement] = useState<MySupplement>({ coreMessage: initialPlan.coreMessage, audience: initialPlan.audience, background: initialPlan.background, angle: initialPlan.angle });
  const [supplementBusy, setSupplementBusy] = useState(false);
  const [supplementMessage, setSupplementMessage] = useState("");
  const [mother, setMother] = useState(project.motherContent);
  const [motherHistory, setMotherHistory] = useState(project.motherHistory);
  const [motherGenerating, setMotherGenerating] = useState(false);
  const [motherMessage, setMotherMessage] = useState("");
  const [motherError, setMotherError] = useState("");
  const [warnings, setWarnings] = useState<DraftWarning[]>(initialWarnings);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tab, setTab] = useState<"CREATE" | "PLATFORM">("CREATE");
  const [activePlatform, setActivePlatform] = useState<SupportedPlatform>("DOUYIN");
  const [variants, setVariants] = useState(project.platformVariants);
  const editableProject = editable && project.status !== "ARCHIVED";
  const configured = ai.integrationStatus === "CONFIGURED" || ai.integrationStatus === "MOCK";

  async function saveSupplement(showMessage = true) {
    setSupplementBusy(true); if (showMessage) setSupplementMessage("");
    try {
      const response = await fetch(`/api/projects/${project.id}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: initialPlan.topic || project.title, coreMessage: supplement.coreMessage, audience: supplement.audience, background: supplement.background, angle: supplement.angle, coreQuestion: initialPlan.coreQuestion, keyPoints: initialPlan.keyPoints, structure: initialPlan.structure, tone: initialPlan.tone, risks: initialPlan.risks, expectedVersion: briefVersion.current }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || result.error || "保存失败"); briefVersion.current = result.version; if (showMessage) setSupplementMessage("已保存"); return true;
    } catch (cause) { setSupplementMessage(cause instanceof Error ? cause.message : "保存失败"); return false; }
    finally { setSupplementBusy(false); }
  }

  async function generateMotherContent() {
    if (motherGenerating || !editableProject) return;
    setMotherGenerating(true); setMotherError(""); setMotherMessage(""); setWarnings([]);
    try {
      if (!await saveSupplement(false)) throw new Error("请先保存我的补充");
      const runResponse = await fetch(`/api/projects/${project.id}/ai/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "GENERATE_MOTHER_CONTENT" }) });
      const run = await runResponse.json().catch(() => ({})); if (!runResponse.ok) throw new Error(run.message || run.error || "口播稿生成失败");
      const applyResponse = await fetch(`/api/projects/${project.id}/ai/runs/${text(object(run).id)}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: mother.version, confirmReplace: Boolean(mother.body.trim()) }) });
      const applied = object(await applyResponse.json().catch(() => ({}))); if (!applyResponse.ok) throw new Error(text(applied.message) || text(applied.error) || "口播稿生成失败");
      const result = object(applied.motherContent); const next: MotherSnapshot = { title: text(result.title), body: text(result.body), outline: stringArray(result.outline), version: typeof result.version === "number" ? result.version : mother.version + 1, origin: "KIMI", originNote: typeof result.originNote === "string" ? result.originNote : null };
      setMother(next); setWarnings(Array.isArray(applied.warnings) ? applied.warnings.filter((item): item is DraftWarning => Boolean(item && typeof item === "object" && "message" in item)) : []);
      const historyResponse = await fetch(`/api/projects/${project.id}/mother-content`); if (historyResponse.ok) setMotherHistory(await historyResponse.json() as MotherContentVersion[]);
      setMotherMessage(mother.version ? "新版本口播稿已生成" : "第一版口播稿已生成");
    } catch (cause) { setMotherError(cause instanceof Error ? cause.message : "口播稿生成失败"); }
    finally { setMotherGenerating(false); }
  }

  function useReference(content: string) { setSupplement((current) => ({ ...current, coreMessage: [current.coreMessage.trim(), content].filter(Boolean).join("\n") })); setSupplementMessage("已放入“我的核心观点”，保存后生效"); }
  const effectiveVariants = variants.map((variant) => ({ ...variant, isStale: variant.sourceMotherVersion < mother.version }));

  return <><nav aria-label="创作区域" className="mb-5 flex gap-1 rounded-xl border bg-[var(--surface)] p-1"><button className={`rounded-lg px-4 py-2.5 text-sm ${tab === "CREATE" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setTab("CREATE")}>创作</button><button className={`rounded-lg px-4 py-2.5 text-sm ${tab === "PLATFORM" ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)]"}`} onClick={() => setTab("PLATFORM")}>平台内容与审核</button></nav>
    {tab === "CREATE" ? <main className="grid gap-5"><Card className="p-5"><StudioSources projectId={project.id} sources={project.sources} availableSources={availableSources} editable={editableProject} onUse={useReference} /></Card><Card className="p-5"><BriefEditor value={supplement} editable={editableProject} busy={supplementBusy} message={supplementMessage} onChange={setSupplement} onSave={() => void saveSupplement()} /></Card><Card id="mother-content" className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">3. 我的口播稿</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">AI 以你的补充为最高优先级，参考素材只提供机制和背景。</p></div>{mother.version ? <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setHistoryOpen(true)}>历史版本</Button> : null}</div>{warnings.length ? <div className="mt-4 rounded-xl border border-[var(--warning)] p-3 text-sm text-[var(--warning)]">有 {warnings.length} 处需要确认</div> : null}{motherMessage ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{motherMessage}</p> : null}{motherError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{motherError}</p> : null}{mother.version ? <><div className="my-4 flex justify-end">{configured && editableProject ? <Button variant="secondary" disabled={motherGenerating} onClick={generateMotherContent}>{motherGenerating ? "正在生成…" : "重新生成我的口播稿"}</Button> : null}</div><MotherContentEditor key={mother.version} projectId={project.id} initial={mother} editable={editableProject} onSaved={(version) => setMother((current) => ({ ...current, version }))} /></> : <section className="mt-5 rounded-xl border border-dashed p-6"><p className="text-sm text-[var(--text-secondary)]">补充你的观点后，生成一版可继续编辑的口播稿。不会把参考素材中的经历当成你的经历。</p>{configured && editableProject ? <Button className="mt-5" disabled={motherGenerating} onClick={generateMotherContent}>{motherGenerating ? "正在生成我的口播稿…" : "生成我的口播稿"}</Button> : <p className="mt-4 text-sm">AI 服务不可用，请先检查 Kimi 配置。</p>}</section>}</Card></main> : <section><nav aria-label="平台版本" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-[var(--surface)] p-1">{SUPPORTED_PLATFORMS.map((platform) => <button key={platform} className={`min-w-24 rounded-lg px-3 py-2 text-sm ${activePlatform === platform ? "bg-[var(--surface-elevated)]" : "text-[var(--text-secondary)]"}`} onClick={() => setActivePlatform(platform)}>{PLATFORM_LABELS[platform]}</button>)}</nav><PlatformContentFactory projectId={project.id} activePlatform={activePlatform} motherVersion={mother.version} variants={effectiveVariants} editable={editableProject} integrationStatus={ai.integrationStatus} onSelectPlatform={setActivePlatform} onVariantChange={(variant) => setVariants((current) => [...current.filter((item) => item.platform !== variant.platform), variant])} /></section>}
    <StudioDrawer title="口播稿历史版本" open={historyOpen} onClose={() => setHistoryOpen(false)}><div className="grid gap-3">{motherHistory.map((item) => <details key={`${item.version}-${item.createdAt}`} className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">V{item.version}{item.current ? " · 当前版本" : ""}</summary><h3 className="mt-3 font-medium">{item.title || "未命名口播稿"}</h3><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.body || "空白草稿"}</p></details>)}</div></StudioDrawer>
  </>;
}
