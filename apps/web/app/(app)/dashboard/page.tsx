import { Button, Card } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, FileText, LibraryBig, Lightbulb, PlaySquare, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { CreationLaunchpad } from "@/components/creation-launchpad";
import { DashboardAssistant } from "@/components/dashboard-assistant";
import { requireWorkspace } from "@/server/access";
import { getDashboardWork } from "@/server/dashboard";
import { getIntegrationStatuses } from "@/server/integrations";
import { projectStatusLabels } from "@/lib/content-labels";

const existingStarts = [
  { title: "单视频找选题", description: "从一条视频发现更多可能", href: "/library", icon: PlaySquare },
  { title: "对标博主找题", description: "分析已研究博主，找到创作方向", href: "/discovery", icon: UserRoundSearch },
  { title: "浏览我的资料", description: "基于已有资料开始创作", href: "/library", icon: LibraryBig },
  { title: "使用默认方法", description: "更适合中文内容创作", href: "/projects/methods", icon: BookOpenCheck },
] as const;

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const [work, integrations] = await Promise.all([getDashboardWork(workspace.id), getIntegrationStatuses(workspace.id)]);
  const missingServices = integrations.filter((item) => item.provider !== "STORAGE" && item.status !== "CONFIGURED" && item.status !== "MOCK").map((item) => item.name);
  return <div className="dashboard-v2">
    <CreationLaunchpad />
    {missingServices.length ? <Link href="/settings/integrations" className="dashboard-service-note"><span><strong>有服务尚未就绪</strong> · {missingServices.join("、")}</span><ArrowRight size={16} /></Link> : null}

    <section className="dashboard-section" aria-labelledby="recent-work-heading">
      <div className="dashboard-section-heading"><div><h2 id="recent-work-heading">最近工作</h2><p>继续上次没有写完的内容</p></div><Link href="/projects">查看全部<ArrowRight size={15} /></Link></div>
      {work.projects.length ? <div className="dashboard-recent-grid">{work.projects.map((project, index) => <Link key={project.id} href={`/projects/${project.id}/studio`} className="dashboard-recent-card"><span className="dashboard-project-visual" data-tone={index % 4}><FileText size={21} /></span><div className="min-w-0"><div><span>{projectStatusLabels[project.status] || project.status}</span></div><h3>{project.title}</h3><p>上次编辑 {project.updatedAt.toLocaleDateString("zh-CN")} · {project._count.sources} 条参考</p><strong>继续创作<ArrowRight size={14} /></strong></div></Link>)}</div> : <Card className="dashboard-empty-work"><div><h3>还没有进行中的项目</h3><p>从一个想法或一条参考内容开始。</p></div><Button asChild><Link href="/projects/new">开始创作</Link></Button></Card>}
    </section>

    <section className="dashboard-section" aria-labelledby="existing-start-heading">
      <div className="dashboard-section-heading"><div><h2 id="existing-start-heading">从现有内容开始</h2><p>基于你已有的内容，快速找到新的创作方向</p></div></div>
      <div className="dashboard-start-grid">{existingStarts.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href}><span><Icon size={21} /></span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight size={17} /></Link>)}</div>
    </section>

    {work.recommendations.length ? <section className="dashboard-inspiration-strip" aria-labelledby="dashboard-inspiration-heading"><div><Lightbulb size={18} /><span><h2 id="dashboard-inspiration-heading">可以继续的灵感</h2><p>来自已保存的真实内容线索</p></span></div><div>{work.recommendations.slice(0, 3).map((item) => <Link key={item.id} href={item.projectId ? `/projects/${item.projectId}/studio` : item.contentIdeaId ? `/discovery/ideas/${item.contentIdeaId}` : `/discovery/recommendations/${item.id}`}>{item.title}<ArrowRight size={14} /></Link>)}</div><Link href="/discovery">去灵感研究</Link></section> : null}
    <DashboardAssistant />
  </div>;
}
