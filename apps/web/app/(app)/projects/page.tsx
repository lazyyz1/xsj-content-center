import { Badge, Button, Card } from "@content-center/ui";
import { Plus, Search } from "lucide-react";
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
  return (
    <>
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-3xl font-semibold tracking-tight">我的创作</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">从参考素材出发，补充自己的观点，生成并修改口播稿。</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href="/projects/methods">我的创作方法</Link></Button>{role !== "VIEWER" ? <Button asChild><Link href="/projects/new"><Plus size={16} />新建创作</Link></Button> : null}</div></header>
      {query.review === "pending" ? <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border bg-[var(--surface)] p-4 text-sm"><span>当前仅显示有平台内容待人工审核的项目。</span><Link href="/projects" className="shrink-0 font-medium text-[var(--accent)]">清除筛选</Link></div> : null}
      <Card className="mb-5 p-4"><form method="get" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto]"><label className="flex h-10 items-center gap-2 rounded-[var(--radius)] border bg-[var(--surface)] px-3"><Search size={16} className="text-[var(--text-secondary)]" /><input name="search" defaultValue={query.search} aria-label="搜索项目" placeholder="搜索名称、目标或受众" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" /></label><select name="status" defaultValue={query.status || ""} aria-label="状态筛选" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="">进行中的项目</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select name="sort" defaultValue={query.sort || "newest"} aria-label="项目排序" className="h-10 rounded-[var(--radius)] border bg-[var(--surface)] px-3 text-sm"><option value="newest">最新创建</option><option value="oldest">最早创建</option></select><button className="h-10 rounded-[var(--radius)] bg-[var(--text-primary)] px-4 text-sm text-white">筛选</button></form><p className="mt-3 border-t pt-3 text-xs text-[var(--text-secondary)]">共 {total} 个项目</p></Card>
      {items.length ? <section aria-label="创作列表" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id} className="flex min-h-56 flex-col p-5"><div className="flex items-center justify-between gap-3"><Badge>{item.nextAction.label}</Badge><span className="text-xs text-[var(--text-secondary)]">{item.updatedAt.toLocaleDateString("zh-CN")}</span></div><Link href={`/projects/${item.id}/studio`} className="mt-4 line-clamp-2 text-lg font-semibold hover:text-[var(--accent)]">{item.title}</Link><p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.description || item.goal || "暂无创作说明"}</p><div className="mt-auto border-t pt-4 text-xs text-[var(--text-secondary)]"><p>{statusLabels[item.status]} · {item._count.sources} 条参考素材</p><div className="mt-2 flex items-center justify-between"><span>下一步：{item.nextAction.label}</span><Link className="font-medium text-[var(--accent)]" href={`/projects/${item.id}/studio`}>继续创作</Link></div></div></Card>)}</section> : <Card className="grid min-h-64 place-items-center p-8 text-center"><div><h2 className="font-semibold">还没有创作</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">从素材库选择一条素材开始，或新建创作。</p></div></Card>}
      <nav aria-label="分页" className="mt-6 flex items-center justify-between text-sm"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page - 1) })}>上一页</Link><span className="text-[var(--text-secondary)]">第 {page} / {pages} 页</span><Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : "text-[var(--accent)]"} href={queryHref(query, { page: String(page + 1) })}>下一页</Link></nav>
    </>
  );
}
