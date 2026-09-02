"use client";

import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type RecommendationBatchView = {
  id: string;
  mode: "DETERMINISTIC" | "AI_ASSISTED";
  generatedAt: string;
  expiresAt: string;
  creatorProfileId: string | null;
  items: Array<{ id: string; position: number; title: string; coreQuestion: string; angle: string; whyRecommended: string; whyNow: string; creatorFit: string; differenceFromRecentContent: string; suggestedNextStep: string; riskNotes: unknown; recommendedFormat: string | null; status: "NEW" | "SAVED" | "STARTED" | "DISMISSED"; contentIdeaId: string | null; projectId: string | null }>;
};

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, init); const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "操作未完成，请稍后重试。");
  return body;
}

export function TodayRecommendations({ initialBatch, canWrite }: { initialBatch: RecommendationBatchView | null; canWrite: boolean }) {
  const router = useRouter();
  const [batch, setBatch] = useState(initialBatch); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  async function generate() { setBusy("generate"); setError(""); try { const body = await request("/api/discovery/recommendations", { method: "POST" }); setBatch(body.batch); } catch (reason) { setError(reason instanceof Error ? reason.message : "生成失败。"); } finally { setBusy(""); } }
  async function act(id: string, action: "DISMISS" | "SAVE_IDEA" | "START_RESEARCH") { setBusy(`${id}:${action}`); setError(""); try { const body = await request(`/api/discovery/recommendations/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); setBatch((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, status: action === "DISMISS" ? "DISMISSED" : "SAVED", contentIdeaId: body.ideaId ?? item.contentIdeaId } : item) } : current); if (action === "START_RESEARCH" && body.ideaId) router.push(`/discovery/ideas/${body.ideaId}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败。"); } finally { setBusy(""); } }
  const visible = batch?.items.filter((item) => item.status !== "DISMISSED").slice(0, 3) ?? [];
  const ai = batch?.mode === "AI_ASSISTED";
  return <section data-testid="today-recommendations">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{ai ? "今天值得做" : "今日内容线索"}</h2>{ai ? <Badge>AI 辅助</Badge> : null}</div><p className="mt-1 text-xs text-[var(--text-secondary)]">基于已保存的趋势、对标内容、素材与近期创作记录</p></div>{canWrite ? <Button variant="secondary" onClick={() => void generate()} disabled={busy === "generate"}>{busy === "generate" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}{batch ? "更新一批" : "生成今日线索"}</Button> : null}</div>
    {error ? <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p> : null}
    {!batch ? <Card className="p-6"><h3 className="font-semibold">还没有今日内容线索</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">先加载趋势或对标作品，也可以从素材库收录内容。只有你主动点击时，系统才会获取新的外部数据。</p>{!canWrite ? <p className="mt-3 text-xs text-[var(--text-secondary)]">当前为只读权限。</p> : null}</Card> : visible.length ? <div className="grid gap-4 xl:grid-cols-3">{visible.map((item) => <Card key={item.id} className="flex flex-col p-5"><div className="flex items-start justify-between gap-3"><Badge>{item.recommendedFormat || "内容方向"}</Badge>{canWrite && item.status === "NEW" ? <button aria-label="忽略该线索" disabled={Boolean(busy)} onClick={() => void act(item.id, "DISMISS")} className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"><X size={15} /></button> : null}</div><h3 className="mt-3 text-lg font-semibold leading-7">{item.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.coreQuestion}</p><dl className="mt-4 grid gap-3 border-t pt-4 text-xs"><div><dt className="font-medium">为什么值得关注</dt><dd className="mt-1 line-clamp-2 leading-5 text-[var(--text-secondary)]">{item.whyRecommended}</dd></div><div><dt className="font-medium">为什么是现在</dt><dd className="mt-1 line-clamp-2 leading-5 text-[var(--text-secondary)]">{item.whyNow}</dd></div><div><dt className="font-medium">与你相关</dt><dd className="mt-1 line-clamp-2 leading-5 text-[var(--text-secondary)]">{item.creatorFit}</dd></div></dl><div className="mt-auto flex flex-wrap gap-2 pt-5"><Button variant="secondary" asChild><Link href={`/discovery/recommendations/${item.id}`}>查看依据 <ArrowRight size={14} /></Link></Button>{canWrite && item.status === "NEW" ? <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void act(item.id, "SAVE_IDEA")}><Check size={14} /> 加入选题</Button> : null}{canWrite && item.status === "NEW" ? <Button disabled={Boolean(busy)} onClick={() => void act(item.id, "START_RESEARCH")}><Sparkles size={14} /> 开始研究</Button> : null}{item.contentIdeaId ? <Button asChild><Link href={`/discovery/ideas/${item.contentIdeaId}`}>查看选题</Link></Button> : null}</div></Card>)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">本批线索已全部处理。你可以明确点击“更新一批”。</Card>}
    {batch && !batch.creatorProfileId ? <p className="mt-3 text-xs text-[var(--text-secondary)]">未使用个性化档案。<Link href="/settings/creator-profile" className="text-[var(--accent)]">完善创作者档案</Link>后可提供更多人工判断依据。</p> : null}
  </section>;
}
