/* finesse · register=product · shell=continue-first-project-workbench · palette=continued-cool-slate-cobalt · density=7 */
import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, Clock3, FileText, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { listProjects, type ProjectListQuery } from "@/server/project-service";
import { ProjectArchiveButton } from "@/components/projects/project-archive-button";

type ListedProject = Awaited<ReturnType<typeof listProjects>>["items"][number];

function employeeState(item: ListedProject) {
  if (item.status === "APPROVED" || item.status === "ARCHIVED") return { label: "已结束", tone: "project-state-done" };
  if (item.status === "DRAFT" && !item.motherContent?.body.trim() && !item.creativeBrief?.coreMessage.trim()) return { label: "未开始", tone: "project-state-new" };
  return { label: "进行中", tone: "project-state-active" };
}

function projectSource(item: ListedProject) {
  const metadata = item.creativeBrief?.metadata;
  const handoff = metadata && typeof metadata === "object" && !Array.isArray(metadata) && "handoff" in metadata ? metadata.handoff : null;
  if (handoff === "BENCHMARK_TOPIC") return "博主选题";
  if (item._count.sources) return "资料";
  if (item.creativeBrief?.coreMessage) return "首页想法";
  return "自建项目";
}

function projectNextLabel(item: ListedProject) {
  const metadata = item.creativeBrief?.metadata;
  const handoff = metadata && typeof metadata === "object" && !Array.isArray(metadata) && "handoff" in metadata ? metadata.handoff : null;
  if (handoff === "BENCHMARK_TOPIC" && item.nextAction.key === "ADD_REFERENCE") return "完善选题与依据";
  return item.nextAction.label;
}

function queryHref(query: ProjectListQuery, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) if (value) params.set(key, value);
  return `/projects?${params.toString()}`;
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<ProjectListQuery> }) {
  const { workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const { items, total, page, pages } = await listProjects(workspace.id, query);
  const continueItems = items.filter((item) => employeeState(item).label !== "已结束").slice(0, 4);
  const view = typeof query.status === "string" && ["UNSTARTED", "ACTIVE", "DONE"].includes(query.status) ? query.status : "ALL";
  const visibleItems = items.filter((item) => view === "ALL" || view === "UNSTARTED" && employeeState(item).label === "未开始" || view === "ACTIVE" && employeeState(item).label === "进行中" || view === "DONE" && employeeState(item).label === "已结束");
  const counts = { ALL: items.length, UNSTARTED: items.filter((item) => employeeState(item).label === "未开始").length, ACTIVE: items.filter((item) => employeeState(item).label === "进行中").length, DONE: items.filter((item) => employeeState(item).label === "已结束").length };
  return <div className="projects-workspace">
    <header className="projects-v2-header page-hero-row">
      <div><h1 className="page-heading">项目</h1><p className="page-description">查看正在推进的内容，清楚知道下一步该做什么。</p></div>
      {role !== "VIEWER" ? <Button asChild><Link href="/projects/new"><Plus size={17} />新建项目</Link></Button> : null}
    </header>
    <nav className="project-state-filters" aria-label="项目状态筛选">{([[["ALL", "全部项目"], ["UNSTARTED", "未开始"], ["ACTIVE", "进行中"], ["DONE", "已结束"]]] as const)[0].map(([value, label]) => <Link key={value} aria-current={view === value ? "page" : undefined} href={queryHref(query, { status: value === "ALL" ? "" : value, page: "1" })}>{label}<span>{counts[value]}</span></Link>)}<Link className="project-more-filter" href={queryHref(query, { status: "ARCHIVED", page: "1" })}><SlidersHorizontal size={14} />归档项目</Link></nav>
    {query.review === "pending" ? <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border bg-white/68 p-4 text-sm"><span>当前仅显示有平台内容待人工审核的项目。</span><Link href="/projects" className="shrink-0 font-medium text-[var(--accent)]">清除筛选</Link></div> : null}
    {continueItems.length ? <section aria-labelledby="continue-projects" className="mb-8">
      <div className="section-heading-row"><div><h2 id="continue-projects">继续创作</h2><p>从你最近的项目继续，保持创作节奏。</p></div><span>{continueItems.length} 个项目</span></div>
      <div className="project-focus-grid">{continueItems.map((item) => { const state = employeeState(item); return <Card key={item.id} className="project-focus-card"><div className="project-focus-visual"><FileText size={24} /><Badge className={state.tone}>{state.label}</Badge></div><h3><Link href={`/projects/${item.id}/studio`}>{item.title}</Link></h3><p>{item.description || item.goal || item.creativeBrief?.coreMessage || "继续完善这项内容。"}</p><div className="project-focus-meta"><span>来自 <b>{projectSource(item)}</b></span><time><Clock3 size={13} />{item.updatedAt.toLocaleDateString("zh-CN")}</time></div><div className="project-focus-next"><span><small>下一步</small>{projectNextLabel(item)}</span><Button asChild><Link href={`/projects/${item.id}/studio`}>继续创作<ArrowRight size={15} /></Link></Button></div></Card>; })}</div>
    </section> : null}
    <section aria-labelledby="all-projects">
      <div className="section-heading-row"><div><h2 id="all-projects">全部项目</h2><p>查看和管理你的所有创作项目。</p></div><span>共 {total} 个</span></div>
      <Card className="project-list-shell">
        <form method="get" className="project-list-toolbar"><label><Search size={17} /><input name="search" defaultValue={query.search} aria-label="搜索项目" placeholder="搜索项目名称、主题或关键词" /></label><select name="sort" defaultValue={query.sort || "newest"} aria-label="项目排序"><option value="newest">最新更新</option><option value="oldest">最早创建</option></select><button>筛选</button></form>
        {visibleItems.length ? <><div className="project-list-head"><span>项目名称</span><span>状态</span><span>来源</span><span>最近更新</span><span>下一步</span><span>操作</span></div><div className="project-compact-list">{visibleItems.map((item) => { const state = employeeState(item); return <article key={item.id}><span className="project-list-icon"><FileText size={18} /></span><div className="min-w-0"><Link href={`/projects/${item.id}/studio`}>{item.title}</Link></div><Badge className={state.tone}>{state.label}</Badge><span className="project-source-label">{projectSource(item)}</span><time>{item.updatedAt.toLocaleDateString("zh-CN")}</time><span className="project-list-next">{projectNextLabel(item)}</span>{state.label === "已结束" ? <div className="project-row-actions"><Link className="project-list-action" href={`/projects/${item.id}/studio`}>查看</Link>{role !== "VIEWER" ? <ProjectArchiveButton projectId={item.id} /> : null}</div> : <Link className="project-list-action" href={`/projects/${item.id}/studio`}>继续创作<ArrowRight size={15} /></Link>}</article>; })}</div></> : <div className="empty-state"><h2>{items.length ? "当前筛选下没有项目" : "还没有创作项目"}</h2><p>可以调整筛选，或开始一个新的内容项目。</p>{role !== "VIEWER" ? <Button asChild><Link href="/projects/new">开始一个新项目</Link></Button> : null}</div>}
      </Card>
    </section>
    <nav aria-label="分页" className="mt-6 flex items-center justify-between text-sm"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page - 1) })}>上一页</Link><span className="text-[var(--text-secondary)]">第 {page} / {pages} 页</span><Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page + 1) })}>下一页</Link></nav>
  </div>;
}
