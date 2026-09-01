import { Badge, Card } from "@content-center/ui";
import { LayoutGrid, List, Music2, Search } from "lucide-react";
import Link from "next/link";
import { IngestDialog } from "@/components/library/ingest-dialog";
import { LibraryPoller } from "@/components/library/library-poller";
import { RetryIngestButton } from "@/components/library/retry-ingest-button";
import { requireWorkspace } from "@/server/access";
import { listLibrarySources, type LibraryQuery } from "@/server/library";
import { db } from "@content-center/db";

const statusLabels = { PENDING: "处理中", PROCESSING: "处理中", READY: "已完成", FAILED: "失败", ARCHIVED: "已归档" } as const;

function queryHref(query: LibraryQuery, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) if (value) params.set(key, value);
  return `/library?${params.toString()}`;
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<LibraryQuery & { view?: string }> }) {
  const { workspace } = await requireWorkspace();
  const query = await searchParams;
  const [{ items, total, page, pages }, tags, collections] = await Promise.all([
    listLibrarySources(workspace.id, query),
    db.contentTag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.collection.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
  ]);
  const listView = query.view === "list";
  const hasProcessing = items.some(({ status }) => status === "PENDING" || status === "PROCESSING");

  return (
    <>
      <LibraryPoller active={hasProcessing} />
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">素材库</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">收录文本、公开网页和抖音作品，并用标签与 Collection 组织个人素材。</p>
        </div>
        <IngestDialog />
      </header>

      <Card className="mb-5 p-4">
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(110px,auto))_auto]" method="get">
          <label className="flex h-10 items-center gap-2 rounded-[var(--radius)] border bg-[var(--surface)] px-3">
            <Search size={16} className="text-[var(--text-secondary)]" />
            <input name="search" defaultValue={query.search} aria-label="搜索素材" placeholder="搜索标题、作者或正文" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
          </label>
          <select name="sourcePlatform" defaultValue={query.sourcePlatform ?? ""} aria-label="平台筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
            <option value="">全部平台</option><option value="GENERIC">Generic</option><option value="DOUYIN">抖音</option><option value="XIAOHONGSHU">小红书</option><option value="WECHAT">微信</option><option value="BILIBILI">Bilibili</option><option value="YOUTUBE">YouTube</option><option value="TIKTOK">TikTok</option><option value="OTHER">Other</option>
          </select>
          <select name="sourceType" defaultValue={query.sourceType ?? ""} aria-label="类型筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
            <option value="">全部类型</option><option value="TEXT">文本</option><option value="URL">网页</option><option value="VIDEO">视频</option><option value="AUDIO">音频</option><option value="IMAGE">图片</option><option value="DOCUMENT">文档</option>
          </select>
          <select name="status" defaultValue={query.status ?? ""} aria-label="状态筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
            <option value="">全部状态</option><option value="PENDING">待处理</option><option value="PROCESSING">处理中</option><option value="READY">已完成</option><option value="FAILED">失败</option><option value="ARCHIVED">已归档</option>
          </select>
          <select name="tag" defaultValue={query.tag ?? ""} aria-label="标签筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
            <option value="">全部标签</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <select name="collection" defaultValue={query.collection ?? ""} aria-label="Collection 筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
            <option value="">全部 Collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
          <div className="flex gap-2">
            <select name="sort" defaultValue={query.sort ?? "newest"} aria-label="排序" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm">
              <option value="newest">最新</option><option value="oldest">最早</option><option value="title">标题</option>
            </select>
            <button className="h-10 rounded-[var(--radius)] bg-[var(--text-primary)] px-4 text-sm text-white">筛选</button>
          </div>
        </form>
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-[var(--text-secondary)]">
          <span>共 {total} 条素材</span>
          <div className="flex gap-1">
            <Link aria-label="卡片视图" href={queryHref(query, { view: "card" })} className="rounded-md p-2 hover:bg-[var(--surface-elevated)]"><LayoutGrid size={16} /></Link>
            <Link aria-label="列表视图" href={queryHref(query, { view: "list" })} className="rounded-md p-2 hover:bg-[var(--surface-elevated)]"><List size={16} /></Link>
          </div>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="grid min-h-64 place-items-center p-8 text-center"><div><h2 className="font-semibold">没有匹配的素材</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">收录第一条内容，或调整当前搜索条件。</p></div></Card>
      ) : (
        <section aria-label="素材列表" className={listView ? "grid gap-3" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
          {items.map((item) => {
            const latestJob = item.ingestJobs[0];
            const isMock = item.transcript?.providerMode === "MOCK" || latestJob?.providerMode === "MOCK";
            return (
              <Card key={item.id} className={listView ? "flex flex-col gap-4 p-4 sm:flex-row sm:items-center" : "overflow-hidden"}>
                <div className={listView ? "h-16 w-24 shrink-0 rounded-lg bg-[var(--surface-elevated)]" : "h-32 bg-[var(--surface-elevated)]"}>
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full rounded-[inherit] object-cover" /> : <div className="grid h-full place-items-center text-xs text-[var(--text-secondary)]">{item.sourcePlatform === "DOUYIN" ? <span className="inline-flex items-center gap-1"><Music2 size={16} />抖音</span> : item.sourceType}</div>}
                </div>
                <div className={listView ? "min-w-0 flex-1" : "p-4"}>
                  <div className="mb-2 flex flex-wrap gap-1.5"><Badge>{item.sourcePlatform}</Badge><Badge>{item.sourceType}</Badge><Badge>{statusLabels[item.status]}</Badge>{isMock ? <Badge className="border-[var(--warning)] text-[var(--warning)]">MOCK</Badge> : null}</div>
                  <Link href={`/library/${item.id}`} className="line-clamp-2 font-semibold hover:text-[var(--accent)]">{item.title || "未命名素材"}</Link>
                  <p className="mt-2 truncate text-xs text-[var(--text-secondary)]">{item.author || "未知作者"} · {item.createdAt.toLocaleString("zh-CN")}</p>
                  <div className="mt-3 flex flex-wrap gap-1">{item.tags.map(({ tag }) => <span key={tag.id} className="rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs">#{tag.name}</span>)}</div>
                  {item.status === "FAILED" && latestJob ? <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-[var(--danger)]"><p>{latestJob.errorMessage || "采集失败"}</p><RetryIngestButton jobId={latestJob.id} /></div> : null}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      <nav aria-label="分页" className="mt-6 flex items-center justify-between text-sm">
        <Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page - 1) })}>上一页</Link>
        <span className="text-[var(--text-secondary)]">第 {page} / {pages} 页</span>
        <Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page + 1) })}>下一页</Link>
      </nav>
    </>
  );
}
