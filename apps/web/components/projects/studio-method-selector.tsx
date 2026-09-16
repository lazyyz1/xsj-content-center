"use client";

import { Badge, Button, Card } from "@content-center/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { methodStatusLabels } from "@/lib/content-labels";
import type { ProjectMethodAvailableDTO, ProjectMethodSelectedDTO, ProjectMethodStateDTO } from "@/server/project-methods/service";
import { StudioDrawer } from "./studio-drawer";

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "操作失败，请重试。");
  return result;
}

export function StudioMethodSelector({ projectId, initial, editable, openRequest = 0, onOpenRequestHandled, onChange }: { projectId: string; initial: ProjectMethodStateDTO; editable: boolean; openRequest?: number; onOpenRequestHandled?: () => void; onChange: (state: ProjectMethodStateDTO) => void }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState(initial.selected.map(({ methodVersionId }) => methodVersionId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setState(initial);
    setDraftIds(initial.selected.map(({ methodVersionId }) => methodVersionId));
  }, [initial]);
  useEffect(() => { if (openRequest && editable) { setError(""); setOpen(true); onOpenRequestHandled?.(); } }, [editable, onOpenRequestHandled, openRequest]);

  async function save(ids = draftIds) {
    if (!editable) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await request(`/api/projects/${projectId}/methods`, "PUT", { methodVersionIds: ids }) as ProjectMethodStateDTO;
      setState(next); setDraftIds(next.selected.map(({ methodVersionId }) => methodVersionId)); onChange(next); setNotice("本次使用的方法已保存。"); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法保存本次使用的方法。"); }
    finally { setBusy(false); }
  }

  function toggle(method: ProjectMethodAvailableDTO) {
    setError("");
    if (draftIds.includes(method.methodVersionId)) { setDraftIds((ids) => ids.filter((id) => id !== method.methodVersionId)); return; }
    if (draftIds.length >= 3) { setError("最多选择 3 个方法。"); return; }
    setDraftIds((ids) => [...ids, method.methodVersionId]);
  }

  function remove(methodVersionId: string) { void save(state.selected.map(({ methodVersionId: id }) => id).filter((id) => id !== methodVersionId)); }

  function replaceLatest(method: ProjectMethodSelectedDTO) {
    const ids = state.selected.map(({ methodVersionId: id }) => id === method.methodVersionId ? method.latestVersionId : id);
    void save([...new Set(ids)]);
  }

  return <Card className="p-5" data-testid="studio-method-selector"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[var(--text-secondary)]">我的创作方法</p><h2 className="mt-1 font-semibold">本次补充使用的创作方法</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">可选。最多选择 3 个自己的创作方法，作为公司默认方法之外的补充。</p></div>{editable ? <Button variant="secondary" disabled={busy} onClick={() => { setDraftIds(state.selected.map(({ methodVersionId }) => methodVersionId)); setError(""); setOpen(true); }}>选择创作方法</Button> : null}</div>{state.selected.length ? <div className="mt-4 grid gap-3">{state.selected.map((method) => <SelectedMethod key={method.selectionId} method={method} editable={editable} busy={busy} onRemove={() => remove(method.methodVersionId)} onReplace={() => replaceLatest(method)} />)}</div> : <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">这次不额外选择私人创作方法，也会自动使用公司默认方法。</p>}{notice ? <p role="status" className="mt-3 text-sm text-[var(--success)]">{notice}</p> : null}{error && !open ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}<StudioDrawer title="选择创作方法" open={open} onClose={() => setOpen(false)}><p className="text-sm text-[var(--text-secondary)]">已选择 {draftIds.length} / 3。私人创作方法只补充表达，不会覆盖公司事实和安全边界。</p><div className="mt-4 grid gap-3">{state.available.map((method) => { const selected = draftIds.includes(method.methodVersionId); const outdatedSelected = state.selected.some((item) => item.methodAssetId === method.methodAssetId && item.methodVersionId !== method.methodVersionId && draftIds.includes(item.methodVersionId)); return <AvailableMethod key={method.methodVersionId} method={method} selected={selected} disabled={outdatedSelected || (!selected && draftIds.length >= 3)} onToggle={() => toggle(method)} onView={() => setOpen(false)} />; })}{state.available.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">还没有可选择的创作方法，先去“我的创作方法”保存一项吧。</p> : null}</div>{error ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}<div className="mt-5 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void save()}>{busy ? "保存中…" : "保存选择"}</Button><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>取消</Button></div></StudioDrawer></Card>;
}

function SelectedMethod({ method, editable, busy, onRemove, onReplace }: { method: ProjectMethodSelectedDTO; editable: boolean; busy: boolean; onRemove: () => void; onReplace: () => void }) {
  return <article className="rounded-xl border bg-[var(--surface-elevated)] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium">{method.title}</p><Badge>{method.isDisabled ? "已停用" : methodStatusLabels[method.status]}</Badge></div><p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">{method.summary}</p>{method.isDisabled ? <p className="mt-2 text-sm text-[var(--warning)]">这个创作方法已经停用，下一次生成会忽略它。</p> : method.isOutdated ? <p className="mt-2 text-sm text-[var(--warning)]">这个创作方法后来修改过，当前创作仍使用你之前选择的版本。</p> : null}{editable && method.isDisabled ? <div className="mt-2 flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={onRemove}>移除</Button><Link href={`/library/methods/${method.methodAssetId}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--accent)]">去我的创作方法调整</Link></div> : editable && method.isOutdated ? <div className="mt-2 flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={onReplace}>换用最新版</Button><Button variant="ghost" disabled={busy} onClick={onRemove}>移除</Button></div> : editable ? <Button variant="ghost" className="mt-2" disabled={busy} onClick={onRemove}>移除</Button> : null}</article>;
}

function AvailableMethod({ method, selected, disabled, onToggle, onView }: { method: ProjectMethodAvailableDTO; selected: boolean; disabled: boolean; onToggle: () => void; onView: () => void }) {
  return <article className={`rounded-xl border p-4 ${disabled ? "opacity-50" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{method.title}</p><p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">{method.summary}</p></div><Badge>{methodStatusLabels[method.status]}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button variant={selected ? "secondary" : "primary"} disabled={disabled} onClick={onToggle}>{selected ? "已选择" : "选择"}</Button><Link href={`/library/methods/${method.methodAssetId}`} onClick={onView} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--accent)]">查看详情</Link></div></article>;
}
