import { Badge, Button, Card } from "@content-center/ui";
import { ArrowRight, BookOpenCheck, Boxes, Workflow } from "lucide-react";
import Link from "next/link";
import { methodStatusLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { getCreatorMethodsOverview, type CreatorMethodDTO } from "@/server/creator-methods/service";
import { getDefaultContentMethod } from "@/server/default-content-method/service";
import { DefaultContentMethod } from "@/components/projects/default-content-method";

export default async function CreatorMethodsPage() {
  const { session, workspace, role } = await requireWorkspace();
  const [overview, defaultMethod] = await Promise.all([getCreatorMethodsOverview({ workspaceId: workspace.id, ownerUserId: session.user.id }), getDefaultContentMethod({ workspaceId: workspace.id })]);
  const activeMethods = overview.all.filter((method) => method.status !== "DISABLED");
  return <div className="methods-center">
    <header className="page-hero-row"><div><h1 className="page-heading">方法中心</h1><p className="page-description">公司通用方法、你自己的创作方法，以及未来可组合的创作流程都在这里。</p></div><Button variant="secondary" asChild><Link href="/library/methods">管理全部方法<ArrowRight size={15} /></Link></Button></header>
    <nav className="method-center-tabs" aria-label="方法中心栏目"><a href="#default-method">鑫世界默认方法</a><a href="#my-methods">我的创作方法</a><a href="#my-workflows">我的创作流程</a></nav>
    <section id="default-method" aria-labelledby="default-method-heading"><div className="section-heading-row"><div><h2 id="default-method-heading">鑫世界默认方法</h2><p>公司通用的创作底座，Studio 会根据当前动作只使用相关部分。</p></div></div><DefaultContentMethod initial={defaultMethod} editable={role !== "VIEWER"} /></section>
    <section id="my-methods" aria-labelledby="my-methods-heading" className="mt-9"><div className="section-heading-row"><div><h2 id="my-methods-heading">我的创作方法</h2><p>你确认过、正在尝试或经常使用的方法，可以与默认方法一起使用。</p></div><span>{activeMethods.length} 项</span></div>
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4" data-testid="creator-methods-summary"><p className="text-sm text-[var(--text-secondary)]">最近 30 天有 {overview.totalGenerations} 次口播稿生成记录。这里只记录实际使用，不把生成完成当成方法有效。</p><Link href="/library/methods" className="text-sm font-semibold text-[var(--accent)]">查看完整方法库</Link></Card>
      {activeMethods.length ? <div className="personal-method-grid">{activeMethods.slice(0, 6).map((method) => <MethodCard key={method.id} method={method} />)}<Link href="/library/methods" className="personal-method-more"><Boxes size={22} /><strong>查看全部方法</strong><span>包括已停用方法和完整版本信息</span></Link></div> : <Card className="empty-state"><BookOpenCheck size={28} /><h3>还没有自己的创作方法</h3><p>从单条内容或博主研究中看到值得保留的做法后，可以保存到这里。</p><Button asChild><Link href="/library">去研究资料</Link></Button></Card>}
    </section>
    <section id="my-workflows" className="mt-9" aria-labelledby="my-workflows-heading"><div className="section-heading-row"><div><h2 id="my-workflows-heading">我的创作流程</h2><p>未来可以在画布中组合资料、方法和工具，形成自己的内容流程。</p></div><Badge>即将支持</Badge></div><Card className="workflow-ready-card"><span><Workflow size={24} /></span><div><h3>画布式创作流程</h3><p>当前不会创建虚假流程或运行记录。后续支持后，你可以在这里自由组合已有方法与资料。</p></div><Button disabled variant="secondary">画布编辑即将支持</Button></Card></section>
  </div>;
}

function MethodCard({ method }: { method: CreatorMethodDTO }) {
  return <Link href={`/library/methods/${method.id}`} className="personal-method-card"><div className="flex items-start justify-between gap-3"><span className="personal-method-icon"><BookOpenCheck size={19} /></span><Badge>{methodStatusLabels[method.status]}</Badge></div><h3>{method.current.title}</h3><p>{method.current.steps[0] || "已保存的方法内容"}</p><footer><span>{method.attempts ? `最近使用 ${method.attempts} 次` : "还没有实际使用"}</span><ArrowRight size={15} /></footer></Link>;
}
