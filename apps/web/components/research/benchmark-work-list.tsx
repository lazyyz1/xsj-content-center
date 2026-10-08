"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileText, Search } from "lucide-react";
import { WorkQueueActions } from "./benchmark-workbench-actions";
import { platformLabel } from "./research-labels";
import { researchTitle, researchTopics, researchCount, researchDuration } from "@/lib/research-presentation";
export type ResearchWorkRow = {
  id: string; accountId: string; accountName: string; platform: string; title: string;
  publishedAt: string | null; multiple: number | null; durationMs: number | null;
  observedAt?: string; latestObservedAt?: string | null; dataAsOf?: string | null;
  counts: { likes: number | null; comments: number | null; favorites: number | null; shares: number | null };
};
type Status = { id: string; reportId: string | null; readable: boolean; read: boolean; followed?: boolean; dismissed?: boolean };
type Props = { works: ResearchWorkRow[]; statuses: Status[]; returnTo: string; initialQuery?: string; initialFilter?: string; initialSort?: string; initialView?: string; initialAccountId?: string; initialPeriod?: string; initialViral?: string; threshold?: number; initialPage?: number };
export function BenchmarkWorkList({ works, statuses, returnTo, initialQuery = "", initialFilter = "all", initialSort = "multiple", initialView = "all", initialAccountId = "", initialPeriod = "all", initialViral = "all", threshold = 2.5, initialPage = 1 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery.slice(0, 100)), [filter, setFilter] = useState(["all", "readable", "report"].includes(initialFilter) ? initialFilter : "all"), [sort, setSort] = useState(["multiple", "likes", "newest"].includes(initialSort) ? initialSort : "multiple");
  const [view, setView] = useState(initialFilter === "unread" && initialView === "all" ? "unread" : ["all", "unread", "read", "favorites", "dismissed"].includes(initialView) ? initialView : "all");
  const [accountId, setAccountId] = useState(initialAccountId), [viral, setViral] = useState(initialViral), [page, setPage] = useState(Math.max(1, initialPage || 1));
  useEffect(() => { const focus = (event: Event) => { const id = (event as CustomEvent<{ id: string }>).detail?.id; if (id) { setAccountId(id); setPage(1); } }; window.addEventListener("research:filter-account", focus); return () => window.removeEventListener("research:filter-account", focus); }, []);
  const accounts = useMemo(() => Array.from(new Map(works.map(work => [work.accountId, { id: work.accountId, name: work.accountName }])).values()), [works]);
  const status = useMemo(() => new Map(statuses.map(item => [item.id, item])), [statuses]);
  const rows = useMemo(() => works.filter(work => {
    const saved = status.get(work.id);
    return (!accountId || work.accountId === accountId) && (viral !== "viral" || work.multiple !== null && work.multiple >= threshold) &&
      (view === "dismissed" ? saved?.dismissed : !saved?.dismissed && (view === "all" || view === "unread" && saved && !saved.read || view === "read" && saved?.read || view === "favorites" && saved?.followed)) &&
      (!query.trim() || (work.title + " " + work.accountName).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
      (filter === "all" || filter === "readable" && saved?.readable || filter === "report" && saved?.reportId);
  }).sort((a, b) => (sort === "newest" ? new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime() : sort === "likes" ? (b.counts.likes ?? -1) - (a.counts.likes ?? -1) : (b.multiple ?? -1) - (a.multiple ?? -1)) || a.id.localeCompare(b.id)), [works, query, filter, sort, status, view, accountId, viral, threshold]);
  const pages = Math.max(1, Math.ceil(rows.length / 25)), currentPage = Math.min(page, pages), visibleRows = rows.slice((currentPage - 1) * 25, currentPage * 25);
  const returnUrl = useMemo(() => {
    const url = new URL(returnTo, "http://local.invalid");
    for (const [key, value] of Object.entries({ workQuery: query, readiness: filter === "all" ? "" : filter, order: sort === "multiple" ? "" : sort, view: view === "all" ? "" : view, accountId, viral: viral === "viral" ? viral : "", page: currentPage > 1 ? String(currentPage) : "" })) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    return url.pathname + url.search + "#works";
  }, [returnTo, query, filter, sort, view, accountId, viral, currentPage]);
  useEffect(() => { const url = new URL(returnUrl, window.location.origin); if (window.location.pathname === url.pathname) window.history.replaceState(window.history.state, "", url.pathname + url.search + window.location.hash); window.dispatchEvent(new CustomEvent("research:account-selection", { detail: { id: accountId } })); }, [returnUrl, accountId]);
  const sourceFilters = new URL(returnTo, "http://local.invalid").searchParams;
  function reset() { setQuery(""); setFilter("all"); setView("all"); setAccountId(""); setViral("all"); setSort("multiple"); setPage(1); if (initialPeriod !== "all" || sourceFilters.get("platform") || sourceFilters.get("q") || sourceFilters.get("purpose") && sourceFilters.get("purpose") !== "all" || sourceFilters.get("threshold")) router.push("/research/benchmarks?period=all#works"); }
  function period(value: string) { const url = new URL(returnUrl, window.location.origin); url.searchParams.set("period", value); url.searchParams.delete("page"); router.push(url.pathname + url.search + "#works"); }
  function sourceFilter(key: string, value: string) { const url = new URL(returnUrl, window.location.origin); if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); url.searchParams.delete("page"); router.push(url.pathname + url.search + "#works"); }
  const filtered = Boolean(query || accountId || filter !== "all" || view !== "all" || viral === "viral" || initialPeriod !== "all" || sourceFilters.get("platform") || sourceFilters.get("q") || sourceFilters.get("threshold") || sourceFilters.get("purpose") && sourceFilters.get("purpose") !== "all");
  return <section className="research-work-library is-compact" id="works" aria-label="作品阅读与拆解">
    <header className="research-library-heading"><h2>作品 <span>{rows.length}</span></h2><span className="research-library-state-note">阅读状态仅对你生效</span></header>
    <nav className="research-work-reading-tabs" aria-label="作品阅读状态">{[["all", "全部"], ["unread", "未读"], ["read", "已读"], ["favorites", "收藏"], ["dismissed", "已忽略"]].map(([value, label]) => <button type="button" key={value} aria-current={view === value ? "page" : undefined} onClick={() => { setView(value!); setPage(1); }}>{label}</button>)}</nav>
    <div className="research-work-filter-row">
      <label className="research-library-search"><Search size={15} /><input type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="查找作品或账号" aria-label="搜索作品或账号" /></label>
      <select aria-label="作品范围" value={initialPeriod} onChange={event => period(event.target.value)}><option value="all">全部已保存</option><option value="3">最近 3 天</option><option value="7">最近一周</option><option value="30">最近 30 天</option></select>
      <select aria-label="筛选关注账号作品" value={accountId} onChange={event => { setAccountId(event.target.value); setPage(1); }}><option value="">全部账号</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
      <select aria-label="作品表现" value={viral} onChange={event => { setViral(event.target.value); setPage(1); }}><option value="all">表现不限</option><option value="viral">≥ {threshold.toFixed(1)}× 高表现</option></select>
      <select aria-label="作品就绪状态" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">原文 / 报告不限</option><option value="readable">已有原文</option><option value="report">已有拆解</option></select>
      <select aria-label="作品排序" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="multiple">相对表现</option><option value="likes">点赞最多</option><option value="newest">最新发布</option></select>
      <details className="research-work-extra-filters"><summary>更多筛选</summary><div><label>平台<select aria-label="作品平台" value={sourceFilters.get("platform") || ""} onChange={event => sourceFilter("platform", event.target.value)}><option value="">全部平台</option>{["DOUYIN", "XIAOHONGSHU", "BILIBILI", "YOUTUBE", "TIKTOK"].map(value => <option key={value} value={value}>{platformLabel[value]}</option>)}</select></label><label>学习分类<select aria-label="账号学习分类筛选" value={sourceFilters.get("purpose") || "all"} onChange={event => sourceFilter("purpose", event.target.value)}><option value="all">分类不限</option><option value="teacher">学方法</option><option value="reference">找题材</option></select></label><label>高表现倍数门槛<input aria-label="高表现倍数门槛" type="number" min={1} max={100} step={0.1} defaultValue={threshold} onBlur={event => { const value = Number(event.target.value); if (value >= 1 && value <= 100 && value !== threshold) sourceFilter("threshold", String(value)); }} /></label></div></details>
      {filtered ? <button type="button" className="research-clear-filters" onClick={reset}>清除筛选</button> : null}
    </div>
    <div className="research-work-table-labels" aria-hidden="true"><span>作品 / 来源与阅读状态</span><span>互动数据</span><span>相对表现</span><span>操作</span></div>
    <div className="research-work-rows">{visibleRows.map((work, index) => {
      const saved = status.get(work.id), title = researchTitle(work.title), topics = researchTopics(work.title), href = "/research/benchmarks/" + work.accountId + "/works/" + work.id + "?returnTo=" + encodeURIComponent(returnUrl.replace("#works", "#work-" + work.id));
      return <article className="research-work-item" id={"work-" + work.id} key={work.id}>
        <div className="research-work-main"><span className="research-work-index" aria-hidden="true">{String((currentPage - 1) * 25 + index + 1).padStart(2, "0")}</span><div><h3><Link href={href} title={title}>{title}</Link></h3><p><Link href={"/research/benchmarks/" + work.accountId}>{work.accountName}</Link><span>{platformLabel[work.platform] || work.platform}</span><time>{work.publishedAt ? new Date(work.publishedAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Singapore" }) : "日期未提供"}</time><span>{researchDuration(work.durationMs)}</span><span className={"research-work-readiness" + (saved?.reportId ? " has-report" : "")}><FileText size={11} />{saved?.reportId ? "已有拆解" : saved?.readable ? "已有原文" : "待准备原文"}{saved?.read ? " · 已读" : ""}</span>{topics.length ? <span className="research-work-topic-note" title={topics.map(topic => "#" + topic).join(" ")}>{topics.length} 个话题</span> : null}</p></div></div>
        <div className="research-work-engagement" title={"本地观察：" + (work.latestObservedAt || work.observedAt ? new Date(work.latestObservedAt || work.observedAt!).toLocaleString("zh-CN", { timeZone: "Asia/Singapore" }) : "未提供") + "；供应商数据时间：" + (work.dataAsOf ? new Date(work.dataAsOf).toLocaleString("zh-CN", { timeZone: "Asia/Singapore" }) : "未提供")}>{([['likes', '赞'], ['favorites', '藏'], ['comments', '评'], ['shares', '分享']] as const).map(([key, label]) => <span key={key} aria-label={label + " " + researchCount(work.counts[key])}><small>{label}</small><b>{researchCount(work.counts[key])}</b></span>)}</div>
        <div className="research-work-relative"><strong>{work.multiple === null ? "—" : work.multiple.toFixed(1) + "×"}</strong><small>{work.multiple === null ? "样本不足" : "同账号中位数"}</small></div>
        <div className="research-work-row-actions"><Link className="research-work-open" href={href} aria-label={(saved?.reportId ? "阅读拆解" : "阅读作品") + "：" + title}><span>{saved?.reportId ? "读拆解" : "查看内容"}</span><ArrowUpRight size={14} /></Link>{saved ? <WorkQueueActions compact id={work.id} accountId={work.accountId} read={saved.read} dismissed={Boolean(saved.dismissed)} followed={Boolean(saved.followed)} reportId={saved.reportId} returnTo={returnUrl} /> : null}</div>
      </article>;
    })}</div>
    {!rows.length ? <div className="research-library-empty"><FileText size={24} /><h3>{works.length ? "没有符合筛选的作品" : "这个范围还没有作品"}</h3><p>已有内容会保留。可以查看全部已保存作品，或调整筛选。</p><button type="button" onClick={reset}>清除筛选</button></div> : null}
    {rows.length ? <nav className="research-work-pagination" aria-label="作品分页"><span>共 {rows.length} 条 · {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, rows.length)} 条</span><button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); document.getElementById("works")?.scrollIntoView({ block: "start" }); }}>上一页</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); document.getElementById("works")?.scrollIntoView({ block: "start" }); }}>下一页</button></nav> : null}
    <footer className="research-library-footnote">相对表现比较同账号、同周期的已知点赞，至少需要 5 个有效样本；不代表播放、完播或效果原因。缺失数据为 —。</footer>
  </section>;
}
