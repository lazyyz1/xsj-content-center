"use client";

import { useEffect, useRef, useState } from "react";

type Snapshot = { title: string; body: string; outline: string[] };
type SaveState = "IDLE" | "DIRTY" | "SAVING" | "SAVED" | "FAILED";

const labels: Record<SaveState, string> = { IDLE: "已保存", DIRTY: "等待保存", SAVING: "正在保存", SAVED: "已保存", FAILED: "保存失败" };

export function MotherContentEditor({ projectId, initial, editable, onSaved, onSelectionChange }: { projectId: string; initial: { title: string; body: string; outline: string[]; version: number; origin?: "HUMAN" | "KIMI" | "GPT_WEB"; originNote?: string | null }; editable: boolean; onSaved?: (version: number, snapshot: Snapshot) => void; onSelectionChange?: (selection: { text: string; start: number; end: number } | null) => void }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [outlineText, setOutlineText] = useState(initial.outline.join("\n"));
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const pending = useRef<Snapshot | null>(null);
  const lastSaved = useRef<Snapshot>({ title: initial.title, body: initial.body, outline: initial.outline });
  const version = useRef(initial.version);

  function reportSelection(element: HTMLTextAreaElement) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = body.slice(start, end).trim();
    onSelectionChange?.(selected ? { text: body.slice(start, end), start, end } : null);
  }

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
      onSaved?.(result.version, snapshot);
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
  return (
    <section className="flex min-h-[42rem] flex-col">
      <div className="flex items-center justify-between gap-3 border-b pb-3"><div><h3 className="font-semibold">稿件</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">直接编辑正文；选中文字后，右侧助手会提供局部操作。</p></div><div className="text-right text-xs"><p className={saveState === "FAILED" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}>{labels[saveState]}</p><p className="mt-1 text-[var(--text-secondary)]">{characters} 字</p></div></div>
      <input aria-label="口播稿标题" value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} className="mt-4 h-14 border-0 bg-transparent text-2xl font-bold tracking-tight outline-none" placeholder="口播稿标题" />
      <details className="mt-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"><summary className="text-sm font-medium text-[var(--text-secondary)]">查看和编辑大纲</summary><textarea aria-label="口播稿提纲" value={outlineText} disabled={!editable} onChange={(event) => setOutlineText(event.target.value)} rows={4} className="mt-2 w-full resize-y border-0 bg-transparent p-2 text-sm leading-6 outline-none" placeholder="提纲，每行一点" /></details>
      <textarea aria-label="口播稿正文" value={body} disabled={!editable} onChange={(event) => { setBody(event.target.value); onSelectionChange?.(null); }} onSelect={(event) => reportSelection(event.currentTarget)} onKeyUp={(event) => reportSelection(event.currentTarget)} onMouseUp={(event) => reportSelection(event.currentTarget)} className="mt-3 min-h-[34rem] flex-1 resize-y rounded-2xl border border-transparent bg-white/55 p-5 text-[15px] leading-8 outline-none transition-colors hover:border-[var(--border)] focus:border-[var(--accent-border)] focus:bg-white" placeholder="从这里开始写口播稿。停止输入 800ms 后自动保存。" />
      {error ? <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
