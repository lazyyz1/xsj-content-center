import { Button, Card } from "@content-center/ui";
import { ArrowRight, Compass, LibraryBig, Settings2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { requireWorkspace } from "@/server/access";
import { getDashboardCounts, getDashboardWork } from "@/server/dashboard";
import { getIntegrationStatuses } from "@/server/integrations";
import { projectStatusLabels } from "@/lib/content-labels";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const [counts, work, integrations] = await Promise.all([getDashboardCounts(workspace.id), getDashboardWork(workspace.id), getIntegrationStatuses(workspace.id)]);
  const missingServices = integrations.filter((item) => item.provider !== "STORAGE" && item.status !== "CONFIGURED" && item.status !== "MOCK").map((item) => item.name);
  const metrics = [["素材", counts.materials, "/library"], ["我的创作", counts.projects, "/projects"], ["待审核", counts.pendingReview, "/projects?review=pending"], ["待发布", counts.pendingPublish, "/calendar?view=pending"]] as const;

  return <>
    <PageHeader title="今天从哪里开始？" description="继续最值得做的下一步。" />
    {missingServices.length ? <Link href="/settings/integrations" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border bg-[var(--surface)] p-4 hover:border-[var(--accent)]"><div className="flex items-start gap-3"><Settings2 size={19} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><p className="text-sm font-medium">完成 AI 服务配置</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">尚未就绪：{missingServices.join("、")}。</p></div></div><ArrowRight size={17} /></Link> : null}
    <section aria-labelledby="continue-heading"><div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="continue-heading" className="text-lg font-semibold">继续创作</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">接着最近的进度往下做</p></div><Link href="/projects" className="text-sm text-[var(--accent)]">查看全部</Link></div>
      {work.projects.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{work.projects.map((project) => <Link key={project.id} href={`/projects/${project.id}/studio`} className="group rounded-2xl border bg-[var(--surface)] p-4 hover:border-[var(--accent)]"><p className="text-xs text-[var(--text-secondary)]">{projectStatusLabels[project.status] || project.status} · {project._count.sources} 条参考素材</p><h3 className="mt-2 line-clamp-2 min-h-12 font-semibold leading-6">{project.title}</h3><p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">继续创作 <ArrowRight size={14} /></p></Link>)}</div> : <Card className="p-5 text-sm text-[var(--text-secondary)]">还没有进行中的创作。先收录一条同行素材开始。</Card>}
    </section>
    <section aria-labelledby="quick-heading" className="mt-6"><h2 id="quick-heading" className="text-lg font-semibold">快速开始</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Button variant="secondary" asChild className="h-auto justify-start p-4"><Link href="/library"><LibraryBig size={18} /><span className="text-left"><strong className="block">粘贴 / 收录一条素材</strong><span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">从一条同行内容开始整理</span></span></Link></Button>
      <Button variant="secondary" asChild className="h-auto justify-start p-4"><Link href="/discovery"><Compass size={18} /><span className="text-left"><strong className="block">发现同行内容</strong><span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">看看今天有哪些值得参考</span></span></Link></Button>
    </div></section>
    <section aria-labelledby="today-heading" className="mt-6"><div className="mb-3 flex items-end justify-between"><div><h2 id="today-heading" className="text-lg font-semibold">今天可以做</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">来自已有内容线索，不会自动获取新数据</p></div><Link href="/discovery" className="text-sm text-[var(--accent)]">去内容发现</Link></div>
      {work.recommendations.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{work.recommendations.map((item) => <Link key={item.id} href={item.projectId ? `/projects/${item.projectId}/studio` : item.contentIdeaId ? `/discovery/ideas/${item.contentIdeaId}` : `/discovery/recommendations/${item.id}`} className="rounded-2xl border bg-[var(--surface)] p-4 hover:border-[var(--accent)]"><h3 className="line-clamp-2 font-semibold">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{item.coreQuestion}</p></Link>)}</div> : <Card className="flex items-center justify-between gap-4 p-4"><p className="text-sm text-[var(--text-secondary)]">还没有内容线索，可以去发现页生成一批。</p><Button className="h-9 px-3" variant="secondary" asChild><Link href="/discovery">去看看</Link></Button></Card>}
    </section>
    <section aria-label="数据统计" className="mt-8"><h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">数据统计</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, href]) => <Link key={label} href={href} aria-label={`${label} ${value}，查看详情`} className="group rounded-[calc(var(--radius)+4px)]"><Card className="h-full p-4 group-hover:border-[var(--accent)]"><p className="text-sm text-[var(--text-secondary)]">{label}</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-semibold tabular-nums">{value}</p><ArrowRight size={16} /></div></Card></Link>)}</div></section>
  </>;
}
