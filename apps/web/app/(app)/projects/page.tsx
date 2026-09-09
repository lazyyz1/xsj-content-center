import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { requireWorkspace } from "@/server/access";
import { listProjects, type ProjectListQuery } from "@/server/project-service";

const statusLabels: Record<string, string> = { DRAFT: "进行中", RESEARCHING: "进行中", BRIEF_READY: "进行中", WRITING: "进行中", IN_REVIEW: "待审核", APPROVED: "已完成", ARCHIVED: "已归档" };

function queryHref(query: ProjectListQuery, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) if (value) params.set(key, value);
  return `/projects?${params.toString()}`;
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<ProjectListQuery> }) {
  const { workspace, role } = await requireWorkspace();
  const query = await searchParams;
  const { items, total, page, pages } = await listProjects(workspace.id, query);
  return <>
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="page-heading">项目</h1><p className="page-description">查看正在创作的内容，继续写稿、审核和发布准备。</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href="/projects/methods">查看方法</Link></Button>{role !== "VIEWER" ? <Button asChild><Link href="/projects/new"><Plus size={16} />新建项目</Link></Button> : null}</div></header>
    {query.review === "pending" ? <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border bg-white/68 p-4 text-sm"><span>当前仅显示有平台内容待人工审核的项目。</span><Link href="/projects" className="shrink-0 font-medium text-[var(--accent)]">清除筛选</Link></div> : null}
    <Card className="mb-5 border-white/75 bg-white/68 p-4"><form method="get" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto]"><label className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] border bg-white/75 px-3"><Search size={16} className="text-[var(--text-secondary)]" /><input name="search" defaultValue={query.search} aria-label="搜索项目" placeholder="搜索名称、目标或受众" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" /></label><select name="status" defaultValue={query.status || ""} aria-label="状态筛选" className="h-11 rounded-[var(--radius-control)] border bg-white/75 px-3 text-sm"><option value="">进行中的项目</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select name="sort" defaultValue={query.sort || "newest"} aria-label="项目排序" className="h-11 rounded-[var(--radius-control)] border bg-white/75 px-3 text-sm"><option value="newest">最新创建</option><option value="oldest">最早创建</option></select><button className="h-11 rounded-[var(--radius-control)] bg-[var(--text-primary)] px-4 text-sm font-medium text-white">筛选</button></form><p className="mt-3 border-t pt-3 text-xs text-[var(--text-secondary)]">共 {total} 个项目</p></Card>
    {items.length ? <section aria-label="项目列表" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id} className="group flex min-h-56 flex-col border-white/75 bg-white/72 p-5 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:bg-white"><div className="flex items-center justify-between gap-3"><Badge>{item.nextAction.label}</Badge><time className="text-xs text-[var(--text-tertiary)]">{item.updatedAt.toLocaleDateString("zh-CN")}</time></div><Link href={`/projects/${item.id}/studio`} className="mt-4 line-clamp-2 text-lg font-semibold leading-6 group-hover:text-[var(--accent)]">{item.title}</Link><p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.description || item.goal || "暂未填写创作说明"}</p><div className="mt-auto pt-5 text-xs text-[var(--text-secondary)]"><p>{statusLabels[item.status]}，{item._count.sources} 条参考资料</p><Link className="mt-3 inline-flex min-h-10 items-center gap-1 font-medium text-[var(--accent)]" href={`/projects/${item.id}/studio`}>继续创作<ArrowRight size={14} /></Link></div></Card>)}</section> : <Card className="grid min-h-64 place-items-center p-8 text-center"><div><h2 className="font-semibold">还没有项目</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">从一个想法开始，或从资料里选择内容进入创作。</p>{role !== "VIEWER" ? <Button className="mt-5" asChild><Link href="/projects/new">新建项目</Link></Button> : null}</div></Card>}
    <nav aria-label="分页" className="mt-6 flex items-center justify-between text-sm"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page - 1) })}>上一页</Link><span className="text-[var(--text-secondary)]">第 {page} / {pages} 页</span><Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page + 1) })}>下一页</Link></nav>
  </>;
}
