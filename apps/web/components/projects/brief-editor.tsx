"use client";

import { Badge, Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CreativePlan } from "@/server/studio/creative-brief-prefill";

type ProjectStatus = "DRAFT" | "RESEARCHING" | "BRIEF_READY" | "WRITING" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
const transitions: Partial<Record<ProjectStatus, ProjectStatus[]>> = { DRAFT: ["RESEARCHING", "BRIEF_READY", "WRITING"], RESEARCHING: ["BRIEF_READY", "WRITING"], BRIEF_READY: ["WRITING"] };
const comparable = (plan: CreativePlan) => JSON.stringify({ topic: plan.topic.trim(), angle: plan.angle.trim(), audience: plan.audience.trim(), coreMessage: plan.coreMessage.trim(), coreQuestion: plan.coreQuestion.trim(), background: plan.background.trim(), keyPoints: plan.keyPoints.map((item) => item.trim()).filter(Boolean), structure: plan.structure.map((item) => item.trim()).filter(Boolean), tone: plan.tone.trim(), risks: plan.risks.map((item) => item.trim()).filter(Boolean) });

export function BriefEditor({ projectId, projectStatus, initial, stored, origins, autoPrefilled, titleReferences, editable, onSaved, onConfirmed }: { projectId: string; projectStatus: ProjectStatus; initial: CreativePlan; stored: CreativePlan; origins: string[]; autoPrefilled: boolean; titleReferences: string[]; editable: boolean; onSaved?: () => void; onConfirmed?: () => void }) {
  const router = useRouter();
  const version = useRef(initial.version);
  const persisted = useRef(stored);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { version.current = initial.version; persisted.current = stored; setDraft(initial); }, [initial, stored]);

  async function saveDraft() {
    const response = await fetch(`/api/projects/${projectId}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: draft.topic, angle: draft.angle, audience: draft.audience, coreMessage: draft.coreMessage, coreQuestion: draft.coreQuestion, background: draft.background, keyPoints: draft.keyPoints.map((item) => item.trim()).filter(Boolean), structure: draft.structure.map((item) => item.trim()).filter(Boolean), tone: draft.tone, risks: draft.risks.map((item) => item.trim()).filter(Boolean), expectedVersion: version.current }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "保存失败");
    version.current = result.version;
    const saved = { ...draft, version: result.version };
    persisted.current = saved;
    setDraft(saved);
    onSaved?.();
  }

  async function save() {
    setBusy(true); setMessage("正在保存");
    try { await saveDraft(); setEditing(false); setMessage("创作方案已保存"); router.refresh(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "保存失败"); }
    finally { setBusy(false); }
  }

  async function confirmAndStart() {
    if (!draft.topic.trim() || !draft.coreMessage.trim()) { setMessage("请先补充主题和素材核心观点。"); return; }
    setBusy(true); setMessage("正在进入创作");
    try {
      if (version.current === 0 || comparable(draft) !== comparable(persisted.current)) await saveDraft();
      for (const to of transitions[projectStatus] ?? []) {
        const response = await fetch(`/api/projects/${projectId}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || result.error || "无法进入创作阶段");
      }
      setMessage("创作方案已确认");
      onConfirmed?.();
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }

  if (editing) return <section id="creative-plan" aria-label="创作方案编辑"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">编辑创作方案</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">保存只修改 CreativeBrief，不会改动素材、Transcript 或 AI 分析。</p></div><button type="button" className="text-sm text-[var(--text-secondary)]" onClick={() => { setDraft(initial); setEditing(false); setMessage(""); }}>取消</button></div><form action={save} className="mt-5 grid gap-4 sm:grid-cols-2"><Field name="topic" label="主题" value={draft.topic} onChange={(value) => setDraft((current) => ({ ...current, topic: value }))} disabled={!editable} /><Field name="audience" label="目标受众" value={draft.audience} onChange={(value) => setDraft((current) => ({ ...current, audience: value }))} disabled={!editable} /><Field name="coreQuestion" label="核心问题" value={draft.coreQuestion} onChange={(value) => setDraft((current) => ({ ...current, coreQuestion: value }))} area disabled={!editable} /><Field name="coreMessage" label="素材核心观点" value={draft.coreMessage} onChange={(value) => setDraft((current) => ({ ...current, coreMessage: value }))} area disabled={!editable} /><Field name="angle" label="建议切入角度" value={draft.angle} onChange={(value) => setDraft((current) => ({ ...current, angle: value }))} area disabled={!editable} /><Field name="tone" label="表达方向" value={draft.tone} onChange={(value) => setDraft((current) => ({ ...current, tone: value }))} disabled={!editable} /><Field name="keyPoints" label="关键要点（每行一点）" value={draft.keyPoints.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, keyPoints: value.split("\n") }))} area disabled={!editable} /><Field name="structure" label="建议结构（每行一点）" value={draft.structure.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, structure: value.split("\n") }))} area disabled={!editable} /><Field name="background" label="参考内容摘要" value={draft.background} onChange={(value) => setDraft((current) => ({ ...current, background: value }))} area disabled={!editable} /><Field name="risks" label="风险提醒（每行一点）" value={draft.risks.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, risks: value.split("\n") }))} area disabled={!editable} /><div className="sm:col-span-2"><Button disabled={busy}>{busy ? "正在保存…" : "保存创作方案"}</Button>{message ? <p role="status" className="mt-2 text-xs text-[var(--text-secondary)]">{message}</p> : null}</div></form></section>;

  return <section id="creative-plan" aria-labelledby="creative-plan-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 id="creative-plan-title" className="font-semibold">创作方案</h2>{autoPrefilled ? <Badge>{origins.includes("UnifiedCreativeAnalysis") ? "AI 已准备" : "已预填"}</Badge> : initial.version ? <Badge>已保存</Badge> : null}</div><p className="mt-1 text-xs text-[var(--text-secondary)]">这次准备怎么创作</p></div>{origins.length ? <p className="text-xs text-[var(--text-secondary)]">来源：{origins.join(" + ")}</p> : null}</div>
    {initial.analysisUpdateAvailable ? <p className="mt-4 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs text-[var(--warning)]">素材整理已有新版本，当前方案不会被自动覆盖。</p> : null}
    <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
      <PlanField label="主题" value={draft.topic} />
      <PlanField label="目标受众" value={draft.audience} />
      <PlanField label="核心问题" value={draft.coreQuestion} wide />
      <PlanField label="素材核心观点" value={draft.coreMessage} wide />
      <PlanField label="建议切入角度" value={draft.angle} wide />
      <PlanList label="关键要点" values={draft.keyPoints} />
      <PlanList label="建议结构" values={draft.structure} />
      <PlanField label="表达方向" value={draft.tone} />
      <PlanList label="风险提醒" values={draft.risks} warning />
      {titleReferences.length ? <PlanList label="标题参考" values={titleReferences} /> : null}
    </dl>
    {editable ? <div className="mt-6 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setEditing(true)}>编辑方案</Button><Button disabled={busy || !draft.topic.trim() || !draft.coreMessage.trim()} onClick={confirmAndStart}>{busy ? "正在进入创作…" : "确认并开始创作"}</Button></div> : <p className="mt-6 text-xs text-[var(--text-secondary)]">只读成员可以查看方案，但不能编辑或确认。</p>}
    {message ? <p role="status" className={`mt-3 text-xs ${message.includes("请先") || message.includes("失败") || message.includes("无法") ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>{message}</p> : null}
  </section>;
}

function PlanField({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-xs font-medium text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6">{value || "待补充"}</dd></div>; }
function PlanList({ label, values, warning }: { label: string; values: string[]; warning?: boolean }) { return <div><dt className="text-xs font-medium text-[var(--text-secondary)]">{label}</dt><dd className={`mt-1 text-sm leading-6 ${warning ? "text-[var(--warning)]" : ""}`}>{values.length ? <ul className="list-disc pl-4">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul> : "待补充"}</dd></div>; }
function Field({ name, label, value, onChange, area, disabled }: { name: string; label: string; value: string; onChange: (value: string) => void; area?: boolean; disabled: boolean }) { return <label className="grid gap-1.5 text-xs font-medium">{label}{area ? <textarea name={name} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={4} className="rounded-[var(--radius)] border bg-[var(--surface)] p-3 text-sm font-normal leading-6 outline-none" /> : <input name={name} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm font-normal outline-none" />}</label>; }
