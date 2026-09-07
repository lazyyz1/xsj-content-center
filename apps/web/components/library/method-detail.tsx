"use client";

import { Badge, Button } from "@content-center/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { methodStatusLabels, sourcePlatformLabels } from "@/lib/content-labels";
import type { MethodDTO, MethodVersionDTO } from "@/server/methods/service";

const statuses = ["SAVED", "TRIAL", "CORE", "DISABLED"] as const;

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "操作失败，请重试。");
  return result;
}

export function MethodDetail({ initial, editable }: { initial: MethodDTO; editable: boolean }) {
  const router = useRouter();
  const [method, setMethod] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.current.title);
  const [steps, setSteps] = useState(initial.current.steps.join("\n"));
  const [applicable, setApplicable] = useState(initial.current.applicableScenarios.join("\n"));
  const [boundaries, setBoundaries] = useState(initial.current.boundaries.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function startEditing() {
    setTitle(method.current.title);
    setSteps(method.current.steps.join("\n"));
    setApplicable(method.current.applicableScenarios.join("\n"));
    setBoundaries(method.current.boundaries.join("\n"));
    setError("");
    setNotice("");
    setEditing(true);
  }

  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await request(`/api/methods/${method.id}`, "PUT", { title, steps: lines(steps), applicableScenarios: lines(applicable), boundaries: lines(boundaries), expectedVersion: method.current.version }) as MethodDTO;
      setMethod(updated); setEditing(false); setNotice("方法已保存，新版本已经保留。"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法保存方法。"); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: typeof statuses[number]) {
    if (status === method.status) return;
    setBusy(true); setError(""); setNotice("");
    try { setMethod(await request(`/api/methods/${method.id}`, "PATCH", { status }) as MethodDTO); setNotice("方法状态已更新。"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法更新方法状态。"); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6" data-testid="method-detail">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Badge>{methodStatusLabels[method.status]}</Badge><span className="text-xs text-[var(--text-secondary)]">仅自己可见</span></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{method.current.title}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">保存的方法可以在“我的创作”中按需选择，不会自动加入稿件。</p></div><div className="flex flex-wrap gap-2"><Link href="/projects" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--text-primary)] px-4 text-sm font-medium text-white">去创作</Link>{editable ? <Button variant="secondary" disabled={busy || editing} onClick={startEditing}>编辑方法</Button> : null}</div></header>
    {method.current.source.stale && method.current.source.sourceItemId ? <div className="rounded-xl border border-[var(--warning)] p-4 text-sm"><p className="font-medium text-[var(--warning)]">来源文字稿后来更新过</p><p className="mt-1 text-[var(--text-secondary)]">这个方法保存时使用的是之前的文字稿，建议重新核对原文。</p><Link href={`/library/${method.current.source.sourceItemId}`} className="mt-3 inline-flex text-sm font-medium text-[var(--accent)]">查看当前来源</Link></div> : null}
    {editing ? <section className="rounded-2xl border bg-[var(--surface)] p-5"><h2 className="font-semibold">确认和修改方法</h2><div className="mt-4 grid gap-4"><label className="grid gap-1.5 text-sm">方法名称<input aria-label="方法名称" value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 rounded-[var(--radius)] border bg-transparent px-3" /></label><Field label="怎么用" value={steps} onChange={setSteps} /><Field label="适合什么时候用" value={applicable} onChange={setApplicable} /><Field label="什么时候不太适合" value={boundaries} onChange={setBoundaries} /></div><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={save}>保存方法</Button><Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>取消</Button></div></section> : <VersionContent version={method.current} />}
    <section className="rounded-2xl border bg-[var(--surface)] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">方法状态</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">状态只会在你主动选择后改变。</p></div>{editable ? <div className="flex flex-wrap gap-2">{statuses.map((status) => <button type="button" key={status} disabled={busy} onClick={() => void changeStatus(status)} className={`min-h-11 rounded-lg border px-3 text-sm ${method.status === status ? "border-[var(--accent)] bg-[var(--surface-elevated)] font-medium" : "text-[var(--text-secondary)] hover:border-[var(--accent)]"}`}>{methodStatusLabels[status]}</button>)}</div> : <Badge>{methodStatusLabels[method.status]}</Badge>}</div></section>
    <section className="rounded-2xl border bg-[var(--surface)] p-5"><h2 className="font-semibold">依据内容</h2><div className="mt-3 rounded-xl bg-[var(--surface-elevated)] p-4"><SourceReference source={method.current.source} /><EvidenceDetails items={method.current.evidence} /></div></section>
    <section><h2 className="font-semibold">历史版本</h2><div className="mt-3 grid gap-3">{method.history.map((version) => <details key={version.id} className="rounded-xl border bg-[var(--surface)] p-4"><summary className="cursor-pointer text-sm font-medium">{version.version === 1 ? "首次保存" : `第 ${version.version} 次修改`} · {new Date(version.createdAt).toLocaleString("zh-CN")}</summary><div className="mt-4"><VersionContent version={version} /></div></details>)}</div></section>
    {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}{notice ? <p role="status" className="text-sm text-[var(--success)]">{notice}</p> : null}
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1.5 text-sm">{label}<textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 resize-y rounded-[var(--radius)] border bg-transparent p-3 leading-6" /></label>; }
function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function VersionContent({ version }: { version: MethodVersionDTO }) { return <div className="grid gap-5 text-sm"><section><h3 className="font-medium">怎么用</h3><List items={version.steps} /></section><section><h3 className="font-medium">适合什么时候用</h3><List items={version.applicableScenarios} /></section><section><h3 className="font-medium">什么时候不太适合</h3><List items={version.boundaries} /></section><section><h3 className="font-medium">依据内容</h3><SourceReference source={version.source} /></section><EvidenceDetails items={version.evidence} /><p className="text-xs text-[var(--text-secondary)]">修改人：{version.editedBy}</p></div>; }
function SourceReference({ source }: { source: MethodVersionDTO["source"] }) { return <div className="mt-2"><p className="font-medium">{source.title}</p>{source.platform ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{sourcePlatformLabels[source.platform] || source.platform}</p> : null}{source.sourceItemId ? <Link href={`/library/${source.sourceItemId}`} className="mt-2 inline-flex text-sm font-medium text-[var(--accent)]">查看当前来源</Link> : null}{source.benchmarkStudyId && source.samples.length ? <div className="mt-3 grid gap-2"><p className="text-xs text-[var(--text-secondary)]">涉及的代表内容（{source.sampleCount} 条）</p>{source.samples.map((sample) => <Link key={sample.sourceItemId} href={`/library/${sample.sourceItemId}`} className="text-sm text-[var(--accent)]">{sample.title}</Link>)}</div> : null}</div>; }
function List({ items }: { items: string[] }) { return items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-[var(--text-secondary)]">暂无内容</p>; }
function EvidenceDetails({ items }: { items: MethodVersionDTO["evidence"] }) { return items.length ? <details className="text-xs"><summary className="cursor-pointer font-medium text-[var(--accent)]">为什么这么总结 · 查看 {items.length} 处原文依据</summary><div className="mt-2 grid gap-2">{items.map((item, index) => <blockquote key={`${item.quote}-${index}`} className="rounded-lg bg-[var(--surface-elevated)] p-3 leading-5"><p>{item.quote}</p>{item.startMs !== undefined && item.endMs !== undefined ? <cite className="mt-1 block not-italic text-[var(--text-secondary)]">{formatTime(item.startMs)}–{formatTime(item.endMs)}</cite> : <cite className="mt-1 block not-italic text-[var(--text-secondary)]">对应文字</cite>}</blockquote>)}</div></details> : null; }
function formatTime(milliseconds: number) { const seconds = Math.floor(milliseconds / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
