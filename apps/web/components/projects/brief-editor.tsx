"use client";

import { Button } from "@content-center/ui";
import { useRef, useState } from "react";

type Brief = { topic: string; angle: string; audience: string; coreMessage: string; keyPoints: string[]; structure: string[]; tone: string; risks: string[]; version: number };

export function BriefEditor({ projectId, initial, editable }: { projectId: string; initial: Brief; editable: boolean }) {
  const version = useRef(initial.version);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(formData: FormData) {
    setBusy(true); setMessage("正在保存");
    const lines = (name: string) => String(formData.get(name) || "").split("\n").map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: String(formData.get("topic") || ""), angle: String(formData.get("angle") || ""), audience: String(formData.get("audience") || ""), coreMessage: String(formData.get("coreMessage") || ""), keyPoints: lines("keyPoints"), structure: lines("structure"), tone: String(formData.get("tone") || ""), risks: lines("risks"), expectedVersion: version.current }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "保存失败");
      version.current = result.version;
      setMessage("已保存");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "保存失败"); }
    finally { setBusy(false); }
  }

  return <section><h2 className="font-semibold">Creative Brief</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">当前为人工填写</p><form action={save} className="mt-4 grid gap-3"><Field name="topic" label="选题" value={initial.topic} disabled={!editable} /><Field name="angle" label="切入角度" value={initial.angle} area disabled={!editable} /><Field name="audience" label="目标受众" value={initial.audience} disabled={!editable} /><Field name="coreMessage" label="核心观点" value={initial.coreMessage} area disabled={!editable} /><Field name="keyPoints" label="关键要点（每行一点）" value={initial.keyPoints.join("\n")} area disabled={!editable} /><Field name="structure" label="内容结构（每行一点）" value={initial.structure.join("\n")} area disabled={!editable} /><Field name="tone" label="语气" value={initial.tone} disabled={!editable} /><Field name="risks" label="风险点（每行一点）" value={initial.risks.join("\n")} area disabled={!editable} />{editable ? <Button disabled={busy}>{busy ? "正在保存…" : "保存 Brief"}</Button> : null}{message ? <p role="status" className={message.includes("失败") || message.includes("更新") ? "text-xs text-[var(--danger)]" : "text-xs text-[var(--text-secondary)]"}>{message}</p> : null}</form></section>;
}

function Field({ name, label, value, area, disabled }: { name: string; label: string; value: string; area?: boolean; disabled: boolean }) {
  return <label className="grid gap-1 text-xs font-medium">{label}{area ? <textarea name={name} aria-label={label} defaultValue={value} disabled={disabled} rows={3} className="rounded-[var(--radius)] border bg-[var(--surface)] p-2 text-sm font-normal leading-5 outline-none" /> : <input name={name} aria-label={label} defaultValue={value} disabled={disabled} className="h-9 rounded-[var(--radius)] border bg-[var(--surface)] px-2 text-sm font-normal outline-none" />}</label>;
}
