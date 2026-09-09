import { Button, Card } from "@content-center/ui";
import { ArrowRight, Clock3, FolderKanban, Lightbulb, LibraryBig } from "lucide-react";
import Link from "next/link";
import { CreationLaunchpad } from "@/components/creation-launchpad";
import { WorkspaceAssistant } from "@/components/workspace-assistant";
import { requireWorkspace } from "@/server/access";
import { getDashboardCounts, getDashboardWork } from "@/server/dashboard";
import { getIntegrationStatuses } from "@/server/integrations";
import { projectStatusLabels } from "@/lib/content-labels";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const [counts, work, integrations] = await Promise.all([getDashboardCounts(workspace.id), getDashboardWork(workspace.id), getIntegrationStatuses(workspace.id)]);
  const missingServices = integrations.filter((item) => item.provider !== "STORAGE" && item.status !== "CONFIGURED" && item.status !== "MOCK").map((item) => item.name);
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <div className="min-w-0">
      <CreationLaunchpad />
      {missingServices.length ? <Link href="/settings/integrations" className="mt-4 flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 px-4 text-sm hover:border-[var(--accent-border)]"><span><strong>有服务尚未就绪</strong><span className="ml-2 text-[var(--text-secondary)]">{missingServices.join("、")}</span></span><ArrowRight size={17} /></Link> : null}
      <section className="mt-7" aria-labelledby="recent-work-heading">
        <div className="flex items-end justify-between gap-4"><div><h2 id="recent-work-heading" className="text-xl font-semibold tracking-tight">最近工作</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">继续上次没有写完的内容</p></div><Link href="/projects" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--accent)]">查看项目<ArrowRight size={15} /></Link></div>
        {work.projects.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{work.projects.map((project) => <Link key={project.id} href={`/projects/${project.id}/studio`} className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-card)] transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:bg-white"><div className="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]"><span>{projectStatusLabels[project.status] || project.status}</span><span>{project._count.sources} 条参考</span></div><h3 className="mt-3 line-clamp-2 text-base font-semibold leading-6">{project.title}</h3><p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">继续创作<ArrowRight size={14} /></p></Link>)}</div> : <Card className="mt-4 flex min-h-40 items-center justify-between gap-5 p-5"><div><h3 className="font-semibold">还没有进行中的项目</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">从一个想法或一条参考内容开始。</p></div><Button asChild><Link href="/projects/new">开始创作</Link></Button></Card>}
      </section>
      <section className="mt-7" aria-labelledby="inspiration-heading">
        <div className="flex items-end justify-between gap-4"><div><h2 id="inspiration-heading" className="text-xl font-semibold tracking-tight">可以继续的灵感</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">来自你已经保存的真实内容线索</p></div><Link href="/discovery" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--accent)]">去研究<ArrowRight size={15} /></Link></div>
        {work.recommendations.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{work.recommendations.slice(0, 3).map((item) => <Link key={item.id} href={item.projectId ? `/projects/${item.projectId}/studio` : item.contentIdeaId ? `/discovery/ideas/${item.contentIdeaId}` : `/discovery/recommendations/${item.id}`} className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white/68 p-4 transition-colors hover:border-[var(--accent-border)] hover:bg-white"><Lightbulb size={18} className="text-[var(--accent)]" /><h3 className="mt-3 line-clamp-2 font-semibold leading-6">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{item.coreQuestion}</p></Link>)}</div> : <Card className="mt-4 p-5 text-sm text-[var(--text-secondary)]">还没有灵感线索。去灵感研究看看有哪些值得参考的内容。</Card>}
      </section>
      <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-tertiary)]"><span className="inline-flex items-center gap-1.5"><LibraryBig size={14} />{counts.materials} 条资料</span><span className="inline-flex items-center gap-1.5"><FolderKanban size={14} />{counts.projects} 个项目</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{counts.pendingPublish} 条待发布</span></div>
    </div>
    <WorkspaceAssistant title="鑫小助" description="我会结合当前项目、真实资料和默认方法，帮你把想法推进到可编辑的内容。" actions={[{ label: "帮我找一组选题", href: "/discovery" }, { label: "根据想法写口播稿", href: "/projects/new" }, { label: "从视频里找方向", href: "/library" }, { label: "看看已有方法", href: "/projects/methods" }]} />
  </div>;
}
