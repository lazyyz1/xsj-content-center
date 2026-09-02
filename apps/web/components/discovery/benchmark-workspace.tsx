"use client";

import { Badge, Button, Card } from "@content-center/ui";
import type { ExternalContent } from "@content-center/providers";
import { ArrowLeft, ArrowRight, BookmarkPlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Work = Omit<ExternalContent, "rawProviderMetadata"> & { sourceItemId: string | null; inIdea: boolean };
const platformLabel: Record<string, string> = { DOUYIN: "抖音", XIAOHONGSHU: "小红书" };

function externalContentPayload(item: Work) {
  const { sourceItemId, inIdea, ...payload } = item;
  void sourceItemId;
  void inIdea;
  return payload;
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init); const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "操作失败。"); return body;
}

export function BenchmarkWorkspace({ benchmark, canRefresh, canManage }: { benchmark: { id: string; name: string; platform: string; avatarUrl: string | null; bio: string | null; lastSyncedAt: string | null }; canRefresh: boolean; canManage: boolean }) {
  const router = useRouter(); const [sort, setSort] = useState<"LATEST" | "POPULAR">("LATEST"); const [items, setItems] = useState<Work[] | null>(null); const [busy, setBusy] = useState(false); const [action, setAction] = useState(""); const [error, setError] = useState("");
  async function load() { setBusy(true); setError(""); try { const body = await request(`/api/discovery/benchmarks/${benchmark.id}?sort=${sort}`); setItems(body.items); } catch (reason) { setError(reason instanceof Error ? reason.message : "加载失败。"); } finally { setBusy(false); } }
  async function collect(item: Work) { const key = `${item.platform}:${item.externalId}`; setAction(key); setError(""); try { const body = await request("/api/discovery/collect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: externalContentPayload(item) }) }); setItems((current) => current?.map((value) => value.externalId === item.externalId ? { ...value, sourceItemId: body.sourceItemId } : value) ?? current); } catch (reason) { setError(reason instanceof Error ? reason.message : "收录失败。"); } finally { setAction(""); } }
  async function create(item: Work) { setAction(`project:${item.externalId}`); setError(""); try { const body = await request("/api/discovery/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: externalContentPayload(item) }) }); router.push(`/projects/${body.projectId}/studio`); } catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败。"); setAction(""); } }
  async function remove() { if (!window.confirm("确认停用这个共享对标账号？")) return; await request(`/api/discovery/benchmarks/${benchmark.id}`, { method: "DELETE" }); router.push("/discovery"); router.refresh(); }
  return <><div className="mb-5 flex items-center justify-between gap-4"><Link href="/discovery" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} /> 返回内容发现</Link>{canManage ? <Button variant="secondary" onClick={() => void remove()}><Trash2 size={14} /> 停用对标</Button> : null}</div><Card className="p-5"><div className="flex items-start gap-4">{benchmark.avatarUrl ? <img src={benchmark.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 rounded-full bg-[var(--surface-elevated)] text-xl font-semibold">{benchmark.name.slice(0,1)}</div>}<div><Badge>{platformLabel[benchmark.platform]}</Badge><h1 className="mt-2 text-2xl font-semibold">{benchmark.name}</h1>{benchmark.bio ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{benchmark.bio}</p> : null}</div></div></Card><section className="mt-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold">账号作品</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">只读取一页作品信息，不会自动下载内容。</p></div><div className="flex gap-2"><select value={sort} onChange={(event) => setSort(event.target.value as "LATEST" | "POPULAR")} className="h-9 rounded-lg border bg-[var(--surface)] px-3 text-sm"><option value="LATEST">最新内容</option><option value="POPULAR">热门内容</option></select><Button disabled={!canRefresh || busy} onClick={() => void load()}>{busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {items ? "刷新" : "加载作品"}</Button></div></div>{!canRefresh ? <p className="mt-4 rounded-xl border p-4 text-sm text-[var(--text-secondary)]">当前权限可查看对标账号，但不会发起付费数据刷新。</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}{items === null ? <Card className="mt-4 grid min-h-48 place-items-center p-8 text-center"><div><p className="font-medium">作品尚未加载</p><p className="mt-2 text-sm text-[var(--text-secondary)]">点击“加载作品”后才会请求内容数据服务。</p></div></Card> : items.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={`${item.platform}:${item.externalId}`} className="overflow-hidden">{item.coverUrl ? <img src={item.coverUrl} alt="" className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-[var(--surface-elevated)]" />}<div className="p-4"><div className="flex gap-2">{item.sourceItemId ? <Badge className="text-[var(--success)]">已收录</Badge> : null}{item.inIdea ? <Badge>已加入选题</Badge> : null}</div><h3 className="mt-3 line-clamp-2 font-semibold">{item.title || item.description || "未命名内容"}</h3><div className="mt-4 flex flex-wrap gap-2">{item.sourceItemId ? <Button variant="secondary" asChild><Link href={`/library/${item.sourceItemId}`}>查看素材</Link></Button> : <Button variant="secondary" disabled={Boolean(action)} onClick={() => void collect(item)}>{action === `${item.platform}:${item.externalId}` ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />} 收录素材</Button>}<Button disabled={Boolean(action)} onClick={() => void create(item)}>{action === `project:${item.externalId}` ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} 开始创作</Button></div></div></Card>)}</div> : <Card className="mt-4 p-8 text-center text-sm text-[var(--text-secondary)]">该账号暂无可用作品。</Card>}</section></>;
}
