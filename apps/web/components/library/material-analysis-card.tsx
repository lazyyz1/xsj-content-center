"use client";

import { Badge, Button, Card } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { MaterialAnalysisDTO } from "@/server/material-analysis/service";
import type { MaterialAnalysisOutput } from "@/server/material-analysis/schemas";

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "操作失败，请重试。");
  return result;
}

export function MaterialAnalysisCard({ sourceId, current: initial, canEdit, llmStatus, canConfigure, hasTranscript, embedded = false, showCreateAction = true }: {
  sourceId: string; current: MaterialAnalysisDTO | null; canEdit: boolean; llmStatus: string; canConfigure: boolean; hasTranscript: boolean; embedded?: boolean; showCreateAction?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const configured = llmStatus === "CONFIGURED";
  const statusLabel = current?.status === "PROCESSING" ? "整理中" : current?.status === "FAILED" ? "整理失败" : current?.status === "COMPLETED" ? "已整理" : "尚未整理";
  const Container = embedded ? "section" : Card;

  async function analyze() {
    if (current && !confirming) { setConfirming(true); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request(`/api/source-items/${sourceId}/material-analysis`, "POST") as MaterialAnalysisDTO;
      setCurrent(result); setConfirming(false); setNotice("素材整理已完成。"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "整理失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function createContent() {
    setBusy(true); setError("");
    try { const result = await request(`/api/source-items/${sourceId}/material-analysis/project`, "POST") as { projectId: string }; router.push(`/projects/${result.projectId}/studio`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法进入创作页面。"); setBusy(false); }
  }

  return <Container className={embedded ? "" : "p-5"} data-testid="material-analysis-card">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">素材整理</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">看清素材讲了什么、哪些可借、哪些不能照搬。</p></div><div className="flex gap-2"><Badge>{statusLabel}</Badge>{current?.stale ? <Badge className="border-[var(--warning)] text-[var(--warning)]">转写已更新</Badge> : null}</div></div>
    {!hasTranscript && !current ? <p className="mt-4 text-sm text-[var(--text-secondary)]">请先完成语音转写，再整理素材。</p> : null}
    {hasTranscript && !configured && !current ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">Kimi 2.6 尚未配置。{canConfigure ? <Link href="/settings/integrations" className="ml-2 font-medium text-[var(--accent)]">前往设置</Link> : "请联系管理员完成配置。"}</div> : null}
    {current?.status === "FAILED" ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{current.errorMessage || "整理失败，请重试。"}</p> : null}
    {current?.status === "COMPLETED" && current.understanding ? <UnderstandingView value={current.understanding} /> : null}
    {current?.status === "COMPLETED" && current.legacy ? <section className="mt-5 rounded-xl border p-4"><div className="flex items-center gap-2"><h3 className="font-medium">旧版整理结果</h3><Badge>旧版</Badge></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{current.summary || "暂无摘要"}</p>{current.keyPoints.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{current.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul> : null}<p className="mt-3 text-xs text-[var(--text-secondary)]">旧结果会保留，不会自动调用 AI。</p></section> : null}
    {confirming ? <div className="mt-4 rounded-xl border border-[var(--warning)] p-4 text-sm"><p>会生成一份新的整理结果，旧版本仍会保留。</p><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={analyze}>确认重新整理</Button><Button variant="secondary" onClick={() => setConfirming(false)}>取消</Button></div></div> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{notice ? <p role="status" className="mt-4 text-sm text-[var(--success)]">{notice}</p> : null}
    {canEdit ? <div className="mt-5 flex flex-wrap gap-2">{hasTranscript && configured && current?.status !== "PROCESSING" ? <Button variant="secondary" disabled={busy || confirming} onClick={analyze}>{busy ? "处理中…" : current?.legacy ? "按新的方式重新整理" : current ? "重新整理" : "开始整理"}</Button> : null}{showCreateAction && current?.status === "COMPLETED" ? <Button disabled={busy} onClick={createContent}>基于这条素材创作</Button> : null}</div> : null}
  </Container>;
}

function UnderstandingView({ value }: { value: MaterialAnalysisOutput }) {
  return <div className="mt-5 grid gap-4">
    <Block title="它讲了什么"><p className="text-sm leading-6">{value.whatItSays.summary}</p>{value.whatItSays.keyPoints.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{value.whatItSays.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul> : null}</Block>
    <Block title="值得借"><ItemList items={value.reusable.map((item) => ({ main: item.content, detail: item.whyUseful }))} /></Block>
    <Block title="不要照搬"><ItemList items={value.doNotCopy.map((item) => ({ main: item.content, detail: item.reason }))} empty="没有明显需要避开的内容" /></Block>
    <Block title="需要确认"><ItemList items={value.uncertain.map((item) => ({ main: item.content, detail: item.reason }))} empty="没有待确认信息" /></Block>
  </div>;
}

function Block({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border p-4"><h3 className="font-medium">{title}</h3><div className="mt-3">{children}</div></section>; }
function ItemList({ items, empty = "暂无" }: { items: Array<{ main: string; detail: string }>; empty?: string }) { return items.length ? <div className="grid gap-3">{items.map((item, index) => <article key={`${item.main}-${index}`}><p className="text-sm leading-6">{item.main}</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.detail}</p></article>)}</div> : <p className="text-sm text-[var(--text-secondary)]">{empty}</p>; }
