"use client";

import { Badge, Button, Card } from "@content-center/ui";
import type { ExternalAccount, ExternalContent } from "@content-center/providers";
import { ArrowRight, BookmarkPlus, ExternalLink, Loader2, Plus, Search, Sparkles, TrendingUp, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TrendCard, type TrendOpportunityView } from "./trend-card";
import { TodayRecommendations, type RecommendationBatchView } from "./today-recommendations";

type PublicContent = Omit<ExternalContent, "rawProviderMetadata"> & { sourceItemId?: string | null };
type PublicAccount = Omit<ExternalAccount, "rawProviderMetadata">;
type IdeaSummary = { id: string; title: string; status: string; projectId?: string | null; updatedAt: string; referenceCount: number; sourceCount: number };
type BenchmarkSummary = { id: string; name: string; platform: string; avatarUrl: string | null; bio: string | null; lastSyncedAt: string | null; latestContent: { title: string; observedAt: string } | null };
type RecentSource = { id: string; title: string | null; author: string | null; thumbnailUrl: string | null; sourcePlatform: string; sourceType: string; status: string; createdAt: string };

function externalContentPayload(item: PublicContent) {
  const payload = { ...item };
  delete payload.sourceItemId;
  return payload;
}

const platformLabel: Record<string, string> = { DOUYIN: "抖音", XIAOHONGSHU: "小红书" };
const ideaStatusLabel: Record<string, string> = { INBOX: "待判断", READY: "准备做", IN_PROGRESS: "创作中", DONE: "已完成", ARCHIVED: "已归档" };

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || "操作未完成，请稍后重试。"), { code: body.error, status: response.status, body });
  return body;
}

function Metric({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return <span>{label} {value.toLocaleString("zh-CN")}</span>;
}

function ContentCard({ item, canWrite, onPreview, onCollect, onIdea, onCreate, busyAction }: {
  item: PublicContent;
  canWrite: boolean;
  onPreview: () => void;
  onCollect: () => void;
  onIdea: () => void;
  onCreate: () => void;
  busyAction: string | null;
}) {
  const key = `${item.platform}:${item.externalId}`;
  const busy = busyAction?.startsWith(key);
  return (
    <Card data-testid={`content-card-${item.platform}-${item.externalId}`} className="overflow-hidden">
      <div className="aspect-[16/9] bg-[var(--surface-elevated)]">
        {item.coverUrl ? <img src={item.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[var(--text-secondary)]">{platformLabel[item.platform]}{item.contentType === "VIDEO" ? "视频" : "内容"}</div>}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2"><Badge>{platformLabel[item.platform]}</Badge><Badge>{item.contentType === "VIDEO" ? "视频" : item.contentType === "IMAGE" ? "图文" : "内容"}</Badge>{item.sourceItemId ? <Badge className="text-[var(--success)]">✓ 已收录</Badge> : null}</div>
        <h3 className="mt-3 line-clamp-2 min-h-12 font-semibold leading-6">{item.title || item.description || "未命名内容"}</h3>
        <p className="mt-2 truncate text-xs text-[var(--text-secondary)]">{item.authorName || "未知作者"}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("zh-CN")}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
          <Metric label="赞" value={item.metrics.likes} /><Metric label="评论" value={item.metrics.comments} /><Metric label="收藏" value={item.metrics.favorites} /><Metric label="分享" value={item.metrics.shares} /><Metric label="播放" value={item.metrics.views} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Button disabled={!canWrite || busy} onClick={onIdea}><Sparkles size={14} /> 加入选题</Button>
          {item.sourceItemId ? <Button variant="secondary" asChild><Link href={`/library/${item.sourceItemId}`}>查看素材</Link></Button> : <Button variant="secondary" disabled={!canWrite || busy} onClick={onCollect}>{busyAction === `${key}:collect` ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />} 收录素材</Button>}
          <Button variant="ghost" onClick={onPreview}>预览</Button>
          <Button variant="ghost" disabled={!canWrite || busy} onClick={onCreate}>{busyAction === `${key}:project` ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} 开始创作</Button>
        </div>
      </div>
    </Card>
  );
}

function Modal({ title, onClose, children, width = "max-w-2xl" }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"><section role="dialog" aria-modal="true" className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border bg-[var(--surface)] p-5 shadow-2xl ${width}`}><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{title}</h2><button aria-label="关闭" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--surface-elevated)]"><X size={18} /></button></div>{children}</section></div>;
}

export function DiscoveryWorkspace({ configured, canWrite, canManageBenchmarks, initialBenchmarks, initialIdeas, recentSources, initialTrends, initialRecommendationBatch }: {
  configured: boolean;
  canWrite: boolean;
  canManageBenchmarks: boolean;
  initialBenchmarks: BenchmarkSummary[];
  initialIdeas: IdeaSummary[];
  recentSources: RecentSource[];
  initialTrends: TrendOpportunityView[];
  initialRecommendationBatch: RecommendationBatchView | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"ALL" | "DOUYIN" | "XIAOHONGSHU">("ALL");
  const [sort, setSort] = useState<"RECOMMENDED" | "LATEST" | "POPULAR">("RECOMMENDED");
  const [results, setResults] = useState<PublicContent[] | null>(null);
  const [accountResults, setAccountResults] = useState<PublicAccount[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [preview, setPreview] = useState<PublicContent | null>(null);
  const [ideaTarget, setIdeaTarget] = useState<PublicContent | null>(null);
  const [quickCollect, setQuickCollect] = useState(false);
  const [benchmarkDialog, setBenchmarkDialog] = useState(false);
  const [ideas, setIdeas] = useState(initialIdeas);
  const hasResults = results !== null || accountResults !== null;

  async function searchContent(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || !configured || !canWrite) return;
    setSearching(true); setError("");
    try {
      const body = await jsonRequest("/api/discovery/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, platform, sort, kind: "AUTO" }) });
      if (body.resultType === "ACCOUNT") {
        setAccountResults(body.items);
        setResults(null);
      } else {
        setResults(body.items);
        setAccountResults(null);
      }
    } catch (reason) {
      setResults([]); setAccountResults(null); setError(reason instanceof Error ? reason.message : "搜索失败。");
    } finally { setSearching(false); }
  }

  async function collect(item: PublicContent) {
    const key = `${item.platform}:${item.externalId}`; setBusyAction(`${key}:collect`); setError("");
    try {
      const body = await jsonRequest("/api/discovery/collect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: externalContentPayload(item) }) });
      setResults((current) => current?.map((candidate) => candidate.externalId === item.externalId && candidate.platform === item.platform ? { ...candidate, sourceItemId: body.sourceItemId } : candidate) ?? current);
      return body.sourceItemId as string;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "收录失败。"); return null; }
    finally { setBusyAction(null); }
  }

  async function createProject(item: PublicContent) {
    const key = `${item.platform}:${item.externalId}`; setBusyAction(`${key}:project`); setError("");
    try {
      const body = await jsonRequest("/api/discovery/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: externalContentPayload(item) }) });
      router.push(`/projects/${body.projectId}/studio`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建项目失败。"); setBusyAction(null); }
  }

  async function addMainBenchmark(account: PublicAccount) {
    const key = `${account.platform}:${account.externalId}`;
    setBusyAction(`${key}:benchmark`); setError("");
    try {
      await jsonRequest("/api/discovery/benchmarks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account }) });
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "添加对标失败。"); }
    finally { setBusyAction(null); }
  }

  const resultTitle = useMemo(() => query.trim() ? `“${query.trim()}”的相关内容` : "搜索结果", [query]);

  return <>
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-3xl font-semibold tracking-tight">内容发现</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">找值得做的内容</p></div><Button disabled={!canWrite} onClick={() => setQuickCollect(true)}><Plus size={16} /> 快速收录</Button></header>
    <Card className="p-5 sm:p-6">
      <form onSubmit={searchContent} className="flex flex-col gap-3 sm:flex-row"><label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border bg-[var(--surface)] px-4"><Search size={19} className="shrink-0 text-[var(--text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} disabled={!configured || !canWrite} aria-label="搜索内容" placeholder="今天想找什么内容？" className="min-w-0 flex-1 border-0 bg-transparent outline-none" /></label><Button className="h-12 px-6" disabled={searching || !query.trim() || !configured || !canWrite}>{searching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} 搜索</Button></form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-1 text-[var(--text-secondary)]">平台</span>{(["ALL", "DOUYIN", "XIAOHONGSHU"] as const).map((value) => <button key={value} onClick={() => setPlatform(value)} className={`rounded-full px-3 py-1.5 ${platform === value ? "bg-[var(--text-primary)] text-white" : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"}`}>{value === "ALL" ? "全部" : platformLabel[value]}</button>)}
        <span className="ml-2 mr-1 text-[var(--text-secondary)]">排序</span>{(["RECOMMENDED", "LATEST", "POPULAR"] as const).map((value) => <button key={value} onClick={() => setSort(value)} className={`rounded-full px-3 py-1.5 ${sort === value ? "bg-[var(--text-primary)] text-white" : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"}`}>{value === "RECOMMENDED" ? "推荐" : value === "LATEST" ? "最新" : "热门"}</button>)}
      </div>
      {!configured ? <div className="mt-5 rounded-xl border bg-[var(--surface-elevated)] p-4"><p className="font-medium">内容数据服务尚未配置，请联系管理员。</p>{canManageBenchmarks ? <Link href="/settings/integrations" className="mt-2 inline-flex text-sm text-[var(--accent)]">前往设置 <ArrowRight size={15} /></Link> : null}</div> : !canWrite ? <p className="mt-5 text-sm text-[var(--text-secondary)]">当前为只读权限，可查看已有对标、选题和素材。</p> : null}
    </Card>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[var(--danger)]">{error}</p> : null}
    {searching ? <section className="mt-7"><div className="h-6 w-52 animate-pulse rounded bg-[var(--surface-elevated)]" /><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((value) => <div key={value} className="h-80 animate-pulse rounded-2xl border bg-[var(--surface)]" />)}</div></section> : null}
    {!searching && results !== null ? <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{resultTitle}</h2><button className="text-sm text-[var(--text-secondary)]" onClick={() => { setResults(null); setAccountResults(null); }}>返回内容发现首页</button></div>{results.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{results.map((item) => <ContentCard key={`${item.platform}:${item.externalId}`} item={item} canWrite={canWrite} busyAction={busyAction} onPreview={() => setPreview(item)} onCollect={() => void collect(item)} onIdea={() => setIdeaTarget(item)} onCreate={() => void createProject(item)} />)}</div> : <Card className="mt-4 grid min-h-48 place-items-center p-8 text-center"><div><h3 className="font-semibold">没有找到匹配内容</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">换一个关键词或平台后再试。</p></div></Card>}</section> : null}
    {!searching && accountResults !== null ? <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">识别到的账号</h2><button className="text-sm text-[var(--text-secondary)]" onClick={() => { setResults(null); setAccountResults(null); }}>返回内容发现首页</button></div>{accountResults.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{accountResults.map((account) => { const key = `${account.platform}:${account.externalId}`; return <Card key={key} className="p-5"><div className="flex items-center gap-4">{account.avatarUrl ? <img src={account.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="grid h-14 w-14 rounded-full bg-[var(--surface-elevated)] font-semibold">{account.name.slice(0, 1)}</div>}<div className="min-w-0 flex-1"><Badge>{platformLabel[account.platform]}</Badge><h3 className="mt-2 truncate font-semibold">{account.name}</h3>{account.bio ? <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{account.bio}</p> : null}</div>{canManageBenchmarks ? <Button variant="secondary" disabled={Boolean(busyAction)} onClick={() => void addMainBenchmark(account)}>{busyAction === `${key}:benchmark` ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 加入我的对标</Button> : null}</div></Card>; })}</div> : <Card className="mt-4 p-8 text-center text-sm text-[var(--text-secondary)]">没有找到可用账号。</Card>}</section> : null}
    {!hasResults && !searching ? <div className="mt-7 grid gap-6">
      <TodayRecommendations initialBatch={initialRecommendationBatch} canWrite={canWrite} />
      <section><div className="mb-3 flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp size={18} /> 趋势机会</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">看看最近哪些内容正在升温</p></div><Button variant="secondary" asChild><Link href="/discovery/trends">查看全部 <ArrowRight size={15} /></Link></Button></div>{initialTrends.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{initialTrends.slice(0, 6).map((item) => <TrendCard key={item.deterministicKey} item={item} compact />)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">{configured ? "还没有趋势记录。进入趋势机会后，可由有权限的成员点击加载。" : "趋势数据服务尚未配置；搜索和已保存内容仍可继续使用。"}</Card>}</section>
      <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">我的对标</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">关注值得持续研究的创作者</p></div>{canManageBenchmarks ? <Button variant="secondary" onClick={() => setBenchmarkDialog(true)}><UserPlus size={15} /> 添加对标账号</Button> : null}</div>{initialBenchmarks.length ? <div className="flex gap-3 overflow-x-auto pb-2">{initialBenchmarks.map((item) => <Link key={item.id} href={`/discovery/benchmarks/${item.id}`} className="w-64 shrink-0 rounded-2xl border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"><div className="flex items-center gap-3">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 rounded-full bg-[var(--surface-elevated)] text-sm font-semibold">{item.name.slice(0,1)}</div>}<div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-[var(--text-secondary)]">{platformLabel[item.platform]}</p></div></div>{item.latestContent ? <div className="mt-3 border-t pt-3"><p className="text-[11px] text-[var(--text-secondary)]">最近加载的内容</p><p className="mt-1 line-clamp-2 text-xs leading-5">{item.latestContent.title}</p></div> : <p className="mt-3 border-t pt-3 text-xs text-[var(--text-secondary)]">尚未加载该账号的作品</p>}</Link>)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">添加对标账号后，这里会出现更多内容机会。</Card>}</section>
      <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">我的选题</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">正在考虑要做的内容方向</p></div></div>{ideas.length ? <div className="grid gap-3 md:grid-cols-2">{ideas.slice(0,6).map((idea) => <Card key={idea.id} className="p-4"><div><Badge>{ideaStatusLabel[idea.status]}</Badge><Link href={`/discovery/ideas/${idea.id}`} className="mt-2 block font-semibold hover:text-[var(--accent)]">{idea.title}</Link></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[var(--text-secondary)]">参考内容 {idea.referenceCount} · {idea.sourceCount > 0 ? `已有 ${idea.sourceCount} 条素材` : "暂无素材"}</p><Link href={`/discovery/ideas/${idea.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">{idea.projectId ? "继续创作" : "继续研究"} <ArrowRight size={13} /></Link></div></Card>)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">还没有选题。搜索外部内容后，可先加入选题，不会立即下载素材。</Card>}</section>
      <section><div className="mb-3"><h2 className="text-lg font-semibold">最近发现</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">你保存下来的参考内容</p></div>{recentSources.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{recentSources.map((item) => <Link key={item.id} href={`/library/${item.id}`} className="flex gap-3 rounded-2xl border bg-[var(--surface)] p-3 hover:border-[var(--accent)]">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-16 w-24 rounded-xl object-cover" /> : <div className="h-16 w-24 shrink-0 rounded-xl bg-[var(--surface-elevated)]" />}<div className="min-w-0"><p className="line-clamp-2 text-sm font-medium">{item.title || "未命名素材"}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{platformLabel[item.sourcePlatform]} · {item.sourceType === "VIDEO" ? "视频" : item.sourceType === "IMAGE" ? "图文" : "内容"}</p></div></Link>)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">还没有从内容发现收录的素材。</Card>}</section>
    </div> : null}

    {preview ? <Modal title="内容预览" onClose={() => setPreview(null)}>{preview.coverUrl ? <img src={preview.coverUrl} alt="" className="mt-5 max-h-80 w-full rounded-xl object-cover" /> : null}<div className="mt-5 flex gap-2"><Badge>{platformLabel[preview.platform]}</Badge><Badge>{preview.contentType === "VIDEO" ? "视频" : "图文"}</Badge></div><h3 className="mt-3 text-xl font-semibold">{preview.title || "未命名内容"}</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">{preview.authorName || "未知作者"}</p>{preview.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{preview.description}</p> : <p className="mt-4 text-sm text-[var(--text-secondary)]">该内容暂无可用摘要。</p>}<a href={preview.originalUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">查看原始内容 <ExternalLink size={14} /></a><div className="mt-5 flex flex-wrap gap-2 border-t pt-4">{preview.sourceItemId ? <Button asChild><Link href={`/library/${preview.sourceItemId}`}>查看素材</Link></Button> : <Button disabled={!canWrite} onClick={() => void collect(preview)}>收录素材</Button>}<Button variant="secondary" disabled={!canWrite} onClick={() => { setIdeaTarget(preview); setPreview(null); }}>加入选题</Button><Button variant="secondary" disabled={!canWrite} onClick={() => void createProject(preview)}>开始创作</Button></div></Modal> : null}
    {ideaTarget ? <IdeaDialog content={ideaTarget} ideas={ideas} onClose={() => setIdeaTarget(null)} onCreated={(idea) => { setIdeas((current) => [idea, ...current]); setIdeaTarget(null); }} /> : null}
    {quickCollect ? <QuickCollectDialog onClose={() => setQuickCollect(false)} onDone={(sourceId) => { setQuickCollect(false); router.push(`/library/${sourceId}`); }} /> : null}
    {benchmarkDialog ? <BenchmarkDialog onClose={() => setBenchmarkDialog(false)} onDone={() => { setBenchmarkDialog(false); router.refresh(); }} /> : null}
  </>;
}

function QuickCollectDialog({ onClose, onDone }: { onClose: () => void; onDone: (sourceId: string) => void }) {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const body = await jsonRequest("/api/source-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "REDFOX", url }) }); onDone(body.sourceItemId); } catch (reason) { const value = reason as Error & { code?: string; body?: { sourceItemId?: string } }; if (value.code === "DUPLICATE_SOURCE" && value.body?.sourceItemId) { onDone(value.body.sourceItemId); return; } setError(value.code === "INVALID_REDFOX_URL" ? "当前暂不支持该平台的自动收录。" : value.message); } finally { setBusy(false); } }
  return <Modal title="快速收录" onClose={onClose}><form onSubmit={submit} className="mt-5 grid gap-4"><label className="grid gap-2 text-sm">粘贴内容链接<input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="h-11 rounded-xl border bg-transparent px-3" /><span className="text-xs text-[var(--text-secondary)]">当前支持抖音和小红书作品链接。</span></label>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>取消</Button><Button disabled={busy}>{busy ? "收录中…" : "收录素材"}</Button></div></form></Modal>;
}

function IdeaDialog({ content, ideas, onClose, onCreated }: { content: PublicContent; ideas: IdeaSummary[]; onClose: () => void; onCreated: (idea: IdeaSummary) => void }) {
  const [mode, setMode] = useState<"NEW" | "EXISTING">("NEW"); const [title, setTitle] = useState(content.title || ""); const [ideaId, setIdeaId] = useState(ideas[0]?.id || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { if (mode === "NEW") { const body = await jsonRequest("/api/discovery/ideas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, reference: externalContentPayload(content) }) }); onCreated({ id: body.idea.id, title: body.idea.title, status: body.idea.status, updatedAt: body.idea.updatedAt, referenceCount: 1, sourceCount: content.sourceItemId ? 1 : 0 }); } else { await jsonRequest(`/api/discovery/ideas/${ideaId}/references`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: externalContentPayload(content) }) }); onClose(); } } catch (reason) { setError(reason instanceof Error ? reason.message : "加入选题失败。"); } finally { setBusy(false); } }
  return <Modal title="加入选题" onClose={onClose}><div className="mt-5 flex rounded-xl bg-[var(--surface-elevated)] p-1"><button onClick={() => setMode("NEW")} className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "NEW" ? "bg-[var(--surface)] font-medium shadow-sm" : "text-[var(--text-secondary)]"}`}>新建选题</button><button disabled={!ideas.length} onClick={() => setMode("EXISTING")} className={`flex-1 rounded-lg px-3 py-2 text-sm disabled:opacity-40 ${mode === "EXISTING" ? "bg-[var(--surface)] font-medium shadow-sm" : "text-[var(--text-secondary)]"}`}>加入已有选题</button></div><form onSubmit={submit} className="mt-5 grid gap-4">{mode === "NEW" ? <label className="grid gap-2 text-sm">选题标题<input required maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-xl border bg-transparent px-3" /></label> : <label className="grid gap-2 text-sm">选择选题<select value={ideaId} onChange={(event) => setIdeaId(event.target.value)} className="h-11 rounded-xl border bg-[var(--surface)] px-3">{ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}</select></label>}<p className="text-xs leading-5 text-[var(--text-secondary)]">加入选题只保存参考信息，不会下载视频或启动转写。</p>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>取消</Button><Button disabled={busy || (mode === "EXISTING" && !ideaId)}>{busy ? "保存中…" : "确认"}</Button></div></form></Modal>;
}

function BenchmarkDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<"ALL" | "DOUYIN" | "XIAOHONGSHU">("ALL"); const [items, setItems] = useState<PublicAccount[]>([]); const [busy, setBusy] = useState(false); const [adding, setAdding] = useState(""); const [error, setError] = useState("");
  async function search(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const body = await jsonRequest("/api/discovery/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, platform, sort: "RECOMMENDED", kind: "ACCOUNT" }) }); setItems(body.items); } catch (reason) { setError(reason instanceof Error ? reason.message : "账号搜索失败。"); } finally { setBusy(false); } }
  async function add(account: PublicAccount) { setAdding(`${account.platform}:${account.externalId}`); setError(""); try { await jsonRequest("/api/discovery/benchmarks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account }) }); onDone(); } catch (reason) { setError(reason instanceof Error ? reason.message : "添加失败。"); setAdding(""); } }
  return <Modal title="添加对标账号" onClose={onClose}><form onSubmit={search} className="mt-5 grid gap-3"><div className="flex gap-2"><input required value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入账号名称或主页链接" className="h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-3" /><Button disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 搜索</Button></div><div className="flex gap-2">{(["ALL", "DOUYIN", "XIAOHONGSHU"] as const).map((value) => <button type="button" key={value} onClick={() => setPlatform(value)} className={`rounded-full px-3 py-1.5 text-sm ${platform === value ? "bg-[var(--text-primary)] text-white" : "bg-[var(--surface-elevated)]"}`}>{value === "ALL" ? "全部" : platformLabel[value]}</button>)}</div></form>{error ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}<div className="mt-5 grid gap-3">{items.map((item) => <div key={`${item.platform}:${item.externalId}`} className="flex items-center gap-3 rounded-xl border p-3">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="h-11 w-11 rounded-full bg-[var(--surface-elevated)]" />}<div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-[var(--text-secondary)]">{platformLabel[item.platform]}{item.followers !== null ? ` · ${item.followers.toLocaleString("zh-CN")} 粉丝` : ""}</p></div><Button variant="secondary" disabled={Boolean(adding)} onClick={() => void add(item)}>{adding === `${item.platform}:${item.externalId}` ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 添加</Button></div>)}{!busy && query && items.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">没有找到匹配账号。</p> : null}</div></Modal>;
}
