"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TranscriptionActions } from "./transcription-actions";

export function TranscriptPanel({ sourceId, status, method, quality, processingTime, fullText, canEdit, canTranscribe, configured, busy, message }: {
  sourceId: string; status: string; method: string; quality: string; processingTime: string; fullText?: string; canEdit: boolean; canTranscribe: boolean; configured: boolean; busy: boolean; message?: string;
}) {
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fullText ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  async function save() {
    setSaving(true); setNotice("");
    try {
      const response = await fetch(`/api/source-items/${sourceId}/transcript`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullText: draft }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "保存失败");
      setEditing(false); setNotice("转写已保存，智能整理结果可能需要更新。"); router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  }
  const body = editing ? <textarea aria-label="编辑转写全文" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-full min-h-[24rem] w-full resize-none bg-transparent p-4 text-sm leading-7 outline-none" /> : <p className="whitespace-pre-wrap p-4 text-sm leading-7">{fullText || "暂无转写内容"}</p>;
  return <Card className="p-5" data-testid="transcript-panel">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">视频转写</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]"><span>方式：{method}</span><span>质量：{quality}</span><span>耗时：{processingTime}</span></div></div><Badge>{status}</Badge></div>
    {message ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p> : null}
    <div data-testid="transcript-scroll-region" className="mt-4 h-[28rem] overflow-y-auto rounded-xl border bg-[var(--surface-elevated)]">{body}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      {editing ? <><Button disabled={saving || !draft.trim()} onClick={save}>保存转写</Button><Button variant="secondary" disabled={saving} onClick={() => { setEditing(false); setDraft(fullText ?? ""); }}>取消</Button></> : <>{fullText ? <Button variant="secondary" onClick={() => navigator.clipboard.writeText(fullText).then(() => setNotice("全文已复制"), () => setNotice("复制失败，请手动选择文本。"))}>复制全文</Button> : null}{fullText && canEdit ? <Button variant="secondary" onClick={() => setEditing(true)}>编辑</Button> : null}{fullText ? <Button variant="secondary" onClick={() => setReading(true)}>展开阅读</Button> : null}</>}
    </div>
    <TranscriptionActions sourceId={sourceId} canTranscribe={canTranscribe} configured={configured} hasTranscript={Boolean(fullText)} busy={busy} />
    {notice ? <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{notice}</p> : null}
    {reading ? <div className="fixed inset-0 z-50 bg-black/35 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="转写全文"><div className="mx-auto flex h-full max-w-3xl flex-col rounded-2xl bg-[var(--surface)] shadow-2xl"><header className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">转写全文</h2><button aria-label="关闭全文阅读" className="rounded-full p-2" onClick={() => setReading(false)}><X size={18} /></button></header><article className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-8">{fullText}</article></div></div> : null}
  </Card>;
}
