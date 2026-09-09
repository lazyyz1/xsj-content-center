"use client";

import { Badge, Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudioDrawer } from "@/components/projects/studio-drawer";

type Topic = { title: string; angle: string; why: string; ourTake: string; evidenceHint: string | null; evidenceStatus: "DIRECT" | "HYPOTHETICAL" | "NEEDS_CASE" | "NEEDS_DATA" };
type Result = { runId: string; projectId: string; summary: string; topics: Topic[] };
const evidenceLabels = { DIRECT: "可以直接讲", HYPOTHETICAL: "可以用假设场景", NEEDS_CASE: "建议补真实案例", NEEDS_DATA: "建议补真实数据" } as const;

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "暂时无法生成选题。");
  return result;
}

export function BenchmarkTopicGenerator({ sourceType, sourceId, available, buttonLabel, unavailableMessage }: { sourceType: "VIDEO" | "CREATOR_PROFILE"; sourceId: string; available: boolean; buttonLabel: string; unavailableMessage: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    setOpen(true); setBusy(true); setError(""); setResult(null);
    try { setResult(await post("/api/benchmark-topics", { sourceType, sourceId }) as Result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "暂时无法生成选题。"); }
    finally { setBusy(false); }
  }

  async function select(index: number) {
    if (!result) return;
    setSelecting(index); setError("");
    try { const selected = await post(`/api/benchmark-topics/${result.runId}/select`, { topicIndex: index }); router.push(selected.studioPath || `/projects/${selected.projectId}/studio`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "暂时无法进入创作。"); setSelecting(null); }
  }

  return <>
    <Button className="w-full" disabled={!available || busy} onClick={() => void generate()}>{busy ? "正在找选题…" : buttonLabel}</Button>
    {!available ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{unavailableMessage}</p> : null}
    <StudioDrawer title="我们可以做什么选题" open={open} onClose={() => setOpen(false)}>
      {busy ? <p role="status" className="text-sm text-[var(--text-secondary)]">正在结合外部启发和我们的真实情况找不同角度…</p> : null}
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
      {result ? <><p className="text-sm leading-6 text-[var(--text-secondary)]">{result.summary}</p><div className="mt-4 grid gap-3">{result.topics.map((topic, index) => <article key={`${topic.title}-${index}`} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-6">{topic.title}</h3><Badge>{evidenceLabels[topic.evidenceStatus]}</Badge></div><p className="mt-2 text-xs font-medium">为什么值得做</p><p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{topic.why}</p><div className="mt-3 rounded-lg bg-[var(--surface-elevated)] p-3 text-sm"><p className="font-medium">我们自己的切入</p><p className="mt-1 leading-6 text-[var(--text-secondary)]">{topic.ourTake}</p></div>{topic.evidenceHint ? <details className="mt-3 text-sm"><summary className="cursor-pointer text-[var(--accent)]">查看更多依据</summary><p className="mt-2 leading-6 text-[var(--text-secondary)]">{topic.evidenceHint}</p></details> : null}<Button className="mt-4 w-full" disabled={selecting !== null} onClick={() => void select(index)}>{selecting === index ? "正在进入创作…" : "选这个题去创作"}</Button></article>)}</div></> : null}
    </StudioDrawer>
  </>;
}
