"use client";

import { useEffect, useRef, useState } from "react";

type Snapshot = { title: string; body: string; outline: string[] };
type SaveState = "IDLE" | "DIRTY" | "SAVING" | "SAVED" | "FAILED";

const labels: Record<SaveState, string> = { IDLE: "已保存", DIRTY: "等待保存", SAVING: "正在保存", SAVED: "已保存", FAILED: "保存失败" };

export function MotherContentEditor({ projectId, initial, editable }: { projectId: string; initial: { title: string; body: string; outline: string[]; version: number }; editable: boolean }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [outlineText, setOutlineText] = useState(initial.outline.join("\n"));
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef<Snapshot | null>(null);
  const version = useRef(initial.version);

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
    if (!mounted.current) { mounted.current = true; return; }
    setSaveState("DIRTY");
    const timer = window.setTimeout(() => {
      pending.current = { title, body, outline: outlineText.split("\n").map((item) => item.trim()).filter(Boolean) };
      void drain();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [title, body, outlineText, editable]);

  const characters = body.replace(/\s/g, "").length;
  return (
    <section className="flex min-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b pb-3"><div><h2 className="font-semibold">Mother Content</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">轻量 Markdown 母稿</p></div><div className="text-right text-xs"><p className={saveState === "FAILED" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}>{labels[saveState]}</p><p className="mt-1 text-[var(--text-secondary)]">{characters} 字</p></div></div>
      <input aria-label="母稿标题" value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} className="mt-4 h-12 border-0 bg-transparent text-xl font-semibold outline-none" placeholder="母稿标题" />
      <textarea aria-label="母稿大纲" value={outlineText} disabled={!editable} onChange={(event) => setOutlineText(event.target.value)} rows={4} className="mt-3 rounded-xl border bg-[var(--surface-elevated)] p-3 text-sm leading-6 outline-none" placeholder="大纲，每行一点" />
      <textarea aria-label="母稿正文" value={body} disabled={!editable} onChange={(event) => setBody(event.target.value)} className="mt-4 min-h-[30rem] flex-1 resize-y rounded-xl border bg-[var(--surface)] p-4 text-sm leading-7 outline-none focus:border-[var(--accent)]" placeholder="从这里开始写母稿。停止输入 800ms 后自动保存。" />
      {error ? <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
