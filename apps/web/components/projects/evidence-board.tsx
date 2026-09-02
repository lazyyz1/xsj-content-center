"use client";

import { Badge, Button } from "@content-center/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { evidenceTypeLabels } from "@/lib/content-labels";
import { StudioDrawer } from "./studio-drawer";

type Evidence = { id: string; type: string; excerpt: string | null; claim: string | null; note: string | null; sourceItemId: string | null; sourceItem: { title: string | null } | null };
type SourceOption = { sourceItem: { id: string; title: string | null } };
const types = ["FACT", "VIEWPOINT", "CASE", "DATA", "QUOTE", "EXPERIENCE", "QUESTION", "OTHER"];

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "操作失败");
}

export function EvidenceBoard({ projectId, evidence, sources, editable, suggestedCount = 0 }: { projectId: string; evidence: Evidence[]; sources: SourceOption[]; editable: boolean; suggestedCount?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const summary = useMemo(() => Object.entries(evidence.reduce<Record<string, number>>((result, item) => ({ ...result, [item.type]: (result[item.type] ?? 0) + 1 }), {})).map(([type, count]) => `${count} 条${evidenceTypeLabels[type] || "其他"}`).join(" · "), [evidence]);
  async function action(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  }
  function payload(formData: FormData) {
    return { type: String(formData.get("type") || "OTHER"), sourceItemId: String(formData.get("sourceItemId") || "") || null, excerpt: String(formData.get("excerpt") || ""), claim: String(formData.get("claim") || ""), note: String(formData.get("note") || "") };
  }

  return <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
    <div><div className="flex items-center gap-2"><h3 className="text-sm font-medium">素材依据</h3><Badge>{evidence.length}</Badge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{summary || (suggestedCount ? `AI 分析整理了 ${suggestedCount} 条参考要点，等待人工确认` : "尚未确认可用依据")}</p></div>
    <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setOpen(true)}>查看素材依据</Button>
    <StudioDrawer title="素材依据" open={open} onClose={() => setOpen(false)}>
      <p className="text-sm text-[var(--text-secondary)]">依据用于约束事实边界，不会自动写成你的观点。</p>
      <div className="mt-4 grid gap-3">
        {evidence.map((item, index) => <article key={item.id} className="rounded-xl border bg-[var(--surface)] p-4 text-sm">
          <div className="flex items-center justify-between gap-2"><Badge>{evidenceTypeLabels[item.type] || item.type}</Badge><span className="text-xs text-[var(--text-secondary)]">{item.sourceItem?.title || "人工录入"}</span></div>
          {item.claim ? <p className="mt-2 font-medium">{item.claim}</p> : null}
          {item.excerpt ? <blockquote className="mt-2 border-l-2 pl-3 text-xs leading-6 text-[var(--text-secondary)]">{item.excerpt}</blockquote> : null}
          {item.note ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.note}</p> : null}
          {editable ? <div className="mt-3 flex flex-wrap gap-3 text-xs"><button disabled={busy || index === 0} onClick={() => action(() => call(`/api/projects/${projectId}/evidence/${item.id}`, "PATCH", { direction: "UP" }))}>上移</button><button disabled={busy || index === evidence.length - 1} onClick={() => action(() => call(`/api/projects/${projectId}/evidence/${item.id}`, "PATCH", { direction: "DOWN" }))}>下移</button><details><summary className="cursor-pointer">编辑</summary><form className="mt-2 grid min-w-64 gap-2" action={(formData) => action(() => call(`/api/projects/${projectId}/evidence/${item.id}`, "PATCH", payload(formData)))}><EvidenceFields item={item} sources={sources} /><Button disabled={busy}>保存素材依据</Button></form></details><button className="text-[var(--danger)]" disabled={busy} onClick={() => action(() => call(`/api/projects/${projectId}/evidence/${item.id}`, "DELETE"))}>删除</button></div> : null}
        </article>)}
        {evidence.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">尚无人工确认的素材依据。</p> : null}
      </div>
      {editable ? <details className="mt-4 rounded-xl border border-dashed p-4"><summary className="cursor-pointer text-sm font-medium">新增素材依据</summary><form className="mt-3 grid gap-2" action={(formData) => action(() => call(`/api/projects/${projectId}/evidence`, "POST", payload(formData)))}><EvidenceFields sources={sources} /><Button disabled={busy}>新增素材依据</Button></form></details> : null}
      {error ? <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </StudioDrawer>
  </section>;
}

function EvidenceFields({ item, sources }: { item?: Evidence; sources: SourceOption[] }) {
  return <><select name="type" aria-label="内容类型" defaultValue={item?.type || "FACT"} className="h-9 rounded-[var(--radius)] border bg-[var(--surface)] px-2">{types.map((type) => <option key={type} value={type}>{evidenceTypeLabels[type] || type}</option>)}</select><select name="sourceItemId" aria-label="关联素材" defaultValue={item?.sourceItemId || ""} className="h-9 rounded-[var(--radius)] border bg-[var(--surface)] px-2"><option value="">无关联素材</option>{sources.map(({ sourceItem }) => <option key={sourceItem.id} value={sourceItem.id}>{sourceItem.title || "未命名素材"}</option>)}</select><textarea name="excerpt" aria-label="原文摘录" defaultValue={item?.excerpt || ""} rows={3} placeholder="原文摘录" className="rounded-[var(--radius)] border bg-[var(--surface)] p-2" /><textarea name="claim" aria-label="观点或结论" defaultValue={item?.claim || ""} rows={2} placeholder="观点或结论" className="rounded-[var(--radius)] border bg-[var(--surface)] p-2" /><textarea name="note" aria-label="备注" defaultValue={item?.note || ""} rows={2} placeholder="备注" className="rounded-[var(--radius)] border bg-[var(--surface)] p-2" /></>;
}
