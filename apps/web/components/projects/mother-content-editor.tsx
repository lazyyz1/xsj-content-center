"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button } from "@content-center/ui";
import type { RewriteRequest } from "./ai-creation-panel";
import { contentOriginLabels } from "@/lib/content-labels";

type Snapshot = { title: string; body: string; outline: string[] };
type SaveState = "IDLE" | "DIRTY" | "SAVING" | "SAVED" | "FAILED";

const labels: Record<SaveState, string> = { IDLE: "已保存", DIRTY: "等待保存", SAVING: "正在保存", SAVED: "已保存", FAILED: "保存失败" };

export function MotherContentEditor({ projectId, initial, editable, aiConfigured, onRewriteRequest, onSaved }: { projectId: string; initial: { title: string; body: string; outline: string[]; version: number; origin?: "HUMAN" | "KIMI" | "GPT_WEB"; originNote?: string | null }; editable: boolean; aiConfigured: boolean; onRewriteRequest: (request: RewriteRequest) => void; onSaved?: (version: number) => void }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [outlineText, setOutlineText] = useState(initial.outline.join("\n"));
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const pending = useRef<Snapshot | null>(null);
  const lastSaved = useRef<Snapshot>({ title: initial.title, body: initial.body, outline: initial.outline });
  const version = useRef(initial.version);
  const bodyArea = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  async function drain() {
    if (inFlight.current || !pending.current) return;
    const snapshot = pending.current;
    pending.current = null;
    inFlight.current = true;
    setSaveState("SAVING");
    try {
      const response = await fetch(`/api/projects/${projectId}/mother-content`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...snapshot, expectedVersion: version.current }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "保存失败");
      version.current = result.version;
      lastSaved.current = snapshot;
      onSaved?.(result.version);
      setError("");
      setSaveState(pending.current ? "DIRTY" : "SAVED");
    } catch (cause) {
      pending.current = null;
      setError(cause instanceof Error ? cause.message : "保存失败");
      setSaveState("FAILED");
    } finally {
      inFlight.current = false;
      if (pending.current) void drain();
    }
  }

  useEffect(() => {
    if (!editable) return;
    const outline = outlineText.split("\n").map((item) => item.trim()).filter(Boolean);
    if (title === lastSaved.current.title && body === lastSaved.current.body && outline.join("\n") === lastSaved.current.outline.join("\n")) return;
    setSaveState("DIRTY");
    const timer = window.setTimeout(() => {
      pending.current = { title, body, outline };
      void drain();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [title, body, outlineText, editable]);

  const characters = body.replace(/\s/g, "").length;
  function requestRewrite(action: RewriteRequest["action"]) {
    const selectedText = body.slice(selection.start, selection.end);
    if (!selectedText) return;
    onRewriteRequest({ id: Date.now(), action, selectedText, selectionStart: selection.start, selectionEnd: selection.end });
  }
  return (
    <section className="flex min-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b pb-3"><div><div className="flex items-center gap-2"><h2 className="font-semibold">核心母稿</h2><Badge>{contentOriginLabels[initial.origin ?? "HUMAN"] || initial.origin || "人工创作"}</Badge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">所有平台版本都以这份内容为准{initial.originNote ? ` · ${initial.originNote}` : ""}</p></div><div className="text-right text-xs"><p className={saveState === "FAILED" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}>{labels[saveState]}</p><p className="mt-1 text-[var(--text-secondary)]">{characters} 字</p></div></div>
      <input aria-label="母稿标题" value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} className="mt-4 h-12 border-0 bg-transparent text-xl font-semibold outline-none" placeholder="母稿标题" />
      <textarea aria-label="母稿大纲" value={outlineText} disabled={!editable} onChange={(event) => setOutlineText(event.target.value)} rows={4} className="mt-3 rounded-xl border bg-[var(--surface-elevated)] p-3 text-sm leading-6 outline-none" placeholder="大纲，每行一点" />
      {editable ? <div className="mt-4 flex flex-wrap gap-2"><span className="self-center text-xs text-[var(--text-secondary)]">选中文字后：</span>{([['REWRITE_SELECTION','改写'],['SHORTEN','缩短'],['EXPAND','扩写'],['ADD_PERSONAL_VIEW','增加个人观点'],['HUMANIZE','表达自然化']] as const).map(([action, label]) => <Button key={action} type="button" variant="ghost" disabled={!aiConfigured || selection.end <= selection.start} className="h-8 px-2 text-xs" onClick={() => requestRewrite(action)}>{label}</Button>)}</div> : null}
      <textarea ref={bodyArea} aria-label="母稿正文" value={body} disabled={!editable} onChange={(event) => setBody(event.target.value)} onSelect={(event) => setSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })} className="mt-3 min-h-[30rem] flex-1 resize-y rounded-xl border bg-[var(--surface)] p-4 text-sm leading-7 outline-none focus:border-[var(--accent)]" placeholder="从这里开始写母稿。停止输入 800ms 后自动保存。" />
      {error ? <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
