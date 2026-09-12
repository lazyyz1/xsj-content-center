/* finesse · register=product · shell=cover-led-creative-project-library · palette=continued-cobalt-cool-slate · density=5 */
import { Button } from "@content-center/ui";
import { ArrowRight, FileText, FolderOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";
import { requireWorkspace } from "@/server/access";
import { listProjects, type ProjectListQuery } from "@/server/project-service";

type ListedProject = Awaited<ReturnType<typeof listProjects>>["items"][number];
type EmployeeState = { key: "ACTIVE" | "UNSTARTED" | "DONE"; label: "进行中" | "未开始" | "已结束" };
type ProjectView = "ALL" | EmployeeState["key"];

function employeeState(item: ListedProject): EmployeeState {
  if (item.status === "APPROVED" || item.status === "ARCHIVED") return { key: "DONE", label: "已结束" };
  if (item.status === "DRAFT" && !item.motherContent?.body.trim() && !item.creativeBrief?.coreMessage.trim()) return { key: "UNSTARTED", label: "未开始" };
  return { key: "ACTIVE", label: "进行中" };
}

function queryHref(query: ProjectListQuery, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) if (value) params.set(key, value);
  return `/projects?${params.toString()}`;
}

function coverVariant(item: ListedProject) {
  let hash = 0;
  for (const character of `${item.id}:${item.title}`) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6;
}

function sortProjects(items: ListedProject[], sort: string | undefined) {
  return [...items].sort((left, right) => {
    if (sort === "created") return right.createdAt.getTime() - left.createdAt.getTime();
    if (sort === "name") return left.title.localeCompare(right.title, "zh-CN");
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

function isToday(date: Date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function editedAt(date: Date) {
  return isToday(date)
    ? `最近编辑：今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `最近编辑：${date.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" })}`;
}

function createdAt(date: Date) {
  return `创建于：${date.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" })}`;
}

function projectSummary(item: ListedProject) {
  return item.description || item.goal || item.creativeBrief?.coreMessage || "从一个想法开始，把它继续写成完整内容。";
}

function ProjectCover({ item, state, compact = false }: { item: ListedProject; state: EmployeeState; compact?: boolean }) {
  return <div className={`project-library-cover cover-${coverVariant(item)} ${compact ? "is-compact" : ""}`}>
    <span className="project-cover-sheet" aria-hidden="true"><FileText size={compact ? 17 : 23} /></span>
    <strong aria-hidden="true">{item.title.slice(0, 1).toUpperCase()}</strong>
    <i aria-hidden="true" />
    <em>{state.label}</em>
  </div>;
}

function ProjectCard({ item, canEdit }: { item: ListedProject; canEdit: boolean }) {
  const state = employeeState(item);
  const href = `/dashboard?project=${item.id}`;
  const action = state.key === "UNSTARTED" ? "开始创作" : "继续创作";
  return <article className={`project-library-card is-${state.key.toLowerCase()}`}>
    <div className="project-card-cover-wrap">
      <ProjectCover item={item} state={state} />
      {canEdit ? <ProjectCardMenu projectId={item.id} title={item.title} ended={false} /> : null}
    </div>
    <div className="project-library-card-body">
      <h3><Link href={href}>{item.title}</Link></h3>
      <p>{projectSummary(item)}</p>
      <footer>
        <time dateTime={item.updatedAt.toISOString()}>{state.key === "UNSTARTED" ? createdAt(item.createdAt) : editedAt(item.updatedAt)}</time>
        <Link className="project-card-primary" href={href}>{action}<ArrowRight size={15} /></Link>
      </footer>
    </div>
  </article>;
}

function EndedProjectCard({ item, canEdit }: { item: ListedProject; canEdit: boolean }) {
  const href = `/dashboard?project=${item.id}`;
  return <article className="project-ended-card">
    <ProjectCover item={item} state={{ key: "DONE", label: "已结束" }} compact />
    <div>
      <span>已结束</span>
      <h3><Link href={href}>{item.title}</Link></h3>
      <time dateTime={item.updatedAt.toISOString()}>{editedAt(item.updatedAt)}</time>
    </div>
    {canEdit ? <ProjectCardMenu projectId={item.id} title={item.title} ended /> : null}
    <ArrowRight className="project-ended-arrow" size={16} aria-hidden="true" />
  </article>;
}

function NewProjectCard() {
  return <Link href="/projects/new" className="project-new-card"><span><Plus size={20} /></span><strong>新建项目</strong><small>从一个想法开始创作</small></Link>;
}

function ProjectSection({ title, items, canEdit, ended = false, addNew = false }: { title: string; items: ListedProject[]; canEdit: boolean; ended?: boolean; addNew?: boolean }) {
  if (!items.length) return null;
  return <section className={`project-library-section ${ended ? "is-ended" : ""}`} aria-labelledby={`project-section-${ended ? "done" : title}`}>
    <header><h2 id={`project-section-${ended ? "done" : title}`}>{title}</h2><span>{items.length} 个项目</span></header>
    <div className={ended ? "project-ended-grid" : "project-library-grid"}>
      {items.map((item) => ended ? <EndedProjectCard key={item.id} item={item} canEdit={canEdit} /> : <ProjectCard key={item.id} item={item} canEdit={canEdit} />)}
      {addNew && canEdit ? <NewProjectCard /> : null}
    </div>
  </section>;
}

function ProjectEmpty({ view, hasProjects, search, canEdit, query }: { view: ProjectView; hasProjects: boolean; search: string; canEdit: boolean; query: ProjectListQuery }) {
  const title = search ? "没有找到相关项目"
    : !hasProjects ? "还没有项目，从一个想法开始吧"
      : view === "ACTIVE" ? "暂时没有正在进行的项目"
        : view === "UNSTARTED" ? "暂时没有未开始的项目"
          : view === "DONE" ? "暂时没有已结束的项目"
            : "当前没有可展示的项目";
  const description = search ? "可以换一个关键词，或清除搜索后查看全部项目。" : "项目会按当前状态出现在这里。";
  return <section className="project-library-empty">
    <span><FolderOpen size={24} /></span>
    <h2>{title}</h2>
    <p>{description}</p>
    <div>{search ? <Button variant="secondary" asChild><Link href={queryHref(query, { search: "", page: "1" })}>清除搜索</Link></Button> : null}{canEdit && !hasProjects ? <Button asChild><Link href="/projects/new"><Plus size={16} />新建项目</Link></Button> : null}</div>
  </section>;
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<ProjectListQuery> }) {
  const { workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const view = typeof query.status === "string" && ["ALL", "ACTIVE", "UNSTARTED", "DONE"].includes(query.status) ? query.status as ProjectView : "ACTIVE";
  const result = await listProjects(workspace.id, { ...query, status: undefined, pageSize: "50" });
  const items = sortProjects(result.items, query.sort);
  const groups = {
    ACTIVE: items.filter((item) => employeeState(item).key === "ACTIVE"),
    UNSTARTED: items.filter((item) => employeeState(item).key === "UNSTARTED"),
    DONE: items.filter((item) => employeeState(item).key === "DONE"),
  };
  const visibleItems = view === "ALL" ? items : groups[view];
  const canEdit = role !== "VIEWER";
  const hasProjects = result.total > 0 || Boolean(query.search);

  return <div className="project-library-page">
    <header className="project-library-header">
      <div><h1>项目</h1><p>管理你的创作项目，随时继续正在进行的内容</p></div>
      {canEdit ? <Button asChild><Link href="/projects/new"><Plus size={17} />新建项目</Link></Button> : null}
    </header>

    <div className="project-library-commandbar">
      <nav aria-label="项目状态">{([ ["ALL", "全部"], ["ACTIVE", "进行中"], ["UNSTARTED", "未开始"], ["DONE", "已结束"] ] as const).map(([value, label]) => <Link key={value} href={queryHref(query, { status: value, page: "1" })} aria-current={view === value ? "page" : undefined}>{label}</Link>)}</nav>
      <form method="get">
        <input type="hidden" name="status" value={view} />
        {query.review ? <input type="hidden" name="review" value={query.review} /> : null}
        <label><Search size={16} /><input name="search" defaultValue={query.search} aria-label="搜索项目" placeholder="搜索项目" /></label>
        <select name="sort" defaultValue={query.sort || "updated"} aria-label="项目排序">
          <option value="updated">最近编辑</option>
          <option value="created">最近创建</option>
          <option value="name">名称排序</option>
        </select>
        <button type="submit">应用</button>
      </form>
    </div>

    {query.review === "pending" ? <div className="project-library-notice"><span>当前仅显示有平台内容待人工审核的项目。</span><Link href="/projects">清除筛选</Link></div> : null}

    <div className="project-library-content">
      {visibleItems.length ? view === "ALL" ? <>
        <ProjectSection title="进行中" items={groups.ACTIVE} canEdit={canEdit} addNew={!query.search} />
        <ProjectSection title="未开始" items={groups.UNSTARTED} canEdit={canEdit} />
        <ProjectSection title="已结束" items={groups.DONE} canEdit={canEdit} ended />
      </> : view === "DONE" ? <ProjectSection title="已结束" items={groups.DONE} canEdit={canEdit} ended />
        : <ProjectSection title={view === "ACTIVE" ? "进行中" : "未开始"} items={groups[view]} canEdit={canEdit} addNew={view === "ACTIVE" && !query.search} />
        : <ProjectEmpty view={view} hasProjects={hasProjects} search={query.search?.trim() || ""} canEdit={canEdit} query={query} />}
    </div>

    {result.pages > 1 ? <nav aria-label="分页" className="project-library-pagination"><Link aria-disabled={result.page <= 1} className={result.page <= 1 ? "is-disabled" : ""} href={queryHref(query, { page: String(result.page - 1) })}>上一页</Link><span>第 {result.page} / {result.pages} 页</span><Link aria-disabled={result.page >= result.pages} className={result.page >= result.pages ? "is-disabled" : ""} href={queryHref(query, { page: String(result.page + 1) })}>下一页</Link></nav> : null}
  </div>;
}
