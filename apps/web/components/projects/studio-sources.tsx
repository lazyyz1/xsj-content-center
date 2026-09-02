"use client";

import { Badge, Button } from "@content-center/ui";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sourcePlatformLabels } from "@/lib/content-labels";
import { StudioDrawer } from "./studio-drawer";

export type ProjectSource = {
  role: string;
  sourceItem: {
    id: string;
    title: string | null;
    sourcePlatform: string;
    sourceType: string;
    rawText: string | null;
    transcript: { fullText: string } | null;
    materialAnalysis: { version: number; suggestedTitle: string | null; summary: string | null; topic: string | null; targetAudience: string | null; coreViewpoint: string | null; keyPoints: string[]; coreQuestion: string | null } | null;
  };
};

type AvailableSource = { id: string; title: string | null; sourcePlatform: string; sourceType: string };

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "操作失败");
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

function relatedAnalysis(output: unknown, sourceId: string) {
  const root = object(output);
  const items: Array<{ label: string; text: string; classification: string }> = [];
  const add = (label: string, value: unknown, content: string) => {
    const item = object(value);
    if (array(item.sourceItemIds).includes(sourceId) && content) items.push({ label, text: content, classification: text(item.classification) });
  };
  add("素材背景", root.summary, text(object(root.summary).text));
  add("核心问题", root.coreQuestion, text(object(root.coreQuestion).text));
  add("素材核心观点", root.coreViewpoint, text(object(root.coreViewpoint).text));
  array(root.keyPoints).forEach((value) => add("关键要点", value, text(object(value).text)));
  add("AI 理解", root.creativeInterpretation, text(object(root.creativeInterpretation).text));
  array(root.angles).forEach((value) => add("建议角度", value, text(object(value).angle)));
  add("结构建议", root.structure, text(object(root.structure).overallApproach));
  array(object(root.structure).sections).forEach((value) => add("结构段落", value, text(object(value).keyMessage)));
  add("表达方向", root.expressionDirection, text(object(root.expressionDirection).description));
  array(root.riskNotes).forEach((value) => add("风险提醒", value, text(object(value).text)));
  array(root.titleReferences).forEach((value) => add("标题参考", value, text(object(value).title)));
  return items;
}

export function StudioSources({ projectId, sources, availableSources, editable, unifiedAnalysisOutput }: { projectId: string; sources: ProjectSource[]; availableSources: AvailableSource[]; editable: boolean; unifiedAnalysisOutput?: unknown }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<{ type: "SOURCE"; id: string } | { type: "MANAGE" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = drawer?.type === "SOURCE" ? sources.find(({ sourceItem }) => sourceItem.id === drawer.id) : null;

  async function action(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); setDrawer(null); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="reference-materials-title">
    <div className="flex items-center justify-between gap-3"><div><h2 id="reference-materials-title" className="font-semibold">参考素材</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">本次创作参考了什么</p></div><Badge>{sources.length}</Badge></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {sources.map(({ sourceItem }) => <button type="button" key={sourceItem.id} onClick={() => setDrawer({ type: "SOURCE", id: sourceItem.id })} className="rounded-xl border bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--accent)]">
        <p className="line-clamp-2 text-sm font-medium">{sourceItem.title || "未命名素材"}</p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{sourcePlatformLabels[sourceItem.sourcePlatform] || sourceItem.sourcePlatform}</p>
        <div className="mt-2 flex flex-wrap gap-1"><Badge>{sourceItem.transcript ? "已转录" : "未转录"}</Badge><Badge>{sourceItem.materialAnalysis ? "已整理" : "待整理"}</Badge></div>
      </button>)}
      {sources.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)] sm:col-span-2">尚未添加参考素材，仍可先填写创作方案。</p> : null}
      {editable ? <button type="button" onClick={() => setDrawer({ type: "MANAGE" })} className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"><Plus size={16} /> 添加素材</button> : null}
    </div>
    <StudioDrawer title={selected?.sourceItem.title || "参考素材详情"} open={Boolean(selected)} onClose={() => setDrawer(null)}>
      {selected ? <SourceDetail source={selected} unifiedAnalysisOutput={unifiedAnalysisOutput} editable={editable} busy={busy} onRemove={() => action(() => request(`/api/projects/${projectId}/sources/${selected.sourceItem.id}`, "DELETE"))} /> : null}
    </StudioDrawer>
    <StudioDrawer title="添加参考素材" open={drawer?.type === "MANAGE"} onClose={() => setDrawer(null)} width="max-w-lg">
      <form className="grid gap-3" action={(formData) => action(() => request(`/api/projects/${projectId}/sources`, "POST", { sourceItemId: String(formData.get("sourceItemId") || ""), role: String(formData.get("role") || "REFERENCE") }))}>
        <label className="grid gap-1.5 text-sm">素材<select name="sourceItemId" aria-label="添加素材" required defaultValue="" className="h-10 min-w-0 rounded-[var(--radius)] border bg-[var(--surface)] px-3"><option value="" disabled>选择素材</option>{availableSources.map((source) => <option key={source.id} value={source.id}>{source.title || "未命名素材"} · {sourcePlatformLabels[source.sourcePlatform] || source.sourcePlatform}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm">用途<select name="role" aria-label="素材角色" defaultValue="REFERENCE" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3"><option value="REFERENCE">参考</option><option value="EVIDENCE">证据</option><option value="INSPIRATION">灵感</option><option value="OWN_MATERIAL">自有素材</option></select></label>
        <Button disabled={busy || availableSources.length === 0}>添加素材</Button>
      </form>
      {availableSources.length === 0 ? <p className="mt-3 text-sm text-[var(--text-secondary)]">素材库中没有可添加的新素材。</p> : null}
      {error ? <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </StudioDrawer>
  </section>;
}

function SourceDetail({ source, unifiedAnalysisOutput, editable, busy, onRemove }: { source: ProjectSource; unifiedAnalysisOutput?: unknown; editable: boolean; busy: boolean; onRemove: () => void }) {
  const { role, sourceItem } = source;
  const related = relatedAnalysis(unifiedAnalysisOutput, sourceItem.id);
  return <div className="grid gap-5 text-sm">
    <section><div className="flex flex-wrap gap-2"><Badge>{sourcePlatformLabels[sourceItem.sourcePlatform] || sourceItem.sourcePlatform}</Badge><Badge>{sourceItem.transcript ? "已转录" : "未转录"}</Badge><Badge>{sourceItem.materialAnalysis ? "已智能整理" : "未智能整理"}</Badge></div><p className="mt-3 text-xs text-[var(--text-secondary)]">项目用途：{role}</p></section>
    {sourceItem.materialAnalysis ? <section className="rounded-xl bg-[var(--surface-elevated)] p-4"><h3 className="font-semibold">智能整理 v{sourceItem.materialAnalysis.version}</h3><dl className="mt-3 grid gap-3"><div><dt className="text-xs text-[var(--text-secondary)]">主题</dt><dd className="mt-1">{sourceItem.materialAnalysis.topic || "未提供"}</dd></div><div><dt className="text-xs text-[var(--text-secondary)]">素材核心观点</dt><dd className="mt-1">{sourceItem.materialAnalysis.coreViewpoint || "未提供"}</dd></div><div><dt className="text-xs text-[var(--text-secondary)]">核心问题</dt><dd className="mt-1">{sourceItem.materialAnalysis.coreQuestion || "未提供"}</dd></div><div><dt className="text-xs text-[var(--text-secondary)]">参考内容摘要</dt><dd className="mt-1 leading-6">{sourceItem.materialAnalysis.summary || "未提供"}</dd></div></dl></section> : null}
    <section><h3 className="font-semibold">Transcript / 原始正文</h3><p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border p-4 text-xs leading-6 text-[var(--text-secondary)]">{sourceItem.transcript?.fullText || sourceItem.rawText || "暂无可用正文"}</p></section>
    <section><h3 className="font-semibold">统一分析中的相关依据</h3>{related.length ? <div className="mt-3 grid gap-2">{related.map((item, index) => <article key={`${item.label}-${index}`} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{item.label}</strong><Badge>{item.classification === "SOURCE_FACT" ? "来源依据" : item.classification === "USER_INPUT" ? "我的输入" : item.classification === "AI_INTERPRETATION" ? "AI 理解" : "AI 建议"}</Badge></div><p className="mt-2 leading-6">{item.text}</p></article>)}</div> : <p className="mt-2 text-sm text-[var(--text-secondary)]">当前统一分析没有直接引用这条素材。</p>}</section>
    {editable ? <Button variant="ghost" className="justify-self-start text-[var(--danger)]" disabled={busy} onClick={onRemove}>移出项目</Button> : null}
  </div>;
}
