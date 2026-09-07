import { Badge, Button, Card } from "@content-center/ui";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page";
import { methodStatusLabels } from "@/lib/content-labels";
import { requireWorkspace } from "@/server/access";
import { getCreatorMethodsOverview, type CreatorMethodDTO } from "@/server/creator-methods/service";

export default async function CreatorMethodsPage() {
  const { session, workspace, role } = await requireWorkspace();
  const overview = await getCreatorMethodsOverview({ workspaceId: workspace.id, ownerUserId: session.user.id });
  const canOperate = role !== "VIEWER";
  const description = "这里整理的是你已经确认、正在尝试和实际使用过的创作方法。系统不会因为一次收藏或一次生成，就自动改变你的长期创作习惯。";
  if (!overview.all.length) return <><Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} />返回我的创作</Link><PageHeader title="我的创作方法" description={description} /><EmptyMethods /></>;
  const savedWithoutUse = overview.groups.SAVED.filter((method) => method.attempts === 0);
  return <><div className="mb-5 flex items-center justify-between gap-3"><Link href="/projects" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ArrowLeft size={16} />返回我的创作</Link><Link href="/library/methods" className="text-sm font-medium text-[var(--accent)]">查看全部方法</Link></div><PageHeader title="我的创作方法" description={description} />
    <section className="mb-8 rounded-2xl border bg-[var(--surface)] p-5" data-testid="creator-methods-summary"><p className="text-sm leading-6 text-[var(--text-secondary)]">最近 30 天共有 <span className="font-semibold text-[var(--text-primary)]">{overview.totalGenerations}</span> 次口播稿生成记录。生成完成只表示技术流程完成，不代表方法有效；这里不计算成功率。</p></section>
    <MethodSection testId="core-methods" title="我常用的方法" description="你手动标记为常用的方法。" items={overview.groups.CORE} totalGenerations={overview.totalGenerations} canOperate={canOperate} />
    <MethodSection testId="trial-methods" title="我正在试的方法" description="你手动标记为试用中的方法。" items={overview.groups.TRIAL} totalGenerations={overview.totalGenerations} canOperate={canOperate} />
    <RecentSection items={overview.recentlyUsed} canOperate={canOperate} />
    <MethodSection testId="saved-methods" title="还没开始尝试" description="这些方法已经收藏，但最近 30 天还没有实际使用记录。" items={savedWithoutUse} totalGenerations={overview.totalGenerations} canOperate={canOperate} secondary />
    {overview.groups.DISABLED.length ? <details className="mt-8" data-testid="disabled-methods"><summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">已停用（{overview.groups.DISABLED.length}）</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><p className="text-sm text-[var(--text-secondary)] md:col-span-2">这些方法过去的使用记录仍会保留，但当前不会出现在创作选择中。</p>{overview.groups.DISABLED.map((method) => <MethodCard key={method.id} method={method} totalGenerations={overview.totalGenerations} canOperate={canOperate} disabled />)}</div></details> : null}
  </>;
}

function EmptyMethods() {
  return <Card className="grid min-h-72 place-items-center p-8 text-center"><div className="max-w-md"><BookOpen className="mx-auto text-[var(--accent)]" size={28} /><h2 className="mt-4 text-lg font-semibold">还没有创作方法</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">你可以从内容拆解或对标账号研究中保存一项方法，之后再在这里查看使用情况。</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Button asChild><Link href="/library">去内容素材</Link></Button><Button variant="secondary" asChild><Link href="/discovery">去对标账号</Link></Button></div></div></Card>;
}

function MethodSection({ testId, title, description, items, totalGenerations, canOperate, secondary = false }: { testId: string; title: string; description: string; items: CreatorMethodDTO[]; totalGenerations: number; canOperate: boolean; secondary?: boolean }) {
  return <section className={`mt-8 ${secondary ? "opacity-95" : ""}`} data-testid={testId}><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p></div><span className="text-xs text-[var(--text-secondary)]">{items.length} 项</span></div>{items.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{items.map((method) => <MethodCard key={method.id} method={method} totalGenerations={totalGenerations} canOperate={canOperate} />)}</div> : <Card className="mt-4 p-5 text-sm text-[var(--text-secondary)]">这里暂时没有方法。</Card>}</section>;
}

function MethodCard({ method, totalGenerations, canOperate, disabled = false }: { method: CreatorMethodDTO; totalGenerations: number; canOperate: boolean; disabled?: boolean }) {
  const source = method.current.source.title;
  return <Card className={disabled ? "opacity-65" : ""}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 font-semibold">{method.current.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{method.current.steps[0] || "已保存的方法内容"}</p></div><Badge>{methodStatusLabels[method.status]}</Badge></div><p className="mt-4 line-clamp-1 text-xs text-[var(--text-secondary)]">来源：{source}</p>{disabled && method.attempts ? <p className="mt-3 text-xs text-[var(--text-secondary)]">过去使用过，当前已停用。</p> : null}<div className="mt-4 border-t pt-4 text-xs text-[var(--text-secondary)]">{method.attempts ? <p>最近 30 天 {totalGenerations} 次生成中，{method.attempts} 次选择此方法：成功生成 {method.successfulCount} 次，生成失败 {method.failedCount} 次。</p> : <p>{totalGenerations ? `最近 30 天有 ${totalGenerations} 次生成，但还没有选择此方法` : "最近 30 天还没有使用记录"}</p>}{method.latestProject && method.latestUsedAt ? <p className="mt-2">最近一次用于：<Link href={`/projects/${method.latestProject.id}/studio`} className="font-medium text-[var(--accent)]">{method.latestProject.title}</Link> · {new Date(method.latestUsedAt).toLocaleDateString("zh-CN")}</p> : null}</div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href={`/library/methods/${method.id}`}>{canOperate ? "查看/调整方法" : "查看方法"}</Link></Button>{canOperate && !disabled ? <Button asChild><Link href="/projects">去创作<ArrowRight size={14} /></Link></Button> : null}</div></Card>;
}

function RecentSection({ items, canOperate }: { items: CreatorMethodDTO[]; canOperate: boolean }) {
  return <section className="mt-8" data-testid="recently-used-methods"><div><h2 className="text-xl font-semibold">最近实际使用</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">只列出最近 30 天有明确使用记录的方法。</p></div>{items.length ? <div className="mt-4 grid gap-3">{items.slice(0, 8).map((method) => <Card key={method.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/library/methods/${method.id}`} className="font-medium text-[var(--accent)]">{method.current.title}</Link><Badge>{methodStatusLabels[method.status]}</Badge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">实际尝试 {method.attempts} 次 · 成功生成 {method.successfulCount} 次 · 生成失败 {method.failedCount} 次</p>{method.latestProject ? <p className="mt-1 text-xs text-[var(--text-secondary)]">最近一次用于：{method.latestProject.title}</p> : null}</div>{method.latestUsedAt ? <time className="text-xs text-[var(--text-secondary)]">{new Date(method.latestUsedAt).toLocaleString("zh-CN")}</time> : null}</div>{method.status === "DISABLED" ? <p className="mt-2 text-xs text-[var(--text-secondary)]">过去使用过，当前已停用。</p> : null}<div className="mt-3 flex gap-2"><Button variant="secondary" asChild><Link href={`/library/methods/${method.id}`}>{canOperate ? "查看/调整方法" : "查看方法"}<ExternalLink size={13} /></Link></Button></div></Card>)}</div> : <Card className="mt-4 p-5 text-sm text-[var(--text-secondary)]">最近 30 天还没有实际使用方法的记录。</Card>}</section>;
}
