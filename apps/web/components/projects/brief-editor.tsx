"use client";

import { Badge, Button } from "@content-center/ui";
import { useEffect, useRef, useState } from "react";

type Brief = { topic: string; angle: string; audience: string; coreMessage: string; coreQuestion: string; background: string; keyPoints: string[]; structure: string[]; tone: string; risks: string[]; version: number; initializedFromMaterialAnalysis: boolean; analysisUpdateAvailable: boolean };

export function BriefEditor({ projectId, initial, editable }: { projectId: string; initial: Brief; editable: boolean }) {
  const version = useRef(initial.version);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    version.current = initial.version;
    setDraft(initial);
  }, [initial]);

  async function save(formData: FormData) {
    setBusy(true); setMessage("正在保存");
    const lines = (name: string) => String(formData.get(name) || "").split("\n").map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: String(formData.get("topic") || ""), angle: String(formData.get("angle") || ""), audience: String(formData.get("audience") || ""), coreMessage: String(formData.get("coreMessage") || ""), coreQuestion: String(formData.get("coreQuestion") || ""), background: String(formData.get("background") || ""), keyPoints: lines("keyPoints"), structure: lines("structure"), tone: String(formData.get("tone") || ""), risks: lines("risks"), expectedVersion: version.current }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "保存失败");
      version.current = result.version;
      setMessage("已保存");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "保存失败"); }
    finally { setBusy(false); }
  }

  return <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">创作简报</h2>{draft.initializedFromMaterialAnalysis ? <Badge>创作准备已完成</Badge> : null}</div><p className="mt-1 text-xs text-[var(--text-secondary)]">{draft.initializedFromMaterialAnalysis ? "已根据素材智能整理预填，可修改后保存。" : "明确写给谁、从哪里切入，以及哪些风险需要注意。"}</p>{draft.analysisUpdateAvailable ? <p className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-xs text-[var(--warning)]">素材整理已更新，已保留你当前的创作简报，不会自动覆盖。</p> : null}<form action={save} className="mt-4 grid gap-3"><Field name="topic" label="选题" value={draft.topic} onChange={(value) => setDraft((current) => ({ ...current, topic: value }))} disabled={!editable} /><Field name="audience" label="目标受众" value={draft.audience} onChange={(value) => setDraft((current) => ({ ...current, audience: value }))} disabled={!editable} /><Field name="coreQuestion" label="核心问题" value={draft.coreQuestion} onChange={(value) => setDraft((current) => ({ ...current, coreQuestion: value }))} area disabled={!editable} /><Field name="coreMessage" label="素材核心观点" value={draft.coreMessage} onChange={(value) => setDraft((current) => ({ ...current, coreMessage: value }))} area disabled={!editable} /><Field name="keyPoints" label="关键要点（每行一点）" value={draft.keyPoints.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, keyPoints: value.split("\n") }))} area disabled={!editable} /><Field name="background" label="参考内容摘要" value={draft.background} onChange={(value) => setDraft((current) => ({ ...current, background: value }))} area disabled={!editable} /><Field name="angle" label="切入角度" value={draft.angle} onChange={(value) => setDraft((current) => ({ ...current, angle: value }))} area disabled={!editable} /><Field name="structure" label="内容结构（每行一点）" value={draft.structure.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, structure: value.split("\n") }))} area disabled={!editable} /><Field name="tone" label="语气" value={draft.tone} onChange={(value) => setDraft((current) => ({ ...current, tone: value }))} disabled={!editable} /><Field name="risks" label="风险点（每行一点）" value={draft.risks.join("\n")} onChange={(value) => setDraft((current) => ({ ...current, risks: value.split("\n") }))} area disabled={!editable} />{editable ? <Button disabled={busy}>{busy ? "正在保存…" : "保存创作简报"}</Button> : null}{message ? <p role="status" className={message.includes("失败") || message.includes("更新") ? "text-xs text-[var(--danger)]" : "text-xs text-[var(--text-secondary)]"}>{message}</p> : null}</form></section>;
}

function Field({ name, label, value, onChange, area, disabled }: { name: string; label: string; value: string; onChange: (value: string) => void; area?: boolean; disabled: boolean }) {
  return <label className="grid gap-1 text-xs font-medium">{label}{area ? <textarea name={name} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={3} className="rounded-[var(--radius)] border bg-[var(--surface)] p-2 text-sm font-normal leading-5 outline-none" /> : <input name={name} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-9 rounded-[var(--radius)] border bg-[var(--surface)] px-2 text-sm font-normal outline-none" />}</label>;
}
