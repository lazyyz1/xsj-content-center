/* finesse · register=product · shell=purpose-led-content-asset-library · palette=continued-cobalt-cool-slate · density=5 */
import type { LucideIcon } from "lucide-react";
import { AudioLines, FileText, ImageIcon, Link2, Mic2, Search, Video } from "lucide-react";
import Link from "next/link";
import { IngestDialog } from "@/components/library/ingest-dialog";
import { LibraryCardAction, LibraryCardMenu } from "@/components/library/library-card-controls";
import { LibraryPoller } from "@/components/library/library-poller";
import { sourcePlatformLabels } from "@/lib/content-labels";
import { sourceDisplayName } from "@/lib/content-production";
import { getSourceProcessingState } from "@/lib/source-processing-state";
import { requireWorkspace } from "@/server/access";
import { listLibrarySources, type LibraryQuery } from "@/server/library";

type Source = Awaited<ReturnType<typeof listLibrarySources>>["items"][number];
type LibraryView = "ALL" | "RECENT" | "CREATION" | "RESEARCH";

const typeLabels: Record<string, string> = {
  VIDEO: "视频",
  DOCUMENT: "文档",
  URL: "链接",
  TEXT: "文字资料",
  AUDIO: "音频",
  IMAGE: "图片",
};
const typeIcons: Record<string, LucideIcon> = {
  VIDEO: Video,
  DOCUMENT: FileText,
  URL: Link2,
  TEXT: Mic2,
  AUDIO: AudioLines,
  IMAGE: ImageIcon,
};

function queryHref(query: LibraryQuery & { view?: string }, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) if (value) params.set(key, value);
  return `/library?${params.toString()}`;
}

function visualVariant(item: Source) {
  let hash = 0;
  for (const character of `${item.id}:${item.title ?? ""}`) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 4;
}

function processingState(item: Source) {
  return getSourceProcessingState({ sourceStatus: item.status, hasTranscript: Boolean(item.transcript), assets: item.assets, jobs: item.ingestJobs });
}

function hasResearch(item: Source) {
  return Boolean(item.materialAnalyses[0]);
}

function employeeStatus(item: Source): string | null {
  const processing = processingState(item);
  if (item.status === "ARCHIVED") return "已归档";
  if (item.status === "FAILED") return "需要处理";
  if (processing.busy) return item.sourceType === "VIDEO" ? processing.libraryLabel : "正在整理";
  if (hasResearch(item) || item.transcript) return null;
  return "待继续研究";
}

function employeeType(item: Source) {
  return typeLabels[item.sourceType] || "资料";
}

function employeePlatform(item: Source) {
  return item.sourcePlatform === "GENERIC" ? "手动添加" : sourcePlatformLabels[item.sourcePlatform] || "其他来源";
}

function sourceTitle(item: Source) {
  return sourceDisplayName({
    title: item.title,
    suggestedTitle: item.materialAnalyses[0]?.suggestedTitle,
    summary: item.materialAnalyses[0]?.summary,
    platformLabel: employeePlatform(item),
    createdAt: item.createdAt,
  });
}

function sourceSummary(item: Source) {
  if (item.materialAnalyses[0]?.summary) return item.materialAnalyses[0].summary;
  if (item.author) return `来自 ${item.author} 的${employeeType(item)}。`;
  return "尚未整理摘要，进入详情查看原始内容。";
}

function joinedAt(date: Date) {
  return `加入于：${date.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" })}`;
}

function primaryMode(item: Source, canManage: boolean): "CREATE" | "RESEARCH" | "DETAIL" | "PROGRESS" {
  if (hasResearch(item)) return canManage ? "CREATE" : "DETAIL";
  if (item.status === "FAILED" || item.status === "ARCHIVED") return "DETAIL";
  if (processingState(item).busy) return "PROGRESS";
  return "RESEARCH";
}

function LibraryCard({ item, canManage }: { item: Source; canManage: boolean }) {
  const Icon = typeIcons[item.sourceType] || FileText;
  const title = sourceTitle(item);
  const href = `/library/${item.id}`;
  const status = employeeStatus(item);
  return <article className={`project-library-card library-asset-card is-${item.sourceType.toLowerCase()}`}>
    <div className="project-card-cover-wrap">
      <div className={`library-asset-cover visual-${visualVariant(item)} ${item.thumbnailUrl ? "has-thumbnail" : ""}`}>
        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : null}
        <span aria-hidden="true"><Icon size={23} /></span>
        <i aria-hidden="true" />
        {status ? <strong>{status}</strong> : null}
      </div>
      {canManage ? <LibraryCardMenu sourceId={item.id} title={title} archived={item.status === "ARCHIVED"} /> : null}
    </div>
    <div className="project-library-card-body">
      <h3><Link href={href}>{title}</Link></h3>
      <p>{sourceSummary(item)}</p>
      <div className="library-asset-meta"><span>{employeeType(item)} · {employeePlatform(item)}</span>{item.author ? <span>{item.author}</span> : null}</div>
      <footer>
        <time dateTime={item.createdAt.toISOString()}>{joinedAt(item.createdAt)}</time>
        <LibraryCardAction sourceId={item.id} href={href} mode={primaryMode(item, canManage)} />
      </footer>
    </div>
  </article>;
}

function CreationCard({ item }: { item: Source }) {
  const Icon = typeIcons[item.sourceType] || FileText;
  const title = sourceTitle(item);
  return <article className="library-creation-card">
    <span aria-hidden="true"><Icon size={18} /></span>
    <div><h3>{title}</h3><p>{employeeType(item)} · {employeePlatform(item)}</p></div>
    <LibraryCardAction sourceId={item.id} href={`/library/${item.id}`} mode="CREATE" />
  </article>;
}

function LibraryEmpty({ view, search, canManage, query }: { view: LibraryView; search: string; canManage: boolean; query: LibraryQuery & { view?: string } }) {
  const title = search ? "没有找到相关资料"
    : view === "CREATION" ? "暂时没有可以直接用于创作的资料"
      : view === "RESEARCH" ? "暂时没有待继续研究的资料"
        : view === "RECENT" ? "暂时没有最近加入的资料"
          : "还没有资料";
  return <section className="project-library-empty library-empty">
    <span><FileText size={24} /></span>
    <h2>{title}</h2>
    <p>{search ? "可以换一个关键词，或清除搜索后查看全部资料。" : "从一个视频、文档或链接开始积累你的创作资料。"}</p>
    <div>{search ? <Link className="library-empty-link" href={queryHref(query, { search: "", page: "1" })}>清除搜索</Link> : canManage ? <IngestDialog /> : null}</div>
  </section>;
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<LibraryQuery & { view?: string }> }) {
  const { workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const view = typeof query.view === "string" && ["ALL", "RECENT", "CREATION", "RESEARCH"].includes(query.view) ? query.view as LibraryView : "RECENT";
  const result = await listLibrarySources(workspace.id, { ...query, pageSize: "50" });
  const items = query.status === "ARCHIVED" ? result.items : result.items.filter((item) => item.status !== "ARCHIVED");
  const newest = [...items].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const recentIds = new Set(newest.slice(0, 4).map(({ id }) => id));
  const creationItems = items.filter(hasResearch);
  const researchItems = items.filter((item) => !hasResearch(item) && item.status !== "ARCHIVED");
  const visibleItems = view === "ALL" ? items
    : view === "RECENT" ? items.filter(({ id }) => recentIds.has(id))
      : view === "CREATION" ? creationItems
        : researchItems;
  const hasProcessing = items.some((item) => processingState(item).busy);
  const canManage = role !== "VIEWER";
  const sectionTitle = view === "ALL" ? "全部资料" : view === "RECENT" ? "最近加入" : view === "CREATION" ? "可用于创作" : "待继续研究";

  return <>
    <LibraryPoller active={hasProcessing} />
    <div className="project-library-page library-page">
      <header className="project-library-header">
        <div><h1>资料</h1><p>把视频、文档、链接和案例整理成创作时可调用的资料</p></div>
        <div className="library-header-actions"><Link href="/library/methods">创作方法</Link>{canManage ? <IngestDialog /> : null}</div>
      </header>

      <div className="project-library-commandbar library-commandbar">
        <nav aria-label="资料用途">{([ ["ALL", "全部"], ["RECENT", "最近加入"], ["CREATION", "可用于创作"], ["RESEARCH", "待继续研究"] ] as const).map(([value, label]) => <Link key={value} href={queryHref(query, { view: value, page: "1" })} aria-current={view === value ? "page" : undefined}>{label}</Link>)}</nav>
        <form method="get">
          <input type="hidden" name="view" value={view} />
          {query.sourcePlatform ? <input type="hidden" name="sourcePlatform" value={query.sourcePlatform} /> : null}
          {query.sourceType ? <input type="hidden" name="sourceType" value={query.sourceType} /> : null}
          {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
          {query.tag ? <input type="hidden" name="tag" value={query.tag} /> : null}
          {query.collection ? <input type="hidden" name="collection" value={query.collection} /> : null}
          <label><Search size={16} /><input name="search" defaultValue={query.search} aria-label="搜索资料" placeholder="搜索资料" /></label>
          <select name="sort" defaultValue={query.sort || "newest"} aria-label="资料排序">
            <option value="newest">最近加入</option>
            <option value="oldest">最早加入</option>
            <option value="title">名称排序</option>
          </select>
          <button type="submit">应用</button>
        </form>
      </div>

      <div className="project-library-content">
        {visibleItems.length ? <section className="project-library-section" aria-labelledby="library-section-title">
          <header><h2 id="library-section-title">{sectionTitle}</h2><span>{visibleItems.length} 条资料</span></header>
          <div className="project-library-grid library-asset-grid">{visibleItems.map((item) => <LibraryCard key={item.id} item={item} canManage={canManage} />)}</div>
        </section> : <LibraryEmpty view={view} search={query.search?.trim() || ""} canManage={canManage} query={query} />}

        {(view === "ALL" || view === "RECENT") && canManage && creationItems.length ? <section className="project-library-section library-creation-section" aria-labelledby="library-creation-title">
          <header><h2 id="library-creation-title">可直接用于创作</h2><span>{creationItems.length} 条资料</span></header>
          <div className="library-creation-grid">{creationItems.slice(0, 4).map((item) => <CreationCard key={item.id} item={item} />)}</div>
        </section> : null}
      </div>

      {result.pages > 1 ? <nav aria-label="分页" className="project-library-pagination"><Link aria-disabled={result.page <= 1} className={result.page <= 1 ? "is-disabled" : ""} href={queryHref(query, { page: String(result.page - 1) })}>上一页</Link><span>第 {result.page} / {result.pages} 页</span><Link aria-disabled={result.page >= result.pages} className={result.page >= result.pages ? "is-disabled" : ""} href={queryHref(query, { page: String(result.page + 1) })}>下一页</Link></nav> : null}
    </div>
  </>;
}
