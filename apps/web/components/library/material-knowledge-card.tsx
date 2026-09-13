"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { getMaterialKnowledge } from "@/server/material-knowledge/service";

type State = Awaited<ReturnType<typeof getMaterialKnowledge>>;

async function request(url: string, init?: RequestInit) { const response = await fetch(url, init); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "整理失败，可以重新试一次。"); return result; }
function locator(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return "真实原文"; const row = value as Record<string, unknown>; if (typeof row.startMs === "number") { const seconds = Math.floor(row.startMs / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; } return "原文摘录"; }

export function MaterialKnowledgeCard({ sourceId, initial, editable }: { sourceId: string; initial: State; editable: boolean }) {
  const [state, setState] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [edits, setEdits] = useState<Record<string, string>>({}); const started = useRef(false);
  const extract = async () => { if (!editable || busy) return; setBusy(true); setError(""); try { const result = await request(`/api/source-items/${sourceId}/knowledge`, { method: "POST" }) as { state: State }; setState(result.state); } catch (cause) { setError(cause instanceof Error ? cause.message : "整理失败，可以重新试一次。"); } finally { setBusy(false); } };
  useEffect(() => { if (state.status === "READY_TO_EXTRACT" && editable && !started.current) { started.current = true; void extract(); } }, [editable, state.status]);
  const decide = async (candidateId: string, decision: "CONFIRM" | "REJECT") => { setBusy(true); setError(""); try { await request(`/api/source-items/${sourceId}/knowledge/candidates/${candidateId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, ...(decision === "CONFIRM" && edits[candidateId]?.trim() ? { content: edits[candidateId].trim() } : {}) }) }); const refreshed = await request(`/api/source-items/${sourceId}/knowledge`) as State; setState(refreshed); } catch (cause) { setError(cause instanceof Error ? cause.message : "处理失败，请重试。"); } finally { setBusy(false); } };
  const candidates = state.candidates.filter(({ status }) => status !== "REJECTED");
  return <section className="material-knowledge-card" data-testid="material-knowledge-card"><header><div><h3>整理结果</h3><p>{state.summary || "系统会从真实原文中整理值得引用或确认的信息。"}</p></div><span>{busy ? "正在整理内容" : state.employeeStatus}</span></header>
    {candidates.length ? <div className="material-knowledge-list">{candidates.map((candidate) => <article key={candidate.id}><div><span>{candidate.category}</span><i>{candidate.ownershipLabel}</i><b>{candidate.statusLabel}</b></div>{candidate.status === "PENDING" && candidate.ownership === "OWN" && editable ? <textarea aria-label={`编辑候选 ${candidate.content}`} value={edits[candidate.id] ?? candidate.content} onChange={(event) => setEdits((current) => ({ ...current, [candidate.id]: event.target.value }))} /> : <p>{candidate.content}</p>}<small>来源：{state.source.title} · {locator(candidate.locator)}</small><details><summary>查看原文</summary><blockquote>{candidate.originalExcerpt}</blockquote></details>{candidate.status === "PENDING" && editable ? <footer>{candidate.ownership === "OWN" ? <button type="button" disabled={busy} onClick={() => void decide(candidate.id, "CONFIRM")}><Check size={14} />确认</button> : null}<button type="button" disabled={busy} onClick={() => void decide(candidate.id, "REJECT")}><X size={14} />不采用</button></footer> : null}</article>)}</div> : state.status === "COMPLETE" ? <p className="material-knowledge-empty">这条资料没有需要人工确认的信息，外部内容仍可作为研究参考。</p> : null}
    {error || state.status === "FAILED" ? <div className="material-knowledge-error"><p>{error || "整理失败，可以重新试一次。"}</p>{editable ? <button type="button" disabled={busy} onClick={() => void extract()}><RefreshCw size={14} />重新整理</button> : null}</div> : null}
  </section>;
}
